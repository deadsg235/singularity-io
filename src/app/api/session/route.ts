import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { MODEL_IDS } from "../../config/models";
import { getDexterApiRoute } from "../../config/env";
import { resolveConciergeProfile } from "@/app/agentConfigs/customerServiceRetail/promptProfile";
import { createScopedLogger } from "@/server/logger";

type Database = any;

const ALLOW_GUEST_SESSIONS =
  process.env.NEXT_PUBLIC_ALLOW_GUEST_SESSIONS === "false" ? false : true;

export const dynamic = 'force-dynamic';

let cachedGuestInstructions: { value: string; expiresAt: number } | null = null;
const log = createScopedLogger({ scope: "api.session" });

async function getGuestInstructions(): Promise<string> {
  const now = Date.now();
  if (cachedGuestInstructions && cachedGuestInstructions.expiresAt > now) {
    return cachedGuestInstructions.value;
  }

  const profile = await resolveConciergeProfile();
  const guestSegment = profile?.guestInstructions?.trim() || '';

  if (!guestSegment) {
    throw new Error("guestInstructions missing from concierge profile");
  }

  cachedGuestInstructions = { value: guestSegment, expiresAt: now + 60_000 };
  return guestSegment;
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: "/api/session",
    method: "GET",
  });

  try {
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

    if (sessionError) {
      routeLog.warn(
        {
          event: "supabase_session_error",
          error: sessionError.message,
        },
        "Supabase session lookup returned an error",
      );
    }

    const isAuthenticated = Boolean(session?.user);

    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!isAuthenticated && !ALLOW_GUEST_SESSIONS) {
      routeLog.warn(
        {
          event: "guest_sessions_disabled",
          durationMs: Date.now() - startedAt,
        },
        "Guest sessions are disabled; rejecting unauthenticated request",
      );
      return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    }

    const payload: Record<string, any> = { model: MODEL_IDS.realtime };

    if (isAuthenticated && session?.access_token) {
      payload.supabaseAccessToken = session.access_token;
    } else if (bearerToken) {
      payload.supabaseAccessToken = bearerToken;
    } else {
      const guestInstructions = await getGuestInstructions();
      payload.guestProfile = {
        label: "Dexter Demo Wallet",
        instructions: guestInstructions,
      };
    }

    const response = await fetch(getDexterApiRoute(`/realtime/sessions`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      routeLog.error(
        {
          event: "upstream_failure",
          status: response.status,
          bodyPreview: body.slice(0, 400),
          durationMs: Date.now() - startedAt,
          isAuthenticated,
        },
        "Dexter realtime session request failed",
      );
      return NextResponse.json(
        { error: "Upstream session service failure", status: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    const sessionType = data?.dexter_session?.type || (isAuthenticated ? "user" : "guest");
    routeLog.info(
      {
        event: "session_created",
        durationMs: Date.now() - startedAt,
        isAuthenticated,
        sessionType,
        sessionId: data?.id ?? null,
        model: data?.model ?? null,
        toolCount: Array.isArray(data?.tools) ? data.tools.length : 0,
        supabaseUserId: data?.dexter_session?.user?.id ?? null,
      },
      "Realtime session created successfully",
    );
    // IMPORTANT: Preserve backend-native tools and configuration returned by Dexter API.
    // Do not strip tools or override tool_choice/instructions so the Realtime backend
    // can call MCP directly using the bearer provided server-side.
    return NextResponse.json(data);
  } catch (error) {
    routeLog.error(
      {
        event: "handler_exception",
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      "Unhandled error while creating realtime session",
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
