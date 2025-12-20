"use client";

import React, { useState } from "react";
import { IdCardIcon } from "@radix-ui/react-icons";
import { LayoutGroup, motion } from "framer-motion";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  SleekHash,
  SleekLoadingCard,
  SleekErrorCard
} from "./sleekVisuals";

type WalletRecord = {
  address?: string;
  public_key?: string;
  label?: string;
  status?: string;
  is_default?: boolean;
};

type WalletListPayload = {
  user?: { id?: string };
  wallets?: WalletRecord[];
};

function pickAddress(wallet: WalletRecord): string | null {
  if (wallet.address && wallet.address.trim().length > 0) return wallet.address.trim();
  if (wallet.public_key && wallet.public_key.trim().length > 0) return wallet.public_key.trim();
  return null;
}

const walletListRenderer: ToolNoteRenderer = ({ item, isExpanded: isListExpanded, onToggle, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as WalletListPayload | WalletRecord[];

  const wallets: WalletRecord[] = Array.isArray((payload as WalletListPayload)?.wallets)
    ? ((payload as WalletListPayload).wallets as WalletRecord[])
    : Array.isArray(payload)
      ? (payload as WalletRecord[])
      : [];

  const visibleWallets = isListExpanded ? wallets : wallets.slice(0, 6);
  const hasMore = wallets.length > visibleWallets.length;
  const timestamp = formatTimestampDisplay(item.timestamp);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (item.status === "IN_PROGRESS" && wallets.length === 0) {
    return <SleekLoadingCard />;
  }

  if (wallets.length === 0) {
    return <SleekErrorCard message="No linked wallets found." />;
  }

  return (
    <div className="w-full max-w-3xl space-y-4">
      <header className="flex items-center justify-between px-1">
         <SleekLabel>Linked Wallets</SleekLabel>
         {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      <LayoutGroup>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleWallets.map((wallet, index) => {
            const address = pickAddress(wallet);
            const label = typeof wallet.label === "string" && wallet.label.trim().length > 0 ? wallet.label.trim() : null;
            const isDefault = Boolean(wallet.is_default);
            const displayLabel = label ?? (address ? `Wallet ${index + 1}` : "Unknown Wallet");
            
            const isExpanded = expandedIndex === index;

            return (
              <SleekCard 
                key={address ?? `wallet-${index}`} 
                layout
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className={`relative group overflow-hidden flex flex-col p-5 gap-3 cursor-pointer transition-colors hover:bg-[#0A0A0A] ${isExpanded ? 'col-span-1 sm:col-span-2 bg-black' : ''}`}
              >
                 <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="shrink-0">
                       <IdCardIcon className={`w-8 h-8 ${isDefault ? 'text-emerald-400' : 'text-neutral-500'}`} />
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                       {/* Header */}
                       <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white tracking-tight text-lg truncate">{displayLabel}</span>
                          {isDefault && (
                             <span className="shrink-0 text-[9px] uppercase font-bold tracking-widest text-emerald-500">Default</span>
                          )}
                       </div>

                       {/* Address (Always visible, expands on click) */}
                       {address && (
                          <div className="-ml-1"> {/* Negative margin to align hash with text start */}
                             <SleekHash 
                               value={address} 
                               label="Address" 
                               truncate={!isExpanded} 
                             />
                          </div>
                       )}
                    </div>
                 </div>
              </SleekCard>
            );
          })}
        </div>
      </LayoutGroup>

      {hasMore && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full py-3 rounded-2xl border border-white/5 bg-white/5 text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isListExpanded ? "Collapse List" : `Show ${wallets.length - visibleWallets.length} more wallets`}
        </button>
      )}

      {debug && (
        <details className="mt-4 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(normalized, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default walletListRenderer;
