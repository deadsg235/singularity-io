"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { LoggedEvent } from "@/app/types";

export interface EventsProps {
  isExpanded: boolean;
}

function Events({ isExpanded }: EventsProps) {
  const [prevEventLogs, setPrevEventLogs] = useState<LoggedEvent[]>([]);
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);

  const { loggedEvents, toggleExpand } = useEvent();

  const getDirectionArrow = (direction: string) => {
    if (direction === "client") return { symbol: "▲", className: "text-primary-bright" };
    if (direction === "server") return { symbol: "▼", className: "text-flux" };
    return { symbol: "•", className: "text-neutral-400" };
  };

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;

    if (isExpanded && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop =
        eventLogsContainerRef.current.scrollHeight;
    }

    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded]);

  if (!isExpanded) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-xs text-neutral-600">
        Logs are hidden
      </div>
    );
  }

  return (
    <div
      ref={eventLogsContainerRef}
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto">
        {loggedEvents.length === 0 ? (
          <div className="flex h-full items-center justify-center py-8 text-xs text-neutral-600">
            None
          </div>
        ) : (
          loggedEvents.map((log, idx) => {
            const arrowInfo = getDirectionArrow(log.direction);
            const isError =
              log.eventName.toLowerCase().includes("error") ||
              log.eventData?.response?.status_details?.error != null;

            return (
              <div
                key={`${log.id}-${idx}`}
                className="border-t border-neutral-800/40 px-5 py-3 font-mono text-xs text-neutral-300 transition hover:bg-surface-glass/40"
              >
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="flex cursor-pointer items-center justify-between gap-4"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <span className={arrowInfo.className}>{arrowInfo.symbol}</span>
                    <span className={`flex-1 ${isError ? "text-accent-critical" : "text-neutral-200"}`}>
                      {log.eventName}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500">{log.timestamp}</div>
                </div>

                {log.expanded && log.eventData && (
                  <div className="mt-2 text-left text-[11px] text-neutral-300">
                    <pre className="whitespace-pre-wrap break-words rounded-md border border-neutral-800/40 bg-surface-glass/40 p-3 text-[11px] text-neutral-200">
                      {JSON.stringify(log.eventData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Events;
