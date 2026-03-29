"use client";

import React from "react";
import type { MarketPulse, PumpStreams, WalletSignals } from "@/app/hooks/useSignalData";

/**
 * Archived signal panels (Market Pulse, Pump Streams, Wallet Radar).
 * Retained for reference while the live SignalStack focuses on tools & logs.
 */
export interface LegacySignalPanelsProps {
  marketPulse: MarketPulse;
  pumpStreams: PumpStreams;
  wallet: WalletSignals;
}

const changeToneClass = (tone: "positive" | "negative" | "neutral") => {
  if (tone === "positive") return "text-flux";
  if (tone === "negative") return "text-accent-critical";
  return "text-neutral-500";
};

const renderEmptyState = (message: string) => (
  <div className="rounded-md border border-dashed border-neutral-800/60 bg-surface-glass/40 px-4 py-6 text-center text-xs text-neutral-500">
    {message}
  </div>
);

export function LegacySignalPanels({ marketPulse, pumpStreams, wallet }: LegacySignalPanelsProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-neutral-800/60 bg-surface-base/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-[0.08em] text-neutral-400">
            Market Pulse
          </h3>
          <span className="text-xs text-neutral-500">
            {marketPulse.lastUpdated ? `Updated ${marketPulse.lastUpdated}` : "Awaiting data"}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {marketPulse.items.length > 0 ? (
            marketPulse.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-2 text-neutral-200"
              >
                <div className="font-mono text-xs tracking-[0.1em] tracking-[0.24em] text-neutral-400">
                  {item.label}
                </div>
                <div className="flex items-center gap-3">
                  <span className={changeToneClass(item.changeTone)}>{item.change}</span>
                  {item.volume && <span className="text-neutral-500">{item.volume}</span>}
                </div>
              </div>
            ))
          ) : (
            renderEmptyState(
              marketPulse.status === "idle"
                ? "No market intel yet. Ask Dexter for a pulse check."
                : "No market data extracted from recent tool calls."
            )
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800/60 bg-surface-base/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-[0.08em] text-neutral-400">
            Pump Streams
          </h3>
          <span className="text-xs text-neutral-500">
            {pumpStreams.lastUpdated ? `Updated ${pumpStreams.lastUpdated}` : "Monitoring"}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {pumpStreams.items.length > 0 ? (
            pumpStreams.items.map((stream) => (
              <div
                key={stream.title}
                className="flex items-center justify-between rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-3"
              >
                <div>
                  <div className="font-body text-sm text-neutral-100">{stream.title}</div>
                  <div className="text-xs text-neutral-500">
                    {[stream.viewers, stream.tokenSymbol, stream.momentum]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                </div>
                {stream.status && (
                  <span className="rounded-pill bg-iris/20 px-3 py-1 font-display text-xs font-semibold tracking-[0.08em] text-iris">
                    {stream.status}
                  </span>
                )}
              </div>
            ))
          ) : (
            renderEmptyState(
              pumpStreams.status === "idle"
                ? "Waiting for the first pumpstream_live_summary call."
                : "No active streams reported by the MCP tool."
            )
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800/60 bg-surface-base/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-[0.08em] text-neutral-400">
            Wallet Radar
          </h3>
          <span className="text-xs text-neutral-500">
            {wallet.lastUpdated ? `Updated ${wallet.lastUpdated}` : "Resolver"}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm text-neutral-200">
          {wallet.status === "ready" ? (
            <>
              <div className="flex items-center justify-between">
                <span>Total Value</span>
                <span className="font-display text-lg text-flux">
                  {wallet.summary.totalUsd ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>24H PnL</span>
                <span className={wallet.summary.pnl24h ? changeToneClass(wallet.summary.pnl24h.tone) : "text-neutral-500"}>
                  {wallet.summary.pnl24h?.label ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Wallet</span>
                <span className="rounded-pill bg-neutral-800 px-3 py-1 font-display text-xs font-semibold tracking-[0.08em] text-neutral-300">
                  {wallet.summary.activeWallet ?? "Auto"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Wallets</span>
                <span className="rounded-pill bg-neutral-800 px-3 py-1 font-display text-xs font-semibold tracking-[0.08em] text-neutral-300">
                  {wallet.summary.walletCount ?? "—"}
                </span>
              </div>
            </>
          ) : (
            renderEmptyState(
              wallet.status === "idle"
                ? "Call list_my_wallets to populate wallet intel."
                : "Wallet tool responses did not contain structured balances."
            )
          )}
        </div>
      </section>
    </div>
  );
}

export default LegacySignalPanels;
