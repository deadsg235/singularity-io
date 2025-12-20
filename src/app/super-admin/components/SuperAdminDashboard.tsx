"use client";

import { useCallback, useEffect, useState } from "react";

import {
  HedgefundApi,
  HedgefundApiError,
  type HedgefundConfig,
  type HedgefundPortfolio,
  type HedgefundSignal,
  type HedgefundStatus,
  type HedgefundTradeResult,
  type HedgefundWalletSummary,
} from "@/app/lib/hedgefund";

import { HedgefundStatusCard } from "./hedgefund/HedgefundStatusCard";
import { HedgefundWalletsCard } from "./hedgefund/HedgefundWalletsCard";
import { HedgefundPortfolioCard } from "./hedgefund/HedgefundPortfolioCard";
import { HedgefundTradePanel } from "./hedgefund/HedgefundTradePanel";
import { HedgefundConfigPanel } from "./hedgefund/HedgefundConfigPanel";
import { HedgefundSignalsPanel } from "./hedgefund/HedgefundSignalsPanel";
import { HedgefundTickCard } from "./hedgefund/HedgefundTickCard";

type Banner = {
  id: string;
  tone: "error" | "success" | "info";
  message: string;
};

const REFRESH_INTERVAL_MS = 30_000;

interface SuperAdminDashboardProps {
  accessToken: string;
  email: string;
}

export function SuperAdminDashboard({ accessToken, email }: SuperAdminDashboardProps) {
  const [status, setStatus] = useState<HedgefundStatus | null>(null);
  const [config, setConfig] = useState<HedgefundConfig | null>(null);
  const [wallets, setWallets] = useState<HedgefundWalletSummary[]>([]);
  const [portfolio, setPortfolio] = useState<HedgefundPortfolio | null>(null);
  const [signals, setSignals] = useState<HedgefundSignal[] | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [prefetchedSignals, setPrefetchedSignals] = useState(false);

  const displayName = email || "Super Admin";

  const showBanner = useCallback((tone: Banner["tone"], message: string) => {
    const id = `${tone}-${Date.now()}`;
    setBanner({ id, tone, message });
    window.setTimeout(() => {
      setBanner((current) => (current?.id === id ? null : current));
    }, 5000);
  }, []);

  const normalizeError = useCallback((error: unknown): string => {
    if (error instanceof HedgefundApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Unexpected error";
  }, []);

  const loadAll = useCallback(async () => {
    setBusy(true);
    try {
      const [nextStatus, nextConfig, nextWallets, nextPortfolio] = await Promise.all([
        HedgefundApi.getStatus(accessToken),
        HedgefundApi.getConfig(accessToken),
        HedgefundApi.listWallets(accessToken),
        HedgefundApi.getPortfolio(accessToken),
      ]);
      setStatus(nextStatus);
      setConfig(nextConfig);
      setWallets(nextWallets);
      setPortfolio(nextPortfolio);
      setLastUpdated(new Date());
      setSignals(null); // force re-fetch when user asks again
    } catch (error) {
      showBanner("error", normalizeError(error));
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, [accessToken, normalizeError, showBanner]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadAll().catch(() => undefined);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadAll]);

  const handleTradeSettled = useCallback(
    async (result: HedgefundTradeResult, action: "buy" | "sell") => {
      if (result.simulated) {
        showBanner("info", `${action.toUpperCase()} simulation completed (${result.provider}).`);
      } else {
        showBanner(
          "success",
          `${action.toUpperCase()} submitted${result.signature ? ` | ${result.signature}` : ""}`
        );
      }
      await loadAll();
    },
    [loadAll, showBanner]
  );

  const handleConfigSaved = useCallback(
    async (updated: HedgefundConfig) => {
      setConfig(updated);
      await loadAll();
      showBanner("success", "Hedgefund config saved.");
    },
    [loadAll, showBanner]
  );

  const handleLoadSignals = useCallback(async () => {
    setSignalsLoading(true);
    try {
      const data = await HedgefundApi.getSignals(accessToken);
      setSignals(data);
    } catch (error) {
      showBanner("error", normalizeError(error));
    } finally {
      setSignalsLoading(false);
    }
  }, [accessToken, normalizeError, showBanner]);

  const handleTick = useCallback(
    async (options: { dryRun?: boolean; riskBudgetSol?: number }) => {
      try {
        const result = await HedgefundApi.runTick(accessToken, options);
        showBanner("success", "Manual tick executed.");
        await loadAll();
        return result;
      } catch (error) {
        const message = normalizeError(error);
        showBanner("error", message);
        throw error;
      }
    },
    [accessToken, loadAll, normalizeError, showBanner]
  );

  const dryRun = status?.dryRun ?? config?.trading?.dryRun ?? true;
  const defaultSlippage = config?.trading?.slippageBps ?? 100;

  const hasData = Boolean(status && config && portfolio && wallets.length);

  useEffect(() => {
    if (!prefetchedSignals && status && !signalsLoading) {
      setPrefetchedSignals(true);
      handleLoadSignals();
    }
  }, [prefetchedSignals, status, signalsLoading, handleLoadSignals]);

  return (
    <div className="flex h-[100dvh] w-full overflow-y-auto bg-slate-950/95 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-12 pb-24">
        <header className="mb-10">
          <div className="text-xs uppercase tracking-widest text-neutral-400">Super Admin</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">Dexter Control Room</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-300">
            Welcome back, {displayName}. Pump.fun automation is wired here. Review status, adjust risk, and
            trigger trades directly when needed.
          </p>
        </header>

        {banner ? (
          <div
            key={banner.id}
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              banner.tone === "error"
                ? "border-red-600/40 bg-red-900/30 text-red-100"
                : banner.tone === "success"
                  ? "border-emerald-600/30 bg-emerald-900/20 text-emerald-100"
                  : "border-sky-600/30 bg-sky-900/20 text-sky-100"
            }`}
          >
            {banner.message}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <HedgefundStatusCard
            status={status}
            loading={loading}
            lastUpdated={lastUpdated}
            onRefresh={loadAll}
            busy={busy}
          />
          <HedgefundTickCard
            onTick={handleTick}
            dryRunDefault={dryRun}
            riskBudgetDefault={status?.riskBudgetSol ?? config?.trading?.riskBudgetSol ?? 1}
          />
          <HedgefundSignalsPanel
            signals={signals}
            loading={signalsLoading}
            onLoad={handleLoadSignals}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <HedgefundPortfolioCard portfolio={portfolio} loading={loading} />
          <HedgefundWalletsCard wallets={wallets} loading={loading} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <HedgefundTradePanel
            accessToken={accessToken}
            wallets={wallets}
            dryRun={dryRun}
            defaultSlippageBps={defaultSlippage}
            onExecuted={handleTradeSettled}
          />
          <HedgefundConfigPanel
            accessToken={accessToken}
            config={config}
            loading={loading}
            onSaved={handleConfigSaved}
          />
        </div>

        {!hasData && !loading ? (
          <div className="mt-10 rounded-lg border border-slate-800/70 bg-slate-900/70 p-6 text-sm text-neutral-300">
            <p>Data not available yet. Verify the hedgefund API is reachable and refresh.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
