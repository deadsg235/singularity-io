import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { MEMORY_LIMITS } from '@/app/config/memory';
import { createScopedLogger } from '@/server/logger';

type Database = any;

export const dynamic = 'force-dynamic';
const log = createScopedLogger({ scope: 'api.realtime.memories' });

const normalizeList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'object' && Array.isArray((value as any).items)) {
    return (value as any).items
      .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item: string) => item.length > 0);
  }
  return [];
};

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: '/api/realtime/memories',
    method: 'GET',
  });

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore }, {
      supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const supabaseUserId = session?.user?.id;
    if (!supabaseUserId) {
      routeLog.info(
        {
          event: 'no_authenticated_user',
          durationMs: Date.now() - startedAt,
        },
        'Realtime memories request returning empty set (no supabase user)',
      );
      return NextResponse.json({ memories: [] });
    }

    const fetchLimit = MEMORY_LIMITS.adminPanel.recentCount;

    const { data, error, count } = await supabase
      .from('user_memories')
      .select('id, summary, facts, follow_ups, created_at, metadata', { count: 'exact', head: false })
      .eq('supabase_user_id', supabaseUserId)
      .order('created_at', { ascending: false })
      .limit(fetchLimit ?? 50);

    if (error) {
      routeLog.error(
        {
          event: 'memories_query_failed',
          durationMs: Date.now() - startedAt,
          supabaseUserId,
          error: error.message,
        },
        'Failed to query user_memories table',
      );
      return NextResponse.json({ error: 'memories_fetch_failed' }, { status: 500 });
    }

    const memories = (data ?? []).map((entry) => {
      const metadata = entry?.metadata && typeof entry.metadata === 'object' ? entry.metadata as Record<string, any> : {};
      const toNullableString = (value: unknown): string | null => (typeof value === 'string' && value.trim().length ? value.trim() : null);
      return {
        id: entry.id,
        summary: typeof entry.summary === 'string' ? entry.summary : '',
        facts: normalizeList(entry.facts),
        followUps: normalizeList(entry.follow_ups),
        createdAt: entry.created_at || null,
        sessionId: toNullableString(metadata?.session_id),
        startedAt: toNullableString(metadata?.started_at),
        endedAt: toNullableString(metadata?.ended_at),
        status: 'summarized' as const,
      };
    });

    const { data: skippedData, error: skippedError, count: skippedCount } = await supabase
      .from('conversation_logs')
      .select('id, session_id, started_at, ended_at, created_at, status', { count: 'exact', head: false })
      .eq('supabase_user_id', supabaseUserId)
      .eq('status', 'skipped')
      .order('started_at', { ascending: false })
      .limit(fetchLimit ?? 50);

    if (skippedError) {
      routeLog.error(
        {
          event: 'skipped_query_failed',
          durationMs: Date.now() - startedAt,
          supabaseUserId,
          error: skippedError.message,
        },
        'Failed to query conversation_logs for skipped sessions',
      );
      return NextResponse.json({ error: 'memories_fetch_failed' }, { status: 500 });
    }

    const skipped = (skippedData ?? []).map((entry) => ({
      id: entry.id,
      summary: 'Session skipped (no retained content)',
      facts: [] as string[],
      followUps: [] as string[],
      createdAt: entry.created_at || entry.started_at || null,
      sessionId: typeof entry.session_id === 'string' ? entry.session_id : null,
      startedAt: entry.started_at || null,
      endedAt: entry.ended_at || null,
      status: 'skipped' as const,
    }));

    const total = typeof count === 'number' ? count : memories.length;
    const totalSkipped = typeof skippedCount === 'number' ? skippedCount : skipped.length;

    routeLog.info(
      {
        event: 'memories_fetched',
        durationMs: Date.now() - startedAt,
        supabaseUserId,
        memoriesReturned: memories.length,
        skippedReturned: skipped.length,
        total,
        totalSkipped,
        fetchLimit,
      },
      'Fetched realtime memories successfully',
    );

    return NextResponse.json({
      memories,
      skipped,
      total,
      totalSkipped,
      limit: fetchLimit ?? null,
    });
  } catch (error) {
    routeLog.error(
      {
        event: 'handler_exception',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      'Unhandled error during memories fetch',
    );
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
