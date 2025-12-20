import React from "react";
import "../app/globals.css";
import { activeThemeVariables } from "../theme/palette";
import type { ToolNoteRenderer } from "../app/components/toolNotes/renderers/types";
import type { TranscriptItem } from "../app/types";

type Props = {
  renderer: ToolNoteRenderer;
  item: TranscriptItem;
  debug?: boolean;
  expanded?: boolean;
};

export function ToolNoteStoryWrapper({ renderer, item, debug = false, expanded = false }: Props) {
  return (
    <div
      style={activeThemeVariables}
      className="min-h-screen bg-[#0E0503] p-8 font-body text-foreground"
    >
      <div className="max-w-3xl space-y-6">
        {renderer({
          item,
          debug,
          isExpanded: expanded,
          onToggle: () => {},
        })}
      </div>
    </div>
  );
}
