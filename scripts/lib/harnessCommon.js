const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { runHarness, resolveOutputDir } = require('../runHarness');

dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });

let mcpModulesPromise;
async function loadMcpModules() {
  if (!mcpModulesPromise) {
    mcpModulesPromise = Promise.all([
      import('@modelcontextprotocol/sdk/client/index.js'),
      import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
    ]).then(([clientMod, transportMod]) => ({
      McpClient: clientMod.Client,
      StreamableHTTPClientTransport: transportMod.StreamableHTTPClientTransport,
    }));
  }
  return mcpModulesPromise;
}

function parseStorageState() {
  const value = typeof process.env.HARNESS_STORAGE_STATE === 'string'
    ? process.env.HARNESS_STORAGE_STATE.trim()
    : '';
  return value || null;
}

function parseAuthorizationHeader() {
  const value = typeof process.env.HARNESS_AUTHORIZATION === 'string'
    ? process.env.HARNESS_AUTHORIZATION.trim()
    : '';
  return value || null;
}

function parseCookieHeader() {
  const value = typeof process.env.HARNESS_COOKIE === 'string' ? process.env.HARNESS_COOKIE.trim() : '';
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (/sb-[^=]+=/.test(decoded)) {
      return decoded;
    }
  } catch {}
  return value;
}

function parsePlaywrightCookies() {
  const cookiePath = process.env.HARNESS_COOKIES_JSON || '';
  if (!cookiePath) return [];
  try {
    const data = fs.readFileSync(cookiePath, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    console.warn('Failed to parse HARNESS_COOKIES_JSON:', error?.message || error);
  }
  return [];
}

function ensureBearerPrefix(token) {
  if (!token) return '';
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

function resolveApiBase() {
  const raw = (process.env.HARNESS_API_BASE || process.env.DEXTER_API_BASE_URL || 'https://api.dexter.cash').trim();
  if (!raw) return 'https://api.dexter.cash';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function extractRefreshTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const segments = cookieHeader.split(';');
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const name = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!name || !value) continue;
    if (!/sb-.*-refresh-token$/i.test(name)) continue;
    let decoded = value;
    try {
      decoded = decodeURIComponent(value);
    } catch {}
    try {
      const arr = JSON.parse(decoded);
      if (!Array.isArray(arr)) continue;
      if (typeof arr[1] === 'string' && arr[1]) return arr[1];
      if (typeof arr[0] === 'string' && arr[0]) return arr[0];
    } catch {}
  }
  return null;
}

async function mintMcpBearerFromCookie(cookieHeader) {
  const refreshToken = extractRefreshTokenFromCookie(cookieHeader);
  if (!refreshToken) return null;
  const apiBase = resolveApiBase();
  const url = `${apiBase}/api/connector/oauth/token`;
  const form = new URLSearchParams();
  form.set('grant_type', 'refresh_token');
  form.set('refresh_token', refreshToken);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!response.ok) {
      if (process.env.HARNESS_DEBUG_SESSION === '1') {
        console.warn(`[harness] MCP JWT mint failed (${response.status} ${response.statusText})`);
      }
      return null;
    }
    const data = await response.json().catch(() => null);
    const token = typeof data?.dexter_mcp_jwt === 'string' ? data.dexter_mcp_jwt.trim() : '';
    if (!token) {
      if (process.env.HARNESS_DEBUG_SESSION === '1') {
        console.warn('[harness] dexter_mcp_jwt missing in token response; falling back.');
      }
      return null;
    }
    return ensureBearerPrefix(token);
  } catch (error) {
    console.warn('Failed to mint per-user MCP JWT:', error?.message || error);
    return null;
  }
}

function resolveStaticBearer() {
  return ensureBearerPrefix(
    process.env.HARNESS_MCP_TOKEN || process.env.TOKEN_AI_MCP_TOKEN || '',
  );
}

async function resolveMcpBearer({ guest } = {}) {
  const demoBearer = guest
    ? ensureBearerPrefix(process.env.TOKEN_AI_MCP_TOKEN || '')
    : resolveStaticBearer();

  if (guest) {
    if (demoBearer) {
      return { bearer: demoBearer, source: 'TOKEN_AI_MCP_TOKEN (guest fallback)' };
    }
  }

  const envBearer = ensureBearerPrefix(process.env.HARNESS_MCP_TOKEN || '');
  if (envBearer) {
    return { bearer: envBearer, source: 'HARNESS_MCP_TOKEN' };
  }
  if (demoBearer) {
    return { bearer: demoBearer, source: 'TOKEN_AI_MCP_TOKEN' };
  }
  const cookieHeader = parseCookieHeader();
  if (!cookieHeader) {
    return { bearer: null, source: 'none' };
  }
  const minted = await mintMcpBearerFromCookie(cookieHeader);
  if (minted) {
    return { bearer: minted, source: 'minted' };
  }
  return { bearer: null, source: 'none' };
}

