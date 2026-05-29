const STORAGE_KEY = "dashboard-vendas-state-v2";
const STORAGE_BACKUP_KEY = "dashboard-vendas-state-v2-backup";
const AUTH_STORAGE_KEY = "dashboard-vendas-auth-v2";
const LAST_SAVED_KEY = "dashboard-vendas-last-saved-v1";
const SESSION_KEY = "dashboard-vendas-session-v1";
const THEME_KEY = "dashboard-vendas-theme-v1";
const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 1 ano

const ALL_MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const SHORT = {
  Janeiro: "Jan",
  Fevereiro: "Fev",
  Marco: "Mar",
  Abril: "Abr",
  Maio: "Mai",
  Junho: "Jun",
  Julho: "Jul",
  Agosto: "Ago",
  Setembro: "Set",
  Outubro: "Out",
  Novembro: "Nov",
  Dezembro: "Dez"
};

const LEGACY_PLATFORM_PRESETS = {
  ml: { name: "Mercado Livre", icon: "ML", color: "#ffe500", iconText: "#1f2937" },
  sh: { name: "Shopee", icon: "SH", color: "#ff5722", iconText: "#ffffff" },
  se: { name: "Shein", icon: "SE", color: "#111111", iconText: "#ffffff" },
  mg: { name: "Magalu", icon: "MG", color: "#0086ff", iconText: "#ffffff" },
  nu: { name: "Nuvem Shop", icon: "NS", color: "#00a86b", iconText: "#ffffff" },
  tk: { name: "TikTok", icon: "TT", color: "#fe2c55", iconText: "#ffffff" },
  kw: { name: "Kwai", icon: "KW", color: "#fb923c", iconText: "#ffffff" }
};

const LEGACY_PLATFORM_KEY_ALIASES = {
  ml: "mercado-livre",
  mercadolivre: "mercado-livre",
  sh: "shopee",
  se: "shein",
  mg: "magalu",
  "magazine-luiza": "magalu",
  nu: "nuvem-shop",
  nuvemshop: "nuvem-shop",
  ns: "nuvem-shop",
  tk: "tiktok",
  "tiktok-shop": "tiktok",
  kw: "kwai"
};

const BRAND_COLORS = ["#2563eb", "#ff5722", "#14b8a6", "#fb923c", "#e11d48", "#7c3aed", "#0ea5e9", "#16a34a"];
const dash = '<span style="color:var(--muted)">-</span>';
const PRICING_DEFAULTS = {
  productCost: 0,
  packagingCost: 0,
  extraCost: 0,
  shippingSubsidy: 0,
  targetMargin: 20,
  targetProfit: 20,
  manualPrice: 0,
  mode: "margin",
  profiles: {}
};
const MARKETPLACE_PRICING_PRESETS = {
  "mercado-livre": {
    label: "Mercado Livre",
    commissionRate: 12,
    transactionRate: 0,
    fixedFee: 6.5,
    extraShippingCost: 0,
    sourceType: "official",
    note: "Baseado nas tabelas publicas do Mercado Livre. Ajuste conforme tipo de anuncio, faixa de preco e frete."
  },
  shopee: {
    label: "Shopee",
    commissionRate: 20,
    transactionRate: 0,
    fixedFee: 4,
    extraShippingCost: 0,
    feeTiers: [
      { min: 0, max: 7.99, commissionRate: 50, fixedFee: 0 },
      { min: 8, max: 79.99, commissionRate: 20, fixedFee: 4 },
      { min: 80, max: 99.99, commissionRate: 14, fixedFee: 16 },
      { min: 100, max: 199.99, commissionRate: 14, fixedFee: 20 },
      { min: 200, max: null, commissionRate: 14, fixedFee: 26 }
    ],
    sourceType: "estimated",
    note: "Referencia 2026 por faixa de preco: 50% ate R$7,99; 20% + R$4 ate R$79,99; 14% com taxa fixa de R$16, R$20 ou R$26 acima disso. Revise campanhas, CPF/CNPJ e regras do Seller Center."
  },
  shein: {
    label: "Shein",
    commissionRate: 16,
    transactionRate: 0,
    fixedFee: 0,
    extraShippingCost: 0,
    sourceType: "estimated",
    note: "Estimativa inicial. Confirme a taxa praticada no painel da sua operação."
  },
  magalu: {
    label: "Magalu",
    commissionRate: 16,
    transactionRate: 0,
    fixedFee: 0,
    extraShippingCost: 0,
    sourceType: "estimated",
    note: "Estimativa inicial. A comissao muda por categoria e contrato."
  },
  "nuvem-shop": {
    label: "Nuvem Shop",
    commissionRate: 0.7,
    transactionRate: 0,
    fixedFee: 0,
    extraShippingCost: 0,
    sourceType: "official",
    note: "Referencia publica do plano Escala com meio de pagamento externo. Se usar Nuvem Pago, a taxa da plataforma pode ser zero."
  },
  tiktok: {
    label: "TikTok",
    commissionRate: 6,
    transactionRate: 6,
    fixedFee: 4,
    extraShippingCost: 0,
    sourceType: "estimated",
    note: "Estimativa 2026: 6% de comissao base + 6% para frete/programa + R$4 por item. Adicione comissao de afiliado/creator em Taxa Extra quando usar esse canal."
  },
  kwai: {
    label: "Kwai",
    commissionRate: 20,
    transactionRate: 0,
    fixedFee: 4,
    extraShippingCost: 0,
    sourceType: "estimated",
    note: "Estimativa 2026 para operacao normal: cerca de 20% + R$4 por item. Incentivos de entrada podem reduzir a taxa temporariamente."
  }
};

let dailyChart = null;
let donutChart = null;
let newMonthSel = null;
let authMode = "login";
let editingPlatformKey = null;
let pendingImportMode = "merge";
let pendingDeleteMonth = null;
let headerMenuCloseTimer = null;
let activeAppScreen = "hub";
let serverSaveTimer = null;
let serverSaveInFlight = false;
let serverSaveQueued = false;

const state = loadState();
let currentTheme = loadTheme();
let sessionUser = loadSession();
activeAppScreen = isKnownAppScreen(state.currentScreen) ? state.currentScreen : "hub";

const R = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const RS = (v) => {
  const value = Number(v || 0);
  const digits = Number.isInteger(value)
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return "R$ " + value.toLocaleString("pt-BR", digits);
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isKnownAppScreen(screen) {
  return ["hub", "dashboard", "calculator", "dailyClose"].includes(screen);
}

// ─── UI Utilities ─────────────────────────────────────────────────────────────

let _toastTimer = null;

function toast(message) {
  // Reuse existing element or create one on the fly
  let el = document.getElementById("appToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "appToast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    Object.assign(el.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "var(--toast-bg, #1f2937)",
      color: "var(--toast-color, #f9fafb)",
      padding: "10px 20px",
      borderRadius: "8px",
      fontSize: "14px",
      fontFamily: "inherit",
      boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
      zIndex: "9999",
      opacity: "0",
      transition: "opacity 0.2s ease",
      pointerEvents: "none",
      whiteSpace: "nowrap",
      maxWidth: "90vw",
      overflow: "hidden",
      textOverflow: "ellipsis"
    });
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.opacity = "1";
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.style.opacity = "0";
  }, 3000);
}

