"use client";

import React, { useState } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { ClipboardCopyIcon, ExternalLinkIcon } from "@radix-ui/react-icons";

export const SleekLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold font-display opacity-80">
    {children}
  </span>
);

export const SleekValue = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-sans text-white font-medium tracking-tight ${className}`}>
    {children}
  </span>
);

export const SleekCard = ({ children, className, ...props }: HTMLMotionProps<"div">) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className={`w-full max-w-lg overflow-hidden rounded-3xl border border-white/5 bg-[#0A0A0A]/90 backdrop-blur-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

export const SleekLoadingCard = () => (
  <SleekCard className="p-6">
    <div className="flex items-center gap-4">
      <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-neutral-800 animate-pulse" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-800" />
        <div className="h-3 w-20 animate-pulse rounded bg-neutral-800" />
      </div>
    </div>
  </SleekCard>
);

export const SleekErrorCard = ({ message }: { message: string }) => (
  <SleekCard className="p-6">
    <div className="text-center text-neutral-400 text-sm">
      {message}
    </div>
  </SleekCard>
);

export const TokenIconSleek = ({ symbol, imageUrl, size = 56 }: { symbol: string; imageUrl?: string; size?: number }) => {
  const [error, setError] = useState(false);
  const showImage = imageUrl && !error;

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-800 shadow-inner ring-1 ring-white/10"
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img 
          src={imageUrl} 
          alt={symbol} 
          className="h-full w-full object-cover" 
          onError={() => setError(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-lg font-bold text-neutral-400">{symbol.slice(0, 2)}</span>
      )}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
    </div>
  );
};

export const SleekHash = ({ value, href, label, truncate = true }: { value: string; href?: string; label: string; truncate?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const display = truncate ? `${value.slice(0, 4)}...${value.slice(-4)}` : value;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Removed border/bg/padding to be "text-only" sleek
  return (
    <div className="flex items-center gap-2 group cursor-pointer transition-colors" onClick={handleCopy} title={`Copy ${label}`}>
      <span className="font-mono text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
        {display}
      </span>
      <button className="text-neutral-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 -ml-1">
        {copied ? <span className="text-[9px] text-emerald-400 font-bold ml-1">COPIED</span> : <ClipboardCopyIcon className="h-3 w-3" />}
      </button>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="text-neutral-600 hover:text-white transition-colors pl-1 opacity-0 group-hover:opacity-100">
           <ExternalLinkIcon className="h-3 w-3" />
        </a>
      )}
    </div>
  );
};

export const MetricItem = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className={`flex flex-col gap-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.02] ${className}`}>
    <SleekLabel>{label}</SleekLabel>
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-semibold text-neutral-200 tracking-wide">
        {value}
      </span>
    </div>
  </div>
);

// Pure formatters
export const formatUsdCompact = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
};

export const formatUsdPrecise = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 6,
  }).format(value);
};

export const formatPercent = (value: number) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};
