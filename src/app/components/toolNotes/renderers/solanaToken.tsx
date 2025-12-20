"use client";

import React, { useState } from "react";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  TokenIconSleek, 
  SleekHash, 
  MetricItem, 
  formatUsdCompact, 
  formatUsdPrecise,
  formatPercent 
} from "./sleekVisuals";

// --- Types (Preserved) ---

type TokenResult = {
  address?: string;
  mint?: string;
  symbol?: string;
  name?: string;
  icon?: string;
  logo?: string;
  image?: string;
  info?: Record<string, unknown>;
  priceUsd?: number;
  price_usd?: number;
  liquidityUsd?: number;
  liquidity_usd?: number;
  liquidity?: Record<string, unknown>;
  volume24hUsd?: number;
  volume24h_usd?: number;
  volume24h?: number;
  totalVolume?: { h24?: number };
  marketCap?: number;
  market_cap?: number;
  marketCapUsd?: number;
  market_cap_usd?: number;
  fdv?: number;
  fdvUsd?: number;
  fdv_usd?: number;
  priceChange?: { h24?: number };
  price_change_24h?: number;
  priceChange24h?: number;
  pairs?: PairResult[];
};

type PairResult = {
  pairAddress?: string;
  dexId?: string;
  url?: string;
  liquidity?: { usd?: number };
  liquidityUsd?: number;
  liquidity_usd?: number;
  volume?: { h24?: number };
  volume24hUsd?: number;
  volume_24h_usd?: number;
  priceChange?: { h24?: number };
  priceChange24h?: number;
  price_change_24h?: number;
};

// --- Helpers (Preserved) ---

function pick<T>(...values: Array<T | null | undefined>): T | undefined {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

function pickString(...values: Array<string | null | undefined>) {
  return pick(...values.map((value) => {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    return undefined;
  }));
}

function pickNumber(...values: Array<number | string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function formatUsdHelper(value?: number | string | null, opts: { precise?: boolean; compact?: boolean } = {}) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  if (opts.compact) return formatUsdCompact(numeric);
  // For standard price, we might want slightly different precision logic than the precise helper
  // But for now using the precise one for consistency
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.precise ? 6 : 2,
  }).format(numeric);
}

function formatPercentHelper(value?: number | string | null) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  return formatPercent(numeric);
}

// --- Main Renderer ---

const solanaResolveTokenRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};
  const query = typeof args?.query === "string" && args.query.trim().length > 0 ? args.query.trim() : undefined;

  const results: TokenResult[] = Array.isArray((payload as any)?.results)
    ? (payload as any)?.results
    : Array.isArray(payload)
      ? (payload as TokenResult[])
      : [];

  const visibleTokens = results.slice(0, 3);
  const timestamp = formatTimestampDisplay(item.timestamp);

  // Loading State
  if (item.status === "IN_PROGRESS" && results.length === 0) {
    return (
      <SleekCard className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-neutral-800 animate-pulse" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-800" />
            <div className="h-3 w-20 animate-pulse rounded bg-neutral-800" />
          </div>
        </div>
      </SleekCard>
    );
  }

  // No Results
  if (results.length === 0) {
    return (
      <SleekCard className="p-6">
        <div className="text-center text-neutral-400 text-sm">
          No tokens found for "{query}".
        </div>
      </SleekCard>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      <header className="flex items-center justify-between px-1">
         <SleekLabel>Token Analysis</SleekLabel>
         {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      {visibleTokens.map((token, index) => {
        const address = pickString(token.address, token.mint);
        const info = token.info && typeof token.info === "object" ? token.info : undefined;
        const symbol = pickString(token.symbol, (info as any)?.symbol) ?? "UNKNOWN";
        const name = pickString(token.name, (info as any)?.name);
        const imageUrl = pickString(
              (info as any)?.imageUrl,
              (info as any)?.openGraphImageUrl,
              (info as any)?.headerImageUrl,
              token.icon,
              token.logo,
              token.image,
        );

        const marketCapValue = pickNumber(token.marketCap, token.market_cap, token.marketCapUsd, token.fdv);
        const marketCap = formatUsdHelper(marketCapValue, { compact: true });
        
        const priceValue = pickNumber(token.priceUsd, token.price_usd);
        const price = formatUsdHelper(priceValue, { precise: true });

        const priceChangeRaw = pickNumber(token.priceChange?.h24, token.price_change_24h, token.priceChange24h);
        const priceChange = formatPercentHelper(priceChangeRaw);
        const isPositive = priceChangeRaw !== undefined && priceChangeRaw >= 0;

        const volumeValue = pickNumber(token.volume24hUsd, token.volume24h);
        const volume = formatUsdHelper(volumeValue, { compact: true });

        const liquidityValue = pickNumber(token.liquidityUsd, token.liquidity_usd);
        const liquidity = formatUsdHelper(liquidityValue, { compact: true });

        return (
          <SleekCard key={address ?? index} className="relative group overflow-visible">
             {/* Glow Effect */}
             <div 
                className={`absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl transition-colors duration-700 pointer-events-none ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} 
             />

             <div className="relative z-10 flex flex-col p-5 gap-6">
                {/* Header Row: Icon | Name(Big)/Ticker | Price/Change */}
                <div className="flex items-start gap-4">
                   <TokenIconSleek symbol={symbol} imageUrl={imageUrl} size={64} />
                   
                   <div className="flex flex-1 flex-col pt-0.5 min-w-0">
                      {/* Swapped Hierarchy: Name Big, Ticker Small */}
                      <h3 className="text-xl font-bold text-white tracking-tight leading-tight mb-1 truncate">
                        {name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-neutral-500 tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
                          {symbol}
                        </span>
                      </div>
                   </div>

                   {/* Price Block */}
                   <div className="flex flex-col items-end">
                      <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
                        {price ?? "—"}
                      </div>
                      {priceChange && (
                         <div className={`text-xs font-bold px-2 py-1 rounded-full bg-white/5 mt-1 ${isPositive ? 'text-emerald-400 shadow-[0_0_10px_-2px_rgba(52,211,153,0.3)]' : 'text-rose-400 shadow-[0_0_10px_-2px_rgba(251,113,133,0.3)]'}`}>
                            {priceChange}
                         </div>
                      )}
                   </div>
                </div>

                {/* Metrics Row (Always Visible) */}
                <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-5">
                   {marketCap && <MetricItem label="MCAP" value={marketCap} />}
                   {volume && <MetricItem label="VOL (24H)" value={volume} />}
                   {liquidity && <MetricItem label="LIQUIDITY" value={liquidity} />}
                </div>

                {/* Footer: Mint Address (Left) + Research Links (Right) */}
                <div className="flex items-center justify-between pt-1">
                   {/* Left: Mint Address Badge */}
                   <div>
                       {address && (
                          <SleekHash value={address} href={`https://solscan.io/token/${address}`} label="Mint" />
                       )}
                   </div>

                   {/* Right: Research Links (Always Visible) */}
                   <div className="flex gap-4">
                      {['Solscan', 'Birdeye', 'Dexscreener'].map((site) => (
                         <a 
                           key={site}
                           href={address ? `https://${site.toLowerCase()}.io/token/${address}` : '#'}
                           target="_blank"
                           rel="noreferrer"
                           className="text-[9px] uppercase font-bold tracking-widest text-neutral-600 hover:text-white transition-colors"
                         >
                           {site}
                         </a>
                      ))}
                   </div>
                </div>
             </div>
          </SleekCard>
        );
      })}

      {debug && (
        <details className="mt-4 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default solanaResolveTokenRenderer;
