"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";

import TextInput from "./TextInput";
import SendButton from "./SendButton";

export type ComposerAttachment = {
  id: string;
  label: string;
  description?: string;
};

interface InputBarProps {
  userText: string;
  setUserText: (text: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  attachments?: ComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;
  onAddAttachments?: (files: File[]) => void;
}

const trayVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.35, duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

const MediaGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M4 3h12a1 1 0 0 1 1 1v12l-3.6-3.6a1 1 0 0 0-1.4 0L9 15l-2.6-2.6a1 1 0 0 0-1.4 0L3 13V4a1 1 0 0 1 1-1Z"
      fill="currentColor"
    />
    <circle cx="7.5" cy="7.5" r="1.8" fill="currentColor" />
  </svg>
);

export function InputBar({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  attachments = [],
  onRemoveAttachment,
  onAddAttachments,
}: InputBarProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const canSubmit = canSend && (userText.trim().length > 0 || attachments.length > 0);
  const [shouldAutoFocus, setShouldAutoFocus] = React.useState(false);

  React.useEffect(() => {
    if (!canSend) {
      setShouldAutoFocus(false);
      return;
    }

    if (typeof window === "undefined") {
      setShouldAutoFocus(false);
      return;
    }

    const mediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)")
      : null;
    const coarsePointer = mediaQuery ? mediaQuery.matches : false;
    const hasTouch = "ontouchstart" in window;
    const isTouchDevice = coarsePointer || hasTouch;

    setShouldAutoFocus(!isTouchDevice);
  }, [canSend]);

  const hasAttachments = attachments.length > 0;

  const handleAttachmentButton = () => {
    if (!onAddAttachments) return;
    fileInputRef.current?.click();
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onAddAttachments) return;
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length > 0) {
      onAddAttachments(files);
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  return (
    <motion.div
      className="pointer-events-none px-4 pb-6 pt-3 sm:px-6"
      initial="hidden"
      animate="visible"
      variants={trayVariants}
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-2">
        {hasAttachments ? (
          <div className="flex flex-wrap items-center gap-2">
            {attachments.map(({ id, label, description }) => (
              <div
                key={id}
                className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-200 backdrop-blur-xl"
              >
                <span>{label}</span>
                {description ? (
                  <span className="hidden text-[10px] text-neutral-400 sm:inline">{description}</span>
                ) : null}
                {onRemoveAttachment ? (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(id)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] text-neutral-400 transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                    aria-label={`Remove ${label}`}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="relative flex w-full items-center gap-2 rounded-full border border-white/10 bg-[#0A0A0A]/80 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 focus-within:border-white/20 focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_12px_40px_rgba(0,0,0,0.6)]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelection}
          />
          <button
            type="button"
            onClick={handleAttachmentButton}
            disabled={!onAddAttachments}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Add attachments"
          >
            <MediaGlyph className="h-4 w-4" />
          </button>

          <TextInput
            value={userText}
            onChange={setUserText}
            onSubmit={onSendMessage}
            disabled={!canSend}
            autoFocus={shouldAutoFocus}
            className="bg-transparent px-1 py-1.5 text-white placeholder-neutral-500"
          />

          <SendButton onClick={onSendMessage} disabled={!canSubmit} />
        </div>
      </div>
    </motion.div>
  );
}

export default InputBar;
