import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { getConnectedMcpServer, resolveMcpAuth, summarizeIdentity } from './auth';
import { createScopedLogger } from '@/server/logger';

export const dynamic = 'force-dynamic';
const log = createScopedLogger({ scope: 'api.mcp' });

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: '/api/mcp',
    method: 'GET',
  });

  try {
    const auth = await resolveMcpAuth();
    const server = await getConnectedMcpServer(auth);
    const tools = await server.listTools();

    const summary = summarizeIdentity(auth);
    const response = NextResponse.json({
      tools,
      identity: summary,
    });
    response.headers.set('x-dexter-mcp-state', summary.state);
    if (summary.detail) {
      response.headers.set('x-dexter-mcp-detail', summary.detail);
    }

    routeLog.info(
      {
        event: 'mcp_list_success',
        durationMs: Date.now() - startedAt,
        identity: summary.state,
        minted: auth.minted,
        toolCount: Array.isArray((tools as any)?.tools) ? (tools as any).tools.length : Array.isArray(tools) ? (tools as any[]).length : null,
      },
      'MCP tool listing succeeded',
    );
    return response;
  } catch (error: any) {
    routeLog.error(
      {
        event: 'mcp_list_failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      'MCP tool listing failed',
    );
    return NextResponse.json({ error: 'mcp_list_failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: '/api/mcp',
    method: 'POST',
  });

  let tool = '';
  try {
    const body = await req.json().catch(() => ({}));
    tool = String(body.tool || body.name || '').trim();
    const args = (body.arguments || body.args || {}) as Record<string, unknown>;

    if (!tool) {
      routeLog.warn(
        {
          event: 'missing_tool',
          durationMs: Date.now() - startedAt,
        },
        'MCP call rejected: missing tool name',
      );
      return NextResponse.json({ error: 'missing_tool' }, { status: 400 });
    }

    const auth = await resolveMcpAuth();
    const server = await getConnectedMcpServer(auth);
    const result = await server.callTool(tool, args);

    const summary = summarizeIdentity(auth);
    const response = NextResponse.json(result);
    response.headers.set('x-dexter-mcp-state', summary.state);
    if (summary.detail) {
      response.headers.set('x-dexter-mcp-detail', summary.detail);
    }
    
    // Condensed log for success
    routeLog.info(
      {
        event: 'mcp_call_success',
        durationMs: Date.now() - startedAt,
        identity: summary.state,
        tool,
        argKeys: Object.keys(args || {}), // Shorter key
        // Omit full details to reduce noise, rely on mcp-tools log for deep dive if needed
      },
      `MCP tool executed: ${tool}` // clearer message
    );
    return response;
  } catch (error: any) {
    routeLog.error(
      {
        event: 'mcp_call_failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error), // Flatten error object
        stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
      },
      `MCP tool failed: ${tool}`
    );
    return NextResponse.json({ error: 'mcp_call_failed', message: error?.message || String(error) }, { status: 500 });
  }
}
