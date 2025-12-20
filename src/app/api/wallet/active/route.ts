import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getDexterApiRoute } from "@/app/config/env";
import { createScopedLogger } from "@/server/logger";

type Database = any;
const log = createScopedLogger({ scope: "api.wallet.active" });

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: "/api/wallet/active",
    method: "GET",
  });

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>(
      { cookies: () => cookieStore },
      {
        supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      routeLog.warn(
        {
          event: "no_access_token",
          durationMs: Date.now() - startedAt,
        },
        "Wallet active request rejected: no Supabase access token",
      );
      return NextResponse.json({ ok: false, error: "authentication_required" }, { status: 401 });
    }

    const response = await fetch(getDexterApiRoute("/wallets/active"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const status = response.status === 401 ? 401 : 502;
      routeLog.error(
        {
          event: "wallet_upstream_failure",
          durationMs: Date.now() - startedAt,
          upstreamStatus: response.status,
          bodyPreview: body.slice(0, 256),
        },
        "Active wallet upstream request failed",
      );
      return NextResponse.json(
        {
          ok: false,
          error: "wallet_service_failure",
          status: response.status,
          body: body.slice(0, 256),
        },
        { status }
      );
    }

    const data = await response.json();
    routeLog.info(
      {
        event: "wallet_active_success",
        durationMs: Date.now() - startedAt,
        hasWallet: Boolean(data?.wallet),
      },
      "Fetched active wallet successfully",
    );
    return NextResponse.json(data);
  } catch (error) {
    routeLog.error(
      {
        event: "handler_exception",
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      "Unhandled error in wallet active endpoint",
    );
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
