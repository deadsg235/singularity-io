"use client";

import { useState } from "react";

interface HedgefundTickCardProps {
  dryRunDefault: boolean;
  riskBudgetDefault: number;
  onTick: (options: { dryRun?: boolean; riskBudgetSol?: number }) => Promise<unknown>;
}

export function HedgefundTickCard({ dryRunDefault, riskBudgetDefault, onTick }: HedgefundTickCardProps) {
  const [dryRun, setDryRun] = useState(dryRunDefault);
  const [riskBudget, setRiskBudget] = useState(String(riskBudgetDefault ?? 1));
  const [busy, setBusy] = useState(false);
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const parsedBudget = Number(riskBudget);
      const payload: { dryRun?: boolean; riskBudgetSol?: number } = { dryRun };
      if (Number.isFinite(parsedBudget) && parsedBudget > 0) {
        payload.riskBudgetSol = parsedBudget;
      }
      const result = await onTick(payload);
      const summary =
        typeof result === "object" && result
          ? JSON.stringify(result, null, 2).slice(0, 240)
          : String(result ?? "Tick dispatched.");
      setResultSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tick failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-lg shadow-black/30">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-neutral-400">Worker</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Manual Tick</h2>
      </header>

      <div className="grid gap-3 text-sm">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-wide text-neutral-400">Risk Budget Override (SOL)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={riskBudget}
            onChange={(event) => setRiskBudget(event.target.value)}
            className="rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </label>

        <label className="flex items-center justify-between rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-neutral-300">
          <span>Dry Run</span>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(event) => setDryRun(event.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
        </label>

        {error ? (
          <div className="rounded-md border border-red-600/40 bg-red-900/30 px-3 py-2 text-xs text-red-100">{error}</div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="rounded-md border border-sky-500/40 bg-sky-600/30 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-600/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Running…" : "Run Tick"}
        </button>

        {resultSummary ? (
          <pre className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border-subtle/50 bg-surface-base/70 p-3 text-xs text-neutral-300">
            {resultSummary}
            {resultSummary.length >= 240 ? "…" : ""}
          </pre>
        ) : (
          <p className="text-xs text-neutral-500">Runs the scheduling loop once with the provided overrides.</p>
        )}
      </div>
    </section>
  );
}
