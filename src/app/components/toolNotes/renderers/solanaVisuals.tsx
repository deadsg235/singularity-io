import React from "react";

import { HashBadge } from "./helpers";

type TokenAccent = "from" | "to" | "neutral";

interface TokenIconProps {
  label: string;
  accent?: TokenAccent;
  imageUrl?: string;
  size?: number;
  className?: string;
}

const ACCENT_GRADIENTS: Record<TokenAccent, string> = {
  from: "linear-gradient(135deg,#0ea5e9,#6366f1)",
  to: "linear-gradient(135deg,#a855f7,#ec4899)",
  neutral: "linear-gradient(135deg,#1e293b,#64748b)",
};

function computeInitials(label: string) {
  const cleaned = label.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length >= 2) return cleaned.slice(0, 2);
  if (cleaned.length === 1) return `${cleaned}•`;
  return "••";
}

export function TokenIcon({ label, accent = "neutral", imageUrl, size = 48, className }: TokenIconProps) {
  const initials = computeInitials(label);
  const style: React.CSSProperties = imageUrl
    ? {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: ACCENT_GRADIENTS[accent],
        color: "#fff",
      };

  return (
    <span
      className={`flex items-center justify-center rounded-[1.5rem] font-semibold tracking-[0.14em] uppercase text-[11px] text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] ${className ?? ""}`}
      style={{ width: size, height: size, ...style }}
    >
      {!imageUrl && <span>{initials}</span>}
    </span>
  );
}

interface MetricPillProps {
  label?: string;
  value: string;
  tone?: "neutral" | "positive" | "negative" | "notice";
}

const TONE_TEXT: Record<NonNullable<MetricPillProps["tone"]>, string> = {
  neutral: "text-slate-800",
  positive: "text-emerald-600",
  negative: "text-rose-600",
  notice: "text-indigo-600",
};

export function MetricPill({ label, value, tone = "neutral" }: MetricPillProps) {
  const toneClass = TONE_TEXT[tone] ?? TONE_TEXT.neutral;
  return (
    <span className={`inline-flex items-baseline gap-2 text-sm font-semibold ${toneClass}`}>
      {label && <span className="text-[0.58rem] uppercase tracking-[0.28em] text-current opacity-70">{label}</span>}
      <span className="text-current">{value}</span>
    </span>
  );
}

export function LinkPill({ value, href }: { value: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 underline decoration-slate-300 decoration-dotted underline-offset-4 transition hover:text-slate-900 hover:decoration-slate-500"
    >
      {value}
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

export function TokenResearchLinks({ mint }: { mint?: string | null }) {
  if (!mint) return null;
  const links = [
    { label: "Solscan", href: `https://solscan.io/token/${mint}` },
    { label: "Dexscreener", href: `https://dexscreener.com/solana/${mint}` },
    { label: "Birdeye", href: `https://birdeye.so/token/${mint}?chain=solana` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 underline decoration-slate-300 decoration-dotted underline-offset-4 transition hover:text-slate-900 hover:decoration-slate-500"
        >
          {link.label}
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      ))}
    </div>
  );
}

export type TokenSide = {
  heading: string;
  amount?: string;
  asset?: string;
  mintAddress?: string;
  explorerUrl?: string;
  imageUrl?: string;
  accent?: TokenAccent;
  meta?: {
    name?: string | null;
    priceChange24h?: number | null;
    priceUsd?: number | null;
    marketCap?: number | null;
    liquidityUsd?: number | null;
  };
};

interface TokenBadgeProps {
  side: TokenSide;
  size?: number;
  compact?: boolean;
}

export function TokenBadge({ side, size = 48, compact = false }: TokenBadgeProps) {
  return (
    <div className={`group flex items-center gap-3 ${compact ? "text-sm" : ""}`}>
      <TokenIcon label={side.asset ?? side.heading ?? "TOKEN"} accent={side.accent} imageUrl={side.imageUrl} size={size} />
      <div className="flex min-w-[120px] flex-col">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{side.heading}</span>
        {side.amount && (
          <span className="text-lg font-semibold text-slate-900">
            {side.amount} {side.asset && <span className="text-sm font-medium text-slate-500">{side.asset}</span>}
          </span>
        )}
        {!side.amount && side.asset && <span className="text-lg font-semibold text-slate-900">{side.asset}</span>}
        {side.meta?.name && <span className="text-xs text-slate-500">{side.meta.name}</span>}
        {side.mintAddress && (
          <HashBadge value={side.mintAddress} href={side.explorerUrl} ariaLabel={`${side.asset ?? "Token"} mint`} />
        )}
      </div>
    </div>
  );
}

