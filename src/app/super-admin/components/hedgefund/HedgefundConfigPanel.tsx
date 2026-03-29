"use client";

import { useEffect, useMemo, useState } from "react";

import { HedgefundApi, HedgefundApiError, type HedgefundConfig } from "@/app/lib/hedgefund";

interface HedgefundConfigPanelProps {
  accessToken: string;
  config: HedgefundConfig | null;
  loading: boolean;
  onSaved: (config: HedgefundConfig) => Promise<void> | void;
}

type FormState = {
  dryRun: boolean;
  riskBudgetSol: string;
  maxTradeSol: string;
  slippageBps: string;
  pollIntervalMs: string;
  targetSol: string;
  priorityLamports: string;
  confirmTimeoutMs: string;
  autoStart: boolean;
};

const DEFAULT_FORM: FormState = {
  dryRun: true,
  riskBudgetSol: "1",
  maxTradeSol: "0.5",
  slippageBps: "100",
  pollIntervalMs: "60000",
  targetSol: "0.15",
  priorityLamports: "0",
  confirmTimeoutMs: "45000",
  autoStart: true,
};

export function HedgefundConfigPanel({ accessToken, config, loading, onSaved }: HedgefundConfigPanelProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setForm({
      dryRun: config.trading.dryRun,
      riskBudgetSol: String(config.trading.riskBudgetSol ?? DEFAULT_FORM.riskBudgetSol),
      maxTradeSol: String(config.trading.maxTradeSol ?? DEFAULT_FORM.maxTradeSol),
      slippageBps: String(config.trading.slippageBps ?? DEFAULT_FORM.slippageBps),
      pollIntervalMs: String(config.trading.pollIntervalMs ?? DEFAULT_FORM.pollIntervalMs),
      targetSol: String(config.pumpfun.targetSol ?? DEFAULT_FORM.targetSol),
      priorityLamports: String(config.pumpfun.priorityLamports ?? DEFAULT_FORM.priorityLamports),
      confirmTimeoutMs: String(config.trading.confirmTimeoutMs ?? DEFAULT_FORM.confirmTimeoutMs),
      autoStart: Boolean(config.trading.autoStart ?? DEFAULT_FORM.autoStart),
    });
  }, [config]);

  const isDirty = useMemo(() => {
    if (!config) return false;
    return (
      form.dryRun !== config.trading.dryRun ||
      Number(form.riskBudgetSol) !== config.trading.riskBudgetSol ||
      Number(form.maxTradeSol) !== config.trading.maxTradeSol ||
      Number(form.slippageBps) !== config.trading.slippageBps ||
      Number(form.pollIntervalMs) !== config.trading.pollIntervalMs ||
      Number(form.confirmTimeoutMs) !== config.trading.confirmTimeoutMs ||
      form.autoStart !== config.trading.autoStart ||
      Number(form.targetSol) !== config.pumpfun.targetSol ||
      Number(form.priorityLamports) !== config.pumpfun.priorityLamports
    );
  }, [config, form]);

  const handleChange = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    if (config) {
      setForm({
        dryRun: config.trading.dryRun,
        riskBudgetSol: String(config.trading.riskBudgetSol),
        maxTradeSol: String(config.trading.maxTradeSol),
        slippageBps: String(config.trading.slippageBps),
        pollIntervalMs: String(config.trading.pollIntervalMs),
        confirmTimeoutMs: String(config.trading.confirmTimeoutMs),
        targetSol: String(config.pumpfun.targetSol),
        priorityLamports: String(config.pumpfun.priorityLamports),
        autoStart: Boolean(config.trading.autoStart),
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setError(null);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await HedgefundApi.updateConfig(accessToken, {
        trading: {
          dryRun: form.dryRun,
          riskBudgetSol: Number(form.riskBudgetSol),
          maxTradeSol: Number(form.maxTradeSol),
          slippageBps: Number(form.slippageBps),
          pollIntervalMs: Number(form.pollIntervalMs),
          confirmTimeoutMs: Number(form.confirmTimeoutMs),
          autoStart: form.autoStart,
        },
        pumpfun: {
          targetSol: Number(form.targetSol),
          tradeUrl: config.pumpfun.tradeUrl,
          priorityLamports: Number(form.priorityLamports),
        },
      });
      await onSaved(updated);
    } catch (err) {
      if (err instanceof HedgefundApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save hedgefund config.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-lg shadow-black/30">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-neutral-400">Config</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Risk & Runtime Controls</h2>
      </header>

      <div className="grid gap-4 text-sm">
        <fieldset className="flex items-center justify-between rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3">
          <legend className="sr-only">Dry run toggle</legend>
          <div>
            <p className="text-sm font-medium text-foreground">Dry Run</p>
            <p className="text-xs text-neutral-400">When enabled, buys/sells will only simulate.</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={form.dryRun}
              onChange={(event) => handleChange("dryRun", event.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Enabled
          </label>
        </fieldset>

        <fieldset className="flex items-center justify-between rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3">
          <legend className="sr-only">Auto start toggle</legend>
          <div>
            <p className="text-sm font-medium text-foreground">Auto Start Worker</p>
            <p className="text-xs text-neutral-400">When disabled, the PM2 process stays idle until manually triggered.</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={form.autoStart}
              onChange={(event) => handleChange("autoStart", event.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Enabled
          </label>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <ConfigNumberInput
            label="Risk Budget (SOL)"
            value={form.riskBudgetSol}
            onChange={(value) => handleChange("riskBudgetSol", value)}
          />
          <ConfigNumberInput
            label="Max Trade (SOL)"
            value={form.maxTradeSol}
            onChange={(value) => handleChange("maxTradeSol", value)}
          />
          <ConfigNumberInput
            label="Target Pump.fun Spend (SOL)"
            value={form.targetSol}
            onChange={(value) => handleChange("targetSol", value)}
          />
          <ConfigNumberInput
            label="Slippage (BPS)"
            value={form.slippageBps}
            onChange={(value) => handleChange("slippageBps", value)}
          />
          <ConfigNumberInput
            label="Poll Interval (ms)"
            value={form.pollIntervalMs}
            onChange={(value) => handleChange("pollIntervalMs", value)}
          />
          <ConfigNumberInput
            label="Confirm Timeout (ms)"
            value={form.confirmTimeoutMs}
            onChange={(value) => handleChange("confirmTimeoutMs", value)}
          />
          <ConfigNumberInput
            label="Priority Fee (lamports)"
            value={form.priorityLamports}
            onChange={(value) => handleChange("priorityLamports", value)}
          />
        </div>

        {error ? (
          <div className="rounded-md border border-red-600/40 bg-red-900/30 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty || loading}
            className="rounded-md border border-emerald-500/50 bg-emerald-600/30 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-600/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Config"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || loading || !config}
            className="rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-2 text-sm text-neutral-200 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
        </div>

        <p className="text-xs text-neutral-400">
          Changes persist to <code className="font-mono text-xs">hedgefund.config.json</code>. The worker loop reads
          updates on the next tick; restart the PM2 process if you change poll timing or dry-run mode while it is
          running.
        </p>
      </div>
    </section>
  );
}

interface ConfigNumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ConfigNumberInput({ label, value, onChange }: ConfigNumberInputProps) {
  return (
    <label className="grid gap-2">
      <span className="text-xs uppercase tracking-wide text-neutral-400">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
    </label>
  );
}
