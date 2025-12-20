import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { createScopedLogger } from "@/server/logger";

export const dynamic = "force-dynamic";
const log = createScopedLogger({ scope: "api.transcription_debug" });

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: "/api/transcription-debug",
    method: "POST",
  });

  try {
    const payload = await request.json();
    routeLog.info(
      {
        event: "transcription_debug_payload",
        durationMs: Date.now() - startedAt,
        payload,
      },
      "Transcription debug payload logged",
    );
    return NextResponse.json({ logged: true });
  } catch (error) {
    routeLog.warn(
      {
        event: "transcription_debug_invalid",
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      "Transcription debug payload invalid",
    );
    return NextResponse.json({ logged: false, error: "invalid_payload" }, { status: 400 });
  }
}
