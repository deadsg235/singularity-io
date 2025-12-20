import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '@/server/logger';

const ENABLE_TRANSCRIPT_LOGS = process.env.ENABLE_TRANSCRIPT_LOGS !== 'false';
const MAX_FIELD_LENGTH = 2000;
const log = createScopedLogger({ scope: 'api.transcript_log' });

const sanitizeText = (value: unknown) => {
  if (typeof value !== 'string') return value;
  if (value.length <= MAX_FIELD_LENGTH) return value;
  return `${value.slice(0, MAX_FIELD_LENGTH)}…`;
};

export async function POST(request: NextRequest) {
  if (!ENABLE_TRANSCRIPT_LOGS) {
    return NextResponse.json({ logged: false }, { status: 202 });
  }

  try {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const routeLog = log.child({
      requestId,
      path: '/api/transcript-log',
      method: 'POST',
    });

    const payload = await request.json();
    const entry = {
      ts: typeof payload?.ts === 'string' ? payload.ts : new Date().toISOString(),
      kind: typeof payload?.kind === 'string' ? payload.kind : 'message',
      role: typeof payload?.role === 'string' ? payload.role : undefined,
      itemId: typeof payload?.itemId === 'string' ? payload.itemId : undefined,
      toolId: typeof payload?.toolId === 'string' ? payload.toolId : undefined,
      toolName: typeof payload?.toolName === 'string' ? payload.toolName : undefined,
      text: sanitizeText(payload?.text),
      arguments: payload?.arguments,
      output: payload?.output,
      meta: payload?.meta,
      source: payload?.source || 'dexter-agents-ui',
      remoteIp: request.headers.get('x-forwarded-for') || undefined,
    };

    routeLog.info(
      {
        event: 'transcript_entry',
        durationMs: Date.now() - startedAt,
        entry,
      },
      'Transcript entry logged',
    );

    return NextResponse.json({ logged: true });
  } catch (error) {
    log.error(
      {
        event: 'transcript_log_failed',
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      'Transcript logging failed',
    );
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
}
