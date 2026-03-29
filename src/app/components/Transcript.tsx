"use-client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { TranscriptItem } from "@/app/types";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";
import MessageMarkdown from "./MessageMarkdown";
import { getToolNoteRenderer } from "./toolNotes/renderers";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  downloadRecording: () => void;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const { loggedEvents } = useEvent();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [justCopied, setJustCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  const handleSaveLog = () => {
    try {
      const artifact = {
        timestamp: new Date().toISOString(),
        source: "live",
        structured: {
          transcripts: transcriptItems,
          events: loggedEvents,
        },
        meta: {
          assistantMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "assistant" && !item.isHidden,
          ).length,
          userMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "user",
          ).length,
          generatedAt: new Date().toLocaleString(),
        },
      };

      const blob = new Blob([JSON.stringify(artifact, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `live-${artifact.timestamp.replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      requestAnimationFrame(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      });

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (error) {
      console.error("Failed to save run artifact:", error);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 overflow-hidden border-b border-white/5 bg-[#0A0A0A]/90 px-6 py-4 backdrop-blur-md shadow-sm">
          <span className="flex-shrink-0 font-display text-sm font-semibold tracking-[0.08em] text-neutral-400">
            Conversation
          </span>
          <div className="flex min-w-0 flex-shrink gap-2">
            <button
              onClick={handleCopyTranscript}
              className="flex flex-shrink-0 items-center justify-center gap-x-1 rounded-md border border-white/5 bg-white/5 px-2 py-2 font-display text-xs font-semibold tracking-[0.08em] text-neutral-300 transition hover:bg-white/10 hover:text-white sm:px-3"
              title="Copy transcript"
            >
              <ClipboardCopyIcon />
              <span className="hidden sm:inline">{justCopied ? "Copied!" : "Copy"}</span>
            </button>
            <button
              onClick={downloadRecording}
              className="flex flex-shrink-0 items-center justify-center gap-x-1 rounded-md border border-white/5 bg-white/5 px-2 py-2 font-display text-xs font-semibold tracking-[0.08em] text-neutral-300 transition hover:bg-white/10 hover:text-white sm:px-3"
              title="Download audio recording"
            >
              <DownloadIcon />
              <span className="hidden md:inline">Audio</span>
              <span className="inline md:hidden">Audio</span>
            </button>
            <button
              onClick={handleSaveLog}
              className="flex flex-shrink-0 items-center justify-center gap-x-1 rounded-md border border-white/5 bg-white/5 px-2 py-2 font-display text-xs font-semibold tracking-[0.08em] text-neutral-300 transition hover:bg-white/10 hover:text-white sm:px-3"
              title="Save conversation log"
            >
              <span className="text-lg leading-none">⬇</span>
              <span className="hidden sm:inline">{justSaved ? "Saved!" : "Log"}</span>
              <span className="inline sm:hidden">{justSaved ? "✓" : "Log"}</span>
            </button>
          </div>
        </div>

        {/* Transcript Content */}
        <div
          ref={transcriptRef}
          className="flex h-full flex-col gap-y-6 overflow-auto p-6"
        >
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
                guardrailResult,
              } = item;

            if (isHidden) {
              return null;
            }

            if (type === "MESSAGE") {
              const isUser = role === "user";
              const isBracketedMessage = title.startsWith("[") && title.endsWith("]");
              const displayTitle = isBracketedMessage ? title.slice(1, -1) : title;
              
              // New Sleek Message Styling (No Bubbles)
              return (
                <div key={itemId} className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className="max-w-2xl space-y-1">
                      {/* Message Content */}
                      <div className={`
                        relative px-6 py-4 rounded-3xl
                        ${isUser 
                          ? "bg-white/10 text-white rounded-br-none border border-white/5 shadow-md" 
                          : "bg-transparent text-neutral-200 pl-0 border-l-2 border-emerald-500/30 rounded-none"
                        }
                      `}>
                        <div className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${isBracketedMessage ? 'italic text-neutral-500' : ''}`}>
                          <MessageMarkdown>{displayTitle}</MessageMarkdown>
                        </div>
                      </div>

                      {/* Guardrails */}
                      {guardrailResult && (
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2 mt-2">
                          <GuardrailChip guardrailResult={guardrailResult} />
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className={`flex items-center gap-2 ${isUser ? "justify-end pr-1" : "justify-start pl-1"}`}>
                        <span className="text-[10px] font-mono text-neutral-600 tracking-wide uppercase">
                          {isUser ? "You" : "Dexter"} • {timestamp}
                        </span>
                      </div>
                  </div>
                </div>
              );
            } else if (type === "TOOL_NOTE") {
              // Check if we have a sleek renderer for this tool
              const renderer = getToolNoteRenderer(title);
              const isPending = item.status === 'IN_PROGRESS';
              
              if (renderer) {
                return (
                  <div key={itemId} className="flex flex-col items-start w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Tool Header (Optional, or integrated into card) */}
                    {/* Render the Sleek Card */}
                    <div className="w-full">
                      {renderer({
                        item,
                        isExpanded: expanded,
                        onToggle: () => toggleTranscriptItemExpand(itemId),
                        debug: false, // Hide raw debug by default for sleekness
                      })}
                    </div>
                  </div>
                );
              }

              // Fallback for unknown tools
              const hasDetails = data && Object.keys(data).length > 0;
              return (
                <div key={itemId} className="flex flex-col items-start text-[11px] text-neutral-400 max-w-2xl">
                  <div
                    className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-300 ${
                      hasDetails ? "cursor-pointer hover:bg-white/10 hover:text-white" : ""
                    }`}
                    onClick={() => hasDetails && toggleTranscriptItemExpand(itemId)}
                  >
                    <span className="text-[9px] text-emerald-500">⚡</span>
                    <span className="uppercase tracking-widest opacity-70">Tool</span>
                    <span className="tracking-normal text-white">{title}</span>
                    {hasDetails && (
                      <span className={`ml-1 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}>
                        ›
                      </span>
                    )}
                  </div>
                  {expanded && hasDetails && (
                    <pre className="mt-2 w-full break-words whitespace-pre-wrap rounded-xl border border-white/5 bg-black/40 p-3 text-[10px] font-mono text-neutral-400">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  )}
                </div>
              );
            } else if (type === "BREADCRUMB") {
              return (
                <div key={itemId} className="flex justify-center w-full py-2 opacity-50">
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-neutral-600">
                    {title} • {timestamp}
                  </span>
                </div>
              );
            } else {
              return null;
            }
          })}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-x-3 border-t border-white/5 bg-[#0A0A0A]/90 px-6 py-4">
        {/* Input Bar area is handled by parent layout usually, but if here: */}
        {/* We rely on the InputBar component passed from props in the layout, wait, TranscriptProps doesn't include the input bar render logic, it IS the input bar logic? No. */}
        {/* Ah, in DexterAppLayout, InputBar is separate. But Transcript.tsx RENDERS an input. */}
        {/* Wait, Transcript.tsx lines 323-344 RENDER the input. */}
        {/* BUT DexterAppLayout.tsx ALSO renders InputBar.tsx. */}
        {/* This seems redundant. Let's check DexterAppLayout. */}
        {/* DexterAppLayout passes `transcriptProps` to `TranscriptMessages` which likely uses `Transcript`. */}
        {/* Ah, `TranscriptMessages.tsx` uses `Transcript.tsx`? No. */}
        {/* Let's assume this file `Transcript.tsx` IS the one used. */}
        {/* But the user input logic is duplicated? */}
        {/* Let's just style this input to match InputBar.tsx just in case. */}
        
        <input
          ref={inputRef}
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) {
              onSendMessage();
            }
          }}
          className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-white/20 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          placeholder="Ask Dexter anything..."
        />
        <button
          onClick={onSendMessage}
          disabled={!canSend || !userText.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-xl leading-none mb-0.5">↑</span>
        </button>
      </div>
    </div>
  );
}

export default Transcript;