function setStorageStatus(message) {
  const el = document.getElementById("storageStatus");
  if (el) el.textContent = String(message || "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function hexToRgb(color) {
  const normalized = String(color || "").trim().replace("#", "");
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(normalized)) return null;
  const full = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function alphaColor(color, alpha) {
  const rgb = hexToRgb(color);
  return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})` : color;
}

function getReadablePlatformColor(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const brightness = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
  if (currentTheme === "dark" && brightness < 72) return "#f3f4f6";
  if (currentTheme === "light" && brightness > 225) return "#111827";
  return color;
}

function getPlatformTone(platform) {
  const base = platform?.color || "#2563eb";
  return {
    base,
    text: getReadablePlatformColor(base),
    softBg: alphaColor(base, currentTheme === "dark" ? 0.18 : 0.12),
    softBorder: alphaColor(base, currentTheme === "dark" ? 0.34 : 0.2)
  };
}

function getPlatformVisualColor(platform, alpha = null) {
  const base = platform?.color || "#2563eb";
  const rgb = hexToRgb(base);
  const brightness = rgb ? ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000 : 255;
  const visibleBase = currentTheme === "dark" && brightness < 72 ? "#f3f4f6" : base;
  return alpha === null ? visibleBase : alphaColor(visibleBase, alpha);
}

function normalizeAuth(auth) {
  const username = String(auth?.username || "").trim();
  if (!username) return null;
  
  // Aceitar tanto "local" quanto "google" (para migração)
  const provider = auth?.provider === "google" ? "local" : (auth?.provider || "local");
  
  return {
    provider,
    username,
    password: String(auth.password || "")
  };
}

function isLocalAuth() {
  return (state.auth?.provider || "local") === "local";
}

function isSessionActive() {
  if (!sessionUser || !state.auth?.username) return false;
  return sessionUser.username === state.auth.username
    && (sessionUser.provider || "local") === "local"
    && Boolean(sessionUser.serverSessionToken);
}

function getDefaultMonth() {
  return ALL_MONTHS[new Date().getMonth()];
}

function defaultState() {
  return {
    auth: null,
    platforms: [],
    db: {},
    currentMonth: getDefaultMonth(),
    pricing: clone(PRICING_DEFAULTS),
    currentScreen: "hub"
  };
}

function getPlatforms() {
  return Array.isArray(state.platforms) ? state.platforms : [];
}

function getPricingPreset(platform) {
  const candidates = [
    slugifyText(platform?.name),
    slugifyText((platform?.name || "").replace(/\s+/g, "-")),
    slugifyText(platform?.key)
  ];
  return candidates.map((key) => MARKETPLACE_PRICING_PRESETS[key]).find(Boolean) || null;
}

function normalizeFeeTiers(feeTiers = []) {
  if (!Array.isArray(feeTiers)) return [];
  return feeTiers
    .map((tier) => ({
      min: Number(tier.min ?? 0),
      max: tier.max === null || tier.max === undefined || tier.max === "" ? null : Number(tier.max),
      commissionRate: Number(tier.commissionRate || 0),
      fixedFee: Number(tier.fixedFee || 0)
    }))
    .filter((tier) => Number.isFinite(tier.min) && Number.isFinite(tier.commissionRate) && Number.isFinite(tier.fixedFee))
    .sort((a, b) => a.min - b.min);
}

function normalizePricingProfile(platform, profile = {}) {
  const preset = getPricingPreset(platform) || {};
  const isCustom = profile.sourceType === "custom";
  const source = isCustom ? profile : { ...profile, ...preset };
  return {
    commissionRate: Number(source.commissionRate ?? 0),
    transactionRate: Number(source.transactionRate ?? 0),
    fixedFee: Number(source.fixedFee ?? 0),
    extraShippingCost: Number(source.extraShippingCost ?? 0),
    feeTiers: normalizeFeeTiers(source.feeTiers),
    sourceType: String(source.sourceType || "custom"),
    note: String(source.note || "Personalize com os custos reais da sua operação.")
  };
}

function normalizePricing(pricing = {}, platforms = getPlatforms()) {
  const next = {
    productCost: Number(pricing.productCost || 0),
    packagingCost: Number(pricing.packagingCost || 0),
    extraCost: Number(pricing.extraCost || 0),
    shippingSubsidy: Number(pricing.shippingSubsidy || 0),
    targetMargin: Number(pricing.targetMargin || 0),
    targetProfit: Number(pricing.targetProfit || 0),
    manualPrice: Number(pricing.manualPrice || 0),
    mode: pricing.mode === "profit" ? "profit" : "margin",
    profiles: {}
  };
  platforms.forEach((platform) => {
    next.profiles[platform.key] = normalizePricingProfile(platform, pricing.profiles?.[platform.key] || {});
  });
  return next;
}

function slugifyText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalizePlatformKey(value) {
  const normalized = slugifyText(value);
  return LEGACY_PLATFORM_KEY_ALIASES[normalized] || normalized;
}

function getPlatformKeyCandidates(platformOrKey) {
  const rawKey = typeof platformOrKey === "string" ? platformOrKey : platformOrKey?.key;
  const rawName = typeof platformOrKey === "string" ? "" : platformOrKey?.name;
  const canonicalKey = canonicalizePlatformKey(rawKey || rawName);
  const candidates = new Set([canonicalKey]);

  Object.entries(LEGACY_PLATFORM_KEY_ALIASES).forEach(([alias, target]) => {
    if (target === canonicalKey) candidates.add(alias);
  });

  const normalizedName = slugifyText(rawName);
  if (normalizedName) candidates.add(normalizedName);

  return [...candidates].filter(Boolean);
}

/*function normalizeMonthName(month) {
  const normalized = String(month || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ã§/g, "c")
    .replace(/Ã/g, "a");
  const matched = ALL_MONTHS.find((item) => item.toLowerCase() === normalized.toLowerCase());
  return matched || normalized || getDefaultMonth();
}*/

function normalizeMonthName(month) {
  const raw = String(month || "").trim();
  if (!raw) return getDefaultMonth();

  const normalized = raw
    .replace(/MarÃ§o/gi, "Marco")
    .replace(/Marã§o/gi, "Marco")
    .replace(/Ã§/gi, "c")
    .replace(/Ã£/gi, "a")
    .replace(/Ã¡|Ã¢|Ãà|Ãä/gi, "a")
    .replace(/Ã©|Ãê|Ãè|Ãë/gi, "e")
    .replace(/Ãí|Ãì|Ãî|Ãï/gi, "i")
    .replace(/Ã³|Ãò|Ãô|Ãö/gi, "o")
    .replace(/Ãº|Ãù|Ãû|Ãü/gi, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();

  const matched = ALL_MONTHS.find((item) => item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalized);
  return matched || raw || getDefaultMonth();
}

function inferPlatformsFromLegacyData(data) {
  const keySet = new Set();
  Object.values(data || {}).forEach((monthData) => {
    (monthData?.days || []).forEach((day) => {
      Object.keys(day || {}).forEach((key) => {
        if (key !== "d") keySet.add(key);
      });
    });
    Object.keys(monthData?.returns || {}).forEach((key) => keySet.add(key));
  });

  return [...keySet].map((key, index) => {
    const preset = LEGACY_PLATFORM_PRESETS[key] || {};
    return normalizePlatform({
      key,
      name: preset.name || key.toUpperCase(),
      icon: preset.icon || key.toUpperCase().slice(0, 2),
      color: preset.color || BRAND_COLORS[index % BRAND_COLORS.length],
      iconText: preset.iconText || "#ffffff"
    }, index);
  });
}

function inferPlatformsFromDb(data) {
  return inferPlatformsFromLegacyData(data);
}

function convertLegacyBackup(payload) {
  const dashboardData = payload?.dashboardData || {};
  const platforms = inferPlatformsFromLegacyData(dashboardData);
  const db = {};
  const normalizedMonths = Object.keys(dashboardData).map((month) => {
    const normalized = normalizeMonthName(month);
    db[normalized] = dashboardData[month];
    return normalized;
  });

  return {
    auth: null,
    platforms,
    db,
    currentMonth: payload?.currentMonth ? normalizeMonthName(payload.currentMonth) : (normalizedMonths[normalizedMonths.length - 1] || getDefaultMonth())
  };
}

function mergeImportedState(restoredState) {
  const existingPlatforms = getPlatforms();
  const mergedPlatforms = [...existingPlatforms];

  restoredState.platforms.forEach((platform) => {
    if (!mergedPlatforms.some((item) => item.key === platform.key)) {
      mergedPlatforms.push(platform);
    }
  });

  state.platforms = mergedPlatforms;

  Object.keys(restoredState.db || {}).forEach((month) => {
    const normalizedMonth = normalizeMonthName(month);
    if (!state.db[normalizedMonth]) {
      state.db[normalizedMonth] = normalizeMonthData(restoredState.db[month]);
      return;
    }

    const currentMonthData = state.db[normalizedMonth];
    const importedMonthData = normalizeMonthData(restoredState.db[month]);
    const daysByDate = new Map(currentMonthData.days.map((day) => [day.d, day]));

    importedMonthData.days.forEach((importedDay) => {
      if (!daysByDate.has(importedDay.d)) {
        currentMonthData.days.push(importedDay);
        return;
      }

      const existingDay = daysByDate.get(importedDay.d);
      state.platforms.forEach((platform) => {
        const currentValue = Number(existingDay[platform.key] || 0);
        const importedValue = Number(importedDay[platform.key] || 0);
        if (currentValue === 0 && importedValue > 0) existingDay[platform.key] = importedValue;
        const ordersKey = `orders_${platform.key}`;
        const currentOrders = Math.max(0, Math.round(Number(existingDay[ordersKey] || 0)));
        const importedOrders = Math.max(0, Math.round(Number(importedDay[ordersKey] || 0)));
        if (currentOrders === 0 && importedOrders > 0) existingDay[ordersKey] = importedOrders;
      });
    });

    state.platforms.forEach((platform) => {
      const currentReturn = Number(currentMonthData.returns?.[platform.key] || 0);
      const importedReturn = Number(importedMonthData.returns?.[platform.key] || 0);
      currentMonthData.returns[platform.key] = Math.max(currentReturn, importedReturn);
    });

    currentMonthData.days = sortDays(currentMonthData.days.map((day) => normalizeDay(day)));
  });

  if (restoredState.currentMonth && state.db[restoredState.currentMonth]) {
    state.currentMonth = restoredState.currentMonth;
  } else if (!state.db[state.currentMonth]) {
    state.currentMonth = Object.keys(state.db).pop() || getDefaultMonth();
  }

  ensureMonthData(state.currentMonth);
}

function normalizePlatform(platform = {}, index = 0) {
  const name = String(platform.name || "").trim();
  const short = String(platform.icon || platform.short || name.slice(0, 2) || `P${index + 1}`)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  const normalizedColor = String(platform.color || "").trim();
  const color = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(normalizedColor)
    ? normalizedColor
    : BRAND_COLORS[index % BRAND_COLORS.length];
  return {
    key: String(canonicalizePlatformKey(platform.key || name || `plataforma-${index + 1}`)).slice(0, 20) || `plataforma-${index + 1}`,
    name: name || `Plataforma ${index + 1}`,
    color,
    icon: short || `P${index + 1}`,
    iconText: platform.iconText || "#ffffff"
  };
}

function ensureMonthData(month) {
  if (!state.db[month]) {
    const returns = {};
    getPlatforms().forEach((platform) => {
      returns[platform.key] = 0;
    });
    state.db[month] = { days: [], returns };
  }
  getPlatforms().forEach((platform) => {
    if (state.db[month].returns[platform.key] === undefined) state.db[month].returns[platform.key] = 0;
  });
}

function normalizeDay(day = {}, platforms = getPlatforms()) {
  const normalized = {
    d: day.d || ""
  };
  // legacy global orders field — distribute to first platform that has sales, if no per-platform data exists
  const legacyOrders = Math.max(0, Math.round(Number(day.orders ?? day.pedidos ?? 0)));
  const hasAnyPerPlatformOrders = platforms.some((platform) => getPlatformKeyCandidates(platform).some((candidate) => Number(day[`orders_${candidate}`] || 0) > 0));
  const firstActivePlatform = platforms.find((platform) => getPlatformKeyCandidates(platform).some((candidate) => Number(day[candidate] || 0) > 0)) || platforms[0];
  platforms.forEach((platform) => {
    const keyCandidates = getPlatformKeyCandidates(platform);
    normalized[platform.key] = keyCandidates.reduce((sum, candidate) => sum + Number(day[candidate] || 0), 0);
    const ordersKey = `orders_${platform.key}`;
    let ordersVal = keyCandidates.reduce((sum, candidate) => sum + Math.max(0, Math.round(Number(day[`orders_${candidate}`] || 0))), 0);
    // migrate legacy once
    if (!hasAnyPerPlatformOrders && legacyOrders > 0 && firstActivePlatform && platform.key === firstActivePlatform.key) {
      ordersVal = legacyOrders;
    }
    normalized[ordersKey] = ordersVal;
  });
  return normalized;
}

function sortDays(days) {
  return [...days].sort((a, b) => {
    const [da, ma] = (a.d || "").split("/").map(Number);
    const [db, mb] = (b.d || "").split("/").map(Number);
    if (ma !== mb) return ma - mb;
    return da - db;
  });
}

function normalizeMonthData(monthData = {}, platforms = getPlatforms()) {
  const days = Array.isArray(monthData.days) ? monthData.days.map((day) => normalizeDay(day, platforms)) : [];
  const returns = {};
  platforms.forEach((platform) => {
    returns[platform.key] = getPlatformKeyCandidates(platform).reduce((sum, candidate) => sum + Number((monthData.returns || {})[candidate] || 0), 0);
  });
  return { days: sortDays(days), returns };
}

function ensureStateMonths(targetState) {
  if (!targetState.platforms.length) return;
  const currentMonth = targetState.currentMonth || getDefaultMonth();
  if (!targetState.db[currentMonth]) {
    const returns = {};
    targetState.platforms.forEach((platform) => {
      returns[platform.key] = 0;
    });
    targetState.db[currentMonth] = { days: [], returns };
  }
}

function normalizeState(raw) {
  const base = defaultState();
  const rawDb = raw?.db || {};
  const normalizedPlatforms = Array.isArray(raw?.platforms) && raw.platforms.length
    ? raw.platforms.map((platform, index) => normalizePlatform(platform, index))
    : inferPlatformsFromDb(rawDb);
  const next = {
    auth: normalizeAuth(raw?.auth),
    platforms: normalizedPlatforms,
    db: {},
    currentMonth: raw?.currentMonth || base.currentMonth,
    pricing: clone(PRICING_DEFAULTS),
    currentScreen: isKnownAppScreen(raw?.currentScreen) ? raw.currentScreen : "hub"
  };

  Object.keys(rawDb).forEach((month) => {
    next.db[month] = rawDb[month];
  });

  if (!next.platforms.length && !Object.keys(next.db).length) {
    next.db = {};
    next.currentMonth = base.currentMonth;
  } else {
    Object.keys(next.db).forEach((month) => {
      next.db[month] = normalizeMonthData(next.db[month], next.platforms);
    });
    if (!next.db[next.currentMonth]) {
      const months = Object.keys(next.db);
      next.currentMonth = months[months.length - 1] || base.currentMonth;
    }
    ensureStateMonths(next);
  }

  next.pricing = normalizePricing(raw?.pricing || base.pricing, next.platforms);

  return next;
}

function loadState() {
  try {
    const authRaw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      const next = defaultState();
      next.auth = normalizeAuth(parsed.auth);
      next.currentScreen = isKnownAppScreen(parsed.currentScreen) ? parsed.currentScreen : "hub";
      return next;
    }
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_BACKUP_KEY);
    if (!raw) return defaultState();
    const legacy = normalizeState(JSON.parse(raw));
    return { ...defaultState(), auth: legacy.auth, currentScreen: legacy.currentScreen || "hub" };
  } catch (error) {
    try {
      const backupRaw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (backupRaw) return normalizeState(JSON.parse(backupRaw));
    } catch (backupError) {
      console.error("Falha ao carregar backup local:", backupError);
    }
    console.error("Falha ao carregar credenciais locais:", error);
    return defaultState();
  }
}

function saveState(options = {}) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    auth: state.auth,
    currentScreen: state.currentScreen || activeAppScreen
  }));
  const savedAt = new Date().toISOString();
  localStorage.setItem(LAST_SAVED_KEY, savedAt);
  if (state.auth?.username) {
    const baseMessage = getPlatforms().length
      ? `Dados no servidor de ${state.auth.username}`
      : `Dados no servidor de ${state.auth.username} · cadastre plataformas em "Plataformas"`;
    const stamp = formatSavedAt(savedAt);
    setStorageStatus(stamp ? `${baseMessage} · salvo em ${stamp}` : baseMessage);
  }
  if (!options.localOnly && isSessionActive()) scheduleServerSave();
}

function getBusinessSnapshot() {
  const normalized = normalizeState(clone(state));
  return {
    platforms: normalized.platforms,
    db: normalized.db,
    currentMonth: normalized.currentMonth,
    currentScreen: normalized.currentScreen,
    pricing: normalized.pricing
  };
}

function loadLegacyBusinessState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_BACKUP_KEY);
    if (!raw) return null;
    const legacy = normalizeState(JSON.parse(raw));
    return legacy.platforms.length || Object.keys(legacy.db || {}).length ? legacy : null;
  } catch (error) {
    console.error("Falha ao ler dados locais legados:", error);
    return null;
  }
}

async function migrateFromGoogleBackup(backupData) {
  console.log("Migrando backup do Google para formato local...");
  
  // Extrair dados essenciais
  const state = backupData.state || {};
  
  // Configurar auth como local
  if (state.auth?.username) {
    state.auth.provider = "local";
    
    // Remover campos do Google
    delete state.auth.googleEmail;
    delete state.auth.googleName;
    delete state.auth.googlePicture;
    delete state.auth.googleSub;
    delete state.auth.googleDriveFileId;
    delete state.auth.googleDriveModifiedTime;
    delete state.auth.googleDriveLastAction;
    delete state.auth.googleDriveAuthorized;
  }
  
  // Registrar usuário no servidor se necessário
  if (state.auth?.username && state.auth?.password) {
    try {
      await readBackendJson("/api/auth/migrate-local", {
        method: "POST",
        requiresAuth: false,
        body: JSON.stringify({
          username: state.auth.username,
          password: state.auth.password || "migrate123" // Senha temporária
        })
      });
    } catch (error) {
      console.warn("Não foi possível migrar usuário:", error);
    }
  }
  
  return backupData;
}

function applyBusinessState(serverState = {}) {
  const normalized = normalizeState({
    ...serverState,
    auth: state.auth,
    currentMonth: serverState.currentMonth || state.currentMonth || getDefaultMonth(),
    currentScreen: serverState.currentScreen || state.currentScreen || "hub",
    pricing: serverState.pricing || state.pricing
  });
  state.platforms = normalized.platforms;
  state.db = normalized.db;
  state.currentMonth = normalized.currentMonth;
  state.pricing = normalized.pricing;
  state.currentScreen = normalized.currentScreen;
  activeAppScreen = state.currentScreen || "hub";
  ensureStateMonths(state);
}

// Substitua a função loadBusinessStateFromServer (linhas ~850)
async function loadBusinessStateFromServer({ migrateLocal = false } = {}) {
  if (!isSessionActive()) return false;
  
  try {
    const result = await readBackendJson("/api/state");
    const remote = result?.state || {};
    const remoteHasBusiness = Array.isArray(remote.platforms) && remote.platforms.length;
    
    if (!remoteHasBusiness && migrateLocal) {
      const legacy = loadLegacyBusinessState();
      if (legacy) {
        state.platforms = legacy.platforms;
        state.db = legacy.db;
        state.currentMonth = legacy.currentMonth;
        state.pricing = legacy.pricing;
        state.currentScreen = legacy.currentScreen || state.currentScreen || "hub";
        saveState();
        return true;
      }
    }
    
    applyBusinessState(remote);
    saveState({ localOnly: true });
    return true;
  } catch (error) {
    console.error("Falha ao carregar dados do servidor:", error);
    
    // Se der 401, tenta usar dados locais
    if (error?.message?.includes('401') || error?.message?.includes('unauthorized')) {
      console.log("Sessão inválida, tentando dados locais...");
      const legacy = loadLegacyBusinessState();
      if (legacy) {
        applyBusinessState(legacy);
        return true;
      }
      clearSession();
      renderScreen();
      return false;
    }
    
    toast("Não foi possível carregar os dados do servidor");
    return false;
  }
}

// Adicionar após a função loadBusinessStateFromServer
function debugState() {
  console.log("=== DEBUG STATE ===");
  console.log("Auth:", state.auth);
  console.log("Platforms:", state.platforms);
  console.log("Current Month:", state.currentMonth);
  console.log("DB Keys:", Object.keys(state.db || {}));
  console.log("Current Screen:", state.currentScreen);
  console.log("Session:", sessionUser);
  console.log("isSessionActive:", isSessionActive());
  console.log("isSetupComplete:", isSetupComplete());
  console.log("==================");
}

// Adicionar após a função readBackendJson (linha ~702)
async function validateServerSession() {
  if (!isSessionActive()) return false;
  try {
    await readBackendJson("/api/auth/session", {
      requiresAuth: false,
      headers: {
        Authorization: `Bearer ${getServerSessionToken()}`
      }
    });
    return true;
  } catch (error) {
    console.warn("Sessão inválida ou expirada:", error);
    return false;
  }
}

function scheduleServerSave() {
  clearTimeout(serverSaveTimer);
  serverSaveTimer = setTimeout(() => {
    void persistBusinessStateToServer();
  }, 150);
}

async function persistBusinessStateToServer() {
  if (!isSessionActive()) return;
  if (serverSaveInFlight) {
    serverSaveQueued = true;
    return;
  }
  serverSaveInFlight = true;
  try {
    await readBackendJson("/api/state", {
      method: "POST",
      body: JSON.stringify({ state: getBusinessSnapshot() })
    });
    if (state.auth?.username) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ auth: state.auth }));
} else {
  localStorage.removeItem(STORAGE_KEY);
}
localStorage.removeItem(STORAGE_BACKUP_KEY);
  } catch (error) {
    console.error("Falha ao salvar no servidor:", error);
    toast("Nao foi possivel salvar no servidor");
  } finally {
    serverSaveInFlight = false;
    if (serverSaveQueued) {
      serverSaveQueued = false;
      void persistBusinessStateToServer();
    }
  }
}

function loadTheme() {
  // Alterar de "light" para "dark" como padrão
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" ? "light" : "dark";
}

function applyTheme() {
  document.body.classList.toggle("light-theme", currentTheme === "light");
  // Adicionar classe dark-theme explicitamente
  document.body.classList.toggle("dark-theme", currentTheme === "dark");
  
  const button = document.getElementById("themeToggleButton");
  if (button) {
    button.textContent = currentTheme === "light" ? "☾" : "☀";
    button.setAttribute("aria-label", currentTheme === "light" ? "Ativar modo escuro" : "Ativar modo claro");
    button.title = currentTheme === "light" ? "Modo Escuro" : "Modo Claro";
  }
}

function saveTheme() {
  localStorage.setItem(THEME_KEY, currentTheme);
}

function formatSavedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function loadLastSavedAt() {
  return localStorage.getItem(LAST_SAVED_KEY) || "";
}

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_BACKUP_KEY);
    if (!raw) return null;
    const parsed = normalizeState(JSON.parse(raw));
    return parsed.auth?.username ? parsed.auth : null;
  } catch (error) {
    console.error("Falha ao verificar usuário salvo:", error);
    return null;
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.username || !parsed?.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    if (Date.now() > Number(parsed.expiresAt)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    const serverSessionToken = String(parsed.serverSessionToken || "").trim();
    if (!serverSessionToken) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return {
      username: String(parsed.username),
      provider: "local",
      serverSessionToken
    };
  } catch (error) {
    const legacySession = localStorage.getItem(SESSION_KEY) || "";
    if (!legacySession) return null;
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

// Adicione após a função loadSession()
function refreshSessionIfNeeded() {
  if (!isSessionActive()) return;
  
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  
  try {
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const expiresAt = Number(parsed.expiresAt);
    
    // Se faltar menos de 30 dias para expirar, renova
    if (expiresAt - now < 30 * 24 * 60 * 60 * 1000) {
      const newExpiresAt = now + SESSION_DURATION_MS;
      parsed.expiresAt = newExpiresAt;
      localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
      console.log("Sessão renovada até:", new Date(newExpiresAt).toLocaleDateString());
    }
  } catch (error) {
    console.warn("Falha ao renovar sessão:", error);
  }
}

function saveSession(username, provider = "local", serverSessionToken = sessionUser?.serverSessionToken || "") {
  const safeToken = String(serverSessionToken || "").trim();
  sessionUser = {
    username,
    provider: "local",
    serverSessionToken: safeToken
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    username,
    provider: sessionUser.provider,
    serverSessionToken: safeToken,
    expiresAt: Date.now() + SESSION_DURATION_MS
  }));
}function saveSession(username, provider = "local", serverSessionToken = sessionUser?.serverSessionToken || "") {
  const safeToken = String(serverSessionToken || "").trim();
  sessionUser = {
    username,
    provider: "local",
    serverSessionToken: safeToken
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    username,
    provider: sessionUser.provider,
    serverSessionToken: safeToken,
    expiresAt: Date.now() + SESSION_DURATION_MS
  }));
}

function clearSession() {
  sessionUser = null;
  localStorage.removeItem(SESSION_KEY);
}

function getServerSessionToken() {
  return String(sessionUser?.serverSessionToken || "").trim();
}

async function readBackendJson(path, options = {}) {
  const serverSessionToken = getServerSessionToken();
  const extraHeaders = options.requiresAuth === false || !serverSessionToken
    ? {}
    : { Authorization: `Bearer ${serverSessionToken}` };
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...extraHeaders,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = null;
  }
  if (!response.ok) {
    throw new Error(data?.error || `backend_request_failed_${response.status}`);
  }
  return data;
}

async function migrateLegacyLocalAuthIfNeeded() {
  if (!state.auth?.username || !isLocalAuth() || !state.auth?.password) return false;
  try {
    await readBackendJson("/api/auth/migrate-local", {
      method: "POST",
      requiresAuth: false,
      body: JSON.stringify({
        username: state.auth.username,
        password: state.auth.password
      })
    });
    state.auth = normalizeAuth({
      ...state.auth,
      password: ""
    });
    saveState();
    return true;
  } catch (error) {
    console.error("Falha ao migrar acesso local legado:", error);
    return false;
  }
}

function renderAuthUi() {
  const authHint = document.getElementById("authHint");
  const changePasswordButton = document.getElementById("changePasswordButton");
  if (authHint) authHint.textContent = "Ao entrar, seus dados ficam salvos no servidor do app.";
  if (changePasswordButton) changePasswordButton.hidden = !isLocalAuth();
}

function closeHeaderMenu() {
  const menu = document.getElementById("headerMenu");
  const button = document.getElementById("menuToggleButton");
  if (!menu || !button) return;
  clearTimeout(headerMenuCloseTimer);
  menu.classList.remove("open");
  button.setAttribute("aria-expanded", "false");
  headerMenuCloseTimer = setTimeout(() => {
    menu.hidden = true;
  }, 180);
}

function toggleHeaderMenu() {
  const menu = document.getElementById("headerMenu");
  const button = document.getElementById("menuToggleButton");
  if (!menu || !button) return;
  const willOpen = menu.hidden;
  if (!willOpen) {
    closeHeaderMenu();
    return;
  }
  clearTimeout(headerMenuCloseTimer);
  menu.hidden = false;
  requestAnimationFrame(() => {
    menu.classList.add("open");
    button.setAttribute("aria-expanded", "true");
  });
}

function getPlatformByKey(key) {
  return getPlatforms().find((platform) => platform.key === key) || null;
}

function resetPlatformForm() {
  editingPlatformKey = null;
  const nameInput = document.getElementById("platformName");
  const shortInput = document.getElementById("platformShort");
  const colorInput = document.getElementById("platformColor");
  const button = document.getElementById("addPlatformConfigButton");
  const cancelButton = document.getElementById("cancelPlatformEditButton");
  if (nameInput) nameInput.value = "";
  if (shortInput) shortInput.value = "";
  if (colorInput) colorInput.value = BRAND_COLORS[getPlatforms().length % BRAND_COLORS.length];
  if (button) button.textContent = "Adicionar Plataforma";
  if (cancelButton) cancelButton.hidden = true;
}

function startPlatformEdit(key) {
  const platform = getPlatformByKey(key);
  if (!platform) return;
  editingPlatformKey = key;
  document.getElementById("platformName").value = platform.name;
  document.getElementById("platformShort").value = platform.icon;
  document.getElementById("platformColor").value = platform.color;
  document.getElementById("addPlatformConfigButton").textContent = "Salvar Edicao";
  document.getElementById("cancelPlatformEditButton").hidden = false;
}

function updateImportModeUI() {
  document.querySelectorAll("[data-import-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.importMode === pendingImportMode);
  });
}

function applyTheme() {
  document.body.classList.toggle("light-theme", currentTheme === "light");
  document.body.classList.toggle("dark-theme", currentTheme === "dark");
  const button = document.getElementById("themeToggleButton");
  if (button) {
    button.textContent = currentTheme === "light" ? "☾" : "☀";
    button.setAttribute("aria-label", currentTheme === "light" ? "Ativar modo escuro" : "Ativar modo claro");
    button.title = currentTheme === "light" ? "Modo Escuro" : "Modo Claro";
  }
}

function toggleTheme() {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  saveTheme();
  applyTheme();
}

function getReturnRate(returns, sales) {
  if (!sales) return 0;
  return (returns / sales) * 100;
}

function getMonthDays(month) {
  const monthIndex = ALL_MONTHS.indexOf(month);
  if (monthIndex < 0) return 30;
  return new Date(getCurrentYear(), monthIndex + 1, 0).getDate();
}

function getMonthIndexByName(month) {
  return ALL_MONTHS.indexOf(month);
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getSuggestedInputDate(month) {
  const monthIndex = getMonthIndexByName(month);
  if (monthIndex < 0) return "";
  const today = new Date();
  const day = Math.min(today.getDate(), getMonthDays(month));
  const monthNum = String(monthIndex + 1).padStart(2, "0");
  const dayNum = String(day).padStart(2, "0");
  return `${getCurrentYear()}-${monthNum}-${dayNum}`;
}

function syncSaleDateWithMonth(silent = false) {
  const month = document.getElementById("inputMonth")?.value || state.currentMonth;
  const dateInput = document.getElementById("inputDate");
  if (!dateInput) return;
  const suggested = getSuggestedInputDate(month);
  if (dateInput.value !== suggested) {
    dateInput.value = suggested;
  }
}

function getWeekBuckets(monthName, days) {
  const monthIndex = getMonthIndexByName(monthName);
  if (monthIndex < 0) return [];

  const totalDays = getMonthDays(monthName);
  const firstWeekday = new Date(getCurrentYear(), monthIndex, 1).getDay();
  const ranges = [];
  let startDay = 1;
  let firstWeekLength = 7 - firstWeekday;
  if (firstWeekLength <= 0 || firstWeekday === 0) firstWeekLength = 7;

  while (startDay <= totalDays) {
    const weekLength = ranges.length === 0 ? firstWeekLength : 7;
    const endDay = Math.min(totalDays, startDay + weekLength - 1);
    ranges.push({ startDay, endDay, total: 0 });
    startDay = endDay + 1;
  }

  days.forEach((day) => {
    const dayNumber = Number((day.d || "").split("/")[0]);
    if (!dayNumber) return;
    const bucket = ranges.find((item) => dayNumber >= item.startDay && dayNumber <= item.endDay);
    if (!bucket) return;
    const dayTotal = getPlatforms().reduce((sum, platform) => sum + Number(day[platform.key] || 0), 0);
    bucket.total += dayTotal;
  });

  return ranges.map((bucket, index) => ({
    index,
    total: bucket.total,
    label: bucket.startDay === bucket.endDay ? `${bucket.startDay}` : `${bucket.startDay}-${bucket.endDay}`,
    shortLabel: `${index + 1}a sem.`
  }));
}

function getLoggedDays(month) {
  const data = state.db[month];
  if (!data) return 0;
  return data.days.filter((day) => getPlatforms().some((platform) => Number(day[platform.key] || 0) > 0)).length;
}

function getDayNumber(value) {
  const dayNumber = Number(String(value || "").split("/")[0]);
  return Number.isFinite(dayNumber) ? dayNumber : 0;
}

function getLastLoggedDay(month) {
  const data = state.db[month];
  if (!data?.days?.length) return 0;
  return data.days.reduce((maxDay, day) => {
    const hasSales = getPlatforms().some((platform) => Number(day[platform.key] || 0) > 0);
    if (!hasSales) return maxDay;
    return Math.max(maxDay, getDayNumber(day.d));
  }, 0);
}

function calcTotals(month, options = {}) {
  const data = state.db[month];
  if (!data) return null;
  const cutoffDay = Math.max(0, Number(options.cutoffDay || 0));
  const filteredDays = cutoffDay > 0
    ? data.days.filter((day) => {
      const dayNumber = getDayNumber(day.d);
      return dayNumber > 0 && dayNumber <= cutoffDay;
    })
    : data.days;
  const sales = {};
  getPlatforms().forEach((platform) => {
    sales[platform.key] = filteredDays.reduce((sum, day) => sum + Number(day[platform.key] || 0), 0);
  });
  const ordersByPlatform = {};
  getPlatforms().forEach((platform) => {
    ordersByPlatform[platform.key] = filteredDays.reduce((sum, day) => sum + Math.max(0, Math.round(Number(day[`orders_${platform.key}`] || 0))), 0);
  });
  const orders = getPlatforms().reduce((sum, platform) => sum + (ordersByPlatform[platform.key] || 0), 0);
  const fullSales = {};
  getPlatforms().forEach((platform) => {
    fullSales[platform.key] = data.days.reduce((sum, day) => sum + Number(day[platform.key] || 0), 0);
  });
  const ret = {};
  getPlatforms().forEach((platform) => {
    const totalReturns = Number((data.returns || {})[platform.key] || 0);
    if (!cutoffDay || cutoffDay >= getMonthDays(month)) {
      ret[platform.key] = totalReturns;
      return;
    }
    const fullValue = Number(fullSales[platform.key] || 0);
    const partialValue = Number(sales[platform.key] || 0);
    const share = fullValue > 0 ? Math.min(partialValue / fullValue, 1) : 0;
    ret[platform.key] = totalReturns * share;
  });
  const gross = getPlatforms().reduce((sum, platform) => sum + Number(sales[platform.key] || 0), 0);
  const totalRet = getPlatforms().reduce((sum, platform) => sum + Number(ret[platform.key] || 0), 0);
  return { sales, ret, gross, totalRet, net: gross - totalRet, orders, ordersByPlatform };
}

function getComparisonPeriod(month) {
  // Ordenar meses em ordem cronológica (Janeiro → Dezembro)
  const sortedMonths = Object.keys(state.db).sort((a, b) => {
    return ALL_MONTHS.indexOf(a) - ALL_MONTHS.indexOf(b);
  });
  
  // Encontrar o mês anterior na ordem cronológica
  const currentIndex = sortedMonths.indexOf(month);
  const previousName = currentIndex > 0 ? sortedMonths[currentIndex - 1] : null;
  
  const cutoffDay = getLastLoggedDay(month);
  return {
    previousName,
    cutoffDay,
    currentTotals: calcTotals(month),
    previousTotals: previousName
      ? calcTotals(previousName, { cutoffDay: cutoffDay || 0 })
      : null
  };
}

function calcProjection(month) {
  const totals = calcTotals(month);
  if (!totals) return null;
  const loggedDays = getLoggedDays(month);
  const monthDays = getMonthDays(month);
  const salesDailyAverage = loggedDays > 0 ? totals.gross / loggedDays : 0;
  const ordersDailyAverage = loggedDays > 0 ? totals.orders / loggedDays : 0;
  const returnsDailyAverage = loggedDays > 0 ? totals.totalRet / loggedDays : 0;
  const projectedGross = salesDailyAverage * monthDays;
  const projectedOrders = ordersDailyAverage * monthDays;
  const projectedReturns = returnsDailyAverage * monthDays;
  const platforms = getPlatforms().map((platform) => {
    const realizedGross = Number(totals.sales[platform.key] || 0);
    const dailyAverage = loggedDays > 0 ? realizedGross / loggedDays : 0;
    return {
      key: platform.key,
      realizedGross,
      dailyAverage,
      projectedGross: dailyAverage * monthDays
    };
  });
  return {
    loggedDays,
    monthDays,
    salesDailyAverage,
    ordersDailyAverage,
    returnsDailyAverage,
    projectedGross,
    projectedOrders,
    projectedReturns,
    projectedNet: projectedGross - projectedReturns,
    platforms,
    currentReturnRate: getReturnRate(totals.totalRet, totals.gross),
    projectedReturnRate: getReturnRate(projectedReturns, projectedGross)
  };
}

function prevMonth(month) {
  const months = Object.keys(state.db);
  const index = months.indexOf(month);
  return index > 0 ? months[index - 1] : null;
}

function varH(current, previous) {
  if (previous === null || previous === undefined || previous === 0) return dash;
  const diff = ((current - previous) / previous) * 100;
  const cls = diff >= 0 ? "up" : "down";
  const arrow = diff >= 0 ? "↑" : "↓";
  return `<span class="${cls}">${arrow} ${Math.abs(diff).toFixed(1)}%</span>`;
}

function platformIcon(platform) {
  const label = String(platform?.icon || platform?.name || "").slice(0, 2).toUpperCase();
  if (!label) return "";
  const textColor = platform?.iconText || "#ffffff";
  return `<span class="platform-icon platform-icon-text" style="background:${escapeAttribute(platform?.color || "#2563eb")};color:${escapeAttribute(textColor)}">${escapeHtml(label)}</span>`;
}

