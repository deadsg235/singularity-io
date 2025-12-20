import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { getDexterApiRoute } from "../../../../config/env";
import { createScopedLogger } from "@/server/logger";

export const dynamic = "force-dynamic";
const log = createScopedLogger({ scope: "api.realtime.sessions" });

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const requestId = randomUUID();
  const { sessionId } = await context.params;
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: "/api/realtime/sessions/:id",
    method: "DELETE",
    sessionId: sessionId ?? null,
  });

  try {
    if (!sessionId) {
      routeLog.warn(
        {
          event: "missing_session_id",
          durationMs: Date.now() - startedAt,
        },
        "Realtime session delete rejected: missing sessionId",
      );
      return NextResponse.json({ error: "Missing session id" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      routeLog.warn(
        {
          event: "missing_authorization",
          durationMs: Date.now() - startedAt,
        },
        "Realtime session delete rejected: missing authorization header",
      );
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const upstream = await fetch(getDexterApiRoute(`/realtime/sessions/${encodeURIComponent(sessionId)}`), {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
      credentials: "include",
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      routeLog.error(
        {
          event: "upstream_delete_failed",
          durationMs: Date.now() - startedAt,
          status: upstream.status,
          bodyPreview: body.slice(0, 200),
        },
        "Realtime session delete failed upstream",
      );
      return NextResponse.json({ error: "Upstream realtime session delete failed" }, { status: upstream.status });
    }

    routeLog.info(
      {
        event: "session_deleted",
        durationMs: Date.now() - startedAt,
        status: upstream.status,
      },
      "Realtime session deleted successfully",
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    routeLog.error(
      {
        event: "handler_exception",
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      "Unhandled error deleting realtime session",
    );
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
