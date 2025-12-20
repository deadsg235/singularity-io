import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';

import { MODEL_IDS } from '../../../config/models';
import { createScopedLogger } from '@/server/logger';

const OPENAI_REALTIME_URL = `https://api.openai.com/v1/realtime/calls?model=${MODEL_IDS.realtime}&intent=transcription`;

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-OpenAI-Agents-SDK',
];

const log = createScopedLogger({ scope: 'api.realtime.calls' });

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(','),
    },
  });
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const requestLog = log.child({
    requestId,
    path: '/api/realtime/calls',
    method: 'POST',
  });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      requestLog.warn(
        {
          event: 'missing_authorization',
          durationMs: Date.now() - startedAt,
        },
        'Realtime call proxy rejected missing authorization header',
      );
      return new Response(JSON.stringify({ error: 'missing_authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();

    const upstreamResponse = await fetch(OPENAI_REALTIME_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        Authorization: authHeader,
        'OpenAI-Beta': 'realtime=v1',
        'X-OpenAI-Agents-SDK': req.headers.get('x-openai-agents-sdk') ?? '',
        Accept: 'application/sdp',
      },
      body,
    });

    const responseBody = await upstreamResponse.text();
    const headers = new Headers({
      'Content-Type': upstreamResponse.headers.get('content-type') || 'application/sdp',
      'Access-Control-Allow-Origin': '*',
    });
    const location = upstreamResponse.headers.get('location');
    if (location) headers.set('Location', location);

    requestLog.info(
      {
        event: 'proxy_complete',
        durationMs: Date.now() - startedAt,
        upstreamStatus: upstreamResponse.status,
        hasLocationHeader: Boolean(location),
        requestSize: body.length,
      },
      'Realtime call proxied to OpenAI',
    );

    return new Response(responseBody, {
      status: upstreamResponse.status,
      headers,
    });
  } catch (error) {
    requestLog.error(
      {
        event: 'proxy_exception',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      'Realtime call proxy failed',
    );
    return new Response(JSON.stringify({ error: 'proxy_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
