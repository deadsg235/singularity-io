import type { TranscriptItem } from "@/app/types";

export interface ToolNoteRendererProps {
  item: TranscriptItem;
  isExpanded: boolean;
  onToggle: () => void;
  debug?: boolean;
}

export type ToolNoteRenderer = (props: ToolNoteRendererProps) => React.ReactNode;
