import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSupabaseRouteClient,
  deriveCookieDomain,
  ensureSupabaseConfig,
  resealCookies,
} from "../supabaseServer";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    ensureSupabaseConfig();
    const payload = await request.json();
    const { event, session } = payload ?? {};
    const cookieDomain = deriveCookieDomain(request.headers.get("host"));
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient(cookieStore, cookieDomain);

    if (event === "SIGNED_OUT" || !session) {
      await supabase.auth.signOut();
    } else {
      await supabase.auth.setSession(session);
      resealCookies(cookieStore, cookieDomain);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/auth/callback error", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const host = request.headers.get("host");
  const cookieDomain = deriveCookieDomain(host);
  try {
    ensureSupabaseConfig();
  } catch (err) {
    console.error("/auth/callback DELETE missing Supabase configuration", err);
    return NextResponse.json({ ok: false, error: "supabase_config_missing" }, { status: 500 });
  }
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, cookieDomain);
  await supabase.auth.signOut();
  resealCookies(cookieStore, cookieDomain);
  return NextResponse.json({ ok: true });
}
