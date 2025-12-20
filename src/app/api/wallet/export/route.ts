import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getDexterApiRoute } from "@/app/config/env";
import { createScopedLogger } from "@/server/logger";

type Database = any;
const log = createScopedLogger({ scope: "api.wallet.export" });

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: "/api/wallet/export",
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
        "Wallet export request rejected: no Supabase access token",
      );
      return NextResponse.json({ ok: false, error: "authentication_required" }, { status: 401 });
    }

    const response = await fetch(getDexterApiRoute("/wallets/export"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const rawBody = await response.text();

    if (!response.ok) {
      const status = response.status === 401 ? 401 : 502;
      routeLog.error(
        {
          event: "wallet_export_failed",
          durationMs: Date.now() - startedAt,
          upstreamStatus: response.status,
          bodyPreview: rawBody.slice(0, 512),
        },
        "Wallet export upstream request failed",
      );
      return NextResponse.json(
        {
          ok: false,
          error: "wallet_export_failed",
          status: response.status,
          body: rawBody.slice(0, 512),
        },
        { status }
      );
    }

    try {
      const data = rawBody ? JSON.parse(rawBody) : {};
      routeLog.info(
        {
          event: "wallet_export_success",
          durationMs: Date.now() - startedAt,
          payloadSize: rawBody.length,
        },
        "Wallet export completed successfully",
      );
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    } catch {
      routeLog.error(
        {
          event: "wallet_export_parse_error",
          durationMs: Date.now() - startedAt,
        },
        "Wallet export response failed to parse",
      );
      return NextResponse.json({ ok: false, error: "wallet_export_parse_error" }, { status: 502 });
    }
  } catch (error) {
    routeLog.error(
      {
        event: "handler_exception",
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      "Unhandled error in wallet export endpoint",
    );
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
