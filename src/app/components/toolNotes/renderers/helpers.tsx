import React, { useState } from "react";

export const BASE_CARD_CLASS = "w-full max-w-2xl space-y-6 text-[#111827]";
export const SECTION_TITLE_CLASS = "font-display text-sm font-semibold tracking-[0.08em] text-[#4B5563]";

const usdCompactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdPreciseFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});

export const countCompactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function normalizeOutput(data: Record<string, any> | undefined) {
  if (!data) return undefined;
  if (typeof data.output === "string") {
    const trimmed = data.output.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch {}
    }
  }
  if (data.output && typeof data.output === "object") return data.output;
  return data;
}

export function unwrapStructured(data: any) {
  if (!data || typeof data !== "object") return {};
  if (data.structuredContent && typeof data.structuredContent === "object") return data.structuredContent;
  if (data.structured_content && typeof data.structured_content === "object") return data.structured_content;
  if (data.result && typeof data.result === "object") return data.result;
  return data;
}

export function formatAddress(value: unknown, opts: { prefix?: number; suffix?: number } = {}) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const prefix = opts.prefix ?? 4;
  const suffix = opts.suffix ?? 4;
  if (value.length <= prefix + suffix + 3) return value;
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}

export function resolveSourceBadge(source: string | null) {
  if (!source) {
    return {
      label: "Unknown source",
      className:
        "rounded-full border border-[#D1D5DB] bg-white px-3 py-1 text-[11px] font-display font-medium tracking-[0.08em] text-[#1F2937]",
    };
  }
  const normalized = source.toLowerCase();
  switch (normalized) {
    case "resolver":
      return {
        label: "Resolver default",
        className:
          "rounded-full border border-[#34D399]/40 bg-[#ECFDF5] px-3 py-1 text-[11px] font-display font-medium tracking-[0.08em] text-[#047857]",
      };
    case "session":
    case "override":
      return {
        label: "Session override",
        className:
          "rounded-full border border-[#FB923C]/40 bg-[#FFF7ED] px-3 py-1 text-[11px] font-display font-medium tracking-[0.08em] text-[#9A3412]",
      };
    case "primary":
      return {
        label: "Primary wallet",
        className:
          "rounded-full border border-[#34D399]/40 bg-[#ECFDF5] px-3 py-1 text-[11px] font-display font-medium tracking-[0.08em] text-[#047857]",
      };
    case "demo":
      return {
        label: "Demo wallet",
        className:
          "rounded-full border border-[#A855F7]/30 bg-[#F5F3FF] px-3 py-1 text-[11px] font-display font-medium tracking-[0.08em] text-[#6D28D9]",
      };
    case "env":
    case "environment":
      return {
        label: "Env fallback",
        className:
          "rounded-full border border-[#60A5FA]/40 bg-[#EFF6FF] px-3 py-1 text-[11px] font-display font-medium tracking-[0.08em] text-[#1D4ED8]",
      };
    case "none":
      return {
        label: "No wallet bound",
        className:
          "rounded-full border border-[#D1D5DB] bg-white px-3 py-1 text-[11px] font-display font-medium tracking-[0.08em] text-[#4B5563]",
      };
    default:
      return {
        label: source,
        className:
          "rounded-full border border-[#D1D5DB] bg-white px-3 py-1 text-[11px] font-display font-medium tracking-[0.08em] text-[#1F2937]",
      };
  }
}

export function formatUsd(value: unknown, opts: { precise?: boolean } = {}) {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  if (opts.precise) {
    return usdPreciseFormatter.format(numeric);
  }
  return usdCompactFormatter.format(numeric);
}

function parseLamportsToSol(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value / 1_000_000_000;
  try {
    const bigintValue = BigInt(typeof value === "bigint" ? value : String(value));
    return Number(bigintValue) / 1_000_000_000;
  } catch {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return undefined;
    return numeric / 1_000_000_000;
  }
}

export function formatSolDisplay(value: unknown, { fromLamports = false }: { fromLamports?: boolean } = {}) {
  const base = fromLamports ? parseLamportsToSol(value) : typeof value === "string" || typeof value === "number" ? Number(value) : undefined;
  if (base === undefined || Number.isNaN(base)) return undefined;
  const abs = Math.abs(base);
  let formatted: string;
  if (abs >= 1) {
    formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(base);
  } else if (abs >= 0.01) {
    formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 }).format(base);
  } else {
    formatted = new Intl.NumberFormat("en-US", { minimumSignificantDigits: 2, maximumSignificantDigits: 6 }).format(base);
  }
  return `${formatted} SOL`;
}

export function formatSolAmount(value: unknown, { fromLamports = false }: { fromLamports?: boolean } = {}) {
  const display = formatSolDisplay(value, { fromLamports });
  if (!display) return undefined;
  return display.replace(/\s*SOL$/i, "");
}

interface HashBadgeProps {
  value: string;
  href?: string;
  ariaLabel?: string;
  displayMode?: "compact" | "full";
}

export function HashBadge({ value, href, ariaLabel, displayMode = "compact" }: HashBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement | HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const display = displayMode === "full" ? value : formatAddress(value, { prefix: 6, suffix: 6 }) ?? value;

  return (
    <div className="flex items-center gap-2 text-xs text-[#4B5563]">
      <button
        type="button"
        onClick={handleCopy}
        className="font-mono text-sm text-[#111827] underline decoration-dotted decoration-neutral-400 transition hover:text-[#0F172A]"
        title={value}
        aria-label={ariaLabel ? `Copy ${ariaLabel}` : "Copy value"}
      >
        {display}
      </button>
      {copied && (
        <span className="font-display text-[10px] font-semibold tracking-[0.08em] text-[#2563EB]">Copied</span>
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={ariaLabel ? `Open ${ariaLabel}` : "Open in new tab"}
          className="font-display text-[10px] font-semibold tracking-[0.08em] text-[#1F2937] underline decoration-slate-300 decoration-dotted underline-offset-4 transition hover:text-[#0F172A] hover:decoration-slate-500"
        >
          ↗
        </a>
      )}
    </div>
  );
}

export function formatTimestampDisplay(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
