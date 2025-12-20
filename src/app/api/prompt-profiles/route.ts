import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getDexterApiRoute } from "@/app/config/env";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Database = any;

async function getAccessToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

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

export async function GET(request: Request) {
  try {
    const accessToken = await getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "authentication_required" }, { status: 401 });
    }

    const url = new URL(request.url);
    const backendUrl = new URL(getDexterApiRoute("/prompt-profiles"));
    backendUrl.search = url.search;

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "prompt_profiles_fetch_failed",
          status: response.status,
          body: body.slice(0, 512),
        },
        { status: response.status === 401 ? 401 : 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("/api/prompt-profiles GET error", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const accessToken = await getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "authentication_required" }, { status: 401 });
    }
    const body = await request.json();
    const response = await fetch(getDexterApiRoute("/prompt-profiles"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "prompt_profile_create_failed",
          status: response.status,
          body: payload.slice(0, 512),
        },
        { status: response.status === 401 ? 401 : 502 }
      );
    }
    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("/api/prompt-profiles POST error", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
