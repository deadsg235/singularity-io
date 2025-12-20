"use client";

import React from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatSolDisplay } from "./helpers";
import type { TokenSide } from "./solanaVisuals";
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

type SwapArgs = Record<string, unknown>;

type Metric = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative" | "notice";
  href?: string;
};

type SwapViewModel = {
  title: string;
  timestamp?: string;
  hero: {
    from: TokenSide;
    to: TokenSide;
    priceImpact?: { value: string; tone: "neutral" | "positive" | "negative" };
  };
  metrics: Metric[];
  meta: Metric[];
  warnings: string[];
  errorMessage?: string;
  rawData: any;
};

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  signDisplay: "always",
});

const WELL_KNOWN_MINTS: Record<string, string> = {
  USDC11111111111111111111111111111111111111: "USDC",
  So11111111111111111111111111111111111111112: "SOL",
};

function formatPercentHelper(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return `${percentFormatter.format(numeric)}%`;
}

function pick<T = unknown>(...candidates: Array<T | null | undefined>): T | undefined {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) {
      return candidate as T;
    }
  }
  return undefined;
}

function symbolFromMint(mint?: string): string | undefined {
  if (!mint) return undefined;
  const known = WELL_KNOWN_MINTS[mint];
  if (known) return known;
  return mint.slice(0, 3).toUpperCase();
}

function normalizeAssetSymbol(symbol?: string, fallbackMint?: string) {
  if (!symbol || symbol.trim().length === 0) return symbolFromMint(fallbackMint);
  const normalized = symbol.replace(/\s+/g, " ").trim().toUpperCase();
  if (normalized === "NAT" || normalized === "NATIVE" || normalized === "NATIVE SOL" || normalized === "NATIVE-SOL") {
    return "SOL";
  }
  if (normalized === "UNKNOWN" && fallbackMint) {
    return symbolFromMint(fallbackMint);
  }
  return normalized;
}

function parseAmountDisplay(raw: unknown, fallbackMint?: string): { amount: string; asset?: string } | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      const assetLabel = parts.slice(1).join(" ");
      return { amount: parts[0], asset: normalizeAssetSymbol(assetLabel, fallbackMint) };
    }
    return { amount: parts[0], asset: normalizeAssetSymbol(undefined, fallbackMint) };
  }
  if (typeof raw === "number") {
    const formatted =
      Math.abs(raw) >= 1
        ? raw.toLocaleString("en-US", { maximumFractionDigits: 2 })
        : raw.toLocaleString("en-US", { maximumFractionDigits: 6 });
    return { amount: formatted, asset: normalizeAssetSymbol(undefined, fallbackMint) };
  }
  return null;
}

function resolveTokenImage(structured: any, kind: "input" | "output"): string | undefined {
  if (!structured) return undefined;
  const lower = kind === "input";
  const direct = lower
    ? pick(
        structured?.inputLogo,
        structured?.input_logo,
        structured?.inputIcon,
        structured?.input_icon,
        structured?.sourceLogo,
        structured?.source_icon,
        structured?.route?.[0]?.icon,
        structured?.legs?.[0]?.icon
      )
    : pick(
        structured?.outputLogo,
        structured?.output_logo,
        structured?.destinationLogo,
        structured?.destination_icon,
        structured?.outputIcon,
        structured?.output_icon,
        structured?.legs?.[structured?.legs?.length - 1]?.icon,
        structured?.route?.[structured?.route?.length - 1]?.icon
      );
  if (typeof direct === "string" && direct.startsWith("http")) return direct;
  return undefined;
}

