"use client";

import { type HedgefundSignal } from "@/app/lib/hedgefund";

interface HedgefundSignalsPanelProps {
  signals: HedgefundSignal[] | null;
  loading: boolean;
  onLoad: () => void;
}

function renderRationale(rationale: unknown): string[] {
  if (!Array.isArray(rationale)) return [];
  return rationale
    .map((entry) => (typeof entry === "string" ? entry : null))
    .filter((entry): entry is string => Boolean(entry));
}

export function HedgefundSignalsPanel({ signals, loading, onLoad }: HedgefundSignalsPanelProps) {
  return (
    <section className="flex flex-col rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-lg shadow-black/30">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">Signals</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Strategy Candidates</h2>
        </div>
        <button
          type="button"
          onClick={onLoad}
          disabled={loading}
          className="rounded-md border border-slate-700/70 bg-slate-950/20 px-3 py-1 text-xs uppercase tracking-wide text-neutral-200 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      {signals == null ? (
        <p className="text-sm text-neutral-400">
          Signals load on demand. Click refresh to compute with current thresholds.
        </p>
      ) : signals.length === 0 ? (
        <p className="text-sm text-neutral-400">No eligible signals right now.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {signals.slice(0, 6).map((signal, index) => {
            const rationale = renderRationale((signal as any)?.rationale);
            const scoreRaw = (signal as Record<string, unknown>).score;
            const confidenceRaw = (signal as Record<string, unknown>).confidence;
            const outputMintRaw = (signal as Record<string, unknown>).outputMint;
            const idRaw = (signal as Record<string, unknown>).id;
            const score = typeof scoreRaw === "number" ? scoreRaw.toFixed(2) : "—";
            const confidence = typeof confidenceRaw === "number" ? confidenceRaw.toFixed(2) : "—";
            const outputMint = typeof outputMintRaw === "string" ? outputMintRaw : "Unknown mint";
            const identifier = typeof idRaw === "string" ? idRaw : `signal-${index}`;
            return (
              <li
                key={identifier}
                className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4 shadow-lg shadow-black/20"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{outputMint}</span>
                    <span className="text-xs text-neutral-500">{identifier}</span>
                  </div>
                  <div className="text-right text-xs text-neutral-400">
                    <div>Score: <span className="text-neutral-200">{score}</span></div>
                    <div>Confidence: <span className="text-neutral-200">{confidence}</span></div>
                  </div>
                </div>
                {rationale.length ? (
                  <ul className="mt-3 space-y-1 text-xs text-neutral-400">
                    {rationale.map((item, index) => (
                      <li key={`${signal.id}-reason-${index}`}>• {item}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
          {signals.length > 6 ? (
            <li className="text-xs text-neutral-500">
              Showing first 6 of {signals.length} signals. Use the API if you need the full set.
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
