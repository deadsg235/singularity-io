"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TranscriptItem } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { GuardrailChip } from "./GuardrailChip";
import { getToolNoteRenderer } from "./toolNotes/renderers";
import MessageMarkdown from "./MessageMarkdown";
import { StartConversationButton } from "./StartConversationButton";

interface TranscriptMessagesProps {
  hasActivatedSession?: boolean;
  onSendMessage?: (message: string) => void;
  canViewDebugPayloads?: boolean;
  onStartConversation?: () => Promise<void> | void;
  onCaptureCrestOrigin?: (rect: DOMRect | null) => void;
}

export function TranscriptMessages({
  hasActivatedSession,
  onSendMessage,
  canViewDebugPayloads = false,
  onStartConversation,
  onCaptureCrestOrigin,
}: TranscriptMessagesProps = {}) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const debugEnvEnabled = process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === 'true';
  const showDebugPayloads = debugEnvEnabled && canViewDebugPayloads;
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [postPromptsVisible, setPostPromptsVisible] = useState(false);
  const hasShownPostPromptsRef = useRef(false);
  const [prefersTouch, setPrefersTouch] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const scrollToBottom = useCallback(() => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight });
  }, []);

  const handleScroll = useCallback(() => {
    const node = transcriptRef.current;
    if (!node) return;
    const { scrollTop, scrollHeight, clientHeight } = node;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const isNearBottom = distanceFromBottom <= 64;
    setIsPinnedToBottom(isNearBottom);
  }, []);

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    const listener = () => handleScroll();
    node.addEventListener("scroll", listener, { passive: true });
    handleScroll();
    return () => node.removeEventListener("scroll", listener);
  }, [handleScroll]);

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if ((hasNewMessage || hasUpdatedMessage) && isPinnedToBottom) {
      scrollToBottom();
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems, prevLogs, isPinnedToBottom, scrollToBottom]);

  // Only show empty state if there are no user or assistant messages (filter out debug/system items)
  const realMessageCount = transcriptItems.filter(
    (item) =>
      item.type === 'MESSAGE' &&
      (item.role === 'user' || item.role === 'assistant') &&
      !item.isHidden,
  ).length;

  const hasRealMessages = realMessageCount > 0;
  const showEmptyState = !hasActivatedSession && !hasRealMessages;

  const POST_PROMPTS_ENABLED = false;

  const suggestedPrompts = [
    "What's trending on Pump.fun right now?",
    "Show me my wallet balance",
    "Help me find a promising new token",
  ];

  useEffect(() => {
    if (!POST_PROMPTS_ENABLED) return;

    if (!hasShownPostPromptsRef.current && hasActivatedSession && hasRealMessages) {
      setPostPromptsVisible(true);
      hasShownPostPromptsRef.current = true;
    }
  }, [POST_PROMPTS_ENABLED, hasActivatedSession, hasRealMessages]);

  useEffect(() => {
    if (!POST_PROMPTS_ENABLED) return;

    if (postPromptsVisible && realMessageCount > 1) {
      setPostPromptsVisible(false);
    }
  }, [POST_PROMPTS_ENABLED, postPromptsVisible, realMessageCount]);

  useEffect(() => {
    if (!showEmptyState) {
      setShowStartButton(false);
      return;
    }

    const timer = window.setTimeout(() => setShowStartButton(true), 4000);
    return () => window.clearTimeout(timer);
  }, [showEmptyState]);

  useEffect(() => {
    if (!showEmptyState || !showStartButton) {
      setShowPrompt(false);
      return;
    }

    const timer = window.setTimeout(() => setShowPrompt(true), 2000);
    return () => window.clearTimeout(timer);
  }, [showEmptyState, showStartButton]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(pointer: coarse)");

    const updatePreference = (event: MediaQueryList | MediaQueryListEvent) => {
      setPrefersTouch(event.matches);
    };

    updatePreference(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);
      return () => mediaQuery.removeEventListener("change", updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  const startPromptLabel = prefersTouch ? "Tap to say hi to Dexter" : "Click to say hi to Dexter";
  const promptCopy = isStartingConversation ? "Dexter's remembering you..." : startPromptLabel;
  const promptKey = isStartingConversation ? "starting" : prefersTouch ? "touch" : "pointer";

  const handleStartClick = async () => {
    if (!onStartConversation || isStartingConversation) return;
    try {
      setShowPrompt(true);
      setIsStartingConversation(true);
      await onStartConversation();
    } finally {
      setIsStartingConversation(false);
    }
  };

  const handleFollowUpPrompt = (prompt: string) => {
    setPostPromptsVisible(false);
    onSendMessage?.(prompt);
  };

  return (
    <div
      ref={transcriptRef}
      data-transcript-messages
      className="flex h-full flex-1 flex-col gap-y-4 overflow-auto p-6"
    >
      <AnimatePresence>
        {showEmptyState && showStartButton && (
          <motion.div
            key="start-conversation"
            className="flex h-full flex-1 items-center justify-center"
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.96 }}
            transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
          >
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 22, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.94 }}
                transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
              >
                <StartConversationButton
                  onClick={handleStartClick}
                  isLoading={isStartingConversation}
                  onCaptureOrigin={onCaptureCrestOrigin}
                />
              </motion.div>
              <AnimatePresence mode="wait">
                {showPrompt && (
                  <motion.p
                    key={promptKey}
                    className="mt-6 text-base font-semibold tracking-[0.08em] text-[#FFA869] drop-shadow-[0_14px_36px_rgba(0,0,0,0.55)]"
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.92 }}
                    transition={{ duration: 0.38, ease: [0.22, 0.61, 0.36, 1] }}
                  >
                    {promptCopy}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {POST_PROMPTS_ENABLED && postPromptsVisible && (
        <div className="animate-in fade-in slide-in-from-top-2 mb-4 flex flex-wrap items-center justify-center gap-2 self-center rounded-full border border-neutral-800/60 bg-surface-glass/40 px-4 py-2 text-sm text-neutral-300 shadow-sm">
          {suggestedPrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleFollowUpPrompt(prompt)}
              className="rounded-full border border-transparent bg-neutral-900/50 px-3 py-1.5 font-display text-xs font-semibold tracking-[0.08em] transition hover:border-flux/60 hover:text-flux"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {[...transcriptItems]
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
        .map((item) => {
          const {
            itemId,
            type,
            role,
            data,
            expanded,
            timestamp,
            title = "",
            isHidden,
            status,
            guardrailResult,
          } = item;

          if (isHidden) {
            return null;
          }

          if (type === "MESSAGE") {
            const isUser = role === "user";
            const containerClasses = `group/message relative flex flex-col gap-1 ${
              isUser ? "items-end" : "items-start"
            }`;
            const bubbleBase = `relative max-w-2xl px-1 py-1 transition-colors`;
            const isBracketedMessage =
              title.startsWith("[") && title.endsWith("]");
            const displayTitle = isBracketedMessage ? title.slice(1, -1) : title;
            const isTranscribingCue =
              isBracketedMessage && displayTitle.toLowerCase() === "transcribing...";
            const messageStyle = isBracketedMessage && !isTranscribingCue ? "italic text-neutral-600" : "";
            const bubbleTone = "bg-transparent";
            const messageTextClass = isUser ? "text-neutral-900" : "text-neutral-800";

            return (
              <div key={itemId} className={containerClasses}>
                <div className="max-w-2xl space-y-2">
                  <div className={`${bubbleBase} ${bubbleTone} ${guardrailResult ? "rounded-b-none" : ""}`}>
                    {isTranscribingCue ? (
                      <TypingIndicator />
                    ) : (
                      <MessageMarkdown
                        className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${messageStyle} ${messageTextClass}`}
                      >
                        {displayTitle}
                      </MessageMarkdown>
                    )}
                  </div>
                  {guardrailResult && (
                    <div className="rounded-b-3xl border border-[#F6A878]/25 bg-[#2A0D08]/85 px-4 py-3 text-[#FFE5D2]">
                      <GuardrailChip guardrailResult={guardrailResult} />
                    </div>
                  )}
                </div>
              </div>
            );
          } else if (type === "TOOL_NOTE") {
            const renderer = getToolNoteRenderer(title);
            const isPending = status === 'IN_PROGRESS';
            const pendingSpinner = (
              <span
                aria-hidden
                className={
                  isPending
                    ? 'inline-flex h-2.5 w-2.5 animate-spin rounded-full border border-flux/70 border-t-transparent'
                    : 'inline-flex h-1.5 w-1.5 items-center justify-center'
                }
              >
                {!isPending && <span className="h-1.5 w-1.5 rounded-full bg-flux/70" />}
              </span>
            );
            if (renderer) {
              return (
                <div key={itemId} className="flex flex-col items-start text-[11px] text-[#FFE1CC]">
                  <div
                    className={`flex items-center gap-2 rounded-full border border-[#F7BE8A]/25 bg-[#220907]/80 px-3 py-1 text-[10px] font-display font-semibold tracking-[0.08em] ${
                      isPending ? 'border-flux/60 text-flux' : 'text-[#FFD6B2]'
                    }`}
                  >
                    {pendingSpinner}
                    <span>Tool</span>
                    <span className="tracking-normal text-[#FFF0D7]">{title}</span>
                    {isPending && (
                      <span className="font-display text-[9px] font-semibold tracking-[0.08em] text-flux/80">
                        Working…
                      </span>
                    )}
                  </div>
                  {renderer({
                    item,
                    isExpanded: expanded,
                    onToggle: () => toggleTranscriptItemExpand(itemId),
                    debug: showDebugPayloads,
                  })}
                </div>
              );
            }

            const hasDetails = data && Object.keys(data).length > 0;
            const canToggle = showDebugPayloads && hasDetails;
            return (
              <div key={itemId} className="flex flex-col items-start text-[11px] text-[#FFE1CC]">
                <div
                  className={`flex items-center gap-2 rounded-full border border-[#F7BE8A]/25 bg-[#220907]/80 px-3 py-1 font-display font-semibold tracking-[0.08em] text-[10px] ${
                    isPending ? 'border-flux/60 text-flux' : 'text-[#FFD6B2]'
                  } ${
                    canToggle ? "cursor-pointer hover:border-flux/60" : ""
                  }`}
                  onClick={() => canToggle && toggleTranscriptItemExpand(itemId)}
                >
                  {pendingSpinner}
                  <span>Tool</span>
                  <span className="tracking-normal text-[#FFF0D7]">{title}</span>
                  {isPending && (
                    <span className="font-display text-[9px] font-semibold tracking-[0.08em] text-flux/80">
                      Working…
                    </span>
                  )}
                  {canToggle && (
                    <span
                      className={`ml-1 select-none text-[#F0BFA1] transition-transform duration-200 ${
                        expanded ? "rotate-90" : "rotate-0"
                      }`}
                    >
                      ▶
                    </span>
                  )}
                </div>
                {showDebugPayloads && expanded && hasDetails && (
                  <pre className="mt-2 w-full max-w-xl break-words whitespace-pre-wrap rounded-md border border-[#F7BE8A]/18 bg-[#1F0906]/85 px-3 py-2 text-[11px] font-mono text-[#FFEBD7]">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                )}
              </div>
            );
          } else if (type === "BREADCRUMB") {
            return (
              <div
                key={itemId}
                className="flex flex-col items-start justify-start text-sm text-[#F7D5C0]"
              >
                <span className="font-mono text-[10px] tracking-[0.08em] text-[#F1BFA0]">
                  {timestamp}
                </span>
                <div
                  className={`mt-1 flex items-center whitespace-pre-wrap font-mono text-xs text-[#FFE6D1] ${
                    data ? "cursor-pointer hover:text-flux" : ""
                  }`}
                  onClick={() => data && toggleTranscriptItemExpand(itemId)}
                >
                  {data && (
                    <span
                      className={`mr-1 select-none font-mono text-[#F0BFA1] transition-transform duration-200 ${
                        expanded ? "rotate-90" : "rotate-0"
                      }`}
                    >
                      ▶
                    </span>
                  )}
                  {title}
                </div>
                {expanded && data && (
                  <div className="text-left text-[#FFE6D1]">
                    <pre className="ml-1 mt-2 mb-2 break-words whitespace-pre-wrap rounded-md border border-[#F7BE8A]/18 bg-[#1F0906]/85 pl-3 text-[11px] font-mono text-[#FFEBD7]">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div
                key={itemId}
                className="flex justify-center font-mono text-xs italic text-[#F1BFA0]"
              >
                Unknown item type: {type} <span className="ml-2 text-[10px]">{timestamp}</span>
              </div>
            );
          }
        })}
    </div>
  );
}

export default TranscriptMessages;

function TypingIndicator() {
  const dotDelays = [0, 0.2, 0.4];

  return (
    <span
      className="inline-flex items-center gap-1"
      role="status"
      aria-label="Dexter is transcribing"
    >
      {dotDelays.map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 rounded-full bg-neutral-500/80 opacity-80 animate-pulse"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}
