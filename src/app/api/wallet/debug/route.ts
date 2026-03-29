import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { resolveMcpAuth, getConnectedMcpServer } from '../../mcp/auth';
import { createScopedLogger } from '@/server/logger';

export const dynamic = 'force-dynamic';
const log = createScopedLogger({ scope: 'api.wallet.debug' });

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: '/api/wallet/debug',
    method: 'GET',
  });

  try {
    const auth = await resolveMcpAuth();
    const server = await getConnectedMcpServer(auth);

    const resolveResult = await server.callTool('resolve_wallet', {});
    const resolvedWallet = (resolveResult as any)?.structuredContent || (resolveResult as any)?.wallet || resolveResult;
    const address =
      typeof resolvedWallet?.wallet_address === 'string'
        ? resolvedWallet.wallet_address
        : typeof resolvedWallet?.address === 'string'
          ? resolvedWallet.address
          : typeof resolvedWallet?.public_key === 'string'
            ? resolvedWallet.public_key
            : null;

    if (!address) {
      routeLog.warn(
        {
          event: 'wallet_debug_no_address',
          durationMs: Date.now() - startedAt,
          identity: auth.identity,
        },
        'Wallet debug resolve_wallet response missing address',
      );
      return NextResponse.json({
        identity: auth.identity,
        wallet: resolveResult,
        error: 'resolve_wallet did not return an address',
      }, { status: 400 });
    }

    const balancesResult = await server.callTool('solana_list_balances', { wallet_address: address, limit: 30 } as any);

    routeLog.info(
      {
        event: 'wallet_debug_success',
        durationMs: Date.now() - startedAt,
        identity: auth.identity,
        address,
        balanceEntries: Array.isArray((balancesResult as any)?.structuredContent)
          ? (balancesResult as any).structuredContent.length
          : null,
      },
      'Wallet debug resolved successfully',
    );

    return NextResponse.json({
      identity: auth.identity,
      wallet: resolveResult,
      walletAddress: address,
      balances: balancesResult,
    });
  } catch (error: any) {
    routeLog.error(
      {
        event: 'wallet_debug_failure',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      'Wallet debug endpoint failed',
    );
    return NextResponse.json({ error: error?.message || 'failed' }, { status: 500 });
  }
}
