"use client";

import React from "react";
import { IdCardIcon, PersonIcon } from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  SleekLoadingCard,
  SleekErrorCard,
  TokenIconSleek,
  SleekHash
} from "./sleekVisuals";

type StreamEntry = {
  name?: string;
  symbol?: string;
  mintId?: string;
  channel?: string;
  url?: string;
  streamUrl?: string;
  thumbnail?: string;
  currentViewers?: number;
  viewer_count?: number;
  viewers?: number;
  marketCapUsd?: number;
  market_cap_usd?: number;
  marketCap?: number;
  momentum?: number | string;
  signal?: number | string;
};

const countFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatViewerCount(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
  if (numeric === undefined || !Number.isFinite(numeric)) return undefined;
  return countFormatter.format(numeric);
}

function formatCurrency(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
  if (numeric === undefined || !Number.isFinite(numeric)) return undefined;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
}

function parseMomentumNumeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const cleaned = trimmed.replace(/%/g, "");
    const numeric = Number(cleaned);
    if (Number.isFinite(numeric)) return numeric;
  }
  return undefined;
}

function formatMomentum(value: unknown) {
  const numeric = parseMomentumNumeric(value);
  if (numeric !== undefined) {
    return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
  }
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return undefined;
}

const pumpstreamRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug = false }) => {
  const payload = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const streams: StreamEntry[] = Array.isArray((payload as any).streams) ? (payload as any).streams : [];
  const generatedAt = typeof (payload as any).generatedAt === "string" ? (payload as any).generatedAt : null;
  const updatedDisplay = formatTimestampDisplay(generatedAt ?? item.timestamp);

  const visibleStreams = isExpanded ? streams : streams.slice(0, 6);
  const hasMore = streams.length > visibleStreams.length;

  if (item.status === "IN_PROGRESS" && streams.length === 0) {
    return <SleekLoadingCard />;
  }

  if (streams.length === 0) {
    return <SleekErrorCard message="No active Pump.fun streams detected." />;
  }

  return (
    <div className="w-full max-w-4xl space-y-4">
      <header className="flex items-center justify-between px-1">
        <SleekLabel>Live Streams</SleekLabel>
        <div className="flex items-center gap-3">
           <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Live</span>
           </span>
           {updatedDisplay && <span className="text-[10px] text-neutral-600 font-mono">{updatedDisplay}</span>}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {visibleStreams.map((stream, index) => {
          const title = stream.name || stream.symbol || stream.mintId || stream.channel || `Stream ${index + 1}`;
          const viewers = formatViewerCount(stream.currentViewers ?? stream.viewer_count ?? stream.viewers);
          const marketCap = formatCurrency(stream.marketCapUsd ?? stream.market_cap_usd ?? stream.marketCap);
          const momentumValue = stream.momentum ?? stream.signal;
          const momentumNumeric = parseMomentumNumeric(momentumValue);
          const momentumDisplay = formatMomentum(momentumValue);
          const isPositive = momentumNumeric !== undefined && momentumNumeric >= 0;
          
          const href = stream.url || stream.streamUrl || (stream.mintId ? `https://pump.fun/${stream.mintId}` : undefined);

          return (
            <a
              key={stream.mintId ?? href ?? `${title}-${index}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="group block focus:outline-none"
            >
              <SleekCard className="p-0 overflow-hidden h-full flex flex-col transition-all duration-300 hover:ring-1 hover:ring-white/20 hover:bg-[#111]">
                {/* Thumbnail Hero */}
                <div className="relative aspect-video bg-neutral-800">
                  {stream.thumbnail ? (
                    <img src={stream.thumbnail} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full bg-neutral-900">
                       <TokenIconSleek symbol={title.slice(0, 2)} size={48} />
                    </div>
                  )}
                  
                  {/* Overlays */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/5">
                     <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                     <span className="text-[9px] font-bold text-white uppercase tracking-wider">LIVE</span>
                  </div>

                  {viewers && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/5">
                       <PersonIcon className="w-3 h-3 text-neutral-400" />
                       <span className="text-[10px] font-bold text-white">{viewers}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                   <div className="flex justify-between items-start">
                      <span className="font-bold text-white tracking-tight leading-tight line-clamp-1">{title}</span>
                      {stream.symbol && (
                        <span className="text-[9px] font-mono font-bold text-neutral-500 bg-white/5 px-1.5 py-0.5 rounded">
                          {stream.symbol}
                        </span>
                      )}
                   </div>

                   <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                         <SleekLabel>MCAP</SleekLabel>
                         <span className="text-xs font-semibold text-neutral-200">{marketCap ?? "—"}</span>
                      </div>
                      
                      {momentumDisplay && (
                        <div className="flex flex-col items-end">
                           <SleekLabel>MOMENTUM</SleekLabel>
                           <span className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {momentumDisplay}
                           </span>
                        </div>
                      )}
                   </div>
                </div>
              </SleekCard>
            </a>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full py-3 rounded-2xl border border-white/5 bg-white/5 text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isExpanded ? "Collapse" : `Show ${streams.length - visibleStreams.length} more streams`}
        </button>
      )}

      {debug && (
        <details className="mt-4 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default pumpstreamRenderer;
