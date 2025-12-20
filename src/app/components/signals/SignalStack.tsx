"use client";

import React from "react";
import type { ToolCatalogEntry } from "@/app/hooks/useToolCatalog";

interface ToolCatalogSnapshot {
  tools: ToolCatalogEntry[];
  loading: boolean;
  error: string | null;
  source: "live" | "cache" | "none";
  lastUpdated: Date | null;
  refresh: () => void;
}

export interface SignalStackProps {
  toolCatalog: ToolCatalogSnapshot;
  renderLogs: (options: { isExpanded: boolean }) => React.ReactNode;
  showLogs: boolean;
}

const STORAGE_KEY_TOOLS_EXPANDED = "dexter:toolsExpanded";
const STORAGE_KEY_LOGS_EXPANDED = "dexter:logsExpanded";

export function SignalStack({ toolCatalog, renderLogs, showLogs }: SignalStackProps) {
  const [isToolsExpanded, setIsToolsExpanded] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY_TOOLS_EXPANDED);
    return stored ? stored === "true" : true;
  });

  const [isLogsExpanded, setIsLogsExpanded] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(STORAGE_KEY_LOGS_EXPANDED);
    return stored ? stored === "true" : false;
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_TOOLS_EXPANDED, isToolsExpanded.toString());
    }
  }, [isToolsExpanded]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_LOGS_EXPANDED, isLogsExpanded.toString());
    }
  }, [isLogsExpanded]);

  const renderToolCatalog = () => {
    if (toolCatalog.error) {
      return (
        <div className="rounded-md border border-accent-critical/40 bg-accent-critical/10 px-3 py-2 text-xs text-accent-critical">
          {toolCatalog.error}
        </div>
      );
    }

    if (!toolCatalog.tools.length && !toolCatalog.loading) {
      return (
        <div className="rounded-md border border-dashed border-neutral-800/60 bg-surface-glass/40 px-4 py-5 text-center text-xs text-neutral-500">
          No tools reported. Try refreshing or check MCP status.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 text-sm text-neutral-200">
        {toolCatalog.tools.map((tool) => (
          <div
            key={tool.name}
            className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-1"
            title={tool.description}
          >
            <span className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-200">
              {tool.name}
            </span>
            <span className="rounded-pill border border-neutral-700/60 bg-neutral-900/70 px-2 py-0.5 font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-400">
              {tool.access}
            </span>
            {tool.tags.map((tag) => (
              <span
                key={`${tool.name}-${tag}`}
                className="rounded-pill border border-neutral-700/40 bg-neutral-900/60 px-2 py-0.5 font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-500"
              >
                {tag}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderToolHeaderMeta = () => {
    if (toolCatalog.loading) {
      return "Refreshing…";
    }
    if (toolCatalog.lastUpdated) {
      return `Updated ${toolCatalog.lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return `${toolCatalog.tools.length} listed`;
  };

  return (
    <>
      <section className="rounded-lg border border-neutral-800/60 bg-surface-base/85 p-4 shadow-inner-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-semibold tracking-[0.28em] text-neutral-400">
              Available Tools
            </h3>
            <span className="rounded-pill border border-neutral-800/60 bg-surface-glass/60 px-2 py-0.5 font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-300">
              {toolCatalog.tools.length}
            </span>
            {toolCatalog.source === "cache" && (
              <span className="rounded-pill border border-accent-warning/40 bg-accent-warning/10 px-2 py-0.5 font-display text-[10px] font-semibold tracking-[0.08em] text-accent-warning">
                Cached
              </span>
            )}
            {toolCatalog.source === "live" && (
              <span className="rounded-pill border border-flux/40 bg-flux/10 px-2 py-0.5 font-display text-[10px] font-semibold tracking-[0.08em] text-flux">
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{renderToolHeaderMeta()}</span>
            <button
              type="button"
              onClick={toolCatalog.refresh}
              className="rounded-md border border-neutral-800/60 px-2 py-0.5 font-display text-[11px] font-semibold tracking-[0.08em] text-neutral-300 transition hover:border-flux/50 hover:text-flux"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div
            className={`relative overflow-hidden rounded-lg transition-all duration-300 ${
              isToolsExpanded ? "max-h-96 overflow-y-auto" : "max-h-48"
            }`}
          >
            <div className="space-y-2">
              {renderToolCatalog()}
            </div>

            {!isToolsExpanded && toolCatalog.tools.length > 0 && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-24 items-end justify-center bg-gradient-fade-dark pb-3">
                <button
                  type="button"
                  onClick={() => setIsToolsExpanded(true)}
                  className="pointer-events-auto rounded-full border-none bg-transparent px-4 py-2 font-display text-xs font-semibold tracking-[0.08em] text-foreground transition hover:-translate-y-0.5"
                >
                  Show all tools
                </button>
              </div>
            )}
          </div>

          {toolCatalog.tools.length > 0 && isToolsExpanded && (
            <div className="flex items-end justify-center pb-2 pt-2">
              <button
                type="button"
                onClick={() => setIsToolsExpanded(false)}
                className="rounded-full border-none bg-transparent px-4 py-2 font-display text-xs font-semibold tracking-[0.08em] text-foreground transition hover:-translate-y-0.5"
              >
                Collapse tools
              </button>
            </div>
          )}
        </div>
      </section>

      {showLogs && (
        <section className="mt-4 rounded-lg border border-neutral-800/60 bg-surface-base/85 p-4 shadow-inner-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold tracking-[0.28em] text-neutral-400">
              Event Logs
            </h3>
            <button
              type="button"
              onClick={() => setIsLogsExpanded((prev) => !prev)}
              className="rounded-md border border-neutral-800/60 px-2 py-0.5 font-display text-[11px] font-semibold tracking-[0.08em] text-neutral-300 transition hover:border-flux/50 hover:text-flux"
            >
              {isLogsExpanded ? "Hide" : "Show"}
            </button>
          </div>
          <div className="mt-3">
            <div
              className={`relative overflow-hidden rounded-lg transition-all duration-300 ${
                isLogsExpanded ? "max-h-96 overflow-y-auto" : "max-h-40"
              }`}
            >
              {renderLogs({ isExpanded: isLogsExpanded })}
              {!isLogsExpanded && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-20 items-end justify-center bg-gradient-fade-dark pb-3">
                  <span className="pointer-events-auto rounded-full border-none bg-transparent px-4 py-1 font-display text-[11px] font-semibold tracking-[0.08em] text-neutral-500">
                    Logs hidden
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default SignalStack;
