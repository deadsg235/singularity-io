"use client";

import React, { useState } from "react";
import { ClipboardCopyIcon, DownloadIcon } from "@radix-ui/react-icons";

interface ConversationHeaderProps {
  onCopyTranscript: () => Promise<void>;
  onDownloadAudio: () => void;
  onSaveLog: () => void;
}

export function ConversationHeader({
  onCopyTranscript,
  onDownloadAudio,
  onSaveLog,
}: ConversationHeaderProps) {
  const [justCopied, setJustCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleCopy = async () => {
    await onCopyTranscript();
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
  };

  const handleSave = () => {
    onSaveLog();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 overflow-hidden border-b border-neutral-800/50 bg-surface-base/90 px-6 py-4 backdrop-blur">
      <span className="flex-shrink-0 font-display text-sm font-semibold tracking-[0.08em] text-neutral-400">
        Conversation
      </span>
      <div className="flex min-w-0 flex-shrink gap-2">
        <button
          onClick={handleCopy}
          className="flex flex-shrink-0 items-center justify-center gap-x-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2 py-2 font-display text-xs font-semibold tracking-[0.08em] text-neutral-300 transition hover:border-flux/50 hover:text-flux sm:px-3"
          title="Copy transcript"
        >
          <ClipboardCopyIcon />
          <span className="hidden sm:inline">{justCopied ? "Copied!" : "Copy"}</span>
        </button>
        <button
          onClick={onDownloadAudio}
          className="flex flex-shrink-0 items-center justify-center gap-x-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2 py-2 font-display text-xs font-semibold tracking-[0.08em] text-neutral-300 transition hover:border-iris/50 hover:text-iris sm:px-3"
          title="Download audio recording"
        >
          <DownloadIcon />
          <span className="hidden md:inline">Download Audio</span>
          <span className="inline md:hidden">Audio</span>
        </button>
        <button
          onClick={handleSave}
          className="flex flex-shrink-0 items-center justify-center gap-x-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2 py-2 font-display text-xs font-semibold tracking-[0.08em] text-neutral-300 transition hover:border-amber-400/60 hover:text-amber-300 sm:px-3"
          title="Save conversation log"
        >
          <span className="text-lg leading-none">⬇</span>
          <span className="hidden sm:inline">{justSaved ? "Saved!" : "Save Log"}</span>
          <span className="inline sm:hidden">{justSaved ? "✓" : "Log"}</span>
        </button>
      </div>
    </div>
  );
}

export default ConversationHeader;
