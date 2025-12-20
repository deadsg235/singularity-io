"use client";

import React from "react";
import { IdCardIcon, CheckCircledIcon, CrossCircledIcon, ReloadIcon } from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  SleekHash 
} from "./sleekVisuals";

type OverridePayload = {
  ok?: boolean;
  cleared?: boolean;
  wallet_address?: string;
};

type OverrideArgs = {
  wallet_address?: string;
};

const walletOverrideRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as OverridePayload;
  const args = ((item.data as any)?.arguments ?? {}) as OverrideArgs;

  const cleared = Boolean(payload.cleared);
  const ok = Boolean(payload.ok);
  const walletAddress = payload.wallet_address ?? args.wallet_address ?? undefined;

  const statusLabel = cleared ? "OVERRIDE CLEARED" : ok ? "OVERRIDE ACTIVE" : "OVERRIDE FAILED";
  const timestamp = formatTimestampDisplay(item.timestamp);

  return (
    <SleekCard className="relative overflow-visible p-5 flex flex-col gap-5">
      <header className="flex items-center justify-between">
         <SleekLabel>Session Control</SleekLabel>
         {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      <div className="flex items-center gap-6">
        {/* Status Icon */}
        <div className={`flex items-center justify-center w-12 h-12 rounded-full border shadow-inner ${
            cleared ? 'bg-neutral-800 border-neutral-700 text-neutral-400' :
            ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
            'bg-rose-500/10 border-rose-500/20 text-rose-500'
        }`}>
            {cleared ? <ReloadIcon className="w-6 h-6" /> : ok ? <CheckCircledIcon className="w-6 h-6" /> : <CrossCircledIcon className="w-6 h-6" />}
        </div>
        
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <span className={`text-sm font-bold tracking-wide ${
              cleared ? 'text-neutral-400' : ok ? 'text-emerald-400' : 'text-rose-400'
          }`}>
              {statusLabel}
          </span>
          
          {cleared ? (
             <span className="text-xs text-neutral-500">Session reverted to default resolver.</span>
          ) : walletAddress ? (
             <SleekHash value={walletAddress} label="Override" truncate={false} />
          ) : (
             <span className="text-xs text-neutral-500">No wallet address provided.</span>
          )}
        </div>
      </div>

      {walletAddress && !cleared && (
        <div className="flex gap-4 justify-end border-t border-white/5 pt-4">
           {['Solscan', 'Explorer'].map((site) => (
              <a 
                key={site}
                href={`https://${site === 'Solscan' ? 'solscan.io' : 'explorer.solana.com'}/account/${walletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] uppercase font-bold tracking-widest text-neutral-600 hover:text-white transition-colors"
              >
                {site}
              </a>
           ))}
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

export default walletOverrideRenderer;
