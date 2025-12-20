"use client";

import { useEffect, useMemo, useState } from "react";

import {
  HedgefundApi,
  HedgefundApiError,
  type HedgefundTradeResult,
  type HedgefundWalletSummary,
} from "@/app/lib/hedgefund";

interface HedgefundTradePanelProps {
  accessToken: string;
  wallets: HedgefundWalletSummary[];
  dryRun: boolean;
  defaultSlippageBps: number;
  onExecuted: (result: HedgefundTradeResult, action: "buy" | "sell") => Promise<void> | void;
}

type BusyAction = "buy" | "sell" | null;

const MIN_SOL = 0.01;

export function HedgefundTradePanel({
  accessToken,
  wallets,
  dryRun,
  defaultSlippageBps,
  onExecuted,
}: HedgefundTradePanelProps) {
  const [mint, setMint] = useState("");
  const [walletAlias, setWalletAlias] = useState(wallets[0]?.alias ?? "");
  const [amountSol, setAmountSol] = useState("0.10");
  const [sellAmount, setSellAmount] = useState("");
  const [sellUseFullBalance, setSellUseFullBalance] = useState(true);
  const [slippageBps, setSlippageBps] = useState(String(defaultSlippageBps));
  const [simulate, setSimulate] = useState(dryRun);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallets.length) {
      setWalletAlias("");
      return;
    }
    const exists = wallets.some((wallet) => wallet.alias === walletAlias);
    if (!exists) {
      setWalletAlias(wallets[0]?.alias ?? "");
    }
  }, [wallets, walletAlias]);

  const resolvedWalletAlias = useMemo(() => {
    if (walletAlias) return walletAlias;
    return wallets[0]?.alias ?? "";
  }, [walletAlias, wallets]);

  const handleError = (err: unknown) => {
    if (err instanceof HedgefundApiError) {
      setError(err.message);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("Unexpected error");
    }
  };

  const validateMint = () => {
    const trimmed = mint.trim();
    if (!trimmed) {
      setError("Mint address is required.");
      return null;
    }
    return trimmed;
  };

  const parseSlippage = (): number | undefined => {
    const trimmed = slippageBps.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Slippage BPS must be positive.");
      return undefined;
    }
    return value;
  };

  const handleBuy = async () => {
    setError(null);
    const mintAddress = validateMint();
    if (!mintAddress) return;

    const amount = Number(amountSol);
    if (!Number.isFinite(amount) || amount < MIN_SOL) {
      setError(`Buy amount must be at least ${MIN_SOL} SOL.`);
      return;
    }

    const slippage = parseSlippage();
    if (slippage === undefined) return;

    if (!resolvedWalletAlias) {
      setError("Select a wallet before submitting.");
      return;
    }

    setBusy("buy");
    try {
      const result = await HedgefundApi.buy(accessToken, {
        mint: mintAddress,
        wallet: resolvedWalletAlias,
        amount,
        slippageBps: slippage,
        simulate,
      });
      await onExecuted(result, "buy");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  };

  const handleSell = async () => {
    setError(null);
    const mintAddress = validateMint();
    if (!mintAddress) return;

    if (!resolvedWalletAlias) {
      setError("Select a wallet before submitting.");
      return;
    }

    const slippage = parseSlippage();
    if (slippage === undefined) return;

    let amountField: number | undefined;
    if (!sellUseFullBalance) {
      const parsed = Number(sellAmount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("Provide a token amount greater than zero or choose 'Use full balance'.");
        return;
      }
      amountField = parsed;
    }

    setBusy("sell");
    try {
      const result = await HedgefundApi.sell(accessToken, {
        mint: mintAddress,
        wallet: resolvedWalletAlias,
        amount: amountField,
        slippageBps: slippage,
        simulate,
      });
      await onExecuted(result, "sell");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-lg shadow-black/30">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">Trades</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Manual Pump.fun Execution</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-300">
          <label className="flex items-center gap-2">
            <span>Simulate</span>
            <input
              type="checkbox"
              checked={simulate}
              onChange={(event) => setSimulate(event.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>
        </div>
      </header>

      <div className="grid gap-4 text-sm">
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-wide text-neutral-400">Mint</label>
          <input
            value={mint}
            onChange={(event) => setMint(event.target.value)}
            placeholder="Pump.fun mint address"
            className="rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-foreground placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-wide text-neutral-400">Wallet</label>
          <select
            value={resolvedWalletAlias}
            onChange={(event) => setWalletAlias(event.target.value)}
            className="rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            {wallets.map((wallet) => (
              <option key={wallet.alias} value={wallet.alias}>
                {wallet.alias} · {wallet.publicKey.slice(0, 4)}…{wallet.publicKey.slice(-4)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-wide text-neutral-400">Buy Amount (SOL)</label>
            <input
              type="number"
              min={MIN_SOL}
              step="0.01"
              value={amountSol}
              onChange={(event) => setAmountSol(event.target.value)}
              className="rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-wide text-neutral-400">Slippage (BPS)</label>
            <input
              type="number"
              min={10}
              step="10"
              value={slippageBps}
              onChange={(event) => setSlippageBps(event.target.value)}
              className="rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Sell Amount</p>
            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={sellUseFullBalance}
                onChange={(event) => setSellUseFullBalance(event.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Use full balance
            </label>
          </div>
          {!sellUseFullBalance ? (
            <input
              type="number"
              step="0.000001"
              min="0"
              value={sellAmount}
              onChange={(event) => setSellAmount(event.target.value)}
              placeholder="Token amount to sell"
              className="mt-3 w-full rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          ) : (
            <p className="mt-3 text-xs text-neutral-400">
              The API will detect the wallet balance and liquidate everything.
            </p>
          )}
        </div>

        {error ? (
          <div className="rounded-md border border-red-600/40 bg-red-900/30 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBuy}
            disabled={busy === "buy" || wallets.length === 0}
            className="rounded-md border border-emerald-500/50 bg-emerald-600/30 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-600/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "buy" ? "Submitting…" : "Buy via Pump.fun"}
          </button>
          <button
            type="button"
            onClick={handleSell}
            disabled={busy === "sell" || wallets.length === 0}
            className="rounded-md border border-pink-500/40 bg-pink-600/20 px-4 py-2 text-sm font-medium text-pink-100 transition hover:bg-pink-600/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "sell" ? "Submitting…" : "Sell via Pump.fun"}
          </button>
        </div>

        <p className="text-xs text-neutral-400">
          All trades call the live `/api/hedgefund/trade/*` endpoints. Leave the simulate checkbox on if you want a
          dry run first.
        </p>
      </div>
    </section>
  );
}