function platformBadge(platform, shortName = false) {
  const label = shortName ? platform.name.split(" ")[0] : platform.name;
  return `<span class="platform-badge">${platformIcon(platform)}<span>${escapeHtml(label)}</span></span>`;
}

function destroyCharts() {
  if (dailyChart) {
    dailyChart.destroy();
    dailyChart = null;
  }
  if (donutChart) {
    donutChart.destroy();
    donutChart = null;
  }
}

function isSetupComplete() {
  return getPlatforms().length > 0;
}

function setActiveAppScreen(screen) {
  activeAppScreen = isKnownAppScreen(screen) ? screen : "hub";
  state.currentScreen = activeAppScreen;
}

// Modificar a função renderScreen() para garantir que os dados estejam disponíveis
function renderScreen() {
  const authScreen = document.getElementById("authScreen");
  const setupScreen = document.getElementById("setupScreen");
  const hubScreen = document.getElementById("hubScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");
  const calculatorScreen = document.getElementById("calculatorScreen");
  const dailyCloseScreen = document.getElementById("dailyCloseScreen");
  const hasAuth = Boolean(state.auth?.username);
  const isLoggedIn = Boolean(hasAuth && isSessionActive());

  if (isLoggedIn) saveSession(sessionUser.username, sessionUser.provider);

  authScreen.hidden = hasAuth && isLoggedIn;
  setupScreen.hidden = true;
  hubScreen.hidden = true;
  dashboardScreen.hidden = true;
  calculatorScreen.hidden = true;
  dailyCloseScreen.hidden = true;

  if (!hasAuth || !isLoggedIn) {
    destroyCharts();
    renderAuthScreen();
    setActiveAppScreen("hub");
  } else if (!isSetupComplete()) {
    setupScreen.hidden = false;
    renderSetupScreen();
    console.log("Setup screen - Platforms:", getPlatforms().length);
  } else if (activeAppScreen === "dashboard") {
    dashboardScreen.hidden = false;
    // CORREÇÃO: Garantir que o mês atual exista antes de renderizar
    ensureStateMonths(state);
    renderDashboardShell();
  } else if (activeAppScreen === "calculator") {
    calculatorScreen.hidden = false;
    renderCalculatorScreen();
  } else if (activeAppScreen === "dailyClose") {
    dailyCloseScreen.hidden = false;
    renderDailyCloseScreen();
  } else {
    hubScreen.hidden = false;
    renderHubScreen();
  }
  renderAuthUi();
}

function renderAuthScreen() {
  const storedAuth = loadStoredAuth();
  if (!state.auth?.username && storedAuth?.username) {
    state.auth = storedAuth;
    saveState();
  }

  const hasExistingAuth = Boolean(state.auth?.username);
  const usernameInput = document.getElementById("authUsername");
  const passwordInput = document.getElementById("authPassword");
  const createButton = document.getElementById("authModeCreateButton");
  const loginButton = document.getElementById("authModeLoginButton");
  const submitButton = document.getElementById("authSubmitButton");

  if (!authMode || (hasExistingAuth && authMode === "create")) {
    authMode = hasExistingAuth ? "login" : "create";
  }

  createButton.classList.toggle("active", authMode === "create");
  loginButton.classList.toggle("active", authMode === "login");
  loginButton.disabled = false;
  createButton.disabled = false;
  usernameInput.disabled = false;
  passwordInput.disabled = false;
  submitButton.disabled = false;
  submitButton.hidden = false;

  document.getElementById("authTitle").textContent = authMode === "create" ? "Criar acesso" : "Fazer login";
  document.getElementById("authSubtitle").textContent = authMode === "create"
    ? "Crie um acesso local simples para proteger seu dashboard nesta maquina."
    : "Use seu acesso local para entrar no dashboard.";
  submitButton.textContent = authMode === "create" ? "Criar acesso" : "Entrar";

  usernameInput.readOnly = false;
  usernameInput.value = authMode === "create" ? "" : (state.auth?.username || "");
  usernameInput.placeholder = state.auth?.username || "Seu usuario";
  passwordInput.value = "";
}
async function handleAuthSubmit() {
  const username = document.getElementById("authUsername").value.trim();
  const password = document.getElementById("authPassword").value;
  if (!username || !password) {
    toast("Preencha usuário e senha");
    return;
  }

  if (authMode === "create") {
    try {
      const result = await readBackendJson("/api/auth/register", {
        method: "POST",
        requiresAuth: false,
        body: JSON.stringify({ username, password })
      });
      if (!result?.sessionToken) {
      toast("Erro ao criar acesso: resposta inválida do servidor");
      return;
      };
      state.auth = normalizeAuth({
        provider: "local",
        username
      });
      saveSession(username, "local", result.sessionToken || "");
      saveState({ localOnly: true });
      await loadBusinessStateFromServer({ migrateLocal: true });
      setActiveAppScreen("hub");
      toast("Acesso criado com sucesso");
      renderScreen();
    } catch (error) {
      toast(error?.message === "user_already_exists" ? "Esse usuário já existe" : "Não foi possível criar o acesso");
    }
    return;
  }

  try {
    const result = await readBackendJson("/api/auth/login", {
      method: "POST",
      requiresAuth: false,
      body: JSON.stringify({ username, password })
    });
      if (!result?.sessionToken) {
    toast("Erro ao fazer login: resposta inválida do servidor");
    return;
     };
    state.auth = normalizeAuth({
      ...state.auth,
      provider: "local",
      username,
      password: ""
    });
    saveSession(username, "local", result.sessionToken || "");
    saveState({ localOnly: true });
    await loadBusinessStateFromServer({ migrateLocal: true });
    setActiveAppScreen("hub");
    renderScreen();
  } catch (error) {
    toast("Usuario ou senha invalidos");
  }
}

