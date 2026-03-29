import { NextRequest, NextResponse } from 'next/server';

import { getDexterApiRoute } from '@/app/config/env';
import { resolveMcpAuth, summarizeIdentity } from '../../mcp/auth';

type LogPayload = Record<string, any> | null;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let payload: LogPayload = null;

  try {
    payload = await request.json().catch(() => null);
  } catch (error) {
    console.error('[realtime.log] failed to parse payload', error);
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'empty_payload' }, { status: 400 });
  }

  const auth = await resolveMcpAuth();
  const identitySummary = summarizeIdentity(auth);

  const metadata = {
    ...(typeof payload.metadata === 'object' && payload.metadata ? payload.metadata : {}),
    identity: identitySummary.state,
    source: 'dexter-agents-ui',
    sessionUserId: auth.user?.id ?? null,
    sessionUserEmail: auth.user?.email ?? null,
  };

  const outgoingBody = JSON.stringify({
    ...payload,
    metadata,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth.bearer) {
    headers.Authorization = auth.bearer;
  }

  try {
    const upstream = await fetch(getDexterApiRoute('/api/realtime/logs'), {
      method: 'POST',
      headers,
      body: outgoingBody,
    });

    const responseText = await upstream.text();

    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);
    responseHeaders.set('x-dexter-mcp-state', identitySummary.state);
    if (identitySummary.detail) responseHeaders.set('x-dexter-mcp-detail', identitySummary.detail);
    responseHeaders.set('x-dexter-mcp-minted', auth.minted ? 'true' : 'false');

    return new NextResponse(responseText, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[realtime.log] failed to forward payload', error);
    return NextResponse.json({ error: 'log_forward_failed' }, { status: 502 });
  }
}
