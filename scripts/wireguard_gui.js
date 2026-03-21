#!/usr/bin/env node
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const {
  HANDSHAKE_WINDOW_MS,
  parseWgShowPeers,
  buildDashboardSites,
  buildCardSections,
  allocateTechnicianRecord,
  buildTechnicianConfig,
  slugifyName,
} = require('./lib/wireguard_dashboard');
const {
  readHubWgShow,
  generateWireGuardKeypair,
  ensureHubPeer,
} = require('./lib/hub_ssh');

const HOST = '127.0.0.1';
const PORT = Number(process.env.WG_GUI_PORT || 8787);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const DEFAULT_CONTROLLER_ID = '9ff47342d5f1f575a3a37dc0b6051f03';
const FIXED_WG_ENDPOINT = '191.248.70.82:51820';
const HUB_PUBLIC_ENDPOINT = '191.248.70.82:51821';
const DEFAULT_HUB_HOST = '192.168.1.253';
const DEFAULT_HUB_USER = 'salthub';
const DEFAULT_HUB_WG_IF = 'wg0';
const DEFAULT_HUB_PUBLIC_KEY = 'aDJDN47AzY1c8ilvGDcIMeh5zF3b+ofrGE9y9HNf7BU=';
const DEFAULT_OUTPUT_BASE = '/Users/edgardcontente/Resilio Sync/Salt - Operacional/Automação/Wireguard';
const CACHE_DIR = path.join(ROOT, 'wireguard-output', 'site-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'sites.json');
const SESSIONS_FILE = path.join(CACHE_DIR, 'active_sessions.json');
const CONFIG_DIR = path.join(ROOT, 'wireguard-output', 'config');
const DEFAULTS_FILE = path.join(CONFIG_DIR, 'gui-defaults.json');
const IPAM_DIR = path.join(ROOT, 'wireguard-output', 'ipam');
const IPAM_FILE = path.join(IPAM_DIR, 'ip_allocations.json');
const SITE_TUNNEL_IPAM_FILE = path.join(IPAM_DIR, 'site_tunnel_allocations.json');
const DASHBOARD_DIR = path.join(ROOT, 'wireguard-output', 'dashboard');
const TECHNICIAN_ALLOCATIONS_FILE = path.join(DASHBOARD_DIR, 'technician_allocations.json');
const DASHBOARD_CONFIGS_DIR = path.join(DASHBOARD_DIR, 'configs');

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      env: { ...process.env, ...(opts.env || {}) },
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    const timer = setTimeout(() => child.kill('SIGTERM'), opts.timeoutMs || 120000);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

function parseFormBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 5_000_000) reject(new Error('Payload muito grande'));
    });
    req.on('end', () => {
      try {
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params.entries()) obj[k] = v;
        resolve(obj);
      } catch (e) {
        reject(e);
      }
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendJson(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeSites(rawSites) {
  const arr = Array.isArray(rawSites) ? rawSites : [];
  const map = new Map();
  for (const x of arr) {
    const id = String(x?.id || x?.value || x?.siteId || x?.key || '').trim();
    const name = String(x?.name || x?.boxlabel || x?.siteName || '').trim();
    if (!id || !name) continue;
    const key = `${id}|${name.toLowerCase()}`;
    if (!map.has(key)) map.set(key, { id, name });
  }
  return [...map.values()];
}

function loadSiteCache() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      updatedAt: parsed?.updatedAt || '',
      sites: normalizeSites(parsed?.sites || []),
    };
  } catch {
    return { updatedAt: '', sites: [] };
  }
}

function saveSiteCache(sites, source = 'unknown') {
  const payload = {
    updatedAt: new Date().toISOString(),
    source,
    sites: normalizeSites(sites),
  };
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

function loadSessions() {
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const sessions = Array.isArray(parsed?.sessions) ? parsed.sessions : [];
    return {
      updatedAt: parsed?.updatedAt || '',
      sessions: sessions.map((s) => ({
        siteId: String(s.siteId || ''),
        siteName: String(s.siteName || ''),
        technician: String(s.technician || ''),
        ttlHours: Number(s.ttlHours || 0),
        activatedAt: String(s.activatedAt || ''),
        expiresAt: String(s.expiresAt || ''),
        status: String(s.status || 'active'),
      })).filter((s) => s.siteId),
    };
  } catch {
    return { updatedAt: '', sessions: [] };
  }
}

