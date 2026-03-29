import { randomUUID } from 'node:crypto';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { MCPServerStreamableHttp } from '@openai/agents-core';
import { cookies } from 'next/headers';

import type { Session } from '@supabase/supabase-js';

import { getDexterApiRoute } from '@/app/config/env';
import { createScopedLogger } from '@/server/logger';
import type { Logger } from '@/server/logger';

type Database = any;

const MCP_URL = (
  process.env.MCP_URL ||
  process.env.NEXT_PUBLIC_MCP_URL ||
  'https://mcp.dexter.cash/mcp'
).replace(/\/$/, '');

const SHARED_BEARER = ensureBearerPrefix(
  process.env.HARNESS_MCP_TOKEN || process.env.TOKEN_AI_MCP_TOKEN || ''
);

const TOKEN_EXPIRY_GRACE_MS = 30_000;

interface MintCacheEntry {
  bearer: string;
  expiresAt: number;
}

interface CachedClient {
  token: string | null;
  server: MCPServerStreamableHttp;
  connecting: Promise<void> | null;
}

const mintedTokenCache = new Map<string, MintCacheEntry>();
const clientCache = new Map<string, CachedClient>();
const log = createScopedLogger({ scope: 'mcp.auth' });

export type McpIdentityState = 'user' | 'fallback' | 'guest' | 'none';

export interface McpAuthDetails {
  bearer: string | null;
  cacheKey: string;
  identity: McpIdentityState;
  minted: boolean;
  sessionId?: string | null;
  user?: { id?: string | null; email?: string | null } | null;
}

export interface McpIdentitySummary {
  state: McpIdentityState | 'loading' | 'error';
  label: string;
  detail?: string;
}

