"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SolanaArtifactType } from "@/app/lib/markdown/solanaArtifacts";

interface SolanaArtifactBadgeProps {
  value: string;
  type: SolanaArtifactType;
}

const ICON_PATH = "/assets/icons/solana.svg";

export function SolanaArtifactBadge({ value, type }: SolanaArtifactBadgeProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const display = useMemo(() => {
    if (value.length <= 12) return value;
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
  }, [value]);

  const explorerUrl = useMemo(() => {
    if (type === "publicKey") return `https://solscan.io/address/${value}`;
    if (type === "signature") return `https://solscan.io/tx/${value}`;
    return undefined;
  }, [type, value]);

  const kindLabel = type === "signature" ? "Transaction" : "Address";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900/40 px-2 py-1 text-xs text-neutral-100">
      <span className="inline-flex items-center gap-1">
        <Image src={ICON_PATH} alt="Solana" width={14} height={14} className="h-3.5 w-3.5" />
        <button
          type="button"
          onClick={handleCopy}
          className="font-mono text-sm text-neutral-100 underline decoration-dotted decoration-neutral-500 underline-offset-2 transition hover:text-flux focus:outline-none focus:ring-1 focus:ring-flux/60"
          title={`Copy ${kindLabel}`}
          aria-label={`Copy ${kindLabel}`}
        >
          {display}
        </button>
      </span>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-500 transition hover:text-flux"
          title="Open in Solscan"
          aria-label="Open in Solscan"
        >
          ↗
        </a>
      )}
      <span
        aria-live="polite"
        className={`font-display text-[10px] font-semibold tracking-[0.08em] transition ${copied ? "text-flux" : "text-neutral-500"}`}
      >
        {copied ? "Copied" : kindLabel}
      </span>
    </span>
  );
}

export default SolanaArtifactBadge;