function saveSessions(sessions, source = 'unknown') {
  const payload = {
    updatedAt: new Date().toISOString(),
    source,
    sessions: Array.isArray(sessions) ? sessions : [],
  };
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

function purgeExpiredSessions(sessions) {
  const now = Date.now();
  const arr = Array.isArray(sessions) ? sessions : [];
  return arr.filter((s) => {
    if (s.status !== 'active') return false;
    const ts = Date.parse(String(s.expiresAt || ''));
    if (!Number.isFinite(ts)) return false;
    return ts > now;
  });
}

function buildActiveSessionsMap(sessions) {
  const map = new Map();
  for (const s of purgeExpiredSessions(sessions)) map.set(String(s.siteId), s);
  return map;
}

function formatDatePt(value) {
  try {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('pt-BR');
  } catch {
    return '-';
  }
}

function readHookScript(name) {
  const full = path.join(SCRIPTS, name);
  return fs.existsSync(full) ? full : '';
}

async function runHookIfExists(scriptName, env) {
  const hook = readHookScript(scriptName);
  if (!hook) {
    return { ok: true, code: 0, stdout: `[hook] ${scriptName} não encontrado; modo local aplicado.`, stderr: '' };
  }
  return run('bash', [hook], { timeoutMs: 120000, env });
}

function mergeSites(a, b) {
  return normalizeSites([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
}

function loadIpam() {
  try {
    const raw = fs.readFileSync(IPAM_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const allocations = Array.isArray(parsed?.allocations) ? parsed.allocations : [];
    return {
      updatedAt: parsed?.updatedAt || '',
      allocations: allocations.map((a) => ({
        siteId: String(a.siteId || ''),
        siteName: String(a.siteName || ''),
        client: String(a.client || ''),
        ip: String(a.ip || ''),
        status: String(a.status || 'active'),
        updatedAt: String(a.updatedAt || ''),
        confPath: String(a.confPath || ''),
      })).filter((a) => a.siteId && a.client && a.ip),
    };
  } catch {
    return { updatedAt: '', allocations: [] };
  }
}

function saveIpam(allocations, source = 'unknown') {
  const payload = {
    updatedAt: new Date().toISOString(),
    source,
    allocations: Array.isArray(allocations) ? allocations : [],
  };
  fs.mkdirSync(IPAM_DIR, { recursive: true });
  fs.writeFileSync(IPAM_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

function loadSiteTunnelIpam() {
  try {
    const raw = fs.readFileSync(SITE_TUNNEL_IPAM_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      updatedAt: parsed?.updatedAt || '',
      allocations: Array.isArray(parsed?.allocations) ? parsed.allocations : [],
    };
  } catch {
    return { updatedAt: '', allocations: [] };
  }
}

function loadTechnicianAllocations() {
  try {
    const raw = fs.readFileSync(TECHNICIAN_ALLOCATIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const allocations = Array.isArray(parsed?.allocations) ? parsed.allocations : [];
    return {
      updatedAt: parsed?.updatedAt || '',
      allocations,
    };
  } catch {
    return { updatedAt: '', allocations: [] };
  }
}

function saveTechnicianAllocations(allocations, source = 'unknown') {
  const payload = {
    updatedAt: new Date().toISOString(),
    source,
    allocations: Array.isArray(allocations) ? allocations : [],
  };
  fs.mkdirSync(DASHBOARD_DIR, { recursive: true });
  fs.mkdirSync(DASHBOARD_CONFIGS_DIR, { recursive: true });
  fs.writeFileSync(TECHNICIAN_ALLOCATIONS_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

function parseIpOctet(ip) {
  const m = String(ip || '').match(/^192\.168\.50\.(\d{1,3})\/32$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 && n <= 254 ? n : null;
}

function normalizeClientName(client) {
  return String(client || '').trim().toLowerCase();
}

function loadDefaults() {
  try {
    return JSON.parse(fs.readFileSync(DEFAULTS_FILE, 'utf8'));
  } catch {
    return {
      omadaUrl: 'https://omada.saltengenharia.com.br:8043',
      omadaUser: '',
      omadaPass: '',
      omadaCid: DEFAULT_CONTROLLER_ID,
      wgIfName: 'Home',
      wgIfIp: '192.168.50.10',
      wgEndpoint: FIXED_WG_ENDPOINT,
      wgDns: '192.168.16.1',
      wgAllowedIps: '0.0.0.0/0, ::/0',
      wgKeepalive: '25',
      wgMtu: '1280',
      outputBase: DEFAULT_OUTPUT_BASE,
      hubHost: DEFAULT_HUB_HOST,
      hubUser: DEFAULT_HUB_USER,
      hubPass: '',
      hubWgIf: DEFAULT_HUB_WG_IF,
      hubPublicEndpoint: HUB_PUBLIC_ENDPOINT,
      hubPublicKey: DEFAULT_HUB_PUBLIC_KEY,
      techDns: '1.1.1.1',
      techMtu: '1280',
      omadaOpenapiClientId: '',
      omadaOpenapiClientSecret: '',
    };
  }
}

function saveDefaults(data) {
  const payload = {
    omadaUrl: data.omadaUrl || 'https://omada.saltengenharia.com.br:8043',
    omadaUser: data.omadaUser || '',
    omadaPass: data.omadaPass || '',
    omadaCid: data.omadaCid || DEFAULT_CONTROLLER_ID,
    wgIfName: data.wgIfName || 'Home',
    wgIfIp: data.wgIfIp || '192.168.50.10',
    wgEndpoint: FIXED_WG_ENDPOINT,
    wgDns: data.wgDns || '192.168.16.1',
    wgAllowedIps: data.wgAllowedIps || '0.0.0.0/0, ::/0',
    wgKeepalive: String(data.wgKeepalive || '25'),
    wgMtu: String(data.wgMtu || '1280'),
    outputBase: data.outputBase || DEFAULT_OUTPUT_BASE,
    hubHost: data.hubHost || DEFAULT_HUB_HOST,
    hubUser: data.hubUser || DEFAULT_HUB_USER,
    hubPass: data.hubPass || '',
    hubWgIf: data.hubWgIf || DEFAULT_HUB_WG_IF,
    hubPublicEndpoint: data.hubPublicEndpoint || HUB_PUBLIC_ENDPOINT,
    hubPublicKey: data.hubPublicKey || DEFAULT_HUB_PUBLIC_KEY,
    techDns: data.techDns || '1.1.1.1',
    techMtu: String(data.techMtu || '1280'),
    omadaOpenapiClientId: data.omadaOpenapiClientId || '',
    omadaOpenapiClientSecret: data.omadaOpenapiClientSecret || '',
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(DEFAULTS_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

function parseDiscoverJson(stdout) {
  const s = String(stdout || '').trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function siteNameToDir(siteName) {
  return String(siteName || '').replaceAll(' ', '_');
}

function getUsedIpsFromConfFiles(outputBase, siteName) {
  const dir = path.join(outputBase, siteNameToDir(siteName));
  const used = new Set();
  const re = /Address\s*=\s*192\.168\.50\.(\d{1,3})\/32/g;
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.conf')) continue;
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      let m;
      while ((m = re.exec(content)) !== null) used.add(Number(m[1]));
    }
  } catch {}
  return used;
}

function getUsedIpsFromIpam(ipam, siteId) {
  const used = new Set();
  for (const a of ipam.allocations || []) {
    if (String(a.siteId) !== String(siteId)) continue;
    const n = parseIpOctet(a.ip);
    if (n !== null) used.add(n);
  }
  return used;
}

function findExistingClientAllocation(ipam, siteId, client) {
  const key = normalizeClientName(client);
  return (ipam.allocations || []).find((a) =>
    String(a.siteId) === String(siteId) && normalizeClientName(a.client) === key
  ) || null;
}

function allocateClientIp(ipam, outputBase, siteId, siteName, client) {
  const existing = findExistingClientAllocation(ipam, siteId, client);
  if (existing) return { ip: existing.ip, reused: true };

  const used = getUsedIpsFromIpam(ipam, siteId);
  for (const n of getUsedIpsFromConfFiles(outputBase, siteName)) used.add(n);

  for (let i = 11; i <= 250; i += 1) {
    if (!used.has(i)) return { ip: `192.168.50.${i}/32`, reused: false };
  }
  return { ip: '192.168.50.251/32', reused: false };
}

function upsertIpamAllocation(ipam, record) {
  const idx = (ipam.allocations || []).findIndex((a) =>
    String(a.siteId) === String(record.siteId) &&
    normalizeClientName(a.client) === normalizeClientName(record.client)
  );
  const next = { ...(idx >= 0 ? ipam.allocations[idx] : {}), ...record, updatedAt: new Date().toISOString() };
  const arr = Array.isArray(ipam.allocations) ? [...ipam.allocations] : [];
  if (idx >= 0) arr[idx] = next;
  else arr.push(next);
  return arr;
}

function extractConfPath(stdout) {
  const m = String(stdout || '').match(/CONF:\s*(.+\.conf)/);
  return m ? String(m[1]).trim() : '';
}

function parseClientFromConfFilename(name) {
  const s = String(name || '');
  const ts = s.match(/-(\d{8}-\d{6})\.conf$/);
  if (!ts) return s.replace(/\.conf$/i, '');
  return s.slice(0, ts.index);
}

function seedIpamFromExistingConfs(outputBase, sites) {
  if (fs.existsSync(IPAM_FILE)) return;
  const allocations = [];
  const siteMap = new Map((Array.isArray(sites) ? sites : []).map((s) => [String(s.name), String(s.id)]));
  try {
    const siteDirs = fs.readdirSync(outputBase, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const d of siteDirs) {
      const siteName = String(d.name || '').replaceAll('_', ' ');
      const siteId = siteMap.get(siteName) || '';
      if (!siteId) continue;
      const absDir = path.join(outputBase, d.name);
      for (const f of fs.readdirSync(absDir)) {
        if (!f.endsWith('.conf')) continue;
        const absFile = path.join(absDir, f);
        const content = fs.readFileSync(absFile, 'utf8');
        const m = content.match(/Address\s*=\s*(192\.168\.50\.\d{1,3}\/32)/);
        if (!m) continue;
        allocations.push({
          siteId,
          siteName,
          client: parseClientFromConfFilename(f),
          ip: m[1],
          status: 'active',
          confPath: absFile,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch {}
  if (allocations.length > 0) saveIpam(allocations, 'seed-from-conf-files');
}

function buildState(overrides = {}) {
  const defaults = loadDefaults();
  const cache = loadSiteCache();
  seedIpamFromExistingConfs(defaults.outputBase || DEFAULT_OUTPUT_BASE, cache.sites);
  const ipam = loadIpam();
  const loadedSessions = loadSessions();
  const activeSessions = purgeExpiredSessions(loadedSessions.sessions || []);
  const activeBySite = buildActiveSessionsMap(activeSessions);
  return {
    ...defaults,
    site: 'Everton Lima',
    client: 'MBP-Cliente',
    siteId: '',
    importJson: '',
    flash: null,
    sites: cache.sites,
    sitesUpdatedAt: cache.updatedAt || '',
    ipamCount: (ipam.allocations || []).length,
    ipamUpdatedAt: ipam.updatedAt || '',
    sessions: activeSessions,
    sessionsCount: activeSessions.length,
    sessionsUpdatedAt: loadedSessions.updatedAt || '',
    activeBySite,
    technician: 'Tecnico 1',
    ttlHours: '2',
    wgEndpoint: FIXED_WG_ENDPOINT,
    ...overrides,
  };
}

function buildHubConfig(defaults) {
  return {
    host: String(defaults.hubHost || DEFAULT_HUB_HOST).trim(),
    user: String(defaults.hubUser || DEFAULT_HUB_USER).trim(),
    pass: String(defaults.hubPass || '').trim(),
    wgInterface: String(defaults.hubWgIf || DEFAULT_HUB_WG_IF).trim(),
    publicEndpoint: String(defaults.hubPublicEndpoint || HUB_PUBLIC_ENDPOINT).trim(),
    publicKey: String(defaults.hubPublicKey || DEFAULT_HUB_PUBLIC_KEY).trim(),
    techDns: String(defaults.techDns || '1.1.1.1').trim(),
    techMtu: String(defaults.techMtu || '1280').trim(),
  };
}

function upsertTechnicianAllocation(allocations, record) {
  const arr = Array.isArray(allocations) ? [...allocations] : [];
  const idx = arr.findIndex((item) =>
    String(item.siteId) === String(record.siteId) &&
    String(item.technicianSlug) === String(record.technicianSlug)
  );
  const next = {
    ...(idx >= 0 ? arr[idx] : {}),
    ...record,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) arr[idx] = next;
  else arr.push(next);
  return arr;
}

function getTechnicianConfigPath(siteName, technicianSlug) {
  const siteDir = path.join(DASHBOARD_CONFIGS_DIR, slugifyName(siteName || 'site'));
  fs.mkdirSync(siteDir, { recursive: true });
  return path.join(siteDir, `${technicianSlug}.conf`);
}

function extractTaggedValue(text, label) {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, 'm');
  const match = String(text || '').match(pattern);
  return match ? String(match[1]).trim() : '';
}

function normalizeSitePublicKey(raw) {
  return String(raw || '').replace(/^Site public key:\s*/, '').trim();
}

async function buildDashboardState(overrides = {}) {
  const defaults = loadDefaults();
  const baseState = buildState(overrides);
  const hub = buildHubConfig(defaults);
  const siteTunnelIpam = loadSiteTunnelIpam();
  const technicianStore = loadTechnicianAllocations();

  let hubWgShow = '';
  let hubReadError = '';
  if (hub.host && hub.user && hub.pass) {
    try {
      hubWgShow = await readHubWgShow(hub);
    } catch (error) {
      hubReadError = error?.stderr || error?.stdout || error?.message || String(error);
    }
  } else {
    hubReadError = 'Preencha Host/Usuário/Senha do hub na Configuração Base para ler handshakes e gerar credenciais.';
  }

  const dashboard = buildDashboardSites({
    sites: baseState.sites || [],
    tunnelAllocations: siteTunnelIpam.allocations || [],
    technicianAllocations: technicianStore.allocations || [],
    hubPeers: hubWgShow ? parseWgShowPeers(hubWgShow) : [],
    hubEndpoint: hub.publicEndpoint,
    handshakeWindowMs: HANDSHAKE_WINDOW_MS,
  });

  return {
    ...baseState,
    hub,
    hubReadError,
    siteTunnelUpdatedAt: siteTunnelIpam.updatedAt || '',
    technicianAllocations: technicianStore.allocations || [],
    technicianUpdatedAt: technicianStore.updatedAt || '',
    dashboard,
    generatedCredential: null,
    repairPrompt: null,
  };
}

function getSiteFromCacheById(sites, id) {
  return (Array.isArray(sites) ? sites : []).find((s) => String(s.id) === String(id));
}

async function runSiteProvisionAndSync(selectedSite, defaults, hub, options = {}) {
  const env = {
    OMADA_URL: defaults.omadaUrl,
    OMADA_USERNAME: defaults.omadaUser,
    OMADA_PASSWORD: defaults.omadaPass,
    OMADA_CONTROLLER_ID: defaults.omadaCid,
    HUB_PUBLIC_KEY: hub.publicKey,
    HUB_ENDPOINT: hub.publicEndpoint,
    WG_INTERFACE_NAME: 'HUB-SPOKE',
    WG_INTERFACE_LISTEN_PORT: '51822',
    WG_FORCE_RECREATE: options.forceRecreate ? 'true' : 'false',
    OMADA_OPENAPI_CLIENT_ID: String(defaults.omadaOpenapiClientId || ''),
    OMADA_OPENAPI_CLIENT_SECRET: String(defaults.omadaOpenapiClientSecret || ''),
  };
  const out = await run('bash', [path.join(SCRIPTS, 'provision_site_spoke_to_hub.sh'), selectedSite.id, selectedSite.name], {
    timeoutMs: 300000,
    env,
  });

  if (!out.ok) return { ok: false, out };

  const sitePublicKey = normalizeSitePublicKey(extractTaggedValue(out.stdout, 'Site public key'));
  const siteTunnelIp = extractTaggedValue(out.stdout, 'Site tunnel IP').replace(/\/32$/, '').trim();
  if (!sitePublicKey || !siteTunnelIp) {
    return {
      ok: false,
      out: {
        ...out,
        ok: false,
        code: 500,
        stdout: `${out.stdout || ''}\nProvisionamento retornou sucesso, mas sem chave/IP do site.`,
      },
    };
  }

  await ensureHubPeer(hub, {
    marker: `${selectedSite.id}:site-spoke`,
    publicKey: sitePublicKey,
    allowedIp: `${siteTunnelIp}/32`,
    keepalive: 25,
  });

  if (options.waitForHandshakeMs) await sleep(options.waitForHandshakeMs);

  const refreshed = await buildDashboardState();
  const refreshedCard = (refreshed.dashboard?.cards || []).find((card) => String(card.siteId) === String(selectedSite.id));
  return { ok: true, out, refreshed, refreshedCard, sitePublicKey, siteTunnelIp };
}

function buildSiteOptions(state) {
  const options = ['<option value="">-- selecionar site --</option>'];
  for (const s of state.sites || []) {
    const sel = state.siteId && state.siteId === s.id ? ' selected' : '';
    const active = state.activeBySite?.get(String(s.id));
    const badge = active ? ' [ATIVO]' : '';
    options.push(`<option value="${esc(s.id)}"${sel}>${esc(s.name)} (${esc(s.id)})${badge}</option>`);
  }
  return options.join('');
}

function sessionsTable(state) {
  const sessions = Array.isArray(state.sessions) ? state.sessions : [];
  if (!sessions.length) return '<div class="hint">Nenhum acesso ativo no momento.</div>';
  const rows = sessions
    .slice()
    .sort((a, b) => String(a.expiresAt).localeCompare(String(b.expiresAt)))
    .map((s) => `
      <tr>
        <td>${esc(s.siteName || '-')}</td>
        <td>${esc(s.siteId)}</td>
        <td>${esc(s.technician || '-')}</td>
        <td>${esc(String(s.ttlHours || '-'))}h</td>
        <td>${esc(formatDatePt(s.activatedAt))}</td>
        <td>${esc(formatDatePt(s.expiresAt))}</td>
      </tr>
    `).join('');
  return `
    <div style="overflow:auto;">
      <table style="width:100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #334155; padding:6px;">Site</th>
            <th style="text-align:left; border-bottom:1px solid #334155; padding:6px;">Site ID</th>
            <th style="text-align:left; border-bottom:1px solid #334155; padding:6px;">Técnico</th>
            <th style="text-align:left; border-bottom:1px solid #334155; padding:6px;">TTL</th>
            <th style="text-align:left; border-bottom:1px solid #334155; padding:6px;">Ativado em</th>
            <th style="text-align:left; border-bottom:1px solid #334155; padding:6px;">Expira em</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function page(content, options = {}) {
  const title = esc(options.title || 'WireGuard Omada Helper');
  const extraHead = options.extraHead || '';
  const extraBody = options.extraBody || '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      --bg: #f7f7f4;
      --panel: #ffffff;
      --txt: #15211d;
      --muted: #56635e;
      --line: #d9dfda;
      --acc: #1f8f5f;
      --acc-soft: #e7f4ee;
      --btn2: #edf2ef;
      --btn2txt: #1e2e27;
      --warn: #b45309;
      --warn-soft: #fff2df;
      --bad: #b42318;
      --bad-soft: #fee4e2;
      --ok: #12715b;
      --ok-soft: #ddf4ea;
    }
    body { margin:0; font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(180deg, #ffffff 0%, var(--bg) 100%); color: var(--txt); }
    .topbar { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(12px); background: rgba(255,255,255,0.92); border-bottom: 1px solid var(--line); }
    .nav { max-width: 1180px; margin: 0 auto; padding: 12px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .brand { font-weight: 800; letter-spacing: 0.02em; }
    .navlinks { display:flex; gap:10px; flex-wrap:wrap; }
    .navlinks a { text-decoration:none; color: var(--btn2txt); background: var(--btn2); border:1px solid var(--line); padding:8px 12px; border-radius:999px; font-size:13px; font-weight:700; }
    .wrap { max-width: 1180px; margin: 24px auto; padding: 0 14px 24px; }
    .card { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 16px; margin-bottom: 14px; box-shadow: 0 14px 28px rgba(21, 33, 29, 0.05); }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 18px; margin: 0 0 10px; }
    .sub { color: var(--muted); margin: 0 0 12px; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
    .full { grid-column: 1 / -1; }
    label { display:block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
    input, select, textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #c7d0ca; border-radius: 12px; background: #ffffff; color: var(--txt); }
    button, .btn { border: 0; border-radius: 12px; padding: 10px 14px; color: #ffffff; background: var(--acc); font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-secondary { background: var(--btn2); color: var(--btn2txt); }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    pre { white-space: pre-wrap; background:#f3f5f4; border:1px solid var(--line); border-radius:12px; padding:10px; overflow:auto; color: #22312a; }
    .hint { font-size: 12px; color: var(--muted); margin-top: 6px; }
    .warn { color: var(--warn); }
    .metrics { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; margin: 18px 0 14px; }
    .metric { background: var(--panel); border:1px solid var(--line); border-radius: 18px; padding: 18px; box-shadow: 0 14px 28px rgba(21, 33, 29, 0.05); }
    .metric .eyebrow { font-size:12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
    .metric .value { font-size: 34px; font-weight: 800; margin-top: 6px; }
    .dashboard-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; }
    .status-badge { display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800; }
    .status-online { color: var(--ok); background: var(--ok-soft); }
    .status-stale { color: var(--warn); background: var(--warn-soft); }
    .status-warning { color: var(--bad); background: var(--bad-soft); }
    .meta { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:10px; margin-top:12px; }
    .meta-item { background:#f5f7f6; border:1px solid var(--line); border-radius:12px; padding:10px; }
    .meta-item span { display:block; font-size:12px; color: var(--muted); margin-bottom:4px; }
    .pill { display:inline-block; padding:6px 10px; border-radius:999px; background: var(--btn2); color: var(--btn2txt); font-size:12px; font-weight:700; }
    .qr-box { min-height: 220px; display:flex; align-items:center; justify-content:center; background:#f5f7f6; border:1px dashed #bfc9c3; border-radius:16px; }
    .muted-block { background:#f5f7f6; border:1px solid var(--line); border-radius:14px; padding:12px; }
    .toolbar { display:flex; gap:10px; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; margin-bottom:14px; }
    .toolbar form { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; }
    .toolbar .field { min-width: 200px; }
    .site-card { padding: 14px; }
    .site-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap; }
    .site-summary-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:8px; margin-top:12px; }
    .site-summary-item { background:#f5f7f6; border:1px solid var(--line); border-radius:12px; padding:8px 10px; }
    .site-summary-item span { display:block; font-size:11px; color:var(--muted); margin-bottom:3px; text-transform:uppercase; letter-spacing:0.04em; }
    .site-summary-item strong { font-size:13px; line-height:1.25; }
    .site-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-top:12px; }
    .site-actions form { margin:0; }
    .details-box { margin-top:10px; border:1px solid var(--line); border-radius:14px; background:#fafbf9; overflow:hidden; }
    .details-box summary { list-style:none; cursor:pointer; padding:10px 12px; font-size:13px; font-weight:700; color:var(--btn2txt); }
    .details-box summary::-webkit-details-marker { display:none; }
    .details-body { padding:0 12px 12px; }
    .tech-block { margin-top:12px; padding-top:12px; border-top:1px solid var(--line); }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    @media (max-width: 900px) { .dashboard-grid, .metrics, .meta, .site-summary-grid { grid-template-columns: 1fr; } }
  </style>
  ${extraHead}
</head>
<body>
  <div class="topbar">
    <div class="nav">
      <div class="brand">Salt WireGuard</div>
      <div class="navlinks">
        <a href="/dashboard">Dashboard</a>
        <a href="/">Helper Legado</a>
      </div>
    </div>
  </div>
  <div class="wrap">${content}</div>
  ${extraBody}
</body>
</html>`;
}

function flashCard(flash) {
  if (!flash) return '';
  const status = flash.ok ? 'OK' : 'FALHOU';
  return `
    <div class="card">
      <h2>${esc(flash.title || 'Resultado')}</h2>
      <div>Status: <strong>${status}</strong> (code ${esc(flash.code || 0)})</div>
      <pre>${esc(flash.body || '(sem saída)')}</pre>
    </div>
  `;
}

function statusBadge(card) {
  const cls = card.deploymentState === 'connected'
    ? 'status-online'
    : card.deploymentState === 'partial'
      ? 'status-warning'
      : 'status-stale';
  return `<span class="status-badge ${cls}">${esc(card.deploymentLabel || card.deploymentState)}</span>`;
}

function handshakeBadge(card) {
  const cls = card.handshakeState === 'online'
    ? 'status-online'
    : card.handshakeState === 'stale'
      ? 'status-stale'
      : 'status-warning';
  return `<span class="status-badge ${cls}">${esc(card.handshakeLabel || card.handshakeState)}</span>`;
}

function connectButton(card) {
  if (!card.connectActionEnabled) {
    return '<button type="button" class="btn btn-secondary" disabled style="opacity:0.7; cursor:not-allowed;">Conectado</button>';
  }
  return '<button type="submit">Conectar wireguard</button>';
}

function technicianButton(card) {
  if (!card.credentialActionEnabled) {
    return '<button type="submit" class="btn btn-secondary" disabled style="opacity:0.7; cursor:not-allowed;">Conecte o site primeiro</button>';
  }
  return '<button type="submit">Gerar credencial</button>';
}

function repairButton(card) {
  if (!card.repairActionEnabled) return '';
  return '<button type="submit" class="btn btn-secondary">Consertar conexão</button>';
}

function renderRepairPrompt(state, card) {
  const prompt = state.repairPrompt;
  if (!prompt || String(prompt.siteId) !== String(card.siteId)) return '';
  return `
    <div class="muted-block" style="margin-top:10px; border-color:#f1c27d; background:#fff8ef;">
      <strong>Reconciliação segura não recuperou o túnel.</strong>
      <div class="hint" style="margin-top:6px;">${esc(prompt.body || 'Você pode tentar a recriação completa do spoke e do peer deste site.')}</div>
      <div class="actions" style="margin-top:10px;">
        <form method="POST" action="/run/dashboard-recreate-site">
          <input type="hidden" name="siteId" value="${esc(card.siteId)}" />
          <button type="submit">Recriar conexão</button>
        </form>
        <form method="POST" action="/run/dashboard-cancel-repair">
          <input type="hidden" name="siteId" value="${esc(card.siteId)}" />
          <button type="submit" class="btn btn-secondary">Cancelar</button>
        </form>
      </div>
    </div>
  `;
}

function renderFactGrid(items) {
  return items.map((item) => `
    <div class="meta-item">
      <span>${esc(item.label)}</span>
      <strong>${esc(item.value || '-')}</strong>
    </div>
  `).join('');
}

function renderSummaryGrid(items) {
  return items.map((item) => `
    <div class="site-summary-item">
      <span>${esc(item.label)}</span>
      <strong>${esc(item.value || '-')}</strong>
    </div>
  `).join('');
}

function renderSiteTechnicians(state, card) {
  const rows = (state.technicianAllocations || [])
    .filter((item) => String(item.siteId) === String(card.siteId))
    .sort((a, b) => String(a.technicianName || '').localeCompare(String(b.technicianName || ''), 'pt-BR'))
    .map((item) => {
      const href = `/download/tech-conf?siteId=${encodeURIComponent(item.siteId)}&technicianSlug=${encodeURIComponent(item.technicianSlug)}`;
      return `
        <div class="muted-block" style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div>
            <strong>${esc(item.technicianName || item.technicianSlug)}</strong>
            <div class="hint">${esc(item.address || '-')}</div>
          </div>
          <a class="btn btn-secondary" href="${href}">Baixar .conf</a>
        </div>
      `;
    }).join('');

  if (!rows) return '<div class="hint">Nenhuma credencial gerada para este site ainda.</div>';
  return `<div style="display:grid; gap:10px;">${rows}</div>`;
}

function renderGeneratedCredential(state, card) {
  const generated = state.generatedCredential;
  if (!generated || String(generated.siteId) !== String(card.siteId)) return '';
  const qrId = `qr-${esc(generated.siteId)}-${esc(generated.technicianSlug)}`;
  return `
    <div class="card" style="margin-top:12px; background:#fcfcfa;">
      <h3 style="margin:0 0 8px;">Credencial Gerada Agora</h3>
      <div class="hint">Técnico: ${esc(generated.technicianName)} | IP: ${esc(generated.address)}</div>
      <div class="actions">
        <a class="btn" href="/download/tech-conf?siteId=${encodeURIComponent(generated.siteId)}&technicianSlug=${encodeURIComponent(generated.technicianSlug)}">Baixar .conf</a>
      </div>
      <div class="meta" style="margin-top:12px;">
        <div class="meta-item">
          <span>Prévia da configuração</span>
          <pre>${esc(generated.configText || '')}</pre>
        </div>
        <div class="meta-item">
          <span>QR Code</span>
          <div id="${qrId}" class="qr-box"></div>
        </div>
      </div>
      <script>
        window.__wgQrs = window.__wgQrs || [];
        window.__wgQrs.push({ id: ${JSON.stringify(qrId)}, text: ${JSON.stringify(generated.configText || '')} });
      </script>
    </div>
  `;
}

function dashboardHtml(state) {
  const q = String(state.dashboardQuery || '');
  const statusFilter = String(state.dashboardStatus || 'all');
  const allCards = state.dashboard?.cards || [];
  const cards = allCards.filter((card) => {
    const matchesQ = !q || `${card.siteName} ${card.siteId}`.toLowerCase().includes(q.toLowerCase());
    const matchesStatus = statusFilter === 'all' || card.deploymentState === statusFilter || card.handshakeState === statusFilter;
    return matchesQ && matchesStatus;
  });
  const summary = state.dashboard?.summary || { totalSites: 0, onlineSites: 0, problemSites: 0 };

  const cardsHtml = cards.map((card) => `
    <div class="card site-card">
      <div class="site-top">
        <div>
          <h2 style="margin-bottom:6px;">${esc(card.siteName)}</h2>
          <div class="hint">Site ID: ${esc(card.siteId)}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">${statusBadge(card)}${handshakeBadge(card)}</div>
      </div>

      <div class="site-summary-grid">${renderSummaryGrid(buildCardSections(card).summaryItems)}</div>

      ${card.issue ? `<div class="hint warn" style="margin-top:10px;">${esc(card.issue)}</div>` : ''}

      <div class="site-actions">
        <div class="actions">
          <form method="POST" action="/run/dashboard-connect-site">
            <input type="hidden" name="siteId" value="${esc(card.siteId)}" />
            ${connectButton(card)}
          </form>
          ${card.repairActionEnabled ? `
          <form method="POST" action="/run/dashboard-repair-safe">
            <input type="hidden" name="siteId" value="${esc(card.siteId)}" />
            ${repairButton(card)}
          </form>` : ''}
        </div>
        <span class="pill">${esc(String(card.technicianCount || 0))} credencial(is)</span>
      </div>

      ${renderRepairPrompt(state, card)}

      <details class="details-box">
        <summary>Ver detalhes e credenciais</summary>
        <div class="details-body">
          <div class="meta">
            ${renderFactGrid([
              { label: 'Último Handshake em', value: card.lastHandshakeAtMs ? formatDatePt(card.lastHandshakeAtMs) : '-' },
              ...buildCardSections(card).detailItems,
            ])}
          </div>

          <div class="tech-block">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
              <strong>Credenciais por técnico</strong>
              <span class="pill">${esc(String(card.technicianCount || 0))} cadastrada(s)</span>
            </div>

            <form method="POST" action="/run/dashboard-generate-tech" style="margin-top:12px;">
              <input type="hidden" name="siteId" value="${esc(card.siteId)}" />
              <div class="grid">
                <div><label>Nome do técnico/dispositivo</label><input name="technicianName" placeholder="Ex.: Joao MacBook" required ${card.credentialActionEnabled ? '' : 'disabled'} /></div>
                <div style="align-self:end;">${technicianButton(card)}</div>
              </div>
            </form>

            <div style="margin-top:12px;">${renderSiteTechnicians(state, card)}</div>
            ${renderGeneratedCredential(state, card)}
          </div>
        </div>
      </details>
    </div>
  `).join('');

  const extraHead = '<script src="/static/qrcode.min.js"></script>';
  const extraBody = `
    <script>
      (window.__wgQrs || []).forEach(function(item) {
        var target = document.getElementById(item.id);
        if (!target || !window.QRCode) return;
        target.innerHTML = '';
        new QRCode(target, {
          text: item.text,
          width: 220,
          height: 220,
          colorDark: '#15211d',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      });
    </script>
  `;

  return page(`
    <h1>Dashboard WireGuard</h1>
    <p class="sub">Visibilidade operacional do hub, com foco em handshake recente dos sites e geração rápida de credenciais por técnico.</p>
    ${flashCard(state.flash)}
    ${state.hubReadError ? `<div class="card"><div class="warn"><strong>Leitura do hub:</strong> ${esc(state.hubReadError)}</div></div>` : ''}

    <div class="metrics">
      <div class="metric">
        <div class="eyebrow">Total de Sites</div>
        <div class="value">${esc(String(summary.totalSites || 0))}</div>
      </div>
      <div class="metric">
        <div class="eyebrow">Handshake Recente</div>
        <div class="value" style="color:var(--ok);">${esc(String(summary.onlineSites || 0))}</div>
      </div>
      <div class="metric">
        <div class="eyebrow">Falhas / Sem Handshake</div>
        <div class="value" style="color:var(--warn);">${esc(String(summary.problemSites || 0))}</div>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <form method="GET" action="/dashboard">
          <div class="field">
            <label>Buscar site</label>
            <input name="q" value="${esc(q)}" placeholder="Nome ou Site ID" />
          </div>
          <div class="field">
            <label>Status</label>
            <select name="status">
              <option value="all"${statusFilter === 'all' ? ' selected' : ''}>Todos</option>
              <option value="connected"${statusFilter === 'connected' ? ' selected' : ''}>Conectados</option>
              <option value="pending"${statusFilter === 'pending' ? ' selected' : ''}>Pendentes</option>
              <option value="partial"${statusFilter === 'partial' ? ' selected' : ''}>Falha de conexão</option>
              <option value="online"${statusFilter === 'online' ? ' selected' : ''}>Handshake recente</option>
              <option value="stale"${statusFilter === 'stale' ? ' selected' : ''}>Sem handshake recente</option>
            </select>
          </div>
          <div class="field">
            <label>Janela de handshake</label>
            <input value="15 minutos" readonly />
          </div>
          <div class="field"><button type="submit">Aplicar filtros</button></div>
        </form>
        <form method="POST" action="/run/dashboard-refresh">
          <button type="submit" class="btn-secondary">Atualizar status</button>
        </form>
      </div>
      <div class="hint">IPAM de sites: ${esc(state.siteTunnelUpdatedAt || '-')} | Credenciais técnicas: ${esc(state.technicianUpdatedAt || '-')}</div>
    </div>

    <div class="dashboard-grid">${cardsHtml || '<div class="card"><div class="hint">Nenhum site encontrado com os filtros atuais.</div></div>'}</div>
  `, { title: 'Dashboard WireGuard', extraHead, extraBody });
}

function homeHtml(state) {
  return page(`
    <h1>WireGuard Omada Helper</h1>
    <p class="sub">Fluxo operacional mínimo: escolher site + nome do cliente e provisionar.</p>
    ${flashCard(state.flash)}

    <div class="card">
      <h2>1) Provisão Rápida</h2>
      <p class="sub">Cria peer no Omada e gera arquivo .conf para importar no laptop/celular.</p>
      <form method="POST" action="/run/quick-provision">
        <div class="grid">
          <div>
            <label>Site (cache)</label>
            <select name="siteId">${buildSiteOptions(state)}</select>
          </div>
          <div>
            <label>Cliente</label>
            <input name="client" value="${esc(state.client)}" required />
          </div>
        </div>
        <div class="hint">Sites em cache: ${(state.sites || []).length}. Última atualização: ${esc(state.sitesUpdatedAt || '-')}.</div>
        <div class="hint">IP do cliente é alocado automaticamente e sempre em /32.</div>
        <div class="hint">Banco IPAM: ${esc(String(state.ipamCount || 0))} alocações. Última atualização: ${esc(state.ipamUpdatedAt || '-')}.</div>
        <div class="actions">
          <button type="submit">Provisionar Cliente</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h2>2) Configuração Base</h2>
      <p class="sub">Preencher uma vez. Depois, usar só a Provisão Rápida.</p>
      <form method="POST" action="/run/save-defaults">
        <div class="grid">
          <div class="full"><label>OMADA_URL</label><input name="omadaUrl" value="${esc(state.omadaUrl)}" required /></div>
          <div><label>OMADA_USERNAME</label><input name="omadaUser" value="${esc(state.omadaUser)}" required /></div>
          <div><label>OMADA_PASSWORD</label><input name="omadaPass" type="password" value="${esc(state.omadaPass)}" required /></div>
          <div><label>OMADA_CONTROLLER_ID</label><input name="omadaCid" value="${esc(state.omadaCid)}" required /></div>
          <div><label>Interface WG</label><input name="wgIfName" value="${esc(state.wgIfName)}" required /></div>
          <div><label>IP Interface WG</label><input name="wgIfIp" value="${esc(state.wgIfIp)}" required /></div>
          <div><label>Endpoint Público (fixo)</label><input value="${esc(FIXED_WG_ENDPOINT)}" readonly /></div>
          <div><label>DNS no cliente</label><input name="wgDns" value="${esc(state.wgDns)}" required /></div>
          <div><label>AllowedIPs no cliente</label><input name="wgAllowedIps" value="${esc(state.wgAllowedIps)}" required /></div>
          <div><label>Keepalive</label><input name="wgKeepalive" value="${esc(state.wgKeepalive)}" required /></div>
          <div><label>MTU</label><input name="wgMtu" value="${esc(state.wgMtu)}" required /></div>
          <div class="full"><label>Diretório de saída</label><input name="outputBase" value="${esc(state.outputBase)}" required /></div>
          <div><label>Hub Host (SSH)</label><input name="hubHost" value="${esc(state.hubHost || '')}" placeholder="${esc(DEFAULT_HUB_HOST)}" /></div>
          <div><label>Hub User (SSH)</label><input name="hubUser" value="${esc(state.hubUser || '')}" placeholder="${esc(DEFAULT_HUB_USER)}" /></div>
          <div><label>Hub Password (SSH)</label><input name="hubPass" type="password" value="${esc(state.hubPass || '')}" /></div>
          <div><label>Hub Interface</label><input name="hubWgIf" value="${esc(state.hubWgIf || '')}" placeholder="${esc(DEFAULT_HUB_WG_IF)}" /></div>
          <div><label>Hub Endpoint Público</label><input name="hubPublicEndpoint" value="${esc(state.hubPublicEndpoint || '')}" placeholder="${esc(HUB_PUBLIC_ENDPOINT)}" /></div>
          <div><label>Hub Public Key</label><input name="hubPublicKey" value="${esc(state.hubPublicKey || '')}" placeholder="${esc(DEFAULT_HUB_PUBLIC_KEY)}" /></div>
          <div><label>DNS para Técnicos</label><input name="techDns" value="${esc(state.techDns || '')}" placeholder="1.1.1.1" /></div>
          <div><label>MTU Técnicos</label><input name="techMtu" value="${esc(state.techMtu || '')}" placeholder="1280" /></div>
          <div><label>OpenAPI Client ID</label><input name="omadaOpenapiClientId" value="${esc(state.omadaOpenapiClientId || '')}" /></div>
          <div><label>OpenAPI Client Secret</label><input name="omadaOpenapiClientSecret" type="password" value="${esc(state.omadaOpenapiClientSecret || '')}" /></div>
        </div>
        <div class="actions">
          <button type="submit" class="btn-secondary">Salvar Configuração Base</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h2>3) Sites (Cache)</h2>
      <p class="sub">Use somente quando entrar cliente novo no Omada.</p>
      <form method="POST" action="/run/discover-sites">
        <div class="grid">
          <div><label>Site (nome opcional para fallback)</label><input name="site" value="${esc(state.site)}" /></div>
          <div><label>&nbsp;</label><button type="submit" class="btn-secondary">Descobrir Sites no Omada</button></div>
        </div>
      </form>
      <form method="POST" action="/run/import-sites" style="margin-top:10px;">
        <div class="grid">
          <div class="full"><label>Importar JSON de sites (console)</label><textarea name="importJson" rows="5" placeholder='[{"name":"Everton Lima","id":"67f55..."}]'>${esc(state.importJson || '')}</textarea></div>
        </div>
        <div class="actions">
          <button type="submit" class="btn-secondary">Importar no Cache</button>
        </div>
      </form>
      <div class="hint warn">Probe técnico foi removido da tela principal para reduzir erro operacional.</div>
    </div>

    <div class="card">
      <h2>4) Acesso Operacional (TTL)</h2>
      <p class="sub">Ativa/desativa sessão de acesso por site com expiração automática.</p>
      <form method="POST" action="/run/activate-site">
        <div class="grid">
          <div>
            <label>Site (cache)</label>
            <select name="siteId">${buildSiteOptions(state)}</select>
          </div>
          <div>
            <label>Técnico</label>
            <input name="technician" value="${esc(state.technician || 'Tecnico 1')}" required />
          </div>
          <div>
            <label>TTL (horas)</label>
            <input name="ttlHours" value="${esc(state.ttlHours || '2')}" required />
          </div>
        </div>
        <div class="actions">
          <button type="submit">Ativar Acesso</button>
        </div>
      </form>
      <form method="POST" action="/run/deactivate-site" style="margin-top:10px;">
        <div class="grid">
          <div>
            <label>Site (cache)</label>
            <select name="siteId">${buildSiteOptions(state)}</select>
          </div>
        </div>
        <div class="actions">
          <button type="submit" class="btn-secondary">Desativar Acesso</button>
        </div>
      </form>
      <div class="hint">Sessões ativas: ${esc(String(state.sessionsCount || 0))}. Última atualização: ${esc(state.sessionsUpdatedAt || '-')}.</div>
      <div class="hint warn">MVP: sem rota de kernel automática ainda. Hook opcional: scripts/wg_activate_site.sh e scripts/wg_deactivate_site.sh.</div>
      <div style="margin-top:10px;">${sessionsTable(state)}</div>
    </div>
  `);
}

function render(res, state) {
  const html = homeHtml(state);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function renderDashboard(res, state) {
  const html = dashboardHtml(state);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${HOST}:${PORT}`);
    const pathName = urlObj.pathname;

    if (req.method === 'GET' && pathName === '/api/health') {
      return sendJson(res, 200, { ok: true, service: 'wireguard-gui' });
    }

    if (req.method === 'GET' && pathName === '/static/qrcode.min.js') {
      const scriptPath = path.join(SCRIPTS, 'vendor', 'qrcode.min.js');
      if (!fs.existsSync(scriptPath)) return sendJson(res, 404, { ok: false, stderr: 'Asset não encontrado' });
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      return res.end(fs.readFileSync(scriptPath));
    }

    if (req.method === 'GET' && pathName === '/dashboard') {
      const dashboardState = await buildDashboardState({
        dashboardQuery: urlObj.searchParams.get('q') || '',
        dashboardStatus: urlObj.searchParams.get('status') || 'all',
      });
      return renderDashboard(res, dashboardState);
    }

    if (req.method === 'POST' && pathName === '/run/dashboard-refresh') {
      const dashboardState = await buildDashboardState();
      dashboardState.flash = {
        ok: !dashboardState.hubReadError,
        code: 0,
        title: 'Dashboard atualizado',
        body: dashboardState.hubReadError
          ? 'A tela foi recarregada, mas a leitura do hub ainda precisa de atenção.'
          : 'Status lido novamente do hub e dos arquivos locais.',
      };
      return renderDashboard(res, dashboardState);
    }

    if (req.method === 'POST' && pathName === '/run/dashboard-connect-site') {
      const form = await parseFormBody(req);
      const siteId = String(form.siteId || '').trim();
      const defaults = loadDefaults();
      const hub = buildHubConfig(defaults);
      const stateBefore = await buildDashboardState();
      const selectedSite = getSiteFromCacheById(stateBefore.sites, siteId);
      const currentCard = (stateBefore.dashboard?.cards || []).find((card) => String(card.siteId) === siteId);

      if (!selectedSite) {
        stateBefore.flash = { ok: false, code: 400, title: 'Conectar wireguard', body: 'Selecione um site válido.' };
        return renderDashboard(res, stateBefore);
      }
      if (currentCard && !currentCard.connectActionEnabled) {
        stateBefore.flash = { ok: true, code: 0, title: 'Conectar wireguard', body: `O site ${selectedSite.name} já está conectado ao hub.` };
        return renderDashboard(res, stateBefore);
      }
      if (!defaults.omadaUrl || !defaults.omadaUser || !defaults.omadaPass || !defaults.omadaCid) {
        stateBefore.flash = { ok: false, code: 400, title: 'Conectar wireguard', body: 'Preencha as credenciais do Omada na Configuração Base.' };
        return renderDashboard(res, stateBefore);
      }
      if (!hub.host || !hub.user || !hub.pass || !hub.publicKey || !hub.publicEndpoint) {
        stateBefore.flash = { ok: false, code: 400, title: 'Conectar wireguard', body: 'Preencha os dados do hub na Configuração Base.' };
        return renderDashboard(res, stateBefore);
      }

      const result = await runSiteProvisionAndSync(selectedSite, defaults, hub, { waitForHandshakeMs: 6000 });
      if (!result.ok) {
        const failedState = await buildDashboardState();
        failedState.flash = {
          ok: false,
          code: result.out.code,
          title: 'Conectar wireguard',
          body: `${result.out.stdout || ''}${result.out.stderr ? `\n[stderr]\n${result.out.stderr}` : ''}`,
        };
        return renderDashboard(res, failedState);
      }
      const refreshed = result.refreshed || await buildDashboardState();
      refreshed.flash = {
        ok: true,
        code: 0,
        title: 'Conectar wireguard',
        body: [
          `Site: ${selectedSite.name}`,
          `Site tunnel IP: ${result.siteTunnelIp}`,
          `Site public key: ${result.sitePublicKey}`,
          'Provisionamento no Omada e conexão com o hub concluídos.',
        ].join('\n'),
      };
      return renderDashboard(res, refreshed);
    }

    if (req.method === 'POST' && pathName === '/run/dashboard-repair-safe') {
      const form = await parseFormBody(req);
      const siteId = String(form.siteId || '').trim();
      const defaults = loadDefaults();
      const hub = buildHubConfig(defaults);
      const stateBefore = await buildDashboardState();
      const selectedSite = getSiteFromCacheById(stateBefore.sites, siteId);
      if (!selectedSite) {
        stateBefore.flash = { ok: false, code: 400, title: 'Consertar conexão', body: 'Selecione um site válido.' };
        return renderDashboard(res, stateBefore);
      }

      const result = await runSiteProvisionAndSync(selectedSite, defaults, hub, { waitForHandshakeMs: 8000 });
      if (!result.ok) {
        const failedState = await buildDashboardState();
        failedState.flash = {
          ok: false,
          code: result.out.code,
          title: 'Consertar conexão',
          body: `${result.out.stdout || ''}${result.out.stderr ? `\n[stderr]\n${result.out.stderr}` : ''}`,
        };
        failedState.repairPrompt = {
          siteId,
          body: 'O reparo seguro falhou antes de recuperar o túnel. Se quiser, podemos tentar recriar a interface e o peer deste site.',
        };
        return renderDashboard(res, failedState);
      }

      const refreshed = result.refreshed || await buildDashboardState();
      if (result.refreshedCard?.handshakeState === 'online') {
        refreshed.flash = {
          ok: true,
          code: 0,
          title: 'Consertar conexão',
          body: [
            `Site: ${selectedSite.name}`,
            `Site tunnel IP: ${result.siteTunnelIp}`,
            'Reconciliação segura concluída e handshake voltou a ficar recente.',
          ].join('\n'),
        };
      } else {
        refreshed.flash = {
          ok: false,
          code: 0,
          title: 'Consertar conexão',
          body: [
            `Site: ${selectedSite.name}`,
            'A reconciliação segura foi aplicada, mas o túnel ainda não voltou a apresentar handshake recente.',
          ].join('\n'),
        };
        refreshed.repairPrompt = {
          siteId,
          body: 'Posso tentar a reconciliação completa agora, recriando a interface e o peer deste site.',
        };
      }
      return renderDashboard(res, refreshed);
    }

    if (req.method === 'POST' && pathName === '/run/dashboard-cancel-repair') {
      const refreshed = await buildDashboardState();
      refreshed.flash = {
        ok: true,
        code: 0,
        title: 'Consertar conexão',
        body: 'A sugestão de recriação foi cancelada.',
      };
      return renderDashboard(res, refreshed);
    }

    if (req.method === 'POST' && pathName === '/run/dashboard-recreate-site') {
      const form = await parseFormBody(req);
      const siteId = String(form.siteId || '').trim();
      const defaults = loadDefaults();
      const hub = buildHubConfig(defaults);
      const stateBefore = await buildDashboardState();
      const selectedSite = getSiteFromCacheById(stateBefore.sites, siteId);
      if (!selectedSite) {
        stateBefore.flash = { ok: false, code: 400, title: 'Recriar conexão', body: 'Selecione um site válido.' };
        return renderDashboard(res, stateBefore);
      }

      const result = await runSiteProvisionAndSync(selectedSite, defaults, hub, { forceRecreate: true, waitForHandshakeMs: 10000 });
      if (!result.ok) {
        const failedState = await buildDashboardState();
        failedState.flash = {
          ok: false,
          code: result.out.code,
          title: 'Recriar conexão',
          body: `${result.out.stdout || ''}${result.out.stderr ? `\n[stderr]\n${result.out.stderr}` : ''}`,
        };
        return renderDashboard(res, failedState);
      }

      const refreshed = result.refreshed || await buildDashboardState();
      const recreatedOnline = result.refreshedCard?.handshakeState === 'online';
      refreshed.flash = {
        ok: recreatedOnline,
        code: 0,
        title: 'Recriar conexão',
        body: recreatedOnline
          ? [
              `Site: ${selectedSite.name}`,
              `Site tunnel IP: ${result.siteTunnelIp}`,
              'Reconciliação completa concluída e o túnel voltou a responder com handshake recente.',
            ].join('\n')
          : [
              `Site: ${selectedSite.name}`,
              `Site tunnel IP: ${result.siteTunnelIp}`,
              'A recriação foi aplicada, mas o site ainda não apresentou handshake recente.',
            ].join('\n'),
      };
      return renderDashboard(res, refreshed);
    }

    if (req.method === 'GET' && pathName === '/download/tech-conf') {
      const siteId = String(urlObj.searchParams.get('siteId') || '').trim();
      const technicianSlug = String(urlObj.searchParams.get('technicianSlug') || '').trim();
      const store = loadTechnicianAllocations();
      const record = (store.allocations || []).find((item) =>
        String(item.siteId) === siteId && String(item.technicianSlug) === technicianSlug
      );
      if (!record || !record.confPath || !fs.existsSync(record.confPath)) {
        return sendJson(res, 404, { ok: false, stderr: 'Configuração não encontrada para este técnico/site.' });
      }
      const downloadName = `${slugifyName(record.siteName || 'site')}-${technicianSlug}.conf`;
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
      });
      return res.end(fs.readFileSync(record.confPath));
    }

    if (req.method === 'POST' && pathName === '/run/dashboard-generate-tech') {
      const form = await parseFormBody(req);
      const defaults = loadDefaults();
      const hub = buildHubConfig(defaults);
      const dashboardState = await buildDashboardState();
      const siteId = String(form.siteId || '').trim();
      const technicianName = String(form.technicianName || '').trim();
      const selectedSite = getSiteFromCacheById(dashboardState.sites, siteId);
      const siteTunnelIpam = loadSiteTunnelIpam();
      const siteAllocation = (siteTunnelIpam.allocations || []).find((item) =>
        String(item.siteId) === siteId && String(item.status || 'active') === 'active'
      );

      if (!selectedSite) {
        dashboardState.flash = { ok: false, code: 400, title: 'Gerar credencial', body: 'Selecione um site válido.' };
        return renderDashboard(res, dashboardState);
      }
      if (!technicianName) {
        dashboardState.flash = { ok: false, code: 400, title: 'Gerar credencial', body: 'Informe o nome do técnico/dispositivo.' };
        return renderDashboard(res, dashboardState);
      }
      if (!siteAllocation?.tunnelIp) {
        dashboardState.flash = { ok: false, code: 400, title: 'Gerar credencial', body: 'Este site ainda não possui IP de túnel ativo no IPAM.' };
        return renderDashboard(res, dashboardState);
      }
      if (!hub.host || !hub.user || !hub.pass || !hub.publicKey || !hub.publicEndpoint) {
        dashboardState.flash = { ok: false, code: 400, title: 'Gerar credencial', body: 'Preencha os dados do hub na Configuração Base antes de gerar credenciais.' };
        return renderDashboard(res, dashboardState);
      }

      const store = loadTechnicianAllocations();
      let allocation = allocateTechnicianRecord({
        siteId,
        siteName: selectedSite.name,
        technicianName,
        existingAllocations: store.allocations || [],
        siteTunnelAllocations: siteTunnelIpam.allocations || [],
      });

      let record = allocation.record;
      if (!record.privateKey || !record.publicKey) {
        const keypair = await generateWireGuardKeypair(hub);
        record = {
          ...record,
          privateKey: String(keypair.privateKey || ''),
          publicKey: String(keypair.publicKey || ''),
        };
      }

      const configText = buildTechnicianConfig({
        siteName: selectedSite.name,
        technicianName,
        privateKey: record.privateKey,
        address: record.address,
        dns: hub.techDns,
        mtu: hub.techMtu,
        hubPublicKey: hub.publicKey,
        hubEndpoint: hub.publicEndpoint,
        siteTunnelIp: siteAllocation.tunnelIp,
        keepalive: 25,
      });
      const confPath = getTechnicianConfigPath(selectedSite.name, record.technicianSlug);
      fs.writeFileSync(confPath, configText);

      await ensureHubPeer(hub, {
        marker: `${siteId}:${record.technicianSlug}`,
        publicKey: record.publicKey,
        allowedIp: record.address,
        keepalive: 25,
      });

      const nextAllocations = upsertTechnicianAllocation(store.allocations || [], {
        ...record,
        siteId,
        siteName: selectedSite.name,
        technicianName,
        confPath,
        lastSiteTunnelIp: siteAllocation.tunnelIp,
        lastHubEndpoint: hub.publicEndpoint,
        status: 'active',
      });
      saveTechnicianAllocations(nextAllocations, 'dashboard-generate-tech');

      const refreshed = await buildDashboardState();
      refreshed.flash = {
        ok: true,
        code: 0,
        title: 'Credencial pronta',
        body: [
          `Site: ${selectedSite.name}`,
          `Técnico: ${technicianName}`,
          `IP técnico: ${record.address}`,
          `Site túnel: ${siteAllocation.tunnelIp}`,
          `Arquivo: ${confPath}`,
        ].join('\n'),
      };
      refreshed.generatedCredential = {
        siteId,
        technicianName,
        technicianSlug: record.technicianSlug,
        address: record.address,
        configText,
      };
      return renderDashboard(res, refreshed);
    }

    if (req.method === 'GET' && pathName === '/') {
      return render(res, buildState());
    }

    if (req.method === 'POST' && pathName === '/run/save-defaults') {
      const form = await parseFormBody(req);
      const saved = saveDefaults(form);
      return render(res, buildState({
        ...saved,
        flash: { ok: true, code: 0, title: 'Configuração Base', body: `Salva em: ${DEFAULTS_FILE}` },
      }));
    }

    if (req.method === 'POST' && pathName === '/run/discover-sites') {
      const form = await parseFormBody(req);
      const defaults = loadDefaults();
      const state = buildState({ ...defaults, site: form.site || 'Everton Lima' });
      if (!defaults.omadaUser || !defaults.omadaPass || !defaults.omadaCid || !defaults.omadaUrl) {
        state.flash = {
          ok: false,
          code: 400,
          title: 'Descoberta de Sites',
          body: 'Preencha primeiro a Configuração Base.',
        };
        return render(res, state);
      }

      const env = {
        OMADA_URL: defaults.omadaUrl,
        OMADA_USERNAME: defaults.omadaUser,
        OMADA_PASSWORD: defaults.omadaPass,
        OMADA_CONTROLLER_ID: defaults.omadaCid,
        OMADA_OUTPUT: 'json',
      };
      const args = [path.join(SCRIPTS, 'omada_wireguard_api_probe.sh'), '--discover-sites', state.site];
      const out = await run('bash', args, { timeoutMs: 180000, env });
      const parsed = parseDiscoverJson(out.stdout);
      if (!parsed) {
        state.flash = {
          ok: false,
          code: out.code,
          title: 'Descoberta de Sites',
          body: `${out.stdout || ''}${out.stderr ? `\n[stderr]\n${out.stderr}` : ''}`,
        };
        return render(res, state);
      }
      const merged = mergeSites(state.sites, parsed.sites || []);
      const saved = saveSiteCache(merged, 'discover-sites');
      state.sites = merged;
      state.sitesUpdatedAt = saved.updatedAt;
      state.flash = {
        ok: !!parsed.ok,
        code: out.code,
        title: 'Descoberta de Sites',
        body: [
          parsed.message || '(sem mensagem)',
          `Controller ID: ${parsed.controllerId || '-'}`,
          `Sites da API: ${(parsed.sites || []).length}`,
          `Total no cache: ${merged.length}`,
        ].join('\n'),
      };
      return render(res, state);
    }

    if (req.method === 'POST' && pathName === '/run/import-sites') {
      const form = await parseFormBody(req);
      const state = buildState({ importJson: form.importJson || '' });
      let parsed = [];
      try {
        parsed = JSON.parse(form.importJson || '[]');
      } catch (e) {
        state.flash = { ok: false, code: 400, title: 'Importar Sites', body: `JSON inválido: ${e.message || e}` };
        return render(res, state);
      }
      const normalized = normalizeSites(parsed);
      if (!normalized.length) {
        state.flash = { ok: false, code: 400, title: 'Importar Sites', body: 'Nenhum site válido no JSON.' };
        return render(res, state);
      }
      const merged = mergeSites(state.sites, normalized);
      const saved = saveSiteCache(merged, 'manual-import');
      state.sites = merged;
      state.sitesUpdatedAt = saved.updatedAt;
      state.importJson = '';
      state.flash = {
        ok: true,
        code: 0,
        title: 'Importar Sites',
        body: `Importação concluída.\nNovos válidos: ${normalized.length}\nTotal no cache: ${merged.length}`,
      };
      return render(res, state);
    }

    if (req.method === 'POST' && pathName === '/run/quick-provision') {
      const form = await parseFormBody(req);
      const defaults = loadDefaults();
      const state = buildState({
        site: 'Everton Lima',
        siteId: form.siteId || '',
        client: form.client || 'MBP-Cliente',
      });
      if (!defaults.omadaUser || !defaults.omadaPass || !defaults.omadaCid || !defaults.omadaUrl) {
        state.flash = { ok: false, code: 400, title: 'Provisão Rápida', body: 'Preencha primeiro a Configuração Base.' };
        return render(res, state);
      }
      const selectedSite = getSiteFromCacheById(state.sites, form.siteId || '');
      const siteId = String(form.siteId || selectedSite?.id || '').trim();
      const siteName = String(selectedSite?.name || '').trim();
      if (!siteId || !siteName) {
        state.flash = {
          ok: false,
          code: 400,
          title: 'Provisão Rápida',
          body: 'Selecione um site válido no dropdown.',
        };
        return render(res, state);
      }

      const client = String(form.client || '').trim();
      if (!client) {
        state.flash = { ok: false, code: 400, title: 'Provisão Rápida', body: 'Cliente é obrigatório.' };
        return render(res, state);
      }

      const outputBase = defaults.outputBase || DEFAULT_OUTPUT_BASE;
      const ipam = loadIpam();
      const allocation = allocateClientIp(ipam, outputBase, siteId, siteName, client);
      const clientIp = allocation.ip;

      const env = {
        OMADA_URL: defaults.omadaUrl,
        OMADA_USERNAME: defaults.omadaUser,
        OMADA_PASSWORD: defaults.omadaPass,
        OMADA_CONTROLLER_ID: defaults.omadaCid,
        OMADA_SITE_ID: siteId,
        WG_INTERFACE_NAME: defaults.wgIfName || 'Home',
        WG_INTERFACE_LOCAL_IP: defaults.wgIfIp || '192.168.50.10',
        WG_ENDPOINT: FIXED_WG_ENDPOINT,
        WG_DNS: defaults.wgDns || '192.168.16.1',
        WG_ALLOWED_IPS: defaults.wgAllowedIps || '0.0.0.0/0, ::/0',
        WG_KEEPALIVE: String(defaults.wgKeepalive || '25'),
        WG_MTU: String(defaults.wgMtu || '1280'),
        WG_OUTPUT_BASE: outputBase,
        WG_CLIENT_IP: clientIp,
      };

      const args = [path.join(SCRIPTS, 'provision_wireguard_omada.sh'), siteName, client];
      const out = await run('bash', args, { timeoutMs: 240000, env });
      if (out.ok) {
        const confPath = extractConfPath(out.stdout || '');
        const nextAllocs = upsertIpamAllocation(ipam, {
          siteId,
          siteName,
          client,
          ip: clientIp,
          status: 'active',
          confPath,
        });
        saveIpam(nextAllocs, 'quick-provision');
      }
      state.site = siteName;
      state.siteId = siteId;
      state.client = client;
      state.ipamCount = loadIpam().allocations.length;
      state.ipamUpdatedAt = loadIpam().updatedAt || '';
      state.flash = {
        ok: out.ok,
        code: out.code,
        title: 'Provisão Rápida',
        body: [
          `Site: ${siteName} (${siteId})`,
          `Cliente: ${client}`,
          `IP Cliente: ${clientIp}`,
          `IPAM: ${allocation.reused ? 'cliente já tinha IP reservado' : 'novo IP reservado'}`,
          '',
          out.stdout || '',
          out.stderr ? `\n[stderr]\n${out.stderr}` : '',
        ].join('\n'),
      };
      return render(res, state);
    }

    if (req.method === 'POST' && pathName === '/run/activate-site') {
      const form = await parseFormBody(req);
      const state = buildState({
        siteId: String(form.siteId || '').trim(),
        technician: String(form.technician || 'Tecnico 1').trim(),
        ttlHours: String(form.ttlHours || '2').trim(),
      });
      const selectedSite = getSiteFromCacheById(state.sites, state.siteId);
      if (!selectedSite) {
        state.flash = { ok: false, code: 400, title: 'Ativar Acesso', body: 'Selecione um site válido no cache.' };
        return render(res, state);
      }
      const technician = String(form.technician || '').trim();
      if (!technician) {
        state.flash = { ok: false, code: 400, title: 'Ativar Acesso', body: 'Técnico é obrigatório.' };
        return render(res, state);
      }
      const ttlNum = Number(form.ttlHours || '2');
      if (!Number.isFinite(ttlNum) || ttlNum <= 0 || ttlNum > 24) {
        state.flash = { ok: false, code: 400, title: 'Ativar Acesso', body: 'TTL deve ser um número entre 1 e 24 horas.' };
        return render(res, state);
      }

      const now = new Date();
      const expires = new Date(now.getTime() + ttlNum * 60 * 60 * 1000);
      const sessionsLoaded = loadSessions();
      const active = purgeExpiredSessions(sessionsLoaded.sessions || []);
      const rest = active.filter((s) => String(s.siteId) !== String(selectedSite.id));
      const nextSession = {
        siteId: String(selectedSite.id),
        siteName: String(selectedSite.name),
        technician,
        ttlHours: ttlNum,
        activatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        status: 'active',
      };
      const env = {
        SITE_ID: nextSession.siteId,
        SITE_NAME: nextSession.siteName,
        TECHNICIAN: nextSession.technician,
        TTL_HOURS: String(nextSession.ttlHours),
        ACTIVATED_AT: nextSession.activatedAt,
        EXPIRES_AT: nextSession.expiresAt,
      };
      const hook = await runHookIfExists('wg_activate_site.sh', env);
      if (!hook.ok) {
        state.flash = {
          ok: false,
          code: hook.code,
          title: 'Ativar Acesso',
          body: `${hook.stdout || ''}${hook.stderr ? `\n[stderr]\n${hook.stderr}` : ''}`,
        };
        return render(res, state);
      }
      const saved = saveSessions([...rest, nextSession], 'activate-site');
      state.sessions = purgeExpiredSessions([...rest, nextSession]);
      state.sessionsCount = state.sessions.length;
      state.sessionsUpdatedAt = saved.updatedAt;
      state.activeBySite = buildActiveSessionsMap(state.sessions);
      state.flash = {
        ok: true,
        code: 0,
        title: 'Ativar Acesso',
        body: [
          `Site: ${nextSession.siteName} (${nextSession.siteId})`,
          `Técnico: ${nextSession.technician}`,
          `TTL: ${nextSession.ttlHours}h`,
          `Expira em: ${formatDatePt(nextSession.expiresAt)}`,
          '',
          hook.stdout || '',
          hook.stderr ? `\n[stderr]\n${hook.stderr}` : '',
        ].join('\n'),
      };
      return render(res, state);
    }

    if (req.method === 'POST' && pathName === '/run/deactivate-site') {
      const form = await parseFormBody(req);
      const state = buildState({ siteId: String(form.siteId || '').trim() });
      const selectedSite = getSiteFromCacheById(state.sites, state.siteId);
      if (!selectedSite) {
        state.flash = { ok: false, code: 400, title: 'Desativar Acesso', body: 'Selecione um site válido no cache.' };
        return render(res, state);
      }
      const sessionsLoaded = loadSessions();
      const active = purgeExpiredSessions(sessionsLoaded.sessions || []);
      const current = active.find((s) => String(s.siteId) === String(selectedSite.id));
      if (!current) {
        state.flash = { ok: false, code: 404, title: 'Desativar Acesso', body: 'Este site não está com sessão ativa.' };
        return render(res, state);
      }
      const env = {
        SITE_ID: String(current.siteId),
        SITE_NAME: String(current.siteName),
        TECHNICIAN: String(current.technician),
      };
      const hook = await runHookIfExists('wg_deactivate_site.sh', env);
      if (!hook.ok) {
        state.flash = {
          ok: false,
          code: hook.code,
          title: 'Desativar Acesso',
          body: `${hook.stdout || ''}${hook.stderr ? `\n[stderr]\n${hook.stderr}` : ''}`,
        };
        return render(res, state);
      }
      const next = active.filter((s) => String(s.siteId) !== String(selectedSite.id));
      const saved = saveSessions(next, 'deactivate-site');
      state.sessions = next;
      state.sessionsCount = next.length;
      state.sessionsUpdatedAt = saved.updatedAt;
      state.activeBySite = buildActiveSessionsMap(next);
      state.flash = {
        ok: true,
        code: 0,
        title: 'Desativar Acesso',
        body: [
          `Site: ${selectedSite.name} (${selectedSite.id})`,
          'Sessão removida com sucesso.',
          '',
          hook.stdout || '',
          hook.stderr ? `\n[stderr]\n${hook.stderr}` : '',
        ].join('\n'),
      };
      return render(res, state);
    }

    sendJson(res, 404, { ok: false, stderr: 'Rota não encontrada' });
  } catch (e) {
    if (res.headersSent) {
      try { res.end(); } catch {}
      return;
    }
    sendJson(res, 500, { ok: false, stderr: e.message || String(e) });
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`WireGuard GUI disponível em: ${url}`);
  console.log('Fluxo recomendado: 1) Configuração Base (uma vez) 2) Provisão Rápida.');
});
