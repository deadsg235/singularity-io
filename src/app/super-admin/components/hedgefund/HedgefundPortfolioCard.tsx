"use client";

import { type HedgefundPortfolio } from "@/app/lib/hedgefund";

interface HedgefundPortfolioCardProps {
  portfolio: HedgefundPortfolio | null;
  loading: boolean;
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function HedgefundPortfolioCard({ portfolio, loading }: HedgefundPortfolioCardProps) {
  const snapshots = portfolio?.snapshots ?? [];
  const totalSol = portfolio?.totalSol ?? null;

  return (
    <section className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-lg shadow-black/30">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-neutral-400">Portfolio</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Wallet Balances</h2>
        <p className="text-xs text-neutral-500">Total: <span className="text-neutral-300">{totalSol == null ? "—" : `${formatNumber(totalSol, 3)} SOL`}</span></p>
      </header>

      {snapshots.length === 0 ? (
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-6 text-sm text-neutral-400">
          {loading ? "Fetching token balances…" : "No snapshots available yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.alias}
              className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 shadow-lg shadow-black/20"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{snapshot.alias}</h3>
                  <p className="text-xs text-neutral-500">
                    {snapshot.publicKey ? (
                      <span className="font-mono text-xs text-neutral-400">
                        {snapshot.publicKey.slice(0, 4)}…{snapshot.publicKey.slice(-4)}
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                  </p>
                </div>
                <div className="text-right text-sm text-neutral-400">
                  <div>{formatNumber(snapshot.sol, 3)} SOL</div>
                  <div className="text-xs text-neutral-500">{snapshot.solLamports} lamports</div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-md border border-slate-800/60">
                <table className="min-w-full divide-y divide-slate-800/60 text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-neutral-400">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left">Mint</th>
                      <th scope="col" className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-neutral-200">
                    {snapshot.tokens.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-neutral-500">
                          SOL only
                        </td>
                      </tr>
                    ) : (
                      snapshot.tokens.map((token) => (
                        <tr key={`${snapshot.alias}-${token.mint}`}>
                          <td className="px-3 py-2 font-mono text-xs text-neutral-400">
                            {token.mint.slice(0, 4)}…{token.mint.slice(-4)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-neutral-400">
                            {formatNumber(token.amountUi, 6)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                Snapshot taken {new Date(snapshot.fetchedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
