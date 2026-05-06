const fs = require("fs");
const path = require("path");

const { DatabaseSync } = require("node:sqlite");

const IS_ELECTRON = !!process.versions?.electron;

function getDefaultDataDir() {
  if (!IS_ELECTRON) return path.join(__dirname, ".data");
  try {
    return require("electron").app.getPath("userData");
  } catch {
    return path.join(__dirname, ".data");
  }
}

const DEFAULT_DATA_DIR = getDefaultDataDir();

const DATA_DIR = process.env.SQLITE_DATA_DIR || DEFAULT_DATA_DIR;
const DB_FILE = process.env.SQLITE_DATABASE_PATH || path.join(DATA_DIR, "dashboard-vendas.sqlite");
const LEGACY_USER_STORE_FILE = path.join(DATA_DIR, "users.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'local',
    password_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    platform_key TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    icon_text TEXT NOT NULL DEFAULT '#ffffff',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, platform_key),
    FOREIGN KEY(user_id) REFERENCES users(username) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    platform_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    orders_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, platform_id, month, date),
    FOREIGN KEY(user_id) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY(platform_id) REFERENCES platforms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    platform_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, platform_id, month),
    FOREIGN KEY(user_id) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY(platform_id) REFERENCES platforms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    user_id TEXT PRIMARY KEY,
    current_month TEXT,
    current_screen TEXT,
    pricing_json TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(username) ON DELETE CASCADE
  );