async function handleLogout() {
  const serverSessionToken = getServerSessionToken();
  if (serverSessionToken) {
    try {
      await readBackendJson("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serverSessionToken}`
        }
      });
    } catch (error) {
      console.warn("Falha ao encerrar sessao no backend:", error);
    }
  }
  clearSession();


  setActiveAppScreen("hub");
  authMode = state.auth?.username ? "login" : "create";
  closeHeaderMenu();
  renderScreen();
}

function renderSetupScreen() {
  const list = document.getElementById("platformConfigList");
  if (!getPlatforms().length) {
    list.innerHTML = `<div class="empty-state">Nenhuma plataforma cadastrada ainda.</div>`;
    resetPlatformForm();
    return;
  }

  list.innerHTML = getPlatforms().map((platform) => `
    <div class="setup-item">
      <div class="setup-item-main">
        ${platformIcon(platform)}
        <div class="setup-item-copy">
          <strong>${escapeHtml(platform.name)}</strong>
          <span>Sigla ${platform.icon} · ${platform.color}</span>
        </div>
      </div>
      <div class="setup-item-actions">
        <button class="btn btn-secondary" data-edit-platform="${escapeAttribute(platform.key)}" type="button">Editar</button>
        <button class="btn btn-secondary setup-remove" data-remove-platform="${escapeAttribute(platform.key)}" type="button">Remover</button>
      </div>
    </div>
  `).join("");
}

function openSetupEditor() {
  destroyCharts();
  setActiveAppScreen("hub");
  closeHeaderMenu();
  document.getElementById("authScreen").hidden = true;
  document.getElementById("setupScreen").hidden = false;
  const hubScreen = document.getElementById("hubScreen");
  if (hubScreen) hubScreen.hidden = true;
  document.getElementById("dashboardScreen").hidden = true;
  const calculatorScreen = document.getElementById("calculatorScreen");
  if (calculatorScreen) calculatorScreen.hidden = true;
  const dailyCloseScreen = document.getElementById("dailyCloseScreen");
  if (dailyCloseScreen) dailyCloseScreen.hidden = true;
  resetPlatformForm();
  renderSetupScreen();
}

function addPlatformConfig() {
  const name = document.getElementById("platformName").value.trim();
  const short = document.getElementById("platformShort").value.trim().toUpperCase();
  const color = document.getElementById("platformColor").value;

  if (!name) {
    toast("Informe o nome da plataforma");
    return;
  }

  if (editingPlatformKey) {
    const platform = getPlatformByKey(editingPlatformKey);
    if (!platform) {
      resetPlatformForm();
      renderSetupScreen();
      toast("Plataforma nao encontrada");
      return;
    }

    platform.name = name;
    platform.icon = (short || name.slice(0, 2)).slice(0, 3);
    platform.color = color;
    saveState();
    renderSetupScreen();
    resetPlatformForm();
    toast("Plataforma atualizada");
    return;
  }

  const key = slugifyText(name);
  if (getPlatforms().some((platform) => platform.key === key)) {
    toast("Essa plataforma ja foi cadastrada");
    return;
  }

  state.platforms.push(normalizePlatform({
    key,
    name,
    icon: short || name.slice(0, 2),
    color
  }, getPlatforms().length));

  saveState();
  renderSetupScreen();
  resetPlatformForm();
  toast("Plataforma adicionada");
}

function removePlatformConfig(key) {
  if (editingPlatformKey === key) resetPlatformForm();
  state.platforms = getPlatforms().filter((platform) => platform.key !== key);
  Object.values(state.db).forEach((monthData) => {
    if (!monthData) return;
    if (monthData.returns) delete monthData.returns[key];
    (monthData.days || []).forEach((day) => {
      delete day[key];
    });
  });
  saveState();
  renderSetupScreen();
  toast("Plataforma removida");
}

function finishSetup() {
  if (!getPlatforms().length) {
    toast("Cadastre ao menos uma plataforma");
    return;
  }

  if (!state.db[state.currentMonth]) ensureMonthData(state.currentMonth);
  saveState();
  setActiveAppScreen("hub");
  renderScreen();
}

function openHubScreen() {
  setActiveAppScreen("hub");
  closeHeaderMenu();
  renderScreen();
}

function openDashboardScreen() {
  setActiveAppScreen("dashboard");
  renderScreen();
}

function openCalculatorScreen() {
  setActiveAppScreen("calculator");
  closeHeaderMenu();
  renderScreen();
}

function openDailyCloseScreen() {
  setActiveAppScreen("dailyClose");
  closeHeaderMenu();
  renderScreen();
}

function renderHubScreen() {
  const username = state.auth?.username || "Usuario";
  const shell = document.querySelector("#hubScreen .hub-shell");
  if (!shell) return;

  ensureMonthData(state.currentMonth);
  const month = state.currentMonth || getDefaultMonth();
  const totals = calcTotals(month);
  const platforms = getPlatforms();
  const activePlatforms = platforms.filter((platform) => Number(totals.sales[platform.key] || 0) > 0);
  const returnRate = getReturnRate(totals.totalRet, totals.gross);
  const loggedDays = getLoggedDays(month);
  const monthDays = getMonthDays(month);
  const progress = monthDays > 0 ? Math.min((loggedDays / monthDays) * 100, 100) : 0;
  const lastLoggedDay = getLastLoggedDay(month);
  const platformPreview = platforms.slice(0, 5).map((platform) => `
    <span class="hub-platform-pill">${platformIcon(platform)}${escapeHtml(platform.name)}</span>
  `).join("");
  const overflowCount = Math.max(platforms.length - 5, 0);

  shell.innerHTML = `
    <div class="hub-topbar">
      <div class="logo"><div class="logo-dot"></div>Dashboard de Vendas</div>
      <div class="hub-topbar-actions">
        <button class="btn btn-secondary" id="hubImportBackupButton" type="button">Importar</button>
        <button class="btn btn-secondary" id="hubLogoutButton" type="button">Sair</button>
      </div>
    </div>
    <div class="hub-hero">
      <div class="hub-copy">
        <span class="hub-eyebrow" id="hubMonthName">${escapeHtml(month)} ${getCurrentYear()}</span>
        <h1 id="hubGreeting">Bem-vindo, ${escapeHtml(username)}</h1>
        <p>Escolha uma area para trabalhar. Tudo fica separado por paginas, com acesso rapido ao que voce usa no dia a dia.</p>
        <div class="hub-platform-strip" id="hubPlatformStrip">
          ${platformPreview || '<span class="hub-platform-pill">Nenhuma plataforma</span>'}
          ${overflowCount ? `<span class="hub-platform-pill">+${overflowCount}</span>` : ""}
        </div>
      </div>
      <div class="hub-summary">
        <div class="hub-summary-head">
          <span>Resumo do mes</span>
          <strong id="hubMetricNet">${RS(totals.net)}</strong>
        </div>
        <div class="hub-meter"><span id="hubMeterFill" style="width:${progress.toFixed(1)}%"></span></div>
        <div class="hub-summary-grid">
          <div><span>Bruto</span><strong id="hubMetricGross">${RS(totals.gross)}</strong></div>
          <div><span>Pedidos</span><strong id="hubMetricOrders">${totals.orders}</strong></div>
          <div><span>Devolucoes</span><strong id="hubMetricReturns">${returnRate.toFixed(1)}%</strong></div>
        </div>
        <div class="hub-summary-note" id="hubLastUpdate">${loggedDays ? `${loggedDays} de ${monthDays} dias lancados${lastLoggedDay ? `, ultimo dia ${lastLoggedDay}` : ""}` : "Aguardando lancamentos"} &middot; ${activePlatforms.length} ativa${activePlatforms.length === 1 ? "" : "s"}</div>
      </div>
    </div>
    <div class="hub-grid">
      <button class="hub-card hub-card-primary" id="openDashboardCard" type="button">
        <span class="hub-card-icon">01</span>
        <span class="hub-card-kicker">Vendas e relatorios</span>
        <strong>Dashboard</strong>
        <span>Indicadores, graficos, lancamentos e comparativos mensais.</span>
      </button>
      <button class="hub-card" id="openCalculatorCard" type="button">
        <span class="hub-card-icon">02</span>
        <span class="hub-card-kicker">Preco ideal</span>
        <strong>Calculadora</strong>
        <span>Simule comissao, frete, margem e lucro por plataforma.</span>
      </button>
      <button class="hub-card" id="hubManagePlatformsButton" type="button">
        <span class="hub-card-icon">03</span>
        <span class="hub-card-kicker">Cadastro base</span>
        <strong>Plataformas</strong>
        <span>Adicione ou ajuste marketplaces, cores e siglas.</span>
      </button>
      <button class="hub-card" id="hubImportBackupCard" type="button">
        <span class="hub-card-icon">04</span>
        <span class="hub-card-kicker">Dados</span>
        <strong>Backup</strong>
        <span>Importe uma copia salva para mesclar ou substituir dados.</span>
      </button>
      <button class="hub-card" id="openDailyCloseCard" type="button">
        <span class="hub-card-icon">05</span>
        <span class="hub-card-kicker">Rotina diaria</span>
        <strong>Fechamento Diario</strong>
        <span>Some vendas e devolucoes por plataforma e gere o TXT.</span>
      </button>
    </div>
  `;

  document.getElementById("openDashboardCard").addEventListener("click", openDashboardScreen);
  document.getElementById("openCalculatorCard").addEventListener("click", openCalculatorScreen);
  document.getElementById("openDailyCloseCard").addEventListener("click", openDailyCloseScreen);
  document.getElementById("hubManagePlatformsButton").addEventListener("click", openSetupEditor);
  document.getElementById("hubImportBackupButton").addEventListener("click", openImportBackupModal);
  document.getElementById("hubImportBackupCard").addEventListener("click", openImportBackupModal);
  document.getElementById("hubLogoutButton").addEventListener("click", handleLogout);
}

function getPricingBaseCost() {
  return Number(state.pricing.productCost || 0)
    + Number(state.pricing.packagingCost || 0)
    + Number(state.pricing.extraCost || 0)
    + Number(state.pricing.shippingSubsidy || 0);
}

function isPriceInTier(price, tier) {
  return price >= Number(tier.min || 0) && (tier.max === null || price <= Number(tier.max));
}

function getProfileFeeTiers(profile) {
  return normalizeFeeTiers(profile.feeTiers);
}

function getFeeConfigForPrice(profile, price) {
  const feeTiers = getProfileFeeTiers(profile);
  if (!feeTiers.length) {
    return {
      commissionRate: Number(profile.commissionRate || 0),
      fixedFee: Number(profile.fixedFee || 0),
      feeTier: null
    };
  }
  const feeTier = feeTiers.find((tier) => isPriceInTier(price, tier)) || feeTiers[feeTiers.length - 1];
  return {
    commissionRate: Number(feeTier.commissionRate || 0),
    fixedFee: Number(feeTier.fixedFee || 0),
    feeTier
  };
}

function calculatePriceWithFeeConfig(profile, feeConfig) {
  const variableRate = (Number(feeConfig.commissionRate || 0) + Number(profile.transactionRate || 0)) / 100;
  const baseCost = getPricingBaseCost();
  const fixedFee = Number(feeConfig.fixedFee || 0);
  const shippingCost = Number(profile.extraShippingCost || 0);
  const fixedCosts = baseCost + fixedFee + shippingCost;
  const targetMarginRate = Number(state.pricing.targetMargin || 0) / 100;
  let idealPrice = 0;

  if (state.pricing.mode === "profit") {
    const denominator = 1 - variableRate;
    if (denominator <= 0) return null;
    idealPrice = (fixedCosts + Number(state.pricing.targetProfit || 0)) / denominator;
  } else {
    const denominator = 1 - variableRate - targetMarginRate;
    if (denominator <= 0) return null;
    idealPrice = fixedCosts / denominator;
  }

  const variableFees = idealPrice * variableRate;
  const profit = idealPrice - variableFees - fixedCosts;
  return {
    idealPrice,
    variableFees,
    fixedFee,
    shippingCost,
    baseCost,
    commissionRate: Number(feeConfig.commissionRate || 0),
    transactionRate: Number(profile.transactionRate || 0),
    profit,
    profitMargin: idealPrice > 0 ? (profit / idealPrice) * 100 : 0
  };
}

function calculatePlatformPrice(profile) {
  const feeTiers = getProfileFeeTiers(profile);
  if (!feeTiers.length) {
    return calculatePriceWithFeeConfig(profile, {
      commissionRate: Number(profile.commissionRate || 0),
      fixedFee: Number(profile.fixedFee || 0)
    });
  }

  for (const tier of feeTiers) {
    const result = calculatePriceWithFeeConfig(profile, tier);
    if (result && isPriceInTier(result.idealPrice, tier)) {
      return { ...result, feeTier: tier };
    }
  }

  return null;
}

function calculateSalePriceResult(profile, salePrice) {
  const price = Number(salePrice || 0);
  if (price <= 0) return null;
  const feeConfig = getFeeConfigForPrice(profile, price);
  const variableRate = (Number(feeConfig.commissionRate || 0) + Number(profile.transactionRate || 0)) / 100;
  const baseCost = getPricingBaseCost();
  const fixedFee = Number(feeConfig.fixedFee || 0);
  const shippingCost = Number(profile.extraShippingCost || 0);
  const fixedCosts = baseCost + fixedFee + shippingCost;
  const variableFees = price * variableRate;
  const profit = price - variableFees - fixedCosts;
  return {
    idealPrice: price,
    variableFees,
    fixedFee,
    shippingCost,
    baseCost,
    commissionRate: Number(feeConfig.commissionRate || 0),
    transactionRate: Number(profile.transactionRate || 0),
    profit,
    profitMargin: price > 0 ? (profit / price) * 100 : 0,
    feeTier: feeConfig.feeTier
  };
}

function getPsychologicalPriceOptions(price) {
  const value = Number(price || 0);
  if (value <= 0) return [];
  const bases = [
    Math.ceil(value),
    Math.ceil(value) - 0.01,
    Math.floor(value) + 0.9
  ];
  return [...new Set(bases
    .filter((option) => option > 0)
    .map((option) => Number(option.toFixed(2)))
    .filter((option) => option >= value * 0.96)
    .sort((a, b) => a - b)
  )].slice(0, 3);
}

function renderPricingBreakdown(result) {
  if (!result) return "";
  const fixedTotal = Number(result.baseCost || 0) + Number(result.fixedFee || 0) + Number(result.shippingCost || 0);
  return `
    <div class="pricing-breakdown">
      <div><span>Custo base</span><strong>${R(result.baseCost)}</strong></div>
      <div><span>Taxa fixa</span><strong>${R(result.fixedFee)}</strong></div>
      <div><span>Frete repasse</span><strong>${R(result.shippingCost)}</strong></div>
      <div><span>Taxas variaveis</span><strong>${R(result.variableFees)}</strong></div>
      <div><span>Lucro</span><strong>${R(result.profit)}</strong></div>
      <div><span>Total</span><strong>${R(result.idealPrice)}</strong></div>
      <div class="pricing-breakdown-total"><span>Composicao</span><strong>${R(fixedTotal)} + ${R(result.variableFees)} + ${R(result.profit)}</strong></div>
    </div>
  `;
}

