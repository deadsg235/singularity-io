"use client";

import React from "react";
import { IdCardIcon } from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  SleekHash 
} from "./sleekVisuals";

type WalletResolvePayload = {
  wallet_address?: string;
  address?: string;
  public_key?: string;
  active_wallet_address?: string;
  source?: string;
  user_id?: string;
};

type WalletResolveArgs = {
  wallet_address?: string;
};

function extractAddress(value: unknown, depth = 0): string | null {
  if (value === null || value === undefined) return null;
  if (depth > 4) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(trimmed)) return trimmed;
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractAddress(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const candidates = [
      (value as any)?.wallet_address,
      (value as any)?.address,
      (value as any)?.public_key,
      (value as any)?.active_wallet_address,
      (value as any)?.text,
      (value as any)?.value,
    ];
    for (const candidate of candidates) {
      const found = extractAddress(candidate, depth + 1);
      if (found) return found;
    }
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (candidates.some((candidate) => candidate === (value as any)[key])) continue;
      const found = extractAddress((value as any)[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

const walletResolveRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as WalletResolvePayload | Record<string, unknown>;
  const args = ((item.data as any)?.arguments ?? {}) as WalletResolveArgs;

  const resolvedAddress =
    extractAddress(payload) ??
    extractAddress(normalized) ??
    extractAddress((item.data as any)?.output);
  const requestedAddress = typeof args.wallet_address === "string" ? args.wallet_address : null;
  const source = typeof (payload as any)?.source === "string" ? (payload as any).source : resolvedAddress ? "resolver" : "unknown";
  const showRequested = requestedAddress && requestedAddress !== resolvedAddress;
  const sourceLabel = source ? source.replace(/_/g, " ") : null;

  const timestamp = formatTimestampDisplay(item.timestamp);

  return (
    <SleekCard className="relative overflow-visible p-5 flex flex-col gap-5">
      <header className="flex items-center justify-between">
         <SleekLabel>Session Wallet</SleekLabel>
         {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      <div className="flex items-center gap-6">
        {/* Pure Icon: No Container, No Border, Just Identity */}
        <IdCardIcon className="w-12 h-12 text-neutral-600/80 drop-shadow-md" />
        
        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <div>
            <div className="text-xs text-neutral-400 font-medium mb-1">Active Wallet Address</div>
            {resolvedAddress ? (
              <SleekHash value={resolvedAddress} label="Wallet" truncate={false} />
            ) : (
              <span className="text-sm text-rose-400 font-medium">Resolver failed to return a wallet.</span>
            )}
          </div>

          {sourceLabel && (
            <div className="flex mt-0.5">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 opacity-80">
                {sourceLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {showRequested && (
        <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
          <SleekLabel>Requested Override</SleekLabel>
          <SleekHash value={requestedAddress!} label="Requested" truncate={false} />
        </div>
      )}

      {resolvedAddress && (
        <div className="flex gap-4 justify-end border-t border-white/5 pt-4">
           {['Solscan', 'Explorer'].map((site) => (
              <a 
                key={site}
                href={`https://${site === 'Solscan' ? 'solscan.io' : 'explorer.solana.com'}/account/${resolvedAddress}`}
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

export default walletResolveRenderer;