function buildSupabaseToken() {
  const authHeader = parseAuthorizationHeader();
  if (authHeader) {
    const prefix = 'Bearer ';
    return authHeader.startsWith(prefix) ? authHeader.slice(prefix.length) : authHeader;
  }
  const cookieHeader = parseCookieHeader();
  if (cookieHeader && cookieHeader.includes('sb-')) {
    try {
      const match = cookieHeader.match(/sb-[^=]+=([^;]+)/);
      if (match && match[1]) {
        let candidate = match[1];
        let parsed = null;
        for (let attempts = 0; attempts < 3 && candidate; attempts += 1) {
          try {
            parsed = JSON.parse(candidate);
            break;
          } catch {
            const decodedNext = decodeURIComponent(candidate);
            if (decodedNext === candidate) break;
            candidate = decodedNext;
          }
        }
        if (parsed) {
          if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
            return parsed[0];
          }
          if (typeof parsed === 'object') {
            const accessToken =
              typeof parsed.access_token === 'string'
                ? parsed.access_token
                : typeof parsed.session?.access_token === 'string'
                  ? parsed.session.access_token
                  : typeof parsed.currentSession?.access_token === 'string'
                    ? parsed.currentSession.access_token
                    : null;
            if (accessToken) return accessToken;
          }
        }
      }
    } catch {}
  }
  return null;
}

