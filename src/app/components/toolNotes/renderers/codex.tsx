"use client";

import React from "react";
import { LightningBoltIcon, ChatBubbleIcon, RocketIcon } from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  MetricItem
} from "./sleekVisuals";

type CodexPayload = {
  conversationId?: string;
  response?: {
    text?: string;
    reasoning?: string;
  };
  session?: {
    model?: string;
    reasoningEffort?: string;
  };
  durationMs?: number;
  tokenUsage?: Record<string, any>;
};

type CodexArgs = Record<string, unknown>;

type CodexKind = "start" | "reply" | "exec";

type InfoRow = {
  label: string;
  value: string;
};

// --- Syntax Highlighting Helpers ---

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", 
  "await", "async", "import", "export", "from", "try", "catch", "class", "interface", "type"
]);

const BUILTINS = new Set(["console", "log", "error", "warn", "Math", "JSON", "Promise", "React"]);

function SyntaxHighlighter({ code }: { code: string }) {
  if (!code) return null;

  const parts = code.split(/(\s+|[(){}\[\],.;:])/g);

  return (
    <>
      {parts.map((part, i) => {
        if (KEYWORDS.has(part)) {
          return <span key={i} className="text-pink-400 font-bold">{part}</span>;
        }
        if (BUILTINS.has(part)) {
          return <span key={i} className="text-sky-300">{part}</span>;
        }
        if (part.startsWith('"') || part.startsWith("'") || part.startsWith("`")) {
           return <span key={i} className="text-amber-300">{part}</span>;
        }
        if (part.match(/^[0-9]+$/)) {
           return <span key={i} className="text-violet-400">{part}</span>;
        }
        if (part.startsWith("//")) {
           return <span key={i} className="text-neutral-500 italic">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function createCodexRenderer(kind: CodexKind): ToolNoteRenderer {
  const statusLabel = kind === "start" ? "Session Started" : kind === "reply" ? "Reply Sent" : "Exec Run";
  const title = kind === "exec" ? "System Exec" : "Codex Session";
  const Icon = kind === "exec" ? LightningBoltIcon : kind === "start" ? RocketIcon : ChatBubbleIcon;

  const CodexRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
    const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
    const structured = unwrapStructured(rawOutput) as CodexPayload;
    const args = (item.data as any)?.arguments as CodexArgs | undefined;

    const conversationId = structured.conversationId ?? (typeof args?.conversation_id === "string" ? args.conversation_id : undefined);
    const message = structured.response?.text?.trim();
    const reasoning = structured.response?.reasoning?.trim();
    const model = structured.session?.model;
    const reasoningEffort = structured.session?.reasoningEffort;
    const durationMs = typeof structured.durationMs === "number" ? structured.durationMs : undefined;
    const tokenUsage = structured.tokenUsage;

    const timestamp = formatTimestampDisplay(item.timestamp);

    const infoRows: InfoRow[] = [];
    if (model) infoRows.push({ label: "MODEL", value: model });
    if (reasoningEffort) infoRows.push({ label: "EFFORT", value: reasoningEffort });
    if (durationMs !== undefined) infoRows.push({ label: "DURATION", value: `${(durationMs / 1000).toFixed(2)}s` });

    return (
      <SleekCard className="relative overflow-visible p-5 flex flex-col gap-5 bg-[#050505]">
        {/* Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0 opacity-10">
           <div className="w-full h-full bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.5)_51%)] bg-[length:100%_4px]" />
           <div className="absolute inset-0 animate-[scanline_8s_linear_infinite] bg-gradient-to-b from-transparent via-white/5 to-transparent h-[20%]" />
        </div>

        <header className="relative z-10 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${kind === 'exec' ? 'text-amber-400' : 'text-emerald-400'}`} />
              <SleekLabel>{title}</SleekLabel>
           </div>
           <div className="flex gap-3 items-center">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 border border-white/10 px-2 py-0.5 rounded-full">
                 {statusLabel}
              </span>
              {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
           </div>
        </header>

        {/* Metrics Grid */}
        {infoRows.length > 0 && (
           <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {infoRows.map((row) => (
                 <MetricItem key={row.label} label={row.label} value={row.value} />
              ))}
           </div>
        )}

        {/* Reasoning (No Container) */}
        {reasoning && (
           <div className="relative z-10 flex flex-col gap-2 font-mono text-xs pl-4 border-l-2 border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                 <SleekLabel>Reasoning Trail</SleekLabel>
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-emerald-400/80 leading-relaxed whitespace-pre-wrap">
                 {reasoning}
                 {/* Blinking Cursor */}
                 <span className="inline-block w-2 h-4 ml-1 bg-emerald-500/50 animate-pulse align-middle" />
              </p>
           </div>
        )}

        {/* Output (No Container - Matching Reasoning Style) */}
        {message && (
           <div className="relative z-10 flex flex-col gap-2 pl-4 border-l-2 border-white/10">
              <SleekLabel>Output</SleekLabel>
              <div className="text-sm text-neutral-300 font-mono leading-relaxed whitespace-pre-wrap">
                 <SyntaxHighlighter code={message} />
                 {/* Blinking Cursor */}
                 <span className="inline-block w-2 h-4 ml-1 bg-neutral-500/50 animate-pulse align-middle" />
              </div>
           </div>
        )}

        {/* Token Usage (Sleek Grid) */}
        {tokenUsage && (
           <div className="relative z-10 grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
              <MetricItem label="PROMPT" value={String(tokenUsage.prompt_tokens ?? 0)} />
              <MetricItem label="COMPLETION" value={String(tokenUsage.completion_tokens ?? 0)} />
              <MetricItem label="TOTAL" value={String(tokenUsage.total_tokens ?? 0)} />
           </div>
        )}

        {debug && (
          <details className="relative z-10 mt-2 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono">
            <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
          </details>
        )}
        
        <style jsx>{`
          @keyframes scanline {
            0% { top: -20%; }
            100% { top: 120%; }
          }
        `}</style>
      </SleekCard>
    );
  };

  (CodexRenderer as ToolNoteRenderer & { displayName?: string }).displayName = 
    kind === "start" ? "CodexStart" : kind === "reply" ? "CodexReply" : "CodexExec";

  return CodexRenderer;
}

export const codexStartRenderer = createCodexRenderer("start");
export const codexReplyRenderer = createCodexRenderer("reply");
export const codexExecRenderer = createCodexRenderer("exec");
