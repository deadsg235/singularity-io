import type { TranscriptItem } from "../app/types";

let counter = 0;

export function makeToolNoteItem(title: string, data: Record<string, unknown>): TranscriptItem {
  const now = Date.now();
  return {
    itemId: `tool-${++counter}`,
    type: "TOOL_NOTE",
    role: "assistant",
    title,
    data,
    expanded: false,
    timestamp: new Date(now).toISOString(),
    createdAtMs: now,
    status: "DONE",
    isHidden: false,
  } satisfies TranscriptItem;
}