export async function resolveMcpAuth(): Promise<McpAuthDetails> {
  const authLog = log.child({ requestId: randomUUID() });
  const cookieStorePromise = cookies();
  const supabase = createRouteHandlerClient<Database>(
    { cookies: () => cookieStorePromise },
    {
      supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  );
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const sessionPresent = Boolean(session);
  const hasRefresh = Boolean(session?.refresh_token);

  if (sessionError) {
    authLog.warn({ event: 'supabase_session_error', error: sessionError.message }, 'MCP auth: Supabase session lookup returned error');
  }

  if (!sessionPresent) {
    authLog.warn({ event: 'no_supabase_session' }, 'MCP auth: Supabase session not found');
  }

  authLog.info(
    {
      event: 'session_snapshot',
      sessionPresent,
      hasRefresh,
    },
    'MCP auth: session snapshot',
  );

  const cookieStore = await cookieStorePromise;
  try {
    const cookieNames = cookieStore.getAll().map((entry) => entry.name);
    authLog.debug(
      {
        event: 'cookies_read',
        cookieCount: cookieNames.length,
        cookieNames,
      },
      'MCP auth: cookie names read',
    );
  } catch (error) {
    authLog.warn(
      {
        event: 'cookies_read_failed',
        error: error instanceof Error ? error.message : String(error),
      },
      'MCP auth: failed to read cookie names',
    );
  }
  const refreshToken =
    getRefreshToken(session) || extractRefreshTokenFromCookies(cookieStore.getAll(), authLog);
  const sessionStruct = session as Session & { session_id?: string | null };
  const cacheKey = sessionStruct?.session_id ?? session?.user?.id ?? null;
  authLog.info(
    {
      event: 'cache_key_resolved',
      cacheKey,
    },
    'MCP auth: cache key resolved',
  );

  if (session && refreshToken && cacheKey) {
    const minted = await resolveMintedBearer(cacheKey, refreshToken, authLog);
    if (minted) {
      const result: McpAuthDetails = {
        bearer: minted,
        cacheKey: `user:${cacheKey}`,
        identity: 'user',
        minted: true,
        sessionId: cacheKey,
        user: session.user
          ? { id: session.user.id, email: session.user.email ?? null }
          : null,
      };
      authLog.info(
        {
          event: 'resolved',
          identity: result.identity,
          minted: result.minted,
          cacheKey: result.cacheKey,
          sessionId: result.sessionId ?? null,
          userId: result.user?.id ?? null,
        },
        'MCP auth: resolved with minted bearer',
      );
      return result;
    }
    authLog.warn(
      {
        event: 'mint_fallback',
        cacheKey,
      },
      'MCP auth: mint returned null, falling back to shared bearer',
    );
    if (SHARED_BEARER) {
      const result: McpAuthDetails = {
        bearer: SHARED_BEARER,
        cacheKey: 'shared',
        identity: 'fallback',
        minted: false,
        sessionId: cacheKey,
        user: session.user
          ? { id: session.user.id, email: session.user.email ?? null }
          : null,
      };
      authLog.info(
        {
          event: 'resolved',
          identity: result.identity,
          minted: result.minted,
          cacheKey: result.cacheKey,
          sessionId: result.sessionId ?? null,
          userId: result.user?.id ?? null,
        },
        'MCP auth: resolved with shared bearer fallback',
      );
      return result;
    }
  }

  if (SHARED_BEARER) {
    const result: McpAuthDetails = {
      bearer: SHARED_BEARER,
      cacheKey: 'shared',
      identity: session ? 'fallback' : 'guest',
      minted: false,
      sessionId: cacheKey,
      user: session?.user
        ? { id: session.user.id, email: session.user.email ?? null }
        : null,
    };
    authLog.info(
      {
        event: 'resolved',
        identity: result.identity,
        minted: result.minted,
        cacheKey: result.cacheKey,
        sessionId: result.sessionId ?? null,
        userId: result.user?.id ?? null,
      },
      'MCP auth: resolved using shared bearer',
    );
    return result;
  }

  authLog.error({ event: 'no_bearer_available' }, 'MCP auth: no bearer available');
  const result: McpAuthDetails = {
    bearer: null,
    cacheKey: 'shared',
    identity: 'none',
    minted: false,
    sessionId: cacheKey,
    user: session?.user
      ? { id: session.user.id, email: session.user.email ?? null }
      : null,
  };
  authLog.info(
    {
      event: 'resolved',
      identity: result.identity,
      minted: result.minted,
      cacheKey: result.cacheKey,
      sessionId: result.sessionId ?? null,
      userId: result.user?.id ?? null,
    },
    'MCP auth: resolved without bearer',
  );
  return result;
}

export async function getConnectedMcpServer(auth: McpAuthDetails) {
  const cacheEntry = getClientEntry(auth.cacheKey, auth.bearer);
  if (!cacheEntry.connecting) {
    cacheEntry.connecting = cacheEntry.server
      .connect()
      .then(() => {
        cacheEntry.connecting = null;
      })
      .catch((error) => {
        cacheEntry.connecting = null;
        clientCache.delete(auth.cacheKey);
        throw error;
      });
  }
  if (cacheEntry.connecting) {
    await cacheEntry.connecting;
  }
  return cacheEntry.server;
}

export function summarizeIdentity(auth: McpAuthDetails): McpIdentitySummary {
  switch (auth.identity) {
    case 'user':
      return {
        state: 'user',
        label: 'Personal wallets',
        detail: auth.user?.email ?? undefined,
      };
    case 'fallback':
      return {
        state: 'fallback',
        label: 'Shared fallback',
        detail: 'Using shared bearer',
      };
    case 'guest':
      return {
        state: 'guest',
        label: 'Demo wallet',
        detail: 'Guest session',
      };
    default:
      return {
        state: 'none',
        label: 'Unavailable',
        detail: 'No MCP token',
      };
  }
}

export function clearMcpAuthCaches(sessionId?: string | null, userId?: string | null) {
  if (sessionId) {
    mintedTokenCache.delete(sessionId);
    clientCache.delete(`user:${sessionId}`);
  }

  if (userId) {
    mintedTokenCache.delete(userId);
    clientCache.delete(`user:${userId}`);
  }
}

function getClientEntry(key: string, token: string | null): CachedClient {
  const cached = clientCache.get(key);
  if (cached && cached.token === token) {
    return cached;
  }

  const headers = token ? { Authorization: token } : undefined;
  const server = new MCPServerStreamableHttp({
    url: MCP_URL,
    requestInit: headers ? { headers } : undefined,
    cacheToolsList: true,
  });

  const entry: CachedClient = { token, server, connecting: null };
  clientCache.set(key, entry);
  return entry;
}

async function resolveMintedBearer(sessionId: string, refreshToken: string, scopedLog: Logger = log) {
  const cached = mintedTokenCache.get(sessionId);
  const now = Date.now();
  if (cached && cached.expiresAt - TOKEN_EXPIRY_GRACE_MS > now) {
    scopedLog.debug(
      {
        event: 'mint_cache_hit',
        sessionId,
        expiresAt: cached.expiresAt,
      },
      'MCP auth: using cached minted bearer',
    );
    return cached.bearer;
  }

  const minted = await mintDexterMcpJwt(refreshToken, scopedLog);
  if (minted) {
    mintedTokenCache.set(sessionId, minted);
    scopedLog.info(
      {
        event: 'mint_success',
        sessionId,
        expiresAt: minted.expiresAt,
      },
      'MCP auth: minted bearer refreshed',
    );
    return minted.bearer;
  }

  mintedTokenCache.delete(sessionId);
  scopedLog.warn(
    {
      event: 'mint_failed_cache_cleared',
      sessionId,
    },
    'MCP auth: minted bearer unavailable, cache cleared',
  );
  return null;
}

async function mintDexterMcpJwt(refreshToken: string, scopedLog: Logger = log): Promise<MintCacheEntry | null> {
  try {
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', refreshToken);

    const response = await fetch(getDexterApiRoute('/api/connector/oauth/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      scopedLog.warn(
        {
          event: 'mint_failed',
          status: response.status,
          bodyPreview: body.slice(0, 200),
        },
        'MCP auth: mint request failed',
      );
      return null;
    }

    const data = await response.json().catch(() => null);
    const bearerValue = typeof data?.dexter_mcp_jwt === 'string' ? data.dexter_mcp_jwt.trim() : '';
    if (!bearerValue) {
      scopedLog.warn(
        {
          event: 'mint_missing_token',
          response: data ?? null,
        },
        'MCP auth: mint response missing dexter_mcp_jwt',
      );
      return null;
    }

    const expiresIn = Number(data?.expires_in) || 3600;
    return {
      bearer: ensureBearerPrefix(bearerValue),
      expiresAt: Date.now() + expiresIn * 1000,
    };
  } catch (error) {
    scopedLog.error(
      {
        event: 'mint_exception',
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      'MCP auth: failed to mint per-user bearer',
    );
    return null;
  }
}

function getRefreshToken(session: Session | null | undefined) {
  const token = session?.refresh_token;
  return token && token.trim().length > 0 ? token : null;
}

function extractRefreshTokenFromCookies(entries: { name: string; value: string }[], scopedLog: Logger = log) {
  for (const entry of entries) {
    if (!entry.name.includes('-refresh-token')) continue;
    try {
      const decoded = decodeURIComponent(entry.value);
      const parsed = JSON.parse(decoded);
      const candidate = Array.isArray(parsed)
        ? parsed[1]
        : typeof parsed?.refresh_token === 'string'
          ? parsed.refresh_token
          : null;
      if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
        scopedLog.debug(
          {
            event: 'refresh_token_from_cookie',
            cookieName: entry.name,
          },
          'MCP auth: refresh token extracted from cookie',
        );
        return candidate;
      }
    } catch (error) {
      scopedLog.warn(
        {
          event: 'refresh_cookie_parse_failed',
          cookieName: entry.name,
          error: error instanceof Error ? error.message : String(error),
        },
        'MCP auth: failed to parse refresh token cookie',
      );
    }
  }
  return null;
}

function ensureBearerPrefix(raw: string) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^bearer\s+/i.test(trimmed)) {
    return `Bearer ${trimmed.slice(6).trim()}`;
  }
  return `Bearer ${trimmed}`;
}
