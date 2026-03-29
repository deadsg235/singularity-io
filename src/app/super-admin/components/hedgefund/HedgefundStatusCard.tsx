"use client";

import { type HedgefundStatus } from "@/app/lib/hedgefund";

interface HedgefundStatusCardProps {
  status: HedgefundStatus | null;
  loading: boolean;
  busy: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

function formatTimestamp(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function HedgefundStatusCard({ status, loading, lastUpdated, busy, onRefresh }: HedgefundStatusCardProps) {
  const dryRun = status?.dryRun ?? null;
  const riskBudget = status?.riskBudgetSol ?? null;
  const autoStart = status?.autoStart ?? null;

  return (
    <section className="flex flex-col justify-between rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-lg shadow-black/30">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Hedgefund Status</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">Automation Snapshot</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || busy}
          className="rounded-md border border-slate-700/70 bg-slate-950/20 px-3 py-1 text-xs uppercase tracking-wide text-neutral-200 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh
        </button>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-neutral-400">Dry Run</dt>
          <dd className={`mt-2 text-base font-medium ${dryRun === null ? "text-neutral-300" : dryRun ? "text-amber-300" : "text-emerald-300"}`}>
            {dryRun === null ? "—" : dryRun ? "Simulated" : "Live"}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-neutral-400">Risk Budget</dt>
          <dd className="mt-2 text-base font-medium text-foreground">
            {riskBudget == null ? "—" : `${riskBudget.toFixed(2)} SOL`}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-neutral-400">Auto Start</dt>
          <dd className="mt-2 text-base font-medium text-foreground">
            {autoStart === null ? "—" : autoStart ? "Enabled" : "Standby"}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-neutral-400">Watchlist</dt>
          <dd className="mt-2 text-base font-medium text-foreground">
            {status ? `${status.watchlistCount} pools` : "—"}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-neutral-400">Pump.fun Targets</dt>
          <dd className="mt-2 text-base font-medium text-foreground">
            {status ? `${status.pumpfunTargets} mints` : "—"}
          </dd>
        </div>
      </dl>

      <footer className="mt-6 text-xs text-neutral-500">
        Last updated: <span className="text-neutral-300">{formatTimestamp(lastUpdated)}</span>
      </footer>
    </section>
  );
}
