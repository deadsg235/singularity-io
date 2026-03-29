import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getDexterApiRoute } from "@/app/config/env";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Database = any;

async function getAccessToken(): Promise<string | null> {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>(
    { cookies: () => cookieStore },
    {
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_KEY,
    }
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function GET() {
  try {
    const accessToken = await getAccessToken();
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    const response = await fetch(getDexterApiRoute("/prompt-profiles/active"), {
      method: "GET",
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "prompt_profile_active_failed",
          status: response.status,
          body: body.slice(0, 512),
        },
        { status: response.status === 401 ? 401 : 502 }
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("/api/prompt-profiles/active GET error", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
