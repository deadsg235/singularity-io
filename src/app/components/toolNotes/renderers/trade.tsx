import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, formatSolDisplay, formatSolAmount, HashBadge } from "./helpers";
import { LinkPill, MetricPill, TokenFlow } from "./solanaVisuals";
import type { TokenSide } from "./solanaVisuals";

type TradeMode = "buy" | "sell";

type TradeArgs = Record<string, unknown>;

type TradeStructured = {
  walletAddress?: string;
  signature?: string;
  txSignature?: string;
  mint?: string;
  swapLamports?: number;
  swap_lamports?: number;
  feeLamports?: number;
  fee_lamports?: number;
  warnings?: unknown[];
  solscanUrl?: string;
  status?: string;
  error?: string;
};

type Metric = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative" | "notice";
  href?: string;
};

type TradeViewModel = {
  title: string;
  timestamp?: string;
  hero: {
    from: TokenSide;
    to: TokenSide;
  };
  metrics: Metric[];
  meta: Metric[];
  walletAddress?: string;
  walletHref?: string;
  warnings: string[];
  errorMessage?: string;
  rawData: any;
  requestData?: any;
};

const WELL_KNOWN_MINTS: Record<string, string> = {
  USDC11111111111111111111111111111111111111: "USDC",
  So11111111111111111111111111111111111111112: "SOL",
};

function symbolFromMint(mint?: string) {
  if (!mint) return undefined;
  return WELL_KNOWN_MINTS[mint] ?? mint.slice(0, 3).toUpperCase();
}

