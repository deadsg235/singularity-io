import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import {
  clearSupabaseCookies,
  createSupabaseRouteClient,
  deriveCookieDomain,
  ensureSupabaseConfig,
} from '../supabaseServer';
import { clearMcpAuthCaches } from '@/app/api/mcp/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    ensureSupabaseConfig();
  } catch (err) {
    console.error('/auth/logout missing Supabase configuration', err);
    return NextResponse.json({ ok: false, error: 'supabase_config_missing' }, { status: 500 });
  }

  try {
    const cookieDomain = deriveCookieDomain(request.headers.get('host'));
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient(cookieStore, cookieDomain);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await supabase.auth.signOut();
    clearSupabaseCookies(cookieStore, cookieDomain);

    if (session) {
      const sessionId = (session as any)?.session_id ?? null;
      const userId = session.user?.id ?? null;
      clearMcpAuthCaches(sessionId, userId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/auth/logout error', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
