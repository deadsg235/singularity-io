import React from "react";
import Image from "next/image";

interface BottomStatusRailProps {
  onOpenDebugModal: () => void;
  onOpenSignals: () => void;
  voiceControl: {
    isLive: boolean;
    isMuted: boolean;
    onToggleMuted: () => void;
  } | null;
  vadControl?: {
    isOpen: boolean;
    onToggle: () => void;
  } | null;
  canUseSignals: boolean;
  canUseDebug: boolean;
}

export function BottomStatusRail({
  onOpenDebugModal,
  onOpenSignals,
  voiceControl,
  vadControl,
  canUseSignals,
  canUseDebug,
}: BottomStatusRailProps) {
  return (
    <div className="flex items-center justify-between gap-6 px-9 py-3 text-sm text-neutral-200">
      {/* Left: Dexter.cash link with logo */}
      <a
        href="https://dexter.cash"
        className="flex items-center gap-2 text-xs text-neutral-300 transition hover:text-flux"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/assets/logos/logo.svg"
          alt="Dexter"
          width={16}
          height={16}
          className="h-4 w-4"
        />
        <span>dexter.cash</span>
      </a>

      {/* Center: Voice controls & signals */}
      <div className="flex flex-1 items-center justify-center gap-4">
        {voiceControl ? (
          <button
            type="button"
            onClick={voiceControl.onToggleMuted}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-display text-[11px] tracking-[0.08em] transition whitespace-nowrap sm:text-[12px] ${
              voiceControl.isMuted
                ? 'border-red-500/75 bg-red-600/40 text-red-50'
                : 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100'
            } ${!voiceControl.isLive ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={!voiceControl.isLive}
            title={voiceControl.isLive
              ? voiceControl.isMuted
                ? 'Turn mic on'
                : 'Turn mic off'
              : 'Voice control available once connected'}
            aria-pressed={voiceControl.isMuted}
          >
            <span>{voiceControl.isMuted ? 'Mic Off' : 'Mic On'}</span>
          </button>
        ) : null}

        {vadControl ? (
          <button
            type="button"
            onClick={vadControl.onToggle}
            className={`inline-flex items-center justify-center transition ${
              vadControl.isOpen ? 'text-flux' : 'text-neutral-100 hover:text-flux'
            }`}
            aria-pressed={vadControl.isOpen}
            title="Voice settings"
          >
            <Image src="/settings-gear.svg" alt="Voice settings" width={24} height={24} className="h-6 w-6" />
            <span className="sr-only">Voice settings</span>
          </button>
        ) : null}

        {canUseSignals ? (
          <button
            type="button"
            onClick={onOpenSignals}
            className="inline-flex items-center justify-center rounded-full border border-neutral-800/60 bg-neutral-900/40 p-2 text-neutral-300 transition hover:border-flux/40 hover:text-flux"
            title="Open signals"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" x2="6" y1="4" y2="20" />
              <line x1="12" x2="12" y1="9" y2="20" />
              <line x1="18" x2="18" y1="14" y2="20" />
            </svg>
            <span className="sr-only">Signals</span>
          </button>
        ) : null}
      </div>

      {/* Right: Debug info icon */}
      {canUseDebug ? (
        <button
          onClick={onOpenDebugModal}
          className="flex items-center justify-center text-neutral-500 transition hover:text-flux"
          title="Debug Info"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export default BottomStatusRail;
