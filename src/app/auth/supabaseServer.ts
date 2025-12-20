import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

type Database = any;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const projectRefMatch = SUPABASE_URL?.match(/^https?:\/\/([a-z0-9-]+)\./i);
const SUPABASE_PROJECT_REF = projectRefMatch ? projectRefMatch[1] : null;

export const AUTH_COOKIE_NAMES = SUPABASE_PROJECT_REF
  ? [
      `sb-${SUPABASE_PROJECT_REF}-auth-token`,
      `sb-${SUPABASE_PROJECT_REF}-auth-token.refresh`,
    ]
  : [];

export type CookieStore = ReturnType<typeof cookies>;

export function ensureSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing');
  }
  return { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY };
}

export function deriveCookieDomain(rawHost: string | null): string | undefined {
  if (process.env.SUPABASE_COOKIE_DOMAIN && process.env.SUPABASE_COOKIE_DOMAIN.trim()) {
    return process.env.SUPABASE_COOKIE_DOMAIN.trim();
  }

  const host = (rawHost ?? '').toLowerCase().split(':')[0];
  if (!host) return undefined;

  if (host === 'dexter.cash' || host === 'www.dexter.cash' || host.endsWith('.dexter.cash')) {
    return '.dexter.cash';
  }

  return undefined;
}

export function createCookieOptions(cookieDomain?: string) {
  const options: Record<string, any> = {
    path: '/',
    sameSite: 'lax',
    secure: true,
  };
  if (cookieDomain) {
    options.domain = cookieDomain;
  }
  return options;
}

export function createSupabaseRouteClient(cookieStore: CookieStore, cookieDomain?: string) {
  const { supabaseUrl, supabaseAnonKey } = ensureSupabaseConfig();
  return createRouteHandlerClient<Database>(
    { cookies: () => cookieStore },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
      cookieOptions: createCookieOptions(cookieDomain) as any,
    },
  );
}

export function resealCookies(store: CookieStore, cookieDomain?: string) {
  if (!AUTH_COOKIE_NAMES.length) return;
  for (const name of AUTH_COOKIE_NAMES) {
    const existing = (store as any).get(name);
    if (!existing) continue;
    (store as any).set(name, existing.value, {
      ...createCookieOptions(cookieDomain),
      httpOnly: true,
    });
  }
}

export function clearSupabaseCookies(store: CookieStore, cookieDomain?: string) {
  if (!AUTH_COOKIE_NAMES.length) return;
  for (const name of AUTH_COOKIE_NAMES) {
    (store as any).set(name, '', {
      ...createCookieOptions(cookieDomain),
      httpOnly: true,
      maxAge: 0,
      expires: new Date(0),
    });
  }
}
