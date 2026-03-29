import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Badge,
  type Card,
  type ListView,
  type ListViewItem,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";

type Alignment = "start" | "center" | "end" | "stretch";

type ScenePayload = {
  scene?: string;
  updatedAt?: string;
  scenes?: Array<string | Record<string, unknown>>;
};

type SceneSetPayload = {
  scene?: string;
  updatedAt?: string;
};

type SceneArgs = {
  scene?: string;
};

const streamGetSceneRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as ScenePayload;

  const activeScene = payload.scene ?? null;
  const updatedAt = payload.updatedAt ?? null;
  const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
  const timestampDisplay = formatTimestampDisplay(item.timestamp);
  const updatedDisplay = formatTimestampDisplay(updatedAt ?? undefined);

  const headerCard: Card = {
    type: "Card",
    id: "stream-scene-header",
    children: [
      {
        type: "Row",
        justify: "between",
        align: "center",
        children: [
          {
            type: "Col",
            gap: 4,
            children: [
              { type: "Title", value: "Current Stream Scene", size: "md" },
              timestampDisplay ? { type: "Caption", value: timestampDisplay, size: "xs" } : undefined,
            ].filter(Boolean) as ChatKitWidgetComponent[],
          },
          updatedDisplay
            ? ({ type: "Badge", label: `Updated ${updatedDisplay}`, color: "secondary", variant: "outline" } as Badge)
            : undefined,
        ].filter(Boolean) as ChatKitWidgetComponent[],
      },
    ],
  };

  const widgets: Array<Card | ListView> = [
    headerCard,
    {
      type: "Card",
      id: "stream-scene-active",
      children: [
        {
          type: "Col",
          gap: 6,
          children: [
            { type: "Caption", value: "Active scene", size: "xs" },
            activeScene
              ? { type: "Text", value: activeScene, size: "sm" }
              : { type: "Text", value: "No active scene reported.", size: "sm" },
          ],
        },
      ],
    },
  ];

  if (scenes.length) {
    widgets.push({
      type: "Card",
      id: "stream-scene-list",
      children: [{ type: "Caption", value: "Available scenes", size: "xs" }],
    });
    widgets.push({
      type: "ListView",
      id: "scene-list",
      children: scenes.map((scene, index): ListViewItem => ({
        type: "ListViewItem",
        id: typeof scene === "string" ? scene : `scene-${index}`,
        children: [
          {
            type: "Text",
            value: typeof scene === "string" ? scene : JSON.stringify(scene),
            size: "sm",
          },
        ],
      })),
    });
  } else {
    widgets.push({
      type: "Card",
      id: "stream-scene-list-empty",
      children: [{ type: "Text", value: "Scene list unavailable.", size: "sm" }],
    });
  }

  return renderWithDebug(widgets, rawOutput, isExpanded, onToggle, debug);
};

const streamSetSceneRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const result = unwrapStructured(rawOutput) as SceneSetPayload;
  const args = (item.data as any)?.arguments as SceneArgs | undefined;

  const requestedScene = args?.scene ?? null;
  const updatedScene = result.scene ?? null;
  const updatedAt = result.updatedAt ?? null;
  const timestampDisplay = formatTimestampDisplay(item.timestamp);
  const updatedDisplay = formatTimestampDisplay(updatedAt ?? undefined);

  const statusLabel = updatedScene ? `Switched to ${updatedScene}` : "Scene update acknowledged";

  const headerCard: Card = {
    type: "Card",
    id: "stream-set-scene-header",
    children: [
      {
        type: "Row",
        justify: "between",
        align: "center",
        children: [
          {
            type: "Col",
            gap: 4,
            children: [
              { type: "Title", value: "Set Stream Scene", size: "md" },
              timestampDisplay ? { type: "Caption", value: timestampDisplay, size: "xs" } : undefined,
            ].filter(Boolean) as ChatKitWidgetComponent[],
          },
          { type: "Badge", label: statusLabel, color: "success", variant: "outline" } as Badge,
        ],
      },
    ],
  };

  const rows: ChatKitWidgetComponent[] = [];
  if (requestedScene) {
    rows.push(buildRow("Requested", requestedScene));
  }
  if (updatedScene) {
    rows.push(buildRow("Active", updatedScene));
  }
  if (updatedDisplay) {
    rows.push(buildRow("Updated", updatedDisplay));
  }

  const bodyCard: Card = {
    type: "Card",
    id: "stream-set-scene-body",
    children: [{ type: "Col", gap: 8, children: rows.length ? rows : [{ type: "Text", value: "No scene information returned.", size: "sm" }] }],
  };

  const widgets: Card[] = [headerCard, bodyCard];
  return renderWithDebug(widgets, rawOutput, isExpanded, onToggle, debug);
};

function buildRow(label: string, value: string): ChatKitWidgetComponent {
  return {
    type: "Row",
    justify: "between",
    align: "center" as Alignment,
    children: [
      { type: "Caption", value: label, size: "xs" },
      { type: "Text", value, size: "sm" },
    ],
  };
}

function renderWithDebug(
  widgets: Array<Card | ListView>,
  rawOutput: unknown,
  isExpanded: boolean,
  onToggle: () => void,
  debug?: boolean,
) {
  return (
    <div className={BASE_CARD_CLASS}>
      <ChatKitWidgetRenderer widgets={widgets} />
      {debug && (
        <details className="mt-4 border-t border-[#F7BE8A]/22 pt-3" open={isExpanded}>
          <summary
            className="cursor-pointer font-display text-xs font-semibold tracking-[0.08em] text-[#F9D9C3] transition hover:text-[#FFF2E2]"
            onClick={(event) => {
              event.preventDefault();
              onToggle();
            }}
          >
            {isExpanded ? "Hide raw payload" : "Show raw payload"}
          </summary>
          {isExpanded && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[11px] text-[#FFF2E2]">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          )}
        </details>
      )}
    </div>
  );
}

export { streamGetSceneRenderer, streamSetSceneRenderer };