interface TokenFlowProps {
  from: TokenSide;
  to: TokenSide;
  animate?: boolean;
}

export function TokenFlow({ from, to, animate = false }: TokenFlowProps) {
  return (
    <div className="mt-2 flex flex-col gap-6">
      <div className="hidden md:flex md:items-center md:justify-between">
        <TokenBadge side={{ ...from, accent: from.accent ?? "from" }} />

        {animate ? (
          <div className="swap-animation relative flex h-20 w-40 items-center justify-center">
            <div className="swap-animation__track absolute inset-0">
              <div className="swap-animation__token swap-animation__token--from">
                <TokenIcon label={from.asset ?? from.heading ?? "TOKEN"} accent="from" imageUrl={from.imageUrl} size={44} />
              </div>
              <div className="swap-animation__token swap-animation__token--to">
                <TokenIcon label={to.asset ?? to.heading ?? "TOKEN"} accent="to" imageUrl={to.imageUrl} size={44} />
              </div>
            </div>
            <div className="swap-animation__arrow relative z-10 flex h-11 w-11 items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M5 12.75h10.19l-2.72 2.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06l-4.25-4.25a.75.75 0 0 0-1.06 1.06l2.72 2.72H5a.75.75 0 0 0 0 1.5Z"
                />
              </svg>
            </div>
          </div>
        ) : (
          <div className="flex h-11 w-11 items-center justify-center text-slate-400">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M5 12.75h10.19l-2.72 2.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06l-4.25-4.25a.75.75 0 0 0-1.06 1.06l2.72 2.72H5a.75.75 0 0 0 0 1.5Z"
              />
            </svg>
          </div>
        )}

        <TokenBadge side={{ ...to, accent: to.accent ?? "to" }} />
      </div>

      <div className="flex flex-col items-center gap-4 md:hidden">
        <TokenBadge side={{ ...from, accent: from.accent ?? "from" }} compact />
        {animate ? (
          <div className="flex flex-col items-center gap-2 text-slate-600">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <svg className="h-5 w-5 animate-pulse" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12.75h10.19l-2.72 2.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06l-4.25-4.25a.75.75 0 0 0-1.06 1.06l2.72 2.72H5a.75.75 0 0 0 0 1.5Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="text-xs uppercase tracking-[0.32em] text-slate-500">Swapping</span>
          </div>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center text-slate-500">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M5 12.75h10.19l-2.72 2.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06l-4.25-4.25a.75.75 0 0 0-1.06 1.06l2.72 2.72H5a.75.75 0 0 0 0 1.5Z"
              />
            </svg>
          </div>
        )}
        <TokenBadge side={{ ...to, accent: to.accent ?? "to" }} compact />
      </div>

      {animate && (
        <style jsx>{`
          .swap-animation {
            width: 160px;
            height: 80px;
          }
          .swap-animation__track {
            pointer-events: none;
          }
          .swap-animation__token {
            position: absolute;
            top: 50%;
            margin-top: -22px;
            filter: drop-shadow(0 12px 22px rgba(15, 23, 42, 0.2));
            opacity: 0;
          }
          .swap-animation__token--from {
            animation: swapSlideFrom 8s ease-in-out infinite alternate;
          }
          .swap-animation__token--to {
            animation: swapSlideTo 8s ease-in-out infinite alternate;
          }
          .swap-animation__arrow svg {
            width: 26px;
            height: 26px;
            color: #1e293b;
            filter: drop-shadow(0 6px 12px rgba(15, 23, 42, 0.15));
            animation: swapFlip 8s ease-in-out infinite alternate;
          }
          @keyframes swapSlideFrom {
            0% {
              transform: translateX(-70px) scale(0.9);
              opacity: 0;
            }
            15% {
              opacity: 0.8;
            }
            40% {
              transform: translateX(-18px) scale(1.02);
              opacity: 1;
            }
            50% {
              transform: translateX(0px) scale(0.88);
              opacity: 0.2;
            }
            100% {
              transform: translateX(70px) scale(0.9);
              opacity: 0;
            }
          }
          @keyframes swapSlideTo {
            0% {
              transform: translateX(70px) scale(0.9);
              opacity: 0;
            }
            15% {
              opacity: 0.8;
            }
            40% {
              transform: translateX(18px) scale(1.02);
              opacity: 1;
            }
            50% {
              transform: translateX(0px) scale(0.88);
              opacity: 0.2;
            }
            100% {
              transform: translateX(-70px) scale(0.9);
              opacity: 0;
            }
          }
          @keyframes swapFlip {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(180deg);
            }
          }
        `}</style>
      )}
    </div>
  );
}
