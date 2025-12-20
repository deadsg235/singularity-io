import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { getConnectedMcpServer, resolveMcpAuth, summarizeIdentity } from "../../api/mcp/auth";
import { createScopedLogger } from "@/server/logger";

const log = createScopedLogger({ scope: "api.tools" });

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: "/api/tools",
    method: "GET",
  });

  try {
    const auth = await resolveMcpAuth();
    const server = await getConnectedMcpServer(auth);
    const result = await server.listTools();

    const summary = summarizeIdentity(auth);
    const response = NextResponse.json({ tools: Array.isArray((result as any)?.tools) ? (result as any).tools : result });
    response.headers.set('x-dexter-mcp-state', summary.state);
    if (summary.detail) response.headers.set('x-dexter-mcp-detail', summary.detail);

    routeLog.info(
      {
        event: "tools_listed",
        durationMs: Date.now() - startedAt,
        identity: summary.state,
        minted: auth.minted,
        cacheKey: auth.cacheKey,
        toolCount: Array.isArray((result as any)?.tools) ? (result as any).tools.length : Array.isArray(result) ? (result as any[]).length : null,
      },
      "Retrieved MCP tool catalog",
    );

    return response;
  } catch (error) {
    routeLog.error(
      {
        event: "handler_exception",
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      "Failed to retrieve MCP tools",
    );
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