async function fetchJson(url, { method = 'GET', headers = {}, body, signal } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal,
  });
  const text = await response.text();
  if (!response.ok) {
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {}
    const error = new Error(`HTTP ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.body = parsed || text;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

async function createRealtimeSession({ supabaseToken, guest, sessionUrl } = {}) {
  const payload = supabaseToken
    ? { supabaseAccessToken: supabaseToken }
    : {
        guestProfile: {
          label: 'Dexter Demo Wallet',
        },
      };
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (!guest) {
    const authHeader = parseAuthorizationHeader();
    const cookieHeader = parseCookieHeader();
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }
  }
  const sessionEndpoint = sessionUrl || process.env.HARNESS_SESSION_URL || 'https://api.dexter.cash/realtime/sessions';
  let session;
  try {
    session = await fetchJson(sessionEndpoint, {
      method: 'POST',
      headers: Object.fromEntries(headers.entries()),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!guest && error?.status === 401) {
      throw new Error('Supabase session appears to be expired (401 from realtime sessions). Run "npm run dexchat:refresh" and retry.');
    }
    const body = typeof error?.body === 'string' ? error.body : JSON.stringify(error?.body || '');
    if (!guest && error?.status === 403 && /bad_jwt/i.test(body)) {
      throw new Error('Supabase session rejected as bad JWT. Refresh HARNESS_COOKIE / HARNESS_AUTHORIZATION via "npm run dexchat:refresh".');
    }
    throw error;
  }
  if (!session?.client_secret?.value) {
    throw new Error('Realtime session response missing client_secret');
  }
  if (!guest && session?.dexter_session?.type === 'guest') {
    throw new Error('Realtime session downgraded to guest while authenticated. Refresh HARNESS_COOKIE / HARNESS_AUTHORIZATION and retry.');
  }
  return session;
}

async function runUiHarness({ prompt, targetUrl, waitMs, headless, saveArtifact, outputDir, guest }) {
  const storageState = guest ? null : parseStorageState();
  const authHeader = guest ? null : parseAuthorizationHeader();
  const cookieHeader = guest ? null : parseCookieHeader();
  const cookies = guest ? [] : parsePlaywrightCookies();

  if (!guest) {
    const supabaseToken = buildSupabaseToken();
    const hasBearer = !!authHeader || !!supabaseToken;
    if (hasBearer) {
      await createRealtimeSession({ supabaseToken, guest: false });
    }
    // Preflight realtime session to surface stale Supabase tokens before launching Playwright.
  }

  const extraHTTPHeaders = {};
  if (!guest) {
    if (authHeader) extraHTTPHeaders.Authorization = authHeader;
    if (cookieHeader) extraHTTPHeaders.cookie = cookieHeader;
  }

  const options = {
    prompt,
    targetUrl,
    waitMs,
    headless,
    saveArtifact,
    outputDir,
    storageState,
    extraHTTPHeaders: Object.keys(extraHTTPHeaders).length > 0 ? extraHTTPHeaders : undefined,
    cookies: cookies.length > 0 ? cookies : undefined,
  };

  const { artifact, artifactPath } = await runHarness(options);
  if (artifactPath) {
    process.stdout.write(`Saved artifact: ${artifactPath}\n`);
  } else if (saveArtifact) {
    process.stdout.write('Run completed without writing an artifact.\n');
  }
  return artifact;
}

async function callMcpTool({ session, requestPayload, bearerOverride, guest }) {
  const { McpClient, StreamableHTTPClientTransport } = await loadMcpModules();
  const mcp = Array.isArray(session?.tools) ? session.tools.find((t) => t.type === 'mcp') : null;
  if (!mcp?.server_url) throw new Error('Session missing MCP connector info');

  const fallbackUrl = process.env.HARNESS_MCP_URL || 'https://mcp.dexter.cash/mcp';
  const serverUrl = typeof mcp.server_url === 'string' && !mcp.server_url.includes('<redacted>')
    ? mcp.server_url
    : fallbackUrl;

  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });
  if (!guest && mcp?.headers && typeof mcp.headers === 'object') {
    for (const [key, value] of Object.entries(mcp.headers)) {
      if (typeof value === 'string') headers.set(key, value);
    }
  }
  let bearerToUse = ensureBearerPrefix(bearerOverride || '');
  const existingAuth = headers.get('Authorization');
  if (!bearerToUse && existingAuth && !existingAuth.includes('<redacted>')) {
    bearerToUse = ensureBearerPrefix(existingAuth);
  }
  if (!bearerToUse && !guest) {
    const envFallback = ensureBearerPrefix(process.env.HARNESS_MCP_TOKEN || '') || resolveStaticBearer();
    if (envFallback) {
      if (!process.env.HARNESS_MCP_TOKEN && resolveStaticBearer()) {
        console.warn('HARNESS_MCP_TOKEN missing; using demo bearer fallback.');
      }
      bearerToUse = envFallback;
    }
  }
  if (bearerToUse) {
    headers.set('Authorization', bearerToUse);
  } else if (existingAuth && existingAuth.includes('<redacted>')) {
    headers.delete('Authorization');
    console.warn('No MCP bearer resolved; proceeding without Authorization header.');
  }

  const headerObject = Object.fromEntries(headers.entries());
  const transport = new StreamableHTTPClientTransport(serverUrl, {
    requestInit: { headers: headerObject },
  });
  const client = new McpClient({ name: 'dexter-harness', version: '1.0.0' });

  try {
    await client.connect(transport);
    const toolResult = await client.callTool(requestPayload);
    await client.close();
    return {
      request: requestPayload,
      response: toolResult,
      structured: toolResult?.structuredContent || toolResult?.structured_content || null,
      rawContent: toolResult?.content || null,
    };
  } catch (error) {
    await client.close().catch(() => {});
    const message = error?.message ? String(error.message) : String(error);
    const isAuthMissing = /not initialized|oauth token required|unauthorized/i.test(message);
    if (isAuthMissing) {
      error.message = `${message} - MCP call was rejected; set HARNESS_MCP_TOKEN (or TOKEN_AI_MCP_TOKEN) to provide a bearer.`;
    }
    throw error;
  }
}

async function runApiHarness({ guest, bearerOverride, buildRequest }) {
  const supabaseToken = guest ? null : buildSupabaseToken();
  const session = await createRealtimeSession({ supabaseToken, guest });
  if (process.env.HARNESS_DEBUG_SESSION === '1') {
    process.stdout.write(`Realtime session response:\n${JSON.stringify(session, null, 2)}\n`);
  }
  const requestPayload = buildRequest({ session });
  const toolResult = await callMcpTool({ session, requestPayload, bearerOverride, guest });
  return {
    session: {
      id: session?.id ?? null,
      model: session?.model ?? null,
      sessionType: session?.dexter_session?.type ?? null,
    },
    tool: toolResult,
  };
}

function writeJsonSnapshot(filename, data) {
  try {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
    process.stdout.write(`API artifact written to ${filename}\n`);
  } catch (error) {
    console.warn('Failed to write API artifact:', error?.message || error);
  }
}

module.exports = {
  ensureBearerPrefix,
  parseAuthorizationHeader,
  parseCookieHeader,
  parsePlaywrightCookies,
  parseStorageState,
  resolveOutputDir,
  resolveMcpBearer,
  runUiHarness,
  runApiHarness,
  writeJsonSnapshot,
  buildSupabaseToken,
};
