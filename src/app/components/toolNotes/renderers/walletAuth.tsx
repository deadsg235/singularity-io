"use client";

import React from "react";
import { LockClosedIcon } from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  SleekHash,
  MetricItem
} from "./sleekVisuals";

type Diagnostics = {
  bearer_source?: string;
  has_token?: boolean;
  override_session?: string;
  detail?: string;
  wallets_cached?: number;
};

type AuthSummary = {
  wallet_address?: string;
  user_id?: string;
  source?: string;
  diagnostics?: Diagnostics;
};

const walletAuthRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as AuthSummary;
  const timestamp = formatTimestampDisplay(item.timestamp);

  const diagnostics = payload.diagnostics ?? {};

  const diagnosticChips: { label: string; value: string; tone?: "neutral" | "positive" | "negative" | "notice" }[] = [];
  if (payload.source) diagnosticChips.push({ label: "Source", value: payload.source });
  if (diagnostics.bearer_source) diagnosticChips.push({ label: "Bearer", value: diagnostics.bearer_source });
  if (diagnostics.override_session) diagnosticChips.push({ label: "Override", value: diagnostics.override_session, tone: "notice" });
  if (diagnostics.wallets_cached !== undefined) diagnosticChips.push({ label: "Cached", value: String(diagnostics.wallets_cached) });
  if (diagnostics.has_token !== undefined) diagnosticChips.push({ label: "Token", value: diagnostics.has_token ? "Present" : "Missing", tone: diagnostics.has_token ? "positive" : "negative" });

  return (
    <SleekCard className="relative overflow-visible p-5 flex flex-col gap-5">
      <header className="flex items-center justify-between">
         <SleekLabel>Auth Diagnostics</SleekLabel>
         {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      <div className="flex items-center gap-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-inner">
           <LockClosedIcon className="w-6 h-6 text-neutral-400" />
        </div>
        
        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <div>
            <div className="text-xs text-neutral-400 font-medium mb-1">Session Wallet</div>
            {payload.wallet_address ? (
              <SleekHash value={payload.wallet_address} label="Active wallet" truncate={false} />
            ) : (
              <span className="text-sm text-neutral-500">No wallet bound to this session.</span>
            )}
          </div>
        </div>
      </div>

      {payload.user_id && (
        <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
           <SleekLabel>Supabase User</SleekLabel>
           <SleekHash value={payload.user_id} label="User ID" truncate={false} />
        </div>
      )}

      {diagnosticChips.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
          {diagnosticChips.map((chip, idx) => (
            <MetricItem 
              key={`${chip.label}-${idx}`} 
              label={chip.label.toUpperCase()} 
              value={chip.value} 
              className={chip.tone === 'notice' ? 'border-amber-500/20 bg-amber-500/5' : ''}
            />
          ))}
        </div>
      )}

      {diagnostics.detail && (
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-neutral-400 font-mono break-all">
           {diagnostics.detail}
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(normalized, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

export default walletAuthRenderer;
