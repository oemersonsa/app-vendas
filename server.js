const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const database = require("./database");

loadEnvFile(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const HOST = String(process.env.HOST || "0.0.0.0");
const APP_ORIGIN = String(process.env.APP_ORIGIN || `http://localhost:${PORT}`).replace(/\/$/, "");
const DATA_DIR = process.env.SQLITE_DATA_DIR || path.join(__dirname, ".data");
const SESSION_STORE_FILE = path.join(DATA_DIR, "sessions.json");

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Max requests per window per IP on /api/* routes
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map(); // ip -> { count, windowStart }

// ─── Static file map ──────────────────────────────────────────────────────────
const STATIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.js", "app.js"],
  ["/styles.css", "styles.css"],
  ["/favicon.svg", "favicon.svg"],
]);

// ─── In-memory state ─────────────────────────────────────────────────────────

// ─── Logger ───────────────────────────────────────────────────────────────────
const logger = {
  _fmt(level, msg, meta) {
    const ts = new Date().toISOString();
    const metaStr = meta ? " " + JSON.stringify(meta) : "";
    return `[${ts}] [${level}] ${msg}${metaStr}`;
  },
  info(msg, meta) { console.log(this._fmt("INFO ", msg, meta)); },
  warn(msg, meta) { console.warn(this._fmt("WARN ", msg, meta)); },
  error(msg, meta) { console.error(this._fmt("ERROR", msg, meta)); },
};

// ─── .env loader ─────────────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) return;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ensureDataDir() {
  fs.mkdirSync(path.dirname(SESSION_STORE_FILE), { recursive: true });
}

function getUserRecord(username) {
  if (!username) return null;
  return database.getUserRecord(username);
}

async function saveUserRecord(username, userRecord) {
  database.saveUserRecord(username, userRecord);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password, passwordHash) {
  const [scheme, salt, storedHash] = String(passwordHash || "").split(":");
  if (scheme !== "scrypt" || !salt || !storedHash) return false;
  const candidate = crypto.scryptSync(String(password || ""), salt, 64);
  const expected = Buffer.from(storedHash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

// ─── Session store ────────────────────────────────────────────────────────────
// Alterar de 7 dias para 365 dias (praticamente permanente)
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 ano

function readSessionStore() {
  ensureDataDir();
  if (!fs.existsSync(SESSION_STORE_FILE)) return { sessions: {} };
  try {
    return JSON.parse(fs.readFileSync(SESSION_STORE_FILE, "utf8"));
  } catch {
    return { sessions: {} };
  }
}

function writeSessionStore(store) {
  ensureDataDir();
  // Write to a temp file first, then rename — this is an atomic operation on
  // all major OSes and prevents a corrupt sessions.json if the app is closed
  // mid-write (common in Electron when the user closes the window).
  const tmp = SESSION_STORE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, SESSION_STORE_FILE);
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString("hex");
  const store = readSessionStore();
  if (!store.sessions) store.sessions = {};
  store.sessions[token] = { username, createdAt: Date.now() };
  writeSessionStore(store);
  return token;
}

function validateSession(token) {
  if (!token) return null;
  const store = readSessionStore();
  const session = store.sessions?.[String(token)];
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    delete store.sessions[token];
    writeSessionStore(store);
    return null;
  }
  return session.username;
}

function deleteSession(token) {
  if (!token) return;
  const store = readSessionStore();
  if (store.sessions?.[token]) {
    delete store.sessions[token];
    writeSessionStore(store);
  }
}

function cleanupExpiredSessions() {
  const store = readSessionStore();
  const now = Date.now();
  let changed = false;
  for (const [token, session] of Object.entries(store.sessions || {})) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      delete store.sessions[token];
      changed = true;
    }
  }
  if (changed) writeSessionStore(store);
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────
function checkRateLimit(ip) {
  // Requests from the loopback (Electron's embedded server) must never be
  // rate-limited — they all share the same IP and would hit the cap instantly.
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") return true;

  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function getClientIp(req) {
  return (
    String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

// Substitua a função setCorsHeaders (linhas ~272)
function setCorsHeaders(res, req) {
  const requestOrigin = req ? String(req.headers["origin"] || "") : "";
  
  // Em Electron, a origem pode ser null (file://) ou vazia
  if (requestOrigin === "null" || requestOrigin === "") {
    // Permitir acesso local sem restrições CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  } else {
    // Para requisições de navegador, usar a origem específica
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
}

async function readJsonBody(req) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    throw new Error("invalid_content_type");
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 10 * 1024 * 1024) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
function extractSessionToken(req, url = null) {
  // Accept token from Authorization header: "Bearer <token>"
  const auth = String(req.headers["authorization"] || "");
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  if (url) {
    const tokenFromQuery = String(url.searchParams.get("sessionToken") || "").trim();
    if (tokenFromQuery) return tokenFromQuery;
  }
  return null;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

// POST /api/auth/login  { username, password }  → { sessionToken }
async function handleAuthLogin(req, res) {
  const body = await readJsonBody(req);
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  if (!username || !password) {
    sendJson(res, 400, { error: "username_and_password_required" });
    return;
  }
  const user = getUserRecord(username);
  if (!user || user.provider !== "local" || !verifyPassword(password, user.passwordHash)) {
    sendJson(res, 401, { error: "invalid_credentials" });
    return;
  }
  const token = createSession(username);
  logger.info("Session created", { username });
  sendJson(res, 200, { sessionToken: token });
}

// POST /api/auth/register  { username, password }  → { sessionToken }
async function handleAuthRegister(req, res) {
  const body = await readJsonBody(req);
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  if (!username || !password) {
    sendJson(res, 400, { error: "username_and_password_required" });
    return;
  }
  if (password.length < 4) {
    sendJson(res, 400, { error: "password_too_short" });
    return;
  }
  const existing = getUserRecord(username);
  if (existing?.passwordHash) {
    sendJson(res, 409, { error: "user_already_exists" });
    return;
  }

  await saveUserRecord(username, {
    provider: "local",
    passwordHash: hashPassword(password),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const token = createSession(username);
  logger.info("Local user created", { username });
  sendJson(res, 200, { sessionToken: token });
}

// POST /api/auth/migrate-local  { username, password }  → { ok }
async function handleAuthMigrateLocal(req, res) {
  const body = await readJsonBody(req);
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  if (!username || !password) {
    sendJson(res, 400, { error: "username_and_password_required" });
    return;
  }
  const existing = getUserRecord(username);
  if (!existing) {
    await saveUserRecord(username, {
      provider: "local",
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    logger.info("Legacy local auth migrated", { username });
    sendJson(res, 200, { ok: true, migrated: true });
    return;
  }
  if (existing.provider !== "local") {
    sendJson(res, 409, { error: "provider_mismatch" });
    return;
  }
  if (!verifyPassword(password, existing.passwordHash)) {
    sendJson(res, 409, { error: "migration_password_mismatch" });
    return;
  }
  sendJson(res, 200, { ok: true, migrated: false });
}

// POST /api/auth/logout
async function handleAuthLogout(req, res) {
  const token = extractSessionToken(req);
  if (token) deleteSession(token);
  sendJson(res, 200, { ok: true });
}

// POST /api/auth/change-password  { username, currentPassword, newPassword }
async function handleAuthChangePassword(req, res, authenticatedUser) {
  const body = await readJsonBody(req);
  const username = String(body?.username || "").trim();
  const currentPassword = String(body?.currentPassword || "");
  const newPassword = String(body?.newPassword || "");

  if (!username || !currentPassword || !newPassword) {
    sendJson(res, 400, { error: "username_current_and_new_password_required" });
    return;
  }
  if (authenticatedUser !== username) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }
  if (newPassword.length < 4) {
    sendJson(res, 400, { error: "password_too_short" });
    return;
  }

  const user = getUserRecord(username);
  if (!user || user.provider !== "local") {
    sendJson(res, 404, { error: "local_user_not_found" });
    return;
  }
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    sendJson(res, 401, { error: "invalid_current_password" });
    return;
  }

  await saveUserRecord(username, {
    ...user,
    passwordHash: hashPassword(newPassword),
    updatedAt: new Date().toISOString(),
  });
  sendJson(res, 200, { ok: true });
}

function normalizeBusinessPayload(body) {
  const payload = body?.state || body || {};
  return {
    platforms: Array.isArray(payload.platforms) ? payload.platforms : [],
    db: payload.db && typeof payload.db === "object" ? payload.db : {},
    currentMonth: String(payload.currentMonth || ""),
    currentScreen: payload.currentScreen === "dashboard" || payload.currentScreen === "calculator" ? payload.currentScreen : "hub",
    pricing: payload.pricing && typeof payload.pricing === "object" ? payload.pricing : null
  };
}

async function handleGetState(req, res, authenticatedUser) {
  sendJson(res, 200, { state: database.getBusinessState(authenticatedUser) });
}

async function handleSaveState(req, res, authenticatedUser) {
  const body = await readJsonBody(req);
  const saved = database.replaceBusinessState(authenticatedUser, normalizeBusinessPayload(body));
  sendJson(res, 200, { ok: true, state: saved });
}

async function handleGetPlatforms(req, res, authenticatedUser) {
  const state = database.getBusinessState(authenticatedUser);
  sendJson(res, 200, { platforms: state.platforms });
}

async function handleSavePlatforms(req, res, authenticatedUser) {
  const body = await readJsonBody(req);
  const current = database.getBusinessState(authenticatedUser);
  const saved = database.replaceBusinessState(authenticatedUser, {
    ...current,
    platforms: Array.isArray(body?.platforms) ? body.platforms : []
  });
  sendJson(res, 200, { ok: true, platforms: saved.platforms });
}

async function handleGetSales(req, res, authenticatedUser) {
  const state = database.getBusinessState(authenticatedUser);
  sendJson(res, 200, { sales: state.db });
}

async function handleSaveSales(req, res, authenticatedUser) {
  const body = await readJsonBody(req);
  const current = database.getBusinessState(authenticatedUser);
  const saved = database.replaceBusinessState(authenticatedUser, {
    ...current,
    db: body?.db && typeof body.db === "object" ? body.db : current.db,
    currentMonth: body?.currentMonth || current.currentMonth
  });
  sendJson(res, 200, { ok: true, sales: saved.db });
}

async function handleGetReturns(req, res, authenticatedUser) {
  const state = database.getBusinessState(authenticatedUser);
  const returns = {};
  Object.entries(state.db || {}).forEach(([month, monthData]) => {
    returns[month] = monthData.returns || {};
  });
  sendJson(res, 200, { returns });
}

async function handleSaveReturns(req, res, authenticatedUser) {
  const body = await readJsonBody(req);
  const current = database.getBusinessState(authenticatedUser);
  const nextDb = { ...(current.db || {}) };
  Object.entries(body?.returns || {}).forEach(([month, values]) => {
    if (!nextDb[month]) nextDb[month] = { days: [], returns: {} };
    nextDb[month].returns = values || {};
  });
  const saved = database.replaceBusinessState(authenticatedUser, { ...current, db: nextDb });
  sendJson(res, 200, { ok: true, state: saved });
}

async function handleDashboard(req, res, authenticatedUser, month) {
  const state = database.getBusinessState(authenticatedUser);
  const selectedMonth = decodeURIComponent(month || "");
  sendJson(res, 200, {
    month: selectedMonth,
    platforms: state.platforms,
    data: state.db?.[selectedMonth] || { days: [], returns: {} }
  });
}

// ─── Static file server ───────────────────────────────────────────────────────
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json; charset=utf-8",
  };
  return types[ext] || "application/octet-stream";
}

function serveStatic(req, res, url) {
  const mapped = STATIC_FILES.get(url.pathname);
  if (!mapped) {
    sendText(res, 404, "Not found");
    return;
  }
  const filePath = path.join(__dirname, mapped);
  if (!fs.existsSync(filePath)) {
    sendText(res, 404, "Not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Cache-Control": "public, max-age=60",
  });
  fs.createReadStream(filePath).pipe(res);
}

// ─── Periodic cleanup (replace per-request cleanup) ──────────────────────────
setInterval(() => {
  const now = Date.now();
  // Clean rate limit map entries from old windows
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

setInterval(cleanupExpiredSessions, 60 * 60_000);

// ─── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const ip = getClientIp(req);
  const url = new URL(req.url, APP_ORIGIN);

  setCorsHeaders(res, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  logger.info("Request", { method: req.method, path: url.pathname, ip });

  if (url.pathname.startsWith("/api/")) {
    if (!checkRateLimit(ip)) {
      logger.warn("Rate limit hit", { ip, path: url.pathname });
      sendJson(res, 429, { error: "too_many_requests" });
      return;
    }
  }

  try {
    // Auth routes (no session required)
    if (req.method === "POST" && url.pathname === "/api/auth/register") {
      await handleAuthRegister(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      await handleAuthLogin(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/migrate-local") {
      await handleAuthMigrateLocal(req, res);
      return;
    }
    
    // Session check
    if (req.method === "GET" && url.pathname === "/api/auth/session") {
      const sessionToken = extractSessionToken(req, url);
      const authenticatedUser = validateSession(sessionToken);
      if (!authenticatedUser) {
        sendJson(res, 401, { error: "unauthorized" });
        return;
      }
      sendJson(res, 200, { username: authenticatedUser });
      return;
    }
    
    // Logout (accepts any session state)
    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      const sessionToken = extractSessionToken(req, url);
      if (sessionToken) deleteSession(sessionToken);
      sendJson(res, 200, { ok: true });
      return;
    }
    
    // Protected routes
    const sessionToken = extractSessionToken(req, url);
    const authenticatedUser = validateSession(sessionToken);

    if (req.method === "POST" && url.pathname === "/api/auth/change-password") {
      if (!authenticatedUser) { sendJson(res, 401, { error: "unauthorized" }); return; }
      await handleAuthChangePassword(req, res, authenticatedUser);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      if (!authenticatedUser) { sendJson(res, 401, { error: "unauthorized" }); return; }

      if (req.method === "GET" && url.pathname === "/api/state") {
        await handleGetState(req, res, authenticatedUser);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/state") {
        await handleSaveState(req, res, authenticatedUser);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/platforms") {
        await handleGetPlatforms(req, res, authenticatedUser);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/platforms") {
        await handleSavePlatforms(req, res, authenticatedUser);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/sales") {
        await handleGetSales(req, res, authenticatedUser);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/sales") {
        await handleSaveSales(req, res, authenticatedUser);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/returns") {
        await handleGetReturns(req, res, authenticatedUser);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/returns") {
        await handleSaveReturns(req, res, authenticatedUser);
        return;
      }
      const dashboardMatch = url.pathname.match(/^\/api\/dashboard\/(.+)$/);
      if (req.method === "GET" && dashboardMatch) {
        await handleDashboard(req, res, authenticatedUser, dashboardMatch[1]);
        return;
      }
    }

    // Static files
    if (req.method === "GET") {
      serveStatic(req, res, url);
      return;
    }

    sendText(res, 404, "Not found");
  } catch (error) {
    const message = error?.message || "internal_server_error";
    logger.error("Unhandled error", { message, path: url.pathname });

    const statusCode =
      message.includes("not_connected")       ? 409 :
      message.includes("not_configured")      ? 503 :
      message.includes("file_not_found")      ? 404 :
      message.includes("request_too_large")   ? 413 :
      message.includes("invalid_content_type")? 415 :
      message.includes("unauthorized")        ? 401 :
      message.includes("forbidden")           ? 403 :
      500;

    const safeMessage = statusCode === 500 ? "internal_server_error" : message;
    sendJson(res, statusCode, { error: safeMessage });
  }
});

function startServer({ port = PORT, host = HOST } = {}) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      const actualHost = host === "0.0.0.0" ? "127.0.0.1" : host;
      const url = `http://${actualHost}:${actualPort}`;
      logger.info("Server started", { origin: url });
      resolve({ server, port: actualPort, host: actualHost, url });
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function stopServer() {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close((error) => error ? reject(error) : resolve());
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    logger.error("Failed to start server", { message: error.message });
    process.exit(1);
  });
}

module.exports = {
  server,
  startServer,
  stopServer
};