function renderManualPriceResult(profile) {
  const manualResult = calculateSalePriceResult(profile, state.pricing.manualPrice);
  if (!manualResult) return "";
  const statusClass = manualResult.profit < 0 ? "danger" : manualResult.profitMargin < 10 ? "warning" : "success";
  return `
    <div class="pricing-manual ${statusClass}">
      <div>
        <span>Vendendo por ${R(manualResult.idealPrice)}</span>
        <strong>${R(manualResult.profit)} de lucro</strong>
      </div>
      <div>
        <span>Margem real</span>
        <strong>${manualResult.profitMargin.toFixed(1)}%</strong>
      </div>
    </div>
  `;
}

function renderPsychologicalOptions(platformKey, profile, result) {
  if (!result) return "";
  const options = getPsychologicalPriceOptions(result.idealPrice);
  if (!options.length) return "";
  const buttons = options.map((price) => {
    const rounded = calculateSalePriceResult(profile, price);
    return `
      <button class="pricing-round-button" type="button" data-pricing-manual-price="${price.toFixed(2)}">
        <span>${R(price)}</span>
        <strong>${rounded ? `${rounded.profitMargin.toFixed(1)}%` : "-"}</strong>
      </button>
    `;
  }).join("");
  return `
    <div class="pricing-rounding" data-platform-key="${escapeAttribute(platformKey)}">
      <span>Arredondar e testar margem</span>
      <div>${buttons}</div>
    </div>
  `;
}

function renderCalculatorProfiles() {
  const container = document.getElementById("pricingPlatformGrid");
  container.innerHTML = getPlatforms().map((platform) => {
    const profile = state.pricing.profiles[platform.key] || normalizePricingProfile(platform);
    const result = calculatePlatformPrice(profile);
    const feeTiers = getProfileFeeTiers(profile);
    const hasFeeTiers = feeTiers.length > 0;
    const sourceBadge = profile.sourceType === "official"
      ? "Taxa base publica"
      : profile.sourceType === "estimated"
        ? "Taxa inicial estimada"
        : "Taxa personalizada";
    const commissionValue = result ? result.commissionRate : Number(profile.commissionRate || 0);
    const fixedFeeValue = result ? result.fixedFee : Number(profile.fixedFee || 0);
    const tierNote = hasFeeTiers && result?.feeTier
      ? `<div class="pricing-note">Faixa aplicada: ${R(result.feeTier.min)} a ${result.feeTier.max === null ? "sem limite" : R(result.feeTier.max)} - ${result.feeTier.commissionRate.toFixed(1)}% + ${R(result.feeTier.fixedFee)}.</div>`
      : "";
    return `
      <article class="pricing-card">
        <div class="pricing-card-head">
          <div>
            <div class="pricing-platform">${platformBadge(platform)}</div>
            <div class="pricing-source">${sourceBadge}</div>
          </div>
          <div class="pricing-result">${result ? R(result.idealPrice) : "Revise taxas"}</div>
        </div>
        <div class="pricing-grid">
          <label class="fg">
            <span class="flabel">Comissao %</span>
            <input class="finput" type="number" step="0.1" min="0" data-pricing-profile="${platform.key}" data-field="commissionRate" value="${Number(commissionValue || 0).toFixed(1)}" ${hasFeeTiers ? "disabled" : ""}>
          </label>
          <label class="fg">
            <span class="flabel">Taxa Extra %</span>
            <input class="finput" type="number" step="0.1" min="0" data-pricing-profile="${platform.key}" data-field="transactionRate" value="${Number(profile.transactionRate || 0).toFixed(1)}">
          </label>
          <label class="fg">
            <span class="flabel">Taxa Fixa R$</span>
            <input class="finput" type="number" step="0.01" min="0" data-pricing-profile="${platform.key}" data-field="fixedFee" value="${Number(fixedFeeValue || 0).toFixed(2)}" ${hasFeeTiers ? "disabled" : ""}>
          </label>
          <label class="fg">
            <span class="flabel">Frete Repasse R$</span>
            <input class="finput" type="number" step="0.01" min="0" data-pricing-profile="${platform.key}" data-field="extraShippingCost" value="${Number(profile.extraShippingCost || 0).toFixed(2)}">
          </label>
        </div>
        ${tierNote}
        ${renderPricingBreakdown(result)}
        ${renderManualPriceResult(profile)}
        ${renderPsychologicalOptions(platform.key, profile, result)}
        <div class="pricing-note">${profile.note || "Revise os custos dessa plataforma antes de usar o valor em producao."}</div>
        <div class="pricing-kpis">
          <div><span>Taxas variaveis</span><strong>${result ? R(result.variableFees) : "-"}</strong></div>
          <div><span>Lucro estimado</span><strong>${result ? R(result.profit) : "-"}</strong></div>
          <div><span>Margem final</span><strong>${result ? `${result.profitMargin.toFixed(1)}%` : "-"}</strong></div>
        </div>
      </article>
    `;
  }).join("");
}

function renderCalculatorScreen() {
  document.getElementById("calculatorTitle").textContent = `Calculadora de ${getPlatforms().length} Plataforma${getPlatforms().length > 1 ? "s" : ""}`;
  document.getElementById("pricingModeMargin").classList.toggle("active", state.pricing.mode === "margin");
  document.getElementById("pricingModeProfit").classList.toggle("active", state.pricing.mode === "profit");
  document.getElementById("pricingProductCost").value = Number(state.pricing.productCost || 0).toFixed(2);
  document.getElementById("pricingPackagingCost").value = Number(state.pricing.packagingCost || 0).toFixed(2);
  document.getElementById("pricingExtraCost").value = Number(state.pricing.extraCost || 0).toFixed(2);
  document.getElementById("pricingShippingSubsidy").value = Number(state.pricing.shippingSubsidy || 0).toFixed(2);
  document.getElementById("pricingTargetMargin").value = Number(state.pricing.targetMargin || 0).toFixed(1);
  document.getElementById("pricingTargetProfit").value = Number(state.pricing.targetProfit || 0).toFixed(2);
  document.getElementById("pricingManualPrice").value = Number(state.pricing.manualPrice || 0).toFixed(2);
  document.getElementById("pricingTargetMarginWrap").hidden = state.pricing.mode !== "margin";
  document.getElementById("pricingTargetProfitWrap").hidden = state.pricing.mode !== "profit";
  document.getElementById("pricingBaseCost").textContent = R(getPricingBaseCost());
  renderCalculatorProfiles();
}

function parseDailyCloseValues(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return 0;
  const matches = raw.match(/-?\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?|-?\d+(?:[.,]\d+)?/g) || [];
  return matches.reduce((sum, token) => {
    const clean = token.trim();
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    let normalized = clean;
    if (lastComma >= 0 && lastDot >= 0) {
      normalized = clean
        .replace(new RegExp(`\\${decimalSeparator === "," ? "." : ","}`, "g"), "")
        .replace(decimalSeparator, ".");
    } else if (lastComma >= 0) {
      normalized = clean.replace(/\./g, "").replace(",", ".");
    } else {
      const parts = clean.split(".");
      if (parts.length > 2) normalized = parts.join("");
    }
    const value = Number(normalized);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

function getDailyCloseEntries() {
  return getPlatforms().map((platform) => {
    const sales = parseDailyCloseValues(document.getElementById(`dailyCloseSales_${platform.key}`)?.value || "");
    const returns = parseDailyCloseValues(document.getElementById(`dailyCloseReturns_${platform.key}`)?.value || "");
    return {
      platform,
      sales,
      returns,
      net: sales - returns
    };
  });
}

function buildDailyCloseReport(entries = getDailyCloseEntries()) {
  const activeEntries = entries.filter(({ sales, returns }) => sales !== 0 || returns !== 0);
  const blocks = activeEntries.map(({ platform, sales, returns }) => [
    `*Total ${platform.name}*`,
    "*_Vendas_*",
    `*${R(sales)}*`,
    "*_Devolu\u00e7\u00f5es_*",
    `*${R(returns)}*`,
    "==================="
  ].join("\n"));
  const salesTotal = activeEntries.reduce((sum, item) => sum + item.sales, 0);
  const returnsTotal = activeEntries.reduce((sum, item) => sum + item.returns, 0);
  const netTotal = salesTotal - returnsTotal;
  const totalsBlock = `*TOTAL:*\n*_Vendas_*: *${R(salesTotal)}*\n*_Devolu\u00e7\u00f5es_*: *${R(returnsTotal)}*\n*_Total_*: *${R(netTotal)}*`;
  return blocks.length ? `${blocks.join("\n")}\n${totalsBlock}` : totalsBlock;
}

function updateDailyClosePreview() {
  const entries = getDailyCloseEntries();
  const preview = document.getElementById("dailyClosePreview");
  const totals = document.getElementById("dailyCloseTotals");
  if (preview) preview.value = buildDailyCloseReport(entries);
  if (totals) {
    const salesTotal = entries.reduce((sum, item) => sum + item.sales, 0);
    const returnsTotal = entries.reduce((sum, item) => sum + item.returns, 0);
    totals.innerHTML = `
      <div><span>Vendas</span><strong>${R(salesTotal)}</strong></div>
      <div><span>Devolucoes</span><strong>${R(returnsTotal)}</strong></div>
      <div><span>Total</span><strong>${R(salesTotal - returnsTotal)}</strong></div>
    `;
  }
  entries.forEach(({ platform, sales, returns, net }) => {
    const salesEl = document.getElementById(`dailyCloseSalesTotal_${platform.key}`);
    const returnsEl = document.getElementById(`dailyCloseReturnsTotal_${platform.key}`);
    const netEl = document.getElementById(`dailyCloseNetTotal_${platform.key}`);
    if (salesEl) salesEl.textContent = R(sales);
    if (returnsEl) returnsEl.textContent = R(returns);
    if (netEl) netEl.textContent = R(net);
  });
}

function renderDailyCloseScreen() {
  document.getElementById("dailyCloseTitle").textContent = "Fechamento Diario";
  const dateInput = document.getElementById("dailyCloseDate");
  if (dateInput && !dateInput.value) dateInput.valueAsDate = new Date();
  const grid = document.getElementById("dailyClosePlatformGrid");
  grid.innerHTML = getPlatforms().map((platform) => `
    <article class="daily-close-platform">
      <div class="daily-close-platform-head">
        ${platformBadge(platform)}
        <div class="daily-close-platform-net" id="dailyCloseNetTotal_${escapeAttribute(platform.key)}">${R(0)}</div>
      </div>
      <div class="daily-close-input-grid">
        <label class="fg">
          <span class="flabel">Vendas</span>
          <textarea class="finput daily-close-input" id="dailyCloseSales_${escapeAttribute(platform.key)}" data-daily-close-input placeholder="3229,99 + 120,00"></textarea>
        </label>
        <label class="fg">
          <span class="flabel">Devolucoes</span>
          <textarea class="finput daily-close-input" id="dailyCloseReturns_${escapeAttribute(platform.key)}" data-daily-close-input placeholder="1097,18"></textarea>
        </label>
      </div>
      <div class="daily-close-platform-totals">
        <div><span>Vendas</span><strong id="dailyCloseSalesTotal_${escapeAttribute(platform.key)}">${R(0)}</strong></div>
        <div><span>Devolucoes</span><strong id="dailyCloseReturnsTotal_${escapeAttribute(platform.key)}">${R(0)}</strong></div>
      </div>
    </article>
  `).join("");
  updateDailyClosePreview();
}

function downloadDailyCloseReport() {
  updateDailyClosePreview();
  const report = document.getElementById("dailyClosePreview")?.value || buildDailyCloseReport();
  const date = document.getElementById("dailyCloseDate")?.value || new Date().toISOString().slice(0, 10);
  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fechamento-diario-${date}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Relatorio TXT gerado");
}

async function copyDailyCloseReport() {
  updateDailyClosePreview();
  const report = document.getElementById("dailyClosePreview")?.value || buildDailyCloseReport();
  try {
    await navigator.clipboard.writeText(report);
    toast("Texto copiado");
  } catch (error) {
    const preview = document.getElementById("dailyClosePreview");
    preview?.focus();
    preview?.select();
    toast("Selecione o texto para copiar");
  }
}

function clearDailyClose() {
  document.querySelectorAll("[data-daily-close-input]").forEach((input) => {
    input.value = "";
  });
  updateDailyClosePreview();
  toast("Fechamento limpo");
}

function renderTabs() {
  // ORDEM CORRETA: meses em ordem cronológica (Jan → Dez)
  const months = Object.keys(state.db).sort((a, b) => {
    return ALL_MONTHS.indexOf(a) - ALL_MONTHS.indexOf(b);
  });
  
  document.getElementById("monthTabs").innerHTML = months
    .map((month) => `<button class="month-tab ${month === state.currentMonth ? "active" : ""}" data-month="${month}" type="button">${SHORT[month] || month}</button>`)
    .join("");

  const options = months
    .map((month) => `<option value="${month}"${month === state.currentMonth ? " selected" : ""}>${month}</option>`)
    .join("");

  ["inputMonth", "returnMonth"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = options;
  });
}

// Adicione esta função ANTES de renderDashboardShell
function renderCurrentUserBadge() {
  const el = document.getElementById("currentUserBadge");
  if (!el) return;
  const username = state.auth?.username || "Usuário";
  el.textContent = `Usuário: ${username}`;
}

function renderDashboardShell() {
  document.getElementById("brandTitle").textContent = `Dashboard de ${getPlatforms().length} Plataforma${getPlatforms().length > 1 ? "s" : ""}`;
  renderCurrentUserBadge();
  renderSaleInputs();
  renderTabs();
  const inputMonth = document.getElementById("inputMonth");
  if (inputMonth) inputMonth.value = state.currentMonth;
  syncSaleDateWithMonth(true);
  renderAll();
  const baseMessage = getPlatforms().length ? `Dados no servidor de ${state.auth.username}` : `Dados no servidor de ${state.auth.username} · cadastre plataformas em "Plataformas"`;
  const savedAt = formatSavedAt(loadLastSavedAt());
  setStorageStatus(savedAt ? `${baseMessage} · salvo em ${savedAt}` : baseMessage);
  const returnMonth = document.getElementById("returnMonth");
  if (returnMonth) returnMonth.value = state.currentMonth;
  renderAuthUi();
}

function switchMonth(month) {
  state.currentMonth = month;
  saveState();
  renderTabs();
  const inputMonth = document.getElementById("inputMonth");
  if (inputMonth) inputMonth.value = month;
  syncSaleDateWithMonth(true);
  renderAll();
}

function renderKPIs() {
  const comparison = getComparisonPeriod(state.currentMonth);
  const totals = comparison.currentTotals;
  const previousName = comparison.previousName;
  const previousTotals = comparison.previousTotals;
  const returnsPercent = getReturnRate(totals.totalRet, totals.gross);
  const compareLabel = previousTotals
    ? `${previousName}${comparison.cutoffDay ? ` ate dia ${comparison.cutoffDay}` : ""}`
    : state.currentMonth;

  document.getElementById("kpiRow").innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Faturamento Bruto</div><div class="kpi-value">${RS(totals.gross)}</div><div class="kpi-change">${previousTotals ? `${varH(totals.gross, previousTotals.gross)} vs ${compareLabel}` : state.currentMonth}</div></div>
    <div class="kpi-card"><div class="kpi-label">Faturamento Liquido</div><div class="kpi-value">${RS(totals.net)}</div><div class="kpi-change">${previousTotals ? `${varH(totals.net, previousTotals.net)} vs ${compareLabel}` : dash}</div></div>
    <div class="kpi-card"><div class="kpi-label">Pedidos</div><div class="kpi-value">${totals.orders}</div><div class="kpi-change">${previousTotals ? `${varH(totals.orders, previousTotals.orders)} vs ${compareLabel}` : dash}</div><div class="kpi-change" style="color:var(--muted)">${totals.orders > 0 ? `${RS(totals.gross / totals.orders)} por pedido` : "Sem pedidos lançados"}</div></div>
    <div class="kpi-card"><div class="kpi-label">Devolucoes</div><div class="kpi-value">${RS(totals.totalRet)}</div><div class="kpi-change">${previousTotals ? `${varH(totals.totalRet, previousTotals.totalRet)} vs ${compareLabel}` : dash}</div><div class="kpi-change" style="color:var(--muted)">${returnsPercent.toFixed(1)}% das vendas</div><div class="returns-bar"><div class="returns-fill" style="width:${Math.min(returnsPercent, 100)}%"></div></div></div>
    <div class="kpi-card"><div class="kpi-label">Plataformas Ativas</div><div class="kpi-value">${getPlatforms().filter((platform) => totals.sales[platform.key] > 0).length}</div><div class="kpi-change" style="color:var(--muted)">de ${getPlatforms().length} cadastradas</div></div>
  `;
}

function renderDailyChart() {
  const data = state.db[state.currentMonth];
  const active = getPlatforms().filter((platform) => data.days.some((day) => Number(day[platform.key] || 0) > 0));
  const ctx = document.getElementById("dailyChart").getContext("2d");
  if (dailyChart) dailyChart.destroy();

  if (!active.length || !data.days.length) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  dailyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.days.map((day) => day.d),
      datasets: active.map((platform) => ({
        label: platform.name,
        data: data.days.map((day) => Number(day[platform.key] || 0)),
        backgroundColor: getPlatformVisualColor(platform, 0.73),
        borderColor: getPlatformVisualColor(platform),
        borderWidth: 0,
        borderRadius: 2,
        borderSkipped: false
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#6b7280",
            font: { family: "Inter", size: 10 },
            boxWidth: 7,
            padding: 10
          }
        },
        tooltip: {
          backgroundColor: "#181c24",
          borderColor: "rgba(255,255,255,.1)",
          borderWidth: 1,
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ${R(context.raw)}`
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: "#4b5563", font: { size: 8 }, maxRotation: 50 },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          stacked: true,
          ticks: { color: "#4b5563", font: { size: 9 }, callback: (value) => RS(value) },
          grid: { color: "rgba(255,255,255,.04)" },
          border: { display: false }
        }
      }
    }
  });
}