`);

function nowIso() {
  return new Date().toISOString();
}

function mapUserRow(row) {
  if (!row) return null;
  return {
    provider: "local",
    passwordHash: row.password_hash || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getUserRecord(username) {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  return mapUserRow(row);
}

function saveUserRecord(username, userRecord) {
  const existing = getUserRecord(username);
  const createdAt = userRecord.createdAt || existing?.createdAt || nowIso();
  const updatedAt = userRecord.updatedAt || nowIso();
  db.prepare(`
    INSERT INTO users (
      username, provider, password_hash, created_at, updated_at
    ) VALUES (
      @username, @provider, @passwordHash, @createdAt, @updatedAt
    )
    ON CONFLICT(username) DO UPDATE SET
      provider = excluded.provider,
      password_hash = excluded.password_hash,
      updated_at = excluded.updated_at
  `).run({
    username,
    provider: "local",
    passwordHash: userRecord.passwordHash || null,
    createdAt,
    updatedAt
  });
}

function migrateLegacyUsers() {
  if (!fs.existsSync(LEGACY_USER_STORE_FILE)) return;
  let legacy = null;
  try {
    legacy = JSON.parse(fs.readFileSync(LEGACY_USER_STORE_FILE, "utf8"));
  } catch {
    return;
  }
  Object.entries(legacy.users || {}).forEach(([username, user]) => {
    if (!username || getUserRecord(username)) return;
    saveUserRecord(username, {
      provider: "local",
      passwordHash: user.passwordHash || "",
      createdAt: user.createdAt || nowIso(),
      updatedAt: user.updatedAt || nowIso()
    });
  });
}

function getPlatforms(username) {
  return db.prepare(`
    SELECT id, platform_key, name, icon, color, icon_text, sort_order
    FROM platforms
    WHERE user_id = ?
    ORDER BY sort_order ASC, id ASC
  `).all(username);
}

function getBusinessState(username) {
  const platformRows = getPlatforms(username);
  const platforms = platformRows.map((row) => ({
    key: row.platform_key,
    name: row.name,
    icon: row.icon,
    color: row.color,
    iconText: row.icon_text
  }));
  
  const keyById = new Map(platformRows.map((row) => [row.id, row.platform_key]));
  const dbState = {};

  const sales = db.prepare(`
    SELECT platform_id, month, date, amount, orders_count
    FROM sales
    WHERE user_id = ?
    ORDER BY month ASC, date ASC, platform_id ASC
  `).all(username);
  
  sales.forEach((sale) => {
    const key = keyById.get(sale.platform_id);
    if (!key) return;
    
    if (!dbState[sale.month]) {
      dbState[sale.month] = { days: [], returns: {} };
    }
    
    let day = dbState[sale.month].days.find((item) => item.d === sale.date);
    if (!day) {
      day = { d: sale.date };
      dbState[sale.month].days.push(day);
    }
    
    day[key] = Number(sale.amount || 0);
    day[`orders_${key}`] = Math.max(0, Math.round(Number(sale.orders_count || 0)));
  });

  const returns = db.prepare(`
    SELECT platform_id, month, amount
    FROM returns
    WHERE user_id = ?
    ORDER BY month ASC, platform_id ASC
  `).all(username);
  
  returns.forEach((item) => {
    const key = keyById.get(item.platform_id);
    if (!key) return;
    
    if (!dbState[item.month]) {
      dbState[item.month] = { days: [], returns: {} };
    }
    
    dbState[item.month].returns[key] = Number(item.amount || 0);
  });

  Object.values(dbState).forEach((monthData) => {
    platforms.forEach((platform) => {
      if (monthData.returns[platform.key] === undefined) {
        monthData.returns[platform.key] = 0;
      }
      monthData.days.forEach((day) => {
        if (day[platform.key] === undefined) {
          day[platform.key] = 0;
        }
        if (day[`orders_${platform.key}`] === undefined) {
          day[`orders_${platform.key}`] = 0;
        }
      });
    });
  });

  const settings = db.prepare("SELECT * FROM app_settings WHERE user_id = ?").get(username);
  
  return {
    platforms,
    db: dbState,
    currentMonth: settings?.current_month || Object.keys(dbState)[0] || "",
    currentScreen: settings?.current_screen || "hub",
    pricing: settings?.pricing_json ? JSON.parse(settings.pricing_json) : null,
    updatedAt: settings?.updated_at || ""
  };
}

function replaceBusinessStateTx(username, state) {
  const timestamp = nowIso();
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM sales WHERE user_id = ?").run(username);
    db.prepare("DELETE FROM returns WHERE user_id = ?").run(username);
    db.prepare("DELETE FROM platforms WHERE user_id = ?").run(username);

    const insertPlatform = db.prepare(`
      INSERT INTO platforms (user_id, platform_key, name, icon, color, icon_text, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const platformIds = new Map();
    (state.platforms || []).forEach((platform, index) => {
      const result = insertPlatform.run(
        username,
        platform.key,
        platform.name,
        platform.icon,
        platform.color,
        platform.iconText || "#ffffff",
        index,
        timestamp,
        timestamp
      );
      platformIds.set(platform.key, result.lastInsertRowid);
    });

    const insertSale = db.prepare(`
      INSERT INTO sales (user_id, platform_id, month, date, amount, orders_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    Object.entries(state.db || {}).forEach(([month, monthData]) => {
      (monthData.days || []).forEach((day) => {
        (state.platforms || []).forEach((platform) => {
          const platformId = platformIds.get(platform.key);
          if (!platformId || !day.d) return;
          const amount = Number(day[platform.key] || 0);
          const orders = Math.max(0, Math.round(Number(day[`orders_${platform.key}`] || 0)));
          if (amount <= 0 && orders <= 0) return;
          insertSale.run(username, platformId, month, day.d, amount, orders, timestamp, timestamp);
        });
      });
    });

    const insertReturn = db.prepare(`
      INSERT INTO returns (user_id, platform_id, month, amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    Object.entries(state.db || {}).forEach(([month, monthData]) => {
      (state.platforms || []).forEach((platform) => {
        const platformId = platformIds.get(platform.key);
        if (!platformId) return;
        const amount = Number(monthData.returns?.[platform.key] || 0);
        if (amount <= 0) return;
        insertReturn.run(username, platformId, month, amount, timestamp, timestamp);
      });
    });

    db.prepare(`
      INSERT INTO app_settings (user_id, current_month, current_screen, pricing_json, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        current_month = excluded.current_month,
        current_screen = excluded.current_screen,
        pricing_json = excluded.pricing_json,
        updated_at = excluded.updated_at
    `).run(
      username,
      state.currentMonth || "",
      state.currentScreen || "hub",
      JSON.stringify(state.pricing || null),
      timestamp
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function replaceBusinessState(username, state) {
  replaceBusinessStateTx(username, state || {});
  return getBusinessState(username);
}

function upsertPlatforms(username, platforms) {
  const current = getBusinessState(username);
  return replaceBusinessState(username, { ...current, platforms: platforms || [] });
}

migrateLegacyUsers();

module.exports = {
  db,
  getUserRecord,
  saveUserRecord,
  getBusinessState,
  replaceBusinessState,
  upsertPlatforms
};