function toTokenSide(
  kind: "from" | "to",
  amountRaw: unknown,
  amountLamports: unknown,
  mint: string | undefined,
  tokenMeta?: any,
  fallbackImageUrl?: string,
): TokenSide {
  const display =
    parseAmountDisplay(amountRaw, mint) ??
    (amountLamports ? parseAmountDisplay(formatSolDisplay(amountLamports, { fromLamports: true }), "So11111111111111111111111111111111111111112") : null);
  const metaSymbol = typeof tokenMeta?.symbol === "string" ? tokenMeta.symbol : undefined;
  const asset = normalizeAssetSymbol(metaSymbol, mint) ?? display?.asset ?? symbolFromMint(mint) ?? "TOKEN";
  const explorerUrl = mint ? `https://solscan.io/token/${mint}` : undefined;
  const imageUrl =
    typeof tokenMeta?.imageUrl === "string" && tokenMeta.imageUrl.trim().length
      ? tokenMeta.imageUrl
      : fallbackImageUrl;

  const enrichedMeta = tokenMeta
    ? {
        name: typeof tokenMeta?.name === "string" ? tokenMeta.name : null,
        priceChange24h:
          typeof tokenMeta?.priceChange24h === "number" && Number.isFinite(tokenMeta.priceChange24h)
            ? tokenMeta.priceChange24h
            : null,
        priceUsd:
          typeof tokenMeta?.priceUsd === "number" && Number.isFinite(tokenMeta.priceUsd) ? tokenMeta.priceUsd : null,
        marketCap:
          typeof tokenMeta?.marketCap === "number" && Number.isFinite(tokenMeta.marketCap) ? tokenMeta.marketCap : null,
        liquidityUsd:
          typeof tokenMeta?.liquidityUsd === "number" && Number.isFinite(tokenMeta.liquidityUsd)
            ? tokenMeta.liquidityUsd
            : null,
      }
    : undefined;

  return {
    heading: kind === "from" ? "You give" : "You receive",
    amount: display?.amount ?? undefined,
    asset,
    mintAddress: mint,
    explorerUrl,
    imageUrl,
    accent: kind,
    meta: enrichedMeta,
  };
}

function buildMetrics(structured: any, variant: "preview" | "execute"): { metrics: Metric[]; meta: Metric[]; priceImpact?: { value: string; tone: "neutral" | "positive" | "negative" } } {
  const metrics: Metric[] = [];
  const meta: Metric[] = [];

  const slippage = pick(structured?.slippageBps, structured?.slippage_bps, structured?.slippageBpsPercent);
  if (slippage !== undefined) {
    const numeric = typeof slippage === "number" ? slippage : Number(slippage);
    const percent = Number.isFinite(numeric) ? `${(numeric / 100).toFixed(2)}%` : String(slippage);
    metrics.push({
      label: "Slippage",
      value: percent,
    });
  }

  const priceImpactRaw = pick(structured?.priceImpactPercent, structured?.priceImpact, structured?.price_impact_percent, structured?.price_impact);
  let priceImpact: { value: string; tone: "neutral" | "positive" | "negative" } | undefined;
  if (priceImpactRaw !== undefined) {
    const formatted = formatPercentHelper(priceImpactRaw) ?? String(priceImpactRaw);
    const numeric = typeof priceImpactRaw === "number" ? priceImpactRaw : Number(priceImpactRaw);
    const tone = Number.isFinite(numeric) ? (numeric >= 0 ? "positive" : "negative") : "neutral";
    priceImpact = { value: formatted, tone };
  }

  if (variant === "preview") {
    const quoteSource = pick(structured?.quoteSource, structured?.provider, structured?.routeSource);
    if (quoteSource) {
      meta.push({ label: "Quote", value: String(quoteSource) });
    }
    const eta = pick(structured?.estimatedSeconds, structured?.ETASeconds, structured?.eta_seconds);
    if (eta !== undefined) {
      const seconds = typeof eta === "number" ? eta : Number(eta);
      const label = Number.isFinite(seconds) ? `${seconds.toFixed(0)}s` : String(eta);
      meta.push({ label: "ETA", value: label });
    }
  }

  return { metrics, meta, priceImpact };
}