function renderDailyTable() {
  const data = state.db[state.currentMonth];
  const active = getPlatforms().filter((platform) => data.days.some((day) => Number(day[platform.key] || 0) > 0));
  if (!data.days.length || !active.length) {
    document.getElementById("dailyDetailsTable").innerHTML = `<tbody><tr><td style="text-align:left;padding:20px;color:var(--muted)">Nenhuma venda registrada neste mês.</td></tr></tbody>`;
    return;
  }

  const totals = {};
  const totalOrdersByPlatform = {};
  active.forEach((platform) => {
    totals[platform.key] = data.days.reduce((sum, day) => sum + Number(day[platform.key] || 0), 0);
    totalOrdersByPlatform[platform.key] = data.days.reduce((sum, day) => sum + Math.max(0, Math.round(Number(day[`orders_${platform.key}`] || 0))), 0);
  });
  const grandTotal = active.reduce((sum, platform) => sum + totals[platform.key], 0);
  const totalOrders = active.reduce((sum, platform) => sum + totalOrdersByPlatform[platform.key], 0);

  const head = `<thead><tr><th>Data</th>${active.map((platform) => `<th><span class="chdot" style="background:${getPlatformVisualColor(platform)}"></span>${platform.icon} R$</th><th><span class="chdot" style="background:${getPlatformVisualColor(platform)}"></span>${platform.icon} Ped.</th>`).join("")}<th>Total</th></tr></thead>`;
  const body = data.days.map((day, dayIndex) => {
    const rowTotal = active.reduce((sum, platform) => sum + Number(day[platform.key] || 0), 0);
    return `<tr><td>${day.d}</td>${active.map((platform) => {
      const value = Number(day[platform.key] || 0);
      const ordersKey = `orders_${platform.key}`;
      const ordersVal = Math.max(0, Math.round(Number(day[ordersKey] || 0)));
      return `<td><span class="ceditable${value === 0 ? " czero" : ""}" contenteditable="true" data-day-index="${dayIndex}" data-platform-key="${platform.key}">${value === 0 ? "-" : value.toFixed(2)}</span></td><td><span class="ceditable${ordersVal === 0 ? " czero" : ""}" contenteditable="true" data-day-index="${dayIndex}" data-platform-key="${ordersKey}">${ordersVal === 0 ? "-" : ordersVal}</span></td>`;
    }).join("")}<td style="color:var(--muted2);font-size:11px">${rowTotal > 0 ? RS(rowTotal) : "-"}</td></tr>`;
  }).join("");
  const foot = `<tfoot><tr><td>Total</td>${active.map((platform) => `<td>${RS(totals[platform.key])}</td><td>${totalOrdersByPlatform[platform.key]}</td>`).join("")}<td>${RS(grandTotal)}</td></tr></tfoot>`;
  document.getElementById("dailyDetailsTable").innerHTML = head + body + foot;
}

function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function updateCell(dayIndex, key, el) {
  const rawValue = parseFloat((el.textContent || "").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
  const isOrdersKey = key === "orders" || key.startsWith("orders_");
  const value = isOrdersKey ? Math.max(0, Math.round(rawValue)) : rawValue;
  state.db[state.currentMonth].days[dayIndex][key] = value;
  state.db[state.currentMonth].days = sortDays(state.db[state.currentMonth].days);
  saveState();
  renderAll();
  toast("Valor atualizado");
}

function renderDonut() {
  const totals = calcTotals(state.currentMonth);
  const active = getPlatforms().filter((platform) => totals.sales[platform.key] > 0);
  const netValues = active.map((platform) => Math.max(0, Number(totals.sales[platform.key] || 0) - Number(totals.ret[platform.key] || 0)));
  const total = netValues.reduce((sum, value) => sum + value, 0);
  const ctx = document.getElementById("donutChart").getContext("2d");
  if (donutChart) donutChart.destroy();

  if (!active.length || total <= 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    document.getElementById("donutLegend").innerHTML = `<div class="empty-state">Sem dados suficientes para o mix.</div>`;
    return;
  }

  donutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: active.map((platform) => platform.name),
      datasets: [{
        data: netValues,
        backgroundColor: active.map((platform) => getPlatformVisualColor(platform, 0.8)),
        borderColor: active.map((platform) => getPlatformVisualColor(platform)),
        borderWidth: 1,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#181c24",
          borderColor: "rgba(255,255,255,.1)",
          borderWidth: 1,
          callbacks: {
            label: (context) => ` ${context.label}: ${R(context.raw)} (${total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0}%)`
          }
        }
      }
    }
  });

  document.getElementById("donutLegend").innerHTML = active.map((platform, index) => {
    const value = netValues[index];
    const percent = total > 0 ? (value / total) * 100 : 0;
    const tone = getPlatformTone(platform);
    const visualColor = getPlatformVisualColor(platform);
    return `<div class="dleg-item"><div class="dleg-l"><div class="dleg-dot" style="background:${visualColor};border-color:${tone.softBorder}"></div><span>${escapeHtml(platform.name)}</span></div><div style="text-align:right"><span class="dleg-pct" style="color:${tone.text}">${percent.toFixed(1)}%</span><div class="dleg-bar"><div class="dleg-fill" style="width:${percent}%;background:${visualColor}"></div></div></div></div>`;
  }).join("");
}

function renderWeekly() {
  const weekly = getWeekBuckets(state.currentMonth, state.db[state.currentMonth].days);
  const comparison = getComparisonPeriod(state.currentMonth);
  const previousName = comparison.previousName;
  const previousWeekly = previousName && state.db[previousName]
    ? getWeekBuckets(previousName, state.db[previousName].days.filter((day) => {
      const dayNumber = getDayNumber(day.d);
      return !comparison.cutoffDay || (dayNumber > 0 && dayNumber <= comparison.cutoffDay);
    }))
    : [];
  const total = weekly.reduce((sum, item) => sum + item.total, 0);
  const max = Math.max(...weekly.map((item) => item.total), 1);
  const colors = ["#e8ff47", "#47d4ff", "#a78bfa", "#34d399", "#fb923c", "#f472b6"];
  const weekBars = document.getElementById("weekBars");
  weekBars.style.gridTemplateColumns = `repeat(${Math.max(weekly.length, 1)}, minmax(0,1fr))`;

  weekBars.innerHTML = weekly.map((item, index) => {
    const value = item.total;
    const percent = total > 0 ? (value / total) * 100 : 0;
    const previousValue = previousWeekly[index]?.total || 0;
    const comparison = previousName ? varH(value, previousValue) : "";
    const color = colors[index % colors.length];
    return `<div class="wbwrap"><div class="wblabel">${item.shortLabel}</div><div class="wbpct">${escapeHtml(item.label)}</div><div class="wbcon"><div class="wbar" style="height:${value > 0 ? Math.max(7, (value / max) * 100) : 0}%;background:${color};opacity:${value > 0 ? 1 : .15}"></div></div><div class="wbval" style="color:${color}">${value > 0 ? RS(value) : "-"}</div><div class="wbpct">${value > 0 ? `${percent.toFixed(1)}%` : ""}</div><div class="wbdelta">${comparison || dash}</div></div>`;
  }).join("");
}

function renderBestDays() {
  const data = state.db[state.currentMonth];
  const best = {};
  data.days.forEach((day) => {
    getPlatforms().forEach((platform) => {
      const value = Number(day[platform.key] || 0);
      if (!best[platform.key] || value > best[platform.key].v) best[platform.key] = { v: value, d: day.d };
    });
  });

  const html = getPlatforms()
    .filter((platform) => best[platform.key] && best[platform.key].v > 0)
    .map((platform) => `<div class="bdrow"><div class="bdl"><div class="pdot" style="background:${getPlatformVisualColor(platform)}"></div>${escapeHtml(platform.name)}</div><div class="bdr"><div class="bdval">${RS(best[platform.key].v)}</div><div class="bddate">${escapeHtml(best[platform.key].d)}</div></div></div>`)
    .join("");
  document.getElementById("bestDayGrid").innerHTML = html || `<div class="empty-state">Ainda nao ha dias destacados.</div>`;
}

function renderPlatformTable() {
  const comparison = getComparisonPeriod(state.currentMonth);
  const totals = comparison.currentTotals;
  const previousTotals = comparison.previousTotals;
  const active = getPlatforms().filter((platform) => totals.sales[platform.key] > 0 || totals.ret[platform.key] > 0);
  if (!active.length) {
    document.getElementById("platformTable").innerHTML = `<tbody><tr><td style="text-align:left;padding:20px;color:var(--muted)">Cadastre vendas para ver o resumo por plataforma.</td></tr></tbody>`;
    return;
  }
  const netTotal = active.reduce((sum, platform) => sum + Math.max(0, totals.sales[platform.key] - totals.ret[platform.key]), 0);

  document.getElementById("platformTable").innerHTML = `
    <thead><tr><th>Plataforma</th><th>Bruto</th><th>Devolucoes</th><th>% Dev.</th><th>vs Mes Ant.</th><th>Liquido</th><th>% Mix</th></tr></thead>
    <tbody>${active.map((platform) => {
      const value = totals.sales[platform.key] || 0;
      const returns = totals.ret[platform.key] || 0;
      const net = Math.max(0, value - returns);
      const previousNet = previousTotals ? Math.max(0, (previousTotals.sales[platform.key] || 0) - (previousTotals.ret[platform.key] || 0)) : null;
      const returnRate = getReturnRate(returns, value);
      const percent = netTotal > 0 ? ((net / netTotal) * 100).toFixed(1) : "0.0";
      const tone = getPlatformTone(platform);
      return `<tr>
        <td data-label="Plataforma">${platformBadge(platform)}</td>
        <td data-label="Bruto">${R(value)}</td>
        <td data-label="Devolucoes" class="neg">${returns > 0 ? R(returns) : "-"}</td>
        <td data-label="% Dev." style="color:var(--muted)">${returnRate.toFixed(1)}%</td>
        <td data-label="vs Mes Ant.">${previousTotals ? varH(net, previousNet) : dash}</td>
        <td data-label="Liquido" style="font-family:var(--font-ui);font-weight:700">${R(net)}</td>
        <td data-label="% Mix"><span class="ppill" style="color:${tone.text};background:${tone.softBg};border-color:${tone.softBorder}">${percent}%</span></td>
      </tr>`;
    }).join("")}</tbody>
    <tfoot><tr>
      <td data-label="Plataforma" style="color:var(--accent)">Total</td>
      <td data-label="Bruto">${R(totals.gross)}</td>
      <td data-label="Devolucoes" class="neg">${R(totals.totalRet)}</td>
      <td data-label="% Dev." style="color:var(--muted)">${getReturnRate(totals.totalRet, totals.gross).toFixed(1)}%</td>
      <td data-label="vs Mes Ant.">${previousTotals ? varH(totals.net, previousTotals.net) : dash}</td>
      <td data-label="Liquido" style="color:var(--accent)">${R(totals.net)}</td>
      <td data-label="% Mix"><span class="ppill">100%</span></td>
    </tr></tfoot>
  `;
}

function renderMonthCompare() {
  const comparison = getComparisonPeriod(state.currentMonth);
  const totals = comparison.currentTotals;
  const previousName = comparison.previousName;
  const previousTotals = comparison.previousTotals;
  const previousLabel = previousTotals && comparison.cutoffDay
    ? `${previousName} ate dia ${comparison.cutoffDay}`
    : previousName;

  let html = `<div class="compare-grid">
    <div class="compare-card compare-card-current">
      <div class="compare-month">${state.currentMonth}</div>
      <div class="compare-value compare-value-current">${RS(totals.net)}</div>
      <div class="compare-meta">Bruto: ${RS(totals.gross)}</div>
      <div class="compare-meta compare-meta-neg">Dev: ${RS(totals.totalRet)}</div>
    </div>
    ${previousTotals ? `<div class="compare-card">
      <div class="compare-month">${previousLabel}</div>
      <div class="compare-value">${RS(previousTotals.net)}</div>
      <div class="compare-meta">Bruto: ${RS(previousTotals.gross)}</div>
      <div class="compare-meta compare-meta-neg">Dev: ${RS(previousTotals.totalRet)}</div>
    </div>` : `<div class="compare-card compare-card-empty"><span>Sem mês anterior</span></div>`}
  </div>`;

  if (previousTotals) {
    html += `<div class="compare-section-title">Variação por plataforma</div>`;
    getPlatforms().filter((platform) => totals.sales[platform.key] > 0 || previousTotals.sales[platform.key] > 0).forEach((platform) => {
      const currentNet = Math.max(0, totals.sales[platform.key] - totals.ret[platform.key]);
      const previousNet = Math.max(0, previousTotals.sales[platform.key] - previousTotals.ret[platform.key]);
      html += `<div class="compare-row">${platformBadge(platform)}<div class="compare-delta">${varH(currentNet, previousNet)}</div></div>`;
    });
  }

  document.getElementById("monthCompare").innerHTML = html;
}

function renderSaleInputs() {
  document.getElementById("saleInputs").innerHTML = getPlatforms().map((platform) => `
    <div class="fg">
      <label class="flabel" for="sale_${escapeAttribute(platform.key)}" style="color:${getReadablePlatformColor(platform.color)}">${escapeHtml(platform.name)}</label>
      <input type="number" class="finput" id="sale_${escapeAttribute(platform.key)}" placeholder="0,00" step="0.01" min="0">
    </div>
    <div class="fg">
      <label class="flabel" for="orders_${escapeAttribute(platform.key)}" style="color:${getReadablePlatformColor(platform.color)};opacity:0.75;font-size:11px">Pedidos ${escapeHtml(platform.name)}</label>
      <input type="number" class="finput" id="orders_${escapeAttribute(platform.key)}" placeholder="0" step="1" min="0">
    </div>
  `).join("");
}

function renderReturnInputs() {
  const month = document.getElementById("returnMonth")?.value || state.currentMonth;
  ensureMonthData(month);
  const returns = state.db[month].returns || {};
  document.getElementById("returnInputs").innerHTML = getPlatforms().map((platform) => `
    <div class="fg">
      <label class="flabel" for="ret_${escapeAttribute(platform.key)}" style="color:${getReadablePlatformColor(platform.color)}">${escapeHtml(platform.name)}</label>
      <input type="number" class="finput" id="ret_${escapeAttribute(platform.key)}" value="${Number(returns[platform.key] || 0).toFixed(2)}" step="0.01" min="0">
    </div>
  `).join("");
}

