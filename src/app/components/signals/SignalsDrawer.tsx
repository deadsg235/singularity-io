import React from "react";

interface SignalsDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function SignalsDrawer({ open, onClose, children, title = "Signals" }: SignalsDrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-40 transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`absolute inset-x-0 bottom-0 transform transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-h-[80vh] overflow-hidden rounded-t-3xl border border-neutral-800/70 bg-surface-raised/95 shadow-elevated backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="font-display text-sm font-semibold tracking-[0.08em] text-neutral-400">
              {title}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-pill border border-neutral-800/60 px-3 py-1 font-display text-xs font-semibold tracking-[0.08em] text-neutral-400 transition hover:border-flux/50 hover:text-flux"
            >
              Close
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto pb-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignalsDrawer;