function formatTimestamp(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSwapViewModel(label: string, item: any, structured: any, args: SwapArgs, variant: "preview" | "execute"): SwapViewModel {
  const fromMint = pick<string>(structured?.inputMint, structured?.sourceMint, args?.from_mint as string, args?.input_mint as string);
  const toMint = pick<string>(structured?.outputMint, structured?.destinationMint, args?.to_mint as string, args?.output_mint as string);
  const amountIn = pick(structured?.inputAmount, structured?.amountIn, args?.amount_in, args?.amountIn);
  const amountOut = pick(structured?.outputAmount, structured?.amountOut, structured?.expectedOutput, structured?.expected_out, structured?.quote);
  const amountInLamports = pick(structured?.inputAmountLamports, structured?.amountInLamports, args?.amount_in_lamports);
  const amountOutLamports = pick(structured?.outputAmountLamports, structured?.amountOutLamports, structured?.expected_output_lamports);

  const inputTokenMeta = (structured as any)?.inputToken;
  const outputTokenMeta = (structured as any)?.outputToken;

  const heroFrom = toTokenSide(
    "from",
    amountIn,
    amountInLamports,
    fromMint,
    inputTokenMeta,
    resolveTokenImage(structured, "input"),
  );
  const heroTo = toTokenSide(
    "to",
    amountOut,
    amountOutLamports,
    toMint,
    outputTokenMeta,
    resolveTokenImage(structured, "output"),
  );

  const { metrics, meta, priceImpact } = buildMetrics(structured, variant);

  if (variant === "execute") {
    const status = pick<string>(structured?.status);
    if (status) {
      const tone: Metric["tone"] =
        status.toLowerCase() === "confirmed" ? "positive" : status.toLowerCase() === "failed" ? "negative" : "notice";
      meta.push({ label: "Status", value: status, tone });
    }
    const signature = pick<string>(structured?.signature, structured?.txSignature, structured?.signatureId, structured?.transaction);
    if (signature) {
      meta.push({
        label: "Explorer",
        value: "View on Solscan",
        href: `https://solscan.io/tx/${signature}`,
      });
    }
  }

  const warnings = Array.isArray(structured?.warnings)
    ? structured.warnings.filter((warn: unknown): warn is string => typeof warn === "string" && warn.length > 0)
    : [];

  const errorMessage = pick<string>(structured?.error, structured?.errorMessage);

  return {
    title: label,
    timestamp: formatTimestamp(item.timestamp),
    hero: {
      from: heroFrom,
      to: heroTo,
      priceImpact,
    },
    metrics,
    meta,
    warnings,
    errorMessage,
    rawData: structured,
  };
}

// --- Sleek Swap Flow Component ---

function SleekSwapFlow({ from, to }: { from: TokenSide; to: TokenSide }) {
  // Corrected Animation Timeline (8s total)
  // 0.00 -> 0.25 (Swap: 2s)
  // 0.25 -> 0.50 (Hold: 2s)
  // 0.50 -> 0.75 (Return: 2s)
  // 0.75 -> 1.00 (Hold: 2s)
  const times = [0, 0.125, 0.25, 0.5, 0.625, 0.75, 1];

  return (
    <div className="relative h-24 w-full flex items-center justify-between px-2">
      {/* Left Text (Static) */}
      <div className="flex flex-col items-start z-0">
         <div className="h-14 w-14" /> 
         <div className="mt-2 flex flex-col">
            <span className="text-xl font-bold text-white tracking-tight tabular-nums">{from.amount ?? "0"}</span>
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{from.asset}</span>
         </div>
      </div>

      {/* Right Text (Static) */}
      <div className="flex flex-col items-end z-0">
         <div className="h-14 w-14" /> 
         <div className="mt-2 flex flex-col items-end">
            <span className="text-xl font-bold text-emerald-400 tracking-tight tabular-nums">{to.amount ?? "—"}</span>
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{to.asset}</span>
         </div>
      </div>

      {/* The Moving Icons Layer */}
      <div className="absolute inset-0 pointer-events-none">
         {/* Icon A (From) - Moves Left -> Right -> Left */}
         <motion.div
            className="absolute top-0"
            initial={{ left: 8 }} // Explicit start matching px-2
            animate={{
               left: ["8px", "calc(50% - 28px)", "calc(100% - 64px)", "calc(100% - 64px)", "calc(50% - 28px)", "8px", "8px"],
               top: [0, -40, 0, 0, -40, 0, 0], // Arc UP
               zIndex: [10, 20, 10, 10, 20, 10, 10], 
               scale: [1, 1.2, 1, 1, 1.2, 1, 1]
            }}
            transition={{
               duration: 8,
               times: times,
               repeat: Infinity,
               ease: "easeInOut"
            }}
            style={{ width: 56, height: 56 }}
         >
            <div className="relative w-full h-full">
               <TokenIconSleek symbol={from.asset ?? "IN"} imageUrl={from.imageUrl} size={56} />
            </div>
         </motion.div>

         {/* Icon B (To) - Moves Right -> Left -> Right */}
         <motion.div
            className="absolute top-0"
            initial={{ right: 8 }} // Explicit start matching px-2
            animate={{
               right: ["8px", "calc(50% - 28px)", "calc(100% - 64px)", "calc(100% - 64px)", "calc(50% - 28px)", "8px", "8px"],
               top: [0, 40, 0, 0, 40, 0, 0], // Arc DOWN
               zIndex: [10, 1, 1, 1, 10], 
               scale: [1, 0.8, 1, 1, 0.8, 1, 1]
            }}
            transition={{
               duration: 8,
               times: times,
               repeat: Infinity,
               ease: "easeInOut"
            }}
            style={{ width: 56, height: 56 }}
         >
            <TokenIconSleek symbol={to.asset ?? "OUT"} imageUrl={to.imageUrl} size={56} />
         </motion.div>
      </div>
      
      {/* Center Marker */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <ArrowRightIcon className="w-4 h-4 text-white/10" />
      </div>
    </div>
  );
}

function SwapNote({ view, debug, debugLabel }: { view: SwapViewModel; debug?: boolean; debugLabel: string }) {
  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
         <SleekLabel>{view.title}</SleekLabel>
         {view.timestamp && <span className="text-[10px] text-neutral-600 font-mono">{view.timestamp}</span>}
      </header>

      {/* The Visual Flow */}
      <SleekSwapFlow from={view.hero.from} to={view.hero.to} />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-5 mt-4">
         {view.hero.priceImpact && (
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.02]">
                <SleekLabel>PRICE IMPACT</SleekLabel>
                <span className={`text-sm font-bold tracking-wide ${
                    view.hero.priceImpact.tone === 'negative' ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                    {view.hero.priceImpact.value}
                </span>
            </div>
         )}
         
         {view.metrics.map((metric) => (
            <MetricItem key={metric.label} label={metric.label.toUpperCase()} value={metric.value} />
         ))}
         
         {view.meta.filter(m => !m.href).map((meta) => (
            <MetricItem key={meta.label} label={meta.label.toUpperCase()} value={meta.value} />
         ))}
      </div>

      {/* Warnings & Errors */}
      {view.warnings.length > 0 && (
        <div className="flex flex-col gap-1 pt-4 border-t border-white/5">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[9px] uppercase font-bold tracking-widest text-amber-500">Warning</span>
           </div>
           <ul className="pl-3.5 space-y-1">
              {view.warnings.map((w, i) => (
                <li key={i} className="text-xs text-neutral-400">
                  {w.replace(/Monitor price impact\.?/, "").trim() || w}
                </li>
              ))}
           </ul>
        </div>
      )}

      {view.errorMessage && (
        <div className="flex flex-col gap-1 pt-4 border-t border-white/5">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[9px] uppercase font-bold tracking-widest text-rose-500">Error</span>
           </div>
           <p className="text-xs text-neutral-400 pl-3.5">{view.errorMessage}</p>
        </div>
      )}

      {/* Footer Links */}
      {view.meta.some(m => m.href) && (
        <div className="flex gap-4 justify-end border-t border-white/5 pt-4">
           {view.meta.filter(m => m.href).map((meta) => (
              <a 
                key={meta.label}
                href={meta.href}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] uppercase font-bold tracking-widest text-neutral-600 hover:text-white transition-colors"
              >
                {meta.label}
              </a>
           ))}
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(view.rawData, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
}

export const solanaSwapPreviewRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const structured = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};

  const view = buildSwapViewModel("Swap Preview", item, structured, args, "preview");

  return <SwapNote view={view} debug={debug} debugLabel="Raw preview data" />;
};

export const solanaSwapExecuteRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const structured = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};

  const view = buildSwapViewModel("Swap Execution", item, structured, args, "execute");

  return <SwapNote view={view} debug={debug} debugLabel="Raw execution data" />;
};
