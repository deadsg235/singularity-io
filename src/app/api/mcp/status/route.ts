import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { resolveMcpAuth, summarizeIdentity } from '../auth';
import { createScopedLogger } from '@/server/logger';

export const dynamic = 'force-dynamic';
const log = createScopedLogger({ scope: 'api.mcp.status' });

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: '/api/mcp/status',
    method: 'GET',
  });

  try {
    const auth = await resolveMcpAuth();
    const summary = summarizeIdentity(auth);
    routeLog.info(
      {
        event: 'mcp_status',
        durationMs: Date.now() - startedAt,
        state: summary.state,
        detail: summary.detail,
        minted: auth.minted,
        cacheKey: auth.cacheKey,
        bearerPresent: Boolean(auth.bearer),
      },
      'MCP status resolved',
    );
    return NextResponse.json({
      state: summary.state,
      label: summary.label,
      detail: summary.detail,
      minted: auth.minted,
    });
  } catch (error: any) {
    routeLog.error(
      {
        event: 'mcp_status_failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      'MCP status endpoint failed',
    );
    return NextResponse.json({ state: 'error', label: 'Unavailable' }, { status: 500 });
  }
}