function renderProjection() {
  const totals = calcTotals(state.currentMonth);
  const projection = calcProjection(state.currentMonth);
  const comparison = getComparisonPeriod(state.currentMonth);
  const previousName = comparison.previousName;
  const previousTotals = comparison.previousTotals;
  const compareLabel = previousTotals
    ? `${previousName}${comparison.cutoffDay ? ` ate dia ${comparison.cutoffDay}` : ""}`
    : "";
  const platformProjections = projection.platforms
    .filter((item) => item.realizedGross > 0 || item.projectedGross > 0)
    .sort((a, b) => b.projectedGross - a.projectedGross);
  const maxProjectedPlatform = platformProjections.reduce((max, item) => Math.max(max, item.projectedGross), 0);
  const projectedPlatformTotal = platformProjections.reduce((sum, item) => sum + item.projectedGross, 0);
  const platformProjectionHtml = platformProjections.length
    ? platformProjections.map((item) => {
      const platform = getPlatformByKey(item.key);
      if (!platform) return "";
      const percentOfTotal = projectedPlatformTotal > 0 ? (item.projectedGross / projectedPlatformTotal) * 100 : 0;
      const barWidth = maxProjectedPlatform > 0 ? Math.max(4, (item.projectedGross / maxProjectedPlatform) * 100) : 0;
      return `
        <div class="projection-platform-row">
          <div class="projection-platform-main">
            ${platformBadge(platform)}
            <div class="projection-platform-track" aria-hidden="true">
              <div class="projection-platform-fill" style="width:${barWidth.toFixed(1)}%;background:${getPlatformVisualColor(platform)}"></div>
            </div>
          </div>
          <div class="projection-platform-stats">
            <div>
              <span>Projecao</span>
              <strong>${RS(item.projectedGross)}</strong>
            </div>
            <div>
              <span>Media diaria</span>
              <strong>${RS(item.dailyAverage)}</strong>
            </div>
            <div>
              <span>Realizado</span>
              <strong>${RS(item.realizedGross)}</strong>
            </div>
            <div>
              <span>Participacao</span>
              <strong>${percentOfTotal.toFixed(1)}%</strong>
            </div>
          </div>
        </div>
      `;
    }).join("")
    : `<div class="projection-platform-empty">Cadastre vendas por plataforma para ver a projecao detalhada.</div>`;

  document.getElementById("projectionGrid").innerHTML = `
    <div class="projection-card">
      <div class="projection-label">Dias Lancados</div>
      <div class="projection-value">${projection.loggedDays}/${projection.monthDays}</div>
      <div class="projection-sub">Base usada para a média do mês</div>
    </div>
    <div class="projection-card">
      <div class="projection-label">Projecao de Pedidos</div>
      <div class="projection-value">${Math.round(projection.projectedOrders)}</div>
      <div class="projection-sub">Media diaria: ${projection.ordersDailyAverage.toFixed(1)} pedidos</div>
      <div class="projection-meta">Realizado ate agora: ${totals.orders} pedidos</div>
    </div>
    <div class="projection-card">
      <div class="projection-label">Projecao de Vendas</div>
      <div class="projection-value">${RS(projection.projectedGross)}</div>
      <div class="projection-sub">Media diaria: ${RS(projection.salesDailyAverage)}</div>
      <div class="projection-meta">${previousTotals ? `vs bruto de ${compareLabel}: ${varH(projection.projectedGross, previousTotals.gross)}` : "Sem mês anterior para comparar"}</div>
    </div>
    <div class="projection-card">
      <div class="projection-label">Projecao de Devolucoes</div>
      <div class="projection-value neg">${RS(projection.projectedReturns)}</div>
      <div class="projection-sub">Media diaria: ${RS(projection.returnsDailyAverage)}</div>
      <div class="projection-meta">Taxa projetada: ${projection.projectedReturnRate.toFixed(1)}% das vendas</div>
    </div>
    <div class="projection-card">
      <div class="projection-label">Projecao Liquida</div>
      <div class="projection-value" style="color:var(--accent)">${RS(projection.projectedNet)}</div>
      <div class="projection-sub">Taxa atual de devolução: ${projection.currentReturnRate.toFixed(1)}%</div>
      <div class="projection-meta">Realizado ate agora: ${RS(totals.net)}</div>
    </div>
    <div class="projection-card projection-platform-card">
      <div class="projection-platform-head">
        <div>
          <div class="projection-label">Projecao de Vendas por Plataforma</div>
          <div class="projection-sub">Estimativa calculada pela mesma media diaria do mes atual</div>
        </div>
        <div class="projection-platform-total">${RS(projectedPlatformTotal)}</div>
      </div>
      <div class="projection-platform-list">
        ${platformProjectionHtml}
      </div>
    </div>
  `;
}

function renderCommission() {
  const totals = calcTotals(state.currentMonth);
  const commission = totals.net * 0.01;
  document.getElementById("commissionCard").innerHTML = `
    <div class="commission-shell">
      <div class="commission-copy">
        <div class="commission-label">Minha Comissao</div>
        <div class="commission-title">1% do faturamento líquido</div>
        <div class="commission-sub">Calculado sobre o faturamento líquido realizado do mês atual.</div>
      </div>
      <div class="commission-value-wrap">
        <div class="commission-value">${R(commission)}</div>
        <div class="commission-meta">Base de calculo: ${R(totals.net)}</div>
      </div>
    </div>
  `;
}

function renderAll() {
  if (!getPlatforms().length || !state.db[state.currentMonth]) return;
  renderKPIs();
  renderDailyChart();
  renderDailyTable();
  renderDonut();
  renderWeekly();
  renderBestDays();
  renderPlatformTable();
  renderMonthCompare();
  renderProjection();
  renderCommission();
}

function switchTab(name) {
  document.querySelectorAll(".itab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });
  document.querySelectorAll(".ipanel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${name}`);
  });
  if (name === "returns") renderReturnInputs();
}

function addSale() {
  const month = document.getElementById("inputMonth").value;
  const dateValue = document.getElementById("inputDate").value;
  const ordersValue = Math.max(0, Math.round(parseFloat(document.getElementById("inputOrders")?.value || 0) || 0));
  if (!dateValue) {
    toast("Selecione a data");
    return;
  }

  ensureMonthData(month);

  const parts = dateValue.split("-");
  const selectedMonthIndex = getMonthIndexByName(month);
  if (selectedMonthIndex < 0) {
    toast("Mes invalido");
    return;
  }
  if (Number(parts[1]) !== selectedMonthIndex + 1) {
    document.getElementById("inputDate").value = getSuggestedInputDate(month);
    toast("A data foi ajustada para o mês selecionado");
    return;
  }
  const label = `${parts[2]}/${parts[1]}`;
  const entry = { d: label };
  let hasAnyValue = false;

  getPlatforms().forEach((platform) => {
    const value = parseFloat(document.getElementById(`sale_${platform.key}`)?.value || 0) || 0;
    entry[platform.key] = value;
    const ordersPerPlatform = Math.max(0, Math.round(parseFloat(document.getElementById(`orders_${platform.key}`)?.value || 0) || 0));
    entry[`orders_${platform.key}`] = ordersPerPlatform;
    if (value > 0) hasAnyValue = true;
  });

  if (!hasAnyValue) {
    toast("Insira ao menos um valor");
    return;
  }

  const existingIndex = state.db[month].days.findIndex((day) => day.d === label);
  if (existingIndex >= 0) {
    getPlatforms().forEach((platform) => {
      state.db[month].days[existingIndex][platform.key] = Number(state.db[month].days[existingIndex][platform.key] || 0) + Number(entry[platform.key] || 0);
      const ordersKey = `orders_${platform.key}`;
      state.db[month].days[existingIndex][ordersKey] = Math.max(0, Math.round(Number(state.db[month].days[existingIndex][ordersKey] || 0) + Number(entry[ordersKey] || 0)));
    });
  } else {
    state.db[month].days.push(normalizeDay(entry));
    state.db[month].days = sortDays(state.db[month].days);
  }

  saveState();
  if (month === state.currentMonth) renderAll();
  clearSale();
  toast(`Vendas registradas em ${month}`);
}

function clearSale() {
  getPlatforms().forEach((platform) => {
    const el = document.getElementById(`sale_${platform.key}`);
    if (el) el.value = "";
    const ordersEl = document.getElementById(`orders_${platform.key}`);
    if (ordersEl) ordersEl.value = "";
  });
  const ordersInput = document.getElementById("inputOrders");
  if (ordersInput) ordersInput.value = "";
}

function saveReturns() {
  const month = document.getElementById("returnMonth").value;
  ensureMonthData(month);

  getPlatforms().forEach((platform) => {
    state.db[month].returns[platform.key] = parseFloat(document.getElementById(`ret_${platform.key}`)?.value || 0) || 0;
  });

  saveState();
  if (month === state.currentMonth) renderAll();
  toast(`Devolucoes salvas para ${month}`);
}

function openAddMonth() {
  closeHeaderMenu();
  newMonthSel = null;
  const existing = Object.keys(state.db);
  document.getElementById("monthPicker").innerHTML = ALL_MONTHS.map((month) => {
    const done = existing.includes(month);
    return `<button class="mbtn" ${done ? "disabled" : ""} data-picker-month="${month}" type="button">${SHORT[month] || month}${done ? " ✓" : ""}</button>`;
  }).join("");
  document.getElementById("addMonthModal").classList.add("open");
}

function openDeleteMonthModal() {
  const months = Object.keys(state.db);
  if (months.length <= 1) {
    toast("Mantenha ao menos um mês no dashboard");
    return;
  }
  pendingDeleteMonth = state.currentMonth;
  document.getElementById("deleteMonthSubtitle").textContent = `Confirme a exclusão de ${pendingDeleteMonth}.`;
  closeModal("addMonthModal");
  document.getElementById("deleteMonthModal").classList.add("open");
}

function pickMonth(month, button) {
  newMonthSel = month;
  document.querySelectorAll("#monthPicker .mbtn").forEach((btn) => btn.classList.remove("sel"));
  button.classList.add("sel");
}

function confirmAddMonth() {
  if (!newMonthSel) {
    toast("Selecione um mês");
    return;
  }
  ensureMonthData(newMonthSel);
  state.currentMonth = newMonthSel;
  saveState();
  closeModal("addMonthModal");
  renderTabs();
  renderAll();
  toast(`${newMonthSel} criado`);
}

function confirmDeleteMonth() {
  if (!pendingDeleteMonth || !state.db[pendingDeleteMonth]) {
    closeModal("deleteMonthModal");
    return;
  }

  delete state.db[pendingDeleteMonth];
  const remainingMonths = Object.keys(state.db);
  state.currentMonth = remainingMonths.includes(state.currentMonth)
    ? state.currentMonth
    : (remainingMonths[remainingMonths.length - 1] || getDefaultMonth());
  ensureMonthData(state.currentMonth);
  pendingDeleteMonth = null;
  saveState();
  closeModal("deleteMonthModal");
  renderTabs();
  renderAll();
  toast("Mes excluido com sucesso");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  if (id === "deleteMonthModal") pendingDeleteMonth = null;
  if (id === "importBackupModal") pendingImportMode = "merge";
}

function openImportBackupModal() {
  closeHeaderMenu();
  pendingImportMode = "merge";
  updateImportModeUI();
  document.getElementById("importBackupModal").classList.add("open");
}

function openChangePasswordModal() {
  closeHeaderMenu();
  document.getElementById("currentPasswordInput").value = "";
  document.getElementById("newPasswordInput").value = "";
  document.getElementById("confirmPasswordInput").value = "";
  document.getElementById("changePasswordModal").classList.add("open");
}

function openDailyDetailsModal() {
  closeHeaderMenu();
  renderDailyTable();
  document.getElementById("dailyDetailsModal").classList.add("open");
}

async function saveChangedPassword() {
  const currentPassword = document.getElementById("currentPasswordInput").value;
  const newPassword = document.getElementById("newPasswordInput").value;
  const confirmPassword = document.getElementById("confirmPasswordInput").value;

  if (!state.auth?.username) {
    toast("Nenhum usuário encontrado");
    return;
  }
  if (!currentPassword || !newPassword || !confirmPassword) {
    toast("Preencha todos os campos");
    return;
  }
  if (newPassword.length < 4) {
    toast("Use pelo menos 4 caracteres");
    return;
  }
  if (newPassword !== confirmPassword) {
    toast("A confirmação da senha não confere");
    return;
  }

  try {
    await readBackendJson("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        username: state.auth.username,
        currentPassword,
        newPassword
      })
    });
    state.auth = normalizeAuth({
      ...state.auth,
      password: ""
    });
    saveState();
    closeModal("changePasswordModal");
    toast("Senha atualizada com sucesso");
  } catch (error) {
    toast(error?.message === "invalid_current_password"
      ? "Senha atual incorreta"
      : "Não foi possível atualizar a senha");
  }
}

function openReport() {
  closeHeaderMenu();
  const month = state.currentMonth;
  const comparison = getComparisonPeriod(month);
  const totals = comparison.currentTotals;
  const previousName = comparison.previousName;
  const previousTotals = comparison.previousTotals;
  const previousLabel = previousTotals && comparison.cutoffDay
    ? `${previousName} ate dia ${comparison.cutoffDay}`
    : previousName;
  const active = getPlatforms().filter((platform) => totals.sales[platform.key] > 0 || totals.ret[platform.key] > 0);
  const maxNet = previousTotals ? Math.max(totals.net, previousTotals.net, 1) : Math.max(totals.net, 1);

  document.getElementById("reportTitle").textContent = `Relatorio - ${month} ${getCurrentYear()}`;

  const platformRows = active.map((platform) => {
    const value = totals.sales[platform.key] || 0;
    const returns = totals.ret[platform.key] || 0;
    const net = Math.max(0, value - returns);
    const previousValue = previousTotals ? Math.max(0, (previousTotals.sales[platform.key] || 0) - (previousTotals.ret[platform.key] || 0)) : null;
    return `<tr><td>${platformBadge(platform)}</td><td>${R(value)}</td><td class="neg">${returns > 0 ? R(returns) : "-"}</td><td style="font-size:12px;color:var(--muted)">${value > 0 ? ((returns / value) * 100).toFixed(1) : 0}%</td><td style="font-family:var(--font-ui);font-weight:700">${R(net)}</td><td>${previousValue !== null ? varH(net, previousValue) : dash}</td></tr>`;
  }).join("");

  const compareRows = previousTotals ? active.map((platform) => {
    const currentNet = Math.max(0, (totals.sales[platform.key] || 0) - (totals.ret[platform.key] || 0));
    const previousNet = Math.max(0, (previousTotals.sales[platform.key] || 0) - (previousTotals.ret[platform.key] || 0));
    const maxValue = Math.max(currentNet, previousNet, 1);
    return `<div class="pcrow"><div class="pcname">${platformBadge(platform, true)}</div><div class="pcbars"><div class="pcbar-cur" style="width:${((currentNet / maxValue) * 100).toFixed(0)}%;background:${platform.color}"></div><div class="pcbar-prev" style="width:${((previousNet / maxValue) * 100).toFixed(0)}%;background:${platform.color}"></div></div><div class="pcvals"><div class="pcval-cur">${RS(currentNet)}</div><div class="pcval-var">${varH(currentNet, previousNet)}</div></div></div>`;
  }).join("") : '<div style="color:var(--muted);font-size:12px;padding:10px 0">Sem mês anterior.</div>';

  document.getElementById("reportContent").innerHTML = `
    <div class="rkpis">
      <div class="rkpi"><div class="rkpi-label">Faturamento Bruto</div><div class="rkpi-val">${R(totals.gross)}</div><div class="rkpi-sub">${previousTotals ? varH(totals.gross, previousTotals.gross) : ""}</div></div>
      <div class="rkpi"><div class="rkpi-label">Pedidos</div><div class="rkpi-val">${totals.orders}</div><div class="rkpi-sub">${totals.orders > 0 ? `${RS(totals.gross / totals.orders)} por pedido` : "Sem pedidos lançados"}</div></div>
      <div class="rkpi"><div class="rkpi-label">Devolucoes</div><div class="rkpi-val neg">${R(totals.totalRet)}</div><div class="rkpi-sub" style="color:var(--muted)">${totals.gross > 0 ? ((totals.totalRet / totals.gross) * 100).toFixed(1) : 0}% do bruto</div></div>
      <div class="rkpi" style="border:1px solid rgba(232,255,71,.25)"><div class="rkpi-label">Faturamento Liquido</div><div class="rkpi-val" style="color:var(--accent)">${R(totals.net)}</div><div class="rkpi-sub">${previousTotals ? varH(totals.net, previousTotals.net) : ""}</div></div>
    </div>
    <div class="msection">
      <div class="msec-title">Detalhamento por Plataforma</div>
      <table class="rtable"><thead><tr><th>Plataforma</th><th>Bruto</th><th>Devolucoes</th><th>% Dev.</th><th>Liquido</th><th>vs. Mes Ant.</th></tr></thead><tbody>${platformRows}</tbody><tfoot><tr><td style="color:var(--accent)">Total</td><td>${R(totals.gross)}</td><td class="neg">${R(totals.totalRet)}</td><td style="color:var(--muted)">${totals.gross > 0 ? ((totals.totalRet / totals.gross) * 100).toFixed(1) : 0}%</td><td style="color:var(--accent)">${R(totals.net)}</td><td>${previousTotals ? varH(totals.net, previousTotals.net) : "-"}</td></tr></tfoot></table>
    </div>
    ${previousTotals ? `<div class="msection">
      <div class="msec-title">Comparativo Visual - ${month} vs ${previousLabel}</div>
      <div class="cvis">
        <div class="cvis-item"><div class="cvis-month">${month}</div><div class="cvis-val" style="color:var(--accent)">${R(totals.net)}</div><div style="font-size:11px;color:var(--muted);margin-bottom:6px">Bruto: ${R(totals.gross)} · Dev: ${R(totals.totalRet)}</div><div class="cvis-bar"><div class="cvis-fill" style="width:${((totals.net / maxNet) * 100).toFixed(1)}%;background:var(--accent)"></div></div></div>
        <div class="cvis-item"><div class="cvis-month">${previousLabel}</div><div class="cvis-val">${R(previousTotals.net)}</div><div style="font-size:11px;color:var(--muted);margin-bottom:6px">Bruto: ${R(previousTotals.gross)} · Dev: ${R(previousTotals.totalRet)}</div><div class="cvis-bar"><div class="cvis-fill" style="width:${((previousTotals.net / maxNet) * 100).toFixed(1)}%;background:var(--accent2)"></div></div></div>
      </div>
      <div class="msec-title">Por Plataforma - barra sólida = atual · transparente = anterior</div>
      ${compareRows}
    </div>` : ""}`;

  document.getElementById("reportModal").classList.add("open");
}

