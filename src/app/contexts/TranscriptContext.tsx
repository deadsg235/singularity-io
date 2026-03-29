"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  FC,
  PropsWithChildren,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { TranscriptItem } from "@/app/types";

declare global {
  interface Window {
    __DEXTER_TRANSCRIPT_ITEMS__?: TranscriptItem[];
  }
}

type TranscriptContextValue = {
  transcriptItems: TranscriptItem[];
  addTranscriptMessage: (
    itemId: string,
    role: "user" | "assistant",
    text: string,
    isHidden?: boolean,
  ) => void;
  updateTranscriptMessage: (itemId: string, text: string, isDelta: boolean) => void;
  addTranscriptBreadcrumb: (title: string, data?: Record<string, any>) => void;
  addTranscriptToolNote: (
    toolName: string,
    data?: Record<string, any>,
    options?: { itemId?: string; status?: 'IN_PROGRESS' | 'DONE' }
  ) => void;
  toggleTranscriptItemExpand: (itemId: string) => void;
  updateTranscriptItem: (itemId: string, updatedProperties: Partial<TranscriptItem>) => void;
};

const TranscriptContext = createContext<TranscriptContextValue | undefined>(undefined);

export const TranscriptProvider: FC<PropsWithChildren> = ({ children }) => {
  if (typeof window !== "undefined" && !window.__DEXTER_TRANSCRIPT_ITEMS__) {
    window.__DEXTER_TRANSCRIPT_ITEMS__ = [];
  }

  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__DEXTER_TRANSCRIPT_ITEMS__ = transcriptItems;
    }
  }, [transcriptItems]);

  function newTimestampPretty(): string {
    const now = new Date();
    return now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  const addTranscriptMessage: TranscriptContextValue["addTranscriptMessage"] = (itemId, role, text = "", isHidden = false) => {
    setTranscriptItems((prev) => {
      if (prev.some((log) => log.itemId === itemId && log.type === "MESSAGE")) {
        if (process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === 'true') {
          console.warn(`[addTranscriptMessage] skipping; message already exists for itemId=${itemId}, role=${role}, text=${text}`);
        }
        return prev;
      }

      const newItem: TranscriptItem = {
        itemId,
        type: "MESSAGE",
        role,
        title: text,
        expanded: false,
        timestamp: newTimestampPretty(),
        createdAtMs: Date.now(),
        status: "IN_PROGRESS",
        isHidden,
      };

      return [...prev, newItem];
    });
  };

  const normalizePlaceholder = (text: string | undefined | null) => {
    if (!text) return '';
    return text.replace(/\u2026/g, '...').trim().toLowerCase();
  };

  const updateTranscriptMessage: TranscriptContextValue["updateTranscriptMessage"] = (itemId, newText, append = false) => {
    setTranscriptItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId && item.type === "MESSAGE") {
          const currentTitle = item.title ?? "";
          const normalized = normalizePlaceholder(currentTitle);
          const isPlaceholder =
            normalized === "[transcribing...]" ||
            normalized === "..." ||
            normalized === "…";
          const nextTitle = append
            ? (isPlaceholder || !currentTitle ? newText : currentTitle + newText)
            : newText;
          return {
            ...item,
            title: nextTitle,
          };
        }
        return item;
      })
    );
  };

  const addTranscriptBreadcrumb: TranscriptContextValue["addTranscriptBreadcrumb"] = (title, data) => {
    setTranscriptItems((prev) => [
      ...prev,
      {
        itemId: `breadcrumb-${uuidv4()}`,
        type: "BREADCRUMB",
        title,
        data,
        expanded: false,
        timestamp: newTimestampPretty(),
        createdAtMs: Date.now(),
        status: "DONE",
        isHidden: false,
      },
    ]);
  };

  const addTranscriptToolNote: TranscriptContextValue['addTranscriptToolNote'] = (toolName, data, options) => {
    const providedId = options?.itemId;
    const status = options?.status ?? 'DONE';
    const newId = providedId && providedId.trim().length > 0 ? providedId : `tool-${uuidv4()}`;
    setTranscriptItems((prev) => [
      ...prev,
      {
        itemId: newId,
        type: 'TOOL_NOTE',
        role: 'assistant',
        title: toolName,
        data,
        expanded: false,
        timestamp: newTimestampPretty(),
        createdAtMs: Date.now(),
        status,
        isHidden: false,
      },
    ]);
  };

  const toggleTranscriptItemExpand: TranscriptContextValue["toggleTranscriptItemExpand"] = (itemId) => {
    setTranscriptItems((prev) =>
      prev.map((log) =>
        log.itemId === itemId ? { ...log, expanded: !log.expanded } : log
      )
    );
  };

  const updateTranscriptItem: TranscriptContextValue["updateTranscriptItem"] = (itemId, updatedProperties) => {
    setTranscriptItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, ...updatedProperties } : item
      )
    );
  };

  return (
    <TranscriptContext.Provider
      value={{
        transcriptItems,
        addTranscriptMessage,
        updateTranscriptMessage,
        addTranscriptBreadcrumb,
        addTranscriptToolNote,
        toggleTranscriptItemExpand,
        updateTranscriptItem,
      }}
    >
      {children}
    </TranscriptContext.Provider>
  );
};

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (!context) {
    throw new Error("useTranscript must be used within a TranscriptProvider");
  }
  return context;
}