function formatTimestamp(value?: string) {
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

function buildTokenSide(kind: "from" | "to", opts: { amount?: string | null; symbol?: string | null; mint?: string | null }): TokenSide {
  return {
    heading: kind === "from" ? "You spend" : "You receive",
    amount: opts.amount ?? undefined,
    asset: opts.symbol ?? undefined,
    mintAddress: opts.mint ?? undefined,
    explorerUrl: opts.mint ? `https://solscan.io/token/${opts.mint}` : undefined,
    accent: kind,
  };
}

function resolveStatusTone(status?: string): Metric["tone"] {
  if (!status) return "neutral";
  const normalized = status.toLowerCase();
  if (normalized === "confirmed" || normalized === "success") return "positive";
  if (normalized === "failed" || normalized === "error") return "negative";
  return "notice";
}

function buildTradeView(
  mode: TradeMode,
  item: Parameters<ToolNoteRenderer>[0]["item"],
  structured: TradeStructured,
  args: TradeArgs,
): TradeViewModel {
  const swapLamports = structured.swapLamports ?? structured.swap_lamports;
  const feeLamports = structured.feeLamports ?? structured.fee_lamports;
  const signature = structured.signature ?? structured.txSignature;
  const solscanUrl = structured.solscanUrl || (signature ? `https://solscan.io/tx/${signature}` : undefined);

  const walletAddress =
    structured.walletAddress ??
    (typeof args.wallet_address === "string" ? args.wallet_address : undefined);

  const mint = structured.mint ?? (typeof args.mint === "string" ? args.mint : undefined);
  const tokenSymbol = symbolFromMint(mint);

  const spendFromArgs = typeof args.amount_sol === "number" ? args.amount_sol : typeof args.amount_sol === "string" ? Number(args.amount_sol) : undefined;
  const spendDisplay = spendFromArgs !== undefined ? formatSolAmount(spendFromArgs) : undefined;
  const swapDisplay = swapLamports !== undefined ? formatSolAmount(swapLamports, { fromLamports: true }) : undefined;
  const feeDisplay = feeLamports !== undefined ? formatSolDisplay(feeLamports, { fromLamports: true }) : undefined;

  const percentage = typeof args.percentage === "number" ? `${args.percentage}%` : undefined;
  const amountRaw = typeof args.amount_raw === "string" ? args.amount_raw : undefined;

  const fromSide: TokenSide =
    mode === "buy"
      ? buildTokenSide("from", { amount: spendDisplay ?? swapDisplay ?? undefined, symbol: "SOL" })
      : buildTokenSide("from", { amount: amountRaw ?? percentage ?? undefined, symbol: tokenSymbol ?? "TOKEN", mint });

  const toSide: TokenSide =
    mode === "buy"
      ? buildTokenSide("to", { amount: undefined, symbol: tokenSymbol ?? "TOKEN", mint })
      : buildTokenSide("to", { amount: swapDisplay, symbol: "SOL" });

  const metrics: Metric[] = [];
  if (mode === "buy" && (spendDisplay ?? swapDisplay)) {
    metrics.push({ label: "Spend", value: `${spendDisplay ?? swapDisplay} SOL` });
  }
  if (mode === "sell" && swapDisplay) {
    metrics.push({ label: "Proceeds", value: `${swapDisplay} SOL`, tone: "positive" });
  }
  if (feeDisplay) {
    metrics.push({ label: "Fees", value: feeDisplay });
  }
  if (mode === "sell" && percentage) {
    metrics.push({ label: "Portion", value: percentage });
  }

  const meta: Metric[] = [];
  const status = typeof structured.status === "string" ? structured.status : undefined;
  if (status) {
    meta.push({ label: "Status", value: status, tone: resolveStatusTone(status) });
  }
  if (solscanUrl) {
    meta.push({ label: "Explorer", value: "View on Solscan", href: solscanUrl });
  }

  const warnings = Array.isArray(structured?.warnings)
    ? structured.warnings.filter((warn): warn is string => typeof warn === "string" && warn.length > 0)
    : [];

  const errorMessage =
    typeof structured.error === "string"
      ? structured.error
      : undefined;

  return {
    title: mode === "buy" ? "Buy Execution" : "Sell Execution",
    timestamp: formatTimestamp(item.timestamp),
    hero: {
      from: fromSide,
      to: toSide,
    },
    metrics,
    meta,
    walletAddress,
    walletHref: walletAddress ? `https://solscan.io/account/${walletAddress}` : undefined,
    warnings,
    errorMessage,
    rawData: structured,
    requestData: args,
  };
}

function TradeNote({
  view,
  debug,
}: {
  view: TradeViewModel;
  debug?: boolean;
}) {
  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">{view.title}</span>
            {view.timestamp && <span className="text-xs text-slate-400">{view.timestamp}</span>}
          </div>
        </header>

        <TokenFlow from={view.hero.from} to={view.hero.to} />

        {view.metrics.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {view.metrics.map((metric) => (
              metric.href ? (
                <LinkPill key={`${metric.label}-${metric.value}`} value={metric.value} href={metric.href} />
              ) : (
                <MetricPill key={`${metric.label}-${metric.value}`} label={metric.label} value={metric.value} tone={metric.tone ?? "neutral"} />
              )
            ))}
          </div>
        )}

        {view.meta.length > 0 && (
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            {view.meta.map((meta) =>
              meta.href ? (
                <LinkPill key={`${meta.label}-${meta.value}`} value={meta.value} href={meta.href} />
              ) : (
                <MetricPill key={`${meta.label}-${meta.value}`} label={meta.label} value={meta.value} tone={meta.tone ?? "neutral"} />
              )
            )}
          </div>
        )}

        {view.walletAddress && (
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Wallet</span>
            <HashBadge value={view.walletAddress} href={view.walletHref} ariaLabel="Wallet address" />
          </div>
        )}

        {view.warnings.length > 0 && (
          <section className="flex flex-col gap-2 text-sm text-amber-900">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-700">!</span>
              Pay attention
            </div>
            <ul className="space-y-2">
              {view.warnings.map((warn, idx) => (
                <li key={`${warn}-${idx}`} className="leading-relaxed">
                  {warn}
                </li>
              ))}
            </ul>
          </section>
        )}

        {view.errorMessage && (
          <section className="flex flex-col gap-2 text-sm text-rose-600">
            <div className="text-xs font-semibold uppercase tracking-[0.22em]">Execution error</div>
            <p className="leading-relaxed">{view.errorMessage}</p>
          </section>
        )}
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Debug details
          </summary>
          <div className="mt-3 space-y-3 text-xs">
            {view.requestData && Object.keys(view.requestData).length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Request</div>
                <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-slate-700">
                  {JSON.stringify(view.requestData, null, 2)}
                </pre>
              </div>
            )}
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Response</div>
              <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-slate-700">
                {JSON.stringify(view.rawData, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function createTradeRenderer(mode: TradeMode): ToolNoteRenderer {
  const TradeRenderer: ToolNoteRenderer = ({ item, debug }) => {
    const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
    const structured = unwrapStructured(rawOutput) as TradeStructured;
    const args = ((item.data as any)?.arguments ?? {}) as TradeArgs;

    const view = buildTradeView(mode, item, structured, args);

    return <TradeNote view={view} debug={debug} />;
  };

  (TradeRenderer as ToolNoteRenderer & { displayName?: string }).displayName =
    mode === "buy" ? "ToolNoteTradeBuy" : "ToolNoteTradeSell";

  return TradeRenderer;
}

export const solanaExecuteBuyRenderer = createTradeRenderer("buy");
export const solanaExecuteSellRenderer = createTradeRenderer("sell");