async function exportReportPNG() {
  const button = document.getElementById("exportReportButton");
  const title = document.getElementById("reportTitle")?.textContent || "Relatorio";
  const subtitle = document.querySelector("#reportModal .modal-subtitle")?.textContent || "";
  const reportModal = document.querySelector("#reportModal .modal");

  if (!reportModal || !window.html2canvas) {
    toast("Não foi possível exportar o relatório");
    return;
  }

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Exportando...";

  const exportRoot = document.createElement("div");
  exportRoot.className = "pdf-export-root";
  exportRoot.innerHTML = `
    <div class="modal rmodal pdf-export-modal">
      <div class="mheader">
        <div>
          <div class="mtitle">${title}</div>
          <div class="card-sub modal-subtitle">${subtitle}</div>
        </div>
      </div>
      <div>${document.getElementById("reportContent").innerHTML}</div>
    </div>
  `;
  document.body.appendChild(exportRoot);

  try {
    const canvas = await window.html2canvas(exportRoot.querySelector(".pdf-export-modal"), {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true
    });
    const imageURL = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imageURL;
    link.download = `${slugifyText(title)}.png`;
    link.click();
    toast("PNG exportado com sucesso");
  } catch (error) {
    console.error(error);
    toast("Não foi possível exportar o PNG");
  } finally {
    exportRoot.remove();
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function getBackupPayload() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    theme: currentTheme,
    sessionUser,
    state
  };
}

function exportBackup() {
  const payload = JSON.stringify(getBackupPayload(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dashboard-vendas-backup-${slugifyText(state.currentMonth || "dados")}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStorageStatus("Backup exportado com sucesso");
  toast("Backup exportado com sucesso");
  closeHeaderMenu();
}

async function saveNow() {
  saveState();
  await persistBusinessStateToServer();
  toast("Dados salvos no servidor");
  closeHeaderMenu();
}

function replaceImportedState(restoredState) {
  state.platforms = restoredState.platforms.map((platform) => clone(platform));
  state.db = clone(restoredState.db || {});
  state.currentMonth = restoredState.currentMonth || getDefaultMonth();
  ensureStateMonths(state);
}

function applyImportedBackup(payload, mode = "merge") {
  const previousAuth = state.auth ? clone(state.auth) : null;
  const previousSession = sessionUser;
  const source = payload?.state
    ? payload.state
    : payload?.dashboardData
      ? convertLegacyBackup(payload)
      : payload;
  const restoredState = normalizeState(source);
  state.auth = previousAuth || restoredState.auth;
  if (mode === "replace") {
    replaceImportedState(restoredState);
  } else {
    mergeImportedState(restoredState);
  }
  if (payload?.theme === "light" || payload?.theme === "dark") currentTheme = payload.theme;
  saveState();
  saveTheme();
  if (previousSession && state.auth?.username === previousSession.username && (state.auth?.provider || "local") === previousSession.provider) {
    saveSession(previousSession.username, previousSession.provider, previousSession.serverSessionToken || "");
  }
  applyTheme();
  renderScreen();
  void migrateLegacyLocalAuthIfNeeded();
}

function renderCalculatorCalculatedParts() {
  if (activeAppScreen !== "calculator") return;
  const activeInput = document.activeElement?.closest?.("[data-pricing-profile]");
  const activeProfile = activeInput?.dataset?.pricingProfile;
  const activeField = activeInput?.dataset?.field;
  const baseCost = document.getElementById("pricingBaseCost");
  if (baseCost) baseCost.textContent = R(getPricingBaseCost());
  renderCalculatorProfiles();
  if (activeProfile && activeField) {
    const nextInput = [...document.querySelectorAll("[data-pricing-profile]")]
      .find((input) => input.dataset.pricingProfile === activeProfile && input.dataset.field === activeField);
    if (nextInput && !nextInput.disabled) {
      nextInput.focus();
      const end = nextInput.value.length;
      nextInput.setSelectionRange?.(end, end);
    }
  }
}

function updatePricingValue(field, value, renderMode = "full") {
  if (!state.pricing) state.pricing = normalizePricing({}, getPlatforms());
  state.pricing[field] = Number(value || 0);
  saveState();
  if (activeAppScreen === "calculator") {
    if (renderMode === "calculated") renderCalculatorCalculatedParts();
    else renderCalculatorScreen();
  }
}

function updatePricingMode(mode) {
  state.pricing.mode = mode === "profit" ? "profit" : "margin";
  saveState();
  if (activeAppScreen === "calculator") renderCalculatorScreen();
}

function updatePricingProfileValue(platformKey, field, value) {
  const platform = getPlatformByKey(platformKey);
  if (!platform) return;
  if (!state.pricing.profiles[platformKey]) {
    state.pricing.profiles[platformKey] = normalizePricingProfile(platform);
  }
  state.pricing.profiles[platformKey][field] = Number(value || 0);
  state.pricing.profiles[platformKey].sourceType = "custom";
  saveState();
  if (activeAppScreen === "calculator") renderCalculatorCalculatedParts();
}

async function importBackupFile(file, mode = pendingImportMode) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    
    // 👇 ADICIONE ESTA VERIFICAÇÃO 👇
    const isGoogleBackup = payload?.state?.auth?.provider === "google" || 
                          payload?.state?.auth?.googleEmail;
    
    if (isGoogleBackup) {
      console.log("Detectado backup do Google, migrando...");
      await migrateFromGoogleBackup(payload);
    }
    
    applyImportedBackup(payload, mode);
    closeModal("importBackupModal");
    
    const message = isGoogleBackup 
      ? "Backup do Google migrado com sucesso!" 
      : mode === "replace" 
        ? "Backup importado e substituido com sucesso" 
        : "Backup importado com sucesso";
    
    toast(message);
  } catch (error) {
    console.error("Falha ao importar backup:", error);
    toast("Não foi possível importar o backup");
  }
}

function bindEvents() {
  document.getElementById("authModeLoginButton").addEventListener("click", () => {
    authMode = "login";
    renderAuthScreen();
  });
  document.getElementById("authModeCreateButton").addEventListener("click", () => {
    authMode = "create";
    renderAuthScreen();
  });
  document.getElementById("authSubmitButton").addEventListener("click", handleAuthSubmit);
  document.getElementById("openDashboardCard").addEventListener("click", openDashboardScreen);
  document.getElementById("openCalculatorCard").addEventListener("click", openCalculatorScreen);
  document.getElementById("hubManagePlatformsButton").addEventListener("click", openSetupEditor);
  document.getElementById("hubImportBackupButton").addEventListener("click", openImportBackupModal);
  document.getElementById("hubLogoutButton").addEventListener("click", handleLogout);
  ["authUsername", "authPassword"].forEach((id) => {
    document.getElementById(id).addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAuthSubmit();
      }
    });
  });
  document.getElementById("inputMonth").addEventListener("change", () => {
    syncSaleDateWithMonth();
  });
  document.getElementById("addPlatformConfigButton").addEventListener("click", addPlatformConfig);
  document.getElementById("cancelPlatformEditButton").addEventListener("click", resetPlatformForm);
  document.getElementById("importBackupSetupButton").addEventListener("click", openImportBackupModal);
  document.getElementById("finishSetupButton").addEventListener("click", finishSetup);
  document.getElementById("logoutFromSetupButton").addEventListener("click", handleLogout);
  document.getElementById("logoutButton").addEventListener("click", handleLogout);
  document.getElementById("openHubButton").addEventListener("click", openHubScreen);
  document.getElementById("openCalculatorButton").addEventListener("click", openCalculatorScreen);
  document.getElementById("managePlatformsButton").addEventListener("click", openSetupEditor);
  document.getElementById("changePasswordButton").addEventListener("click", openChangePasswordModal);
  document.getElementById("openDailyDetailsButton").addEventListener("click", openDailyDetailsModal);
  document.getElementById("saveNowButton").addEventListener("click", saveNow);
  document.getElementById("exportBackupButton").addEventListener("click", exportBackup);
  document.getElementById("importBackupButton").addEventListener("click", openImportBackupModal);
  document.getElementById("menuToggleButton").addEventListener("click", toggleHeaderMenu);
  document.getElementById("confirmImportBackupButton").addEventListener("click", () => document.getElementById("backupFileInputModal").click());
  document.getElementById("backupFileInputModal").addEventListener("change", (event) => {
    importBackupFile(event.target.files?.[0], pendingImportMode);
    event.target.value = "";
  });
  document.getElementById("savePasswordButton").addEventListener("click", saveChangedPassword);
  document.getElementById("themeToggleButton").addEventListener("click", toggleTheme);
  document.getElementById("addMonthButton").addEventListener("click", openAddMonth);
  document.getElementById("openDeleteMonthButton").addEventListener("click", openDeleteMonthModal);
  document.getElementById("confirmDeleteMonthButton").addEventListener("click", confirmDeleteMonth);
  document.getElementById("reportButton").addEventListener("click", openReport);
  document.getElementById("calculatorBackToHubButton").addEventListener("click", openHubScreen);
  document.getElementById("calculatorOpenDashboardButton").addEventListener("click", openDashboardScreen);
  document.getElementById("calculatorManagePlatformsButton").addEventListener("click", openSetupEditor);
  document.getElementById("dailyCloseBackToHubButton").addEventListener("click", openHubScreen);
  document.getElementById("dailyCloseOpenDashboardButton").addEventListener("click", openDashboardScreen);
  document.getElementById("dailyCloseManagePlatformsButton").addEventListener("click", openSetupEditor);
  document.getElementById("dailyClosePlatformGrid").addEventListener("input", (event) => {
    if (event.target.closest("[data-daily-close-input]")) updateDailyClosePreview();
  });
  document.getElementById("dailyCloseDate").addEventListener("change", updateDailyClosePreview);
  document.getElementById("downloadDailyCloseButton").addEventListener("click", downloadDailyCloseReport);
  document.getElementById("copyDailyCloseButton").addEventListener("click", copyDailyCloseReport);
  document.getElementById("clearDailyCloseButton").addEventListener("click", clearDailyClose);
  document.getElementById("registerSaleButton").addEventListener("click", addSale);
  document.getElementById("clearSaleButton").addEventListener("click", clearSale);
  document.getElementById("saveReturnsButton").addEventListener("click", saveReturns);
  document.getElementById("cancelReturnsButton").addEventListener("click", renderReturnInputs);
  document.getElementById("confirmAddMonthButton").addEventListener("click", confirmAddMonth);
  document.getElementById("exportReportButton").addEventListener("click", exportReportPNG);
  document.getElementById("returnMonth").addEventListener("change", renderReturnInputs);
  document.getElementById("pricingModeMargin").addEventListener("click", () => updatePricingMode("margin"));
  document.getElementById("pricingModeProfit").addEventListener("click", () => updatePricingMode("profit"));
  ["pricingProductCost", "pricingPackagingCost", "pricingExtraCost", "pricingShippingSubsidy", "pricingTargetMargin", "pricingTargetProfit", "pricingManualPrice"].forEach((id) => {
    const field = {
      pricingProductCost: "productCost",
      pricingPackagingCost: "packagingCost",
      pricingExtraCost: "extraCost",
      pricingShippingSubsidy: "shippingSubsidy",
      pricingTargetMargin: "targetMargin",
      pricingTargetProfit: "targetProfit",
      pricingManualPrice: "manualPrice"
    }[id];
    document.getElementById(id).addEventListener("input", (event) => updatePricingValue(field, event.target.value, "calculated"));
    document.getElementById(id).addEventListener("change", (event) => updatePricingValue(field, event.target.value, "full"));
  });
  document.getElementById("pricingPlatformGrid").addEventListener("input", (event) => {
    const input = event.target.closest("[data-pricing-profile]");
    if (!input) return;
    updatePricingProfileValue(input.dataset.pricingProfile, input.dataset.field, input.value);
  });
  document.getElementById("pricingPlatformGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-pricing-manual-price]");
    if (!button) return;
    updatePricingValue("manualPrice", button.dataset.pricingManualPrice, "full");
  });

  document.querySelectorAll(".itab").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  document.addEventListener("click", (event) => {
    const menu = document.getElementById("headerMenu");
    const toggle = document.getElementById("menuToggleButton");
    if (menu && toggle && !menu.hidden && !event.target.closest("#headerMenu") && !event.target.closest("#menuToggleButton")) {
      closeHeaderMenu();
    }

    const monthTab = event.target.closest("[data-month]");
    if (monthTab) {
      switchMonth(monthTab.dataset.month);
      return;
    }

    const pickerButton = event.target.closest("[data-picker-month]");
    if (pickerButton && !pickerButton.disabled) {
      pickMonth(pickerButton.dataset.pickerMonth, pickerButton);
      return;
    }

    const removeButton = event.target.closest("[data-remove-platform]");
    if (removeButton) {
      removePlatformConfig(removeButton.dataset.removePlatform);
      return;
    }

    const editButton = event.target.closest("[data-edit-platform]");
    if (editButton) {
      startPlatformEdit(editButton.dataset.editPlatform);
      return;
    }

    const importModeButton = event.target.closest("[data-import-mode]");
    if (importModeButton) {
      pendingImportMode = importModeButton.dataset.importMode;
      updateImportModeUI();
      return;
    }

    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) {
      closeModal(closeButton.dataset.closeModal);
    }
  });

  document.getElementById("dailyDetailsTable").addEventListener("focusin", (event) => {
    const cell = event.target.closest(".ceditable");
    if (cell) selectAll(cell);
  });

  document.getElementById("dailyDetailsTable").addEventListener("blur", (event) => {
    const cell = event.target.closest(".ceditable");
    if (!cell) return;
    updateCell(Number(cell.dataset.dayIndex), cell.dataset.platformKey, cell);
  }, true);

  document.querySelectorAll(".moverlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal(overlay.id);
    });
  });
}

// Substitua a função init() atual (linhas ~1780) por esta versão corrigida:
async function init() {
  const storedAuth = loadStoredAuth();
  if (!state.auth?.username && storedAuth?.username) {
    state.auth = storedAuth;
    saveState();
  }
  
  applyTheme();
  bindEvents();
  
  const menuButton = document.getElementById("menuToggleButton");
  if (menuButton) menuButton.textContent = "\u2630";
  const themeButton = document.getElementById("themeToggleButton");
  if (themeButton) {
    themeButton.textContent = currentTheme === "light" ? "\u263E" : "\u2600";
  }
  
  window.addEventListener("beforeunload", saveState);
  
  // Carregar dados primeiro
  if (isSessionActive()) {
    try {
      await loadBusinessStateFromServer({ migrateLocal: true });
    } catch (error) {
      console.error("Falha ao carregar dados:", error);
    }
  } else {
    // Tentar carregar dados locais
    const legacyState = loadLegacyBusinessState();
    if (legacyState) {
      applyBusinessState(legacyState);
    }
  }
  
  // Garantir que o mês atual tenha dados
  ensureStateMonths(state);
  
  // Renderizar a tela APÓS carregar os dados
  renderScreen();
  void migrateLegacyLocalAuthIfNeeded();
}

void init();
