import type { ToolNoteRenderer } from "./types";
import pumpstreamRenderer from "./pumpstream";
import resolveWalletRenderer from "./walletResolve";
import walletListRenderer from "./walletList";
import walletOverrideRenderer from "./walletOverride";
import walletAuthRenderer from "./walletAuth";
import solanaBalancesRenderer from "./solanaBalances";
import solanaResolveTokenRenderer from "./solanaToken";
import searchRenderer from "./search";
import fetchRenderer from "./fetch";
import { codexStartRenderer, codexReplyRenderer, codexExecRenderer } from "./codex";
import { streamGetSceneRenderer, streamSetSceneRenderer } from "./streamScene";
import { solanaSwapPreviewRenderer, solanaSwapExecuteRenderer } from "./solanaSwap";
import twitterSearchRenderer from "./twitterSearch";
import { BASE_CARD_CLASS, formatTimestampDisplay, normalizeOutput } from "./helpers";

const streamPublicShoutRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const structured =
    (normalized as any).structured_content ??
    (normalized as any).structuredContent ??
    normalized;
  const shout = structured?.shout ?? structured;
  const alias =
    typeof shout?.alias === "string" && shout.alias.trim().length > 0
      ? shout.alias.trim()
      : null;
  const message =
    (typeof shout?.message === "string" && shout.message.trim().length > 0 ? shout.message.trim() : null) ??
    (typeof (shout as any)?.text === "string" && (shout as any).text.trim().length > 0 ? (shout as any).text.trim() : null) ??
    null;
  const expiresRaw = shout?.expires_at ?? shout?.expiresAt;
  const expiresDisplay = expiresRaw ? formatTimestampDisplay(expiresRaw) : null;

  const feed = Array.isArray(structured?.shouts)
    ? structured.shouts
    : Array.isArray(shout?.shouts)
      ? shout.shouts
      : null;

  if (feed) {
    return (
      <div className="flex flex-col gap-2">
        <div className="font-medium text-sm text-neutral-300">Recent stream shouts</div>
        <ul className="flex flex-col gap-2">
          {feed.map((entry: any) => (
            <li
              key={entry?.id || entry?.created_at || `${Math.random()}`}
              className={`${BASE_CARD_CLASS} text-sm text-neutral-200`}
            >
              {entry?.message || "—"}
              <div className="mt-1 text-xs text-neutral-500">
                {entry?.alias ? entry.alias : "Anonymous"}
                {entry?.expires_at ? ` · ${formatTimestampDisplay(entry.expires_at)}` : null}
              </div>
            </li>
          ))}
        </ul>
        {debug ? (
          <details className="mt-2 text-xs text-neutral-500" open>
            <summary className="cursor-pointer text-[11px] uppercase tracking-[0.22em] text-neutral-400">
              Raw shout feed payload
            </summary>
            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-neutral-800/40 bg-neutral-950/60 p-3 text-[11px] leading-tight text-neutral-300">
              {JSON.stringify(structured, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={BASE_CARD_CLASS}>
        <div className="text-sm text-neutral-100">{message || "Shout submitted."}</div>
        <div className="mt-1 text-xs text-neutral-500">
          {alias ? `Alias: ${alias}` : "Alias: (auto-generated)"}
          {expiresDisplay ? ` · ${expiresDisplay}` : null}
        </div>
      </div>
      {debug ? (
        <details className="mt-2 text-xs text-neutral-500" open>
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.22em] text-neutral-400">
            Raw shout payload
          </summary>
          <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-neutral-800/40 bg-neutral-950/60 p-3 text-[11px] leading-tight text-neutral-300">
            {JSON.stringify(structured, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
};

const TOOL_NOTE_RENDERERS: Record<string, ToolNoteRenderer> = {
  pumpstream_live_summary: pumpstreamRenderer,
  resolve_wallet: resolveWalletRenderer,
  list_my_wallets: walletListRenderer,
  set_session_wallet_override: walletOverrideRenderer,
  auth_info: walletAuthRenderer,
  solana_list_balances: solanaBalancesRenderer,
  solana_resolve_token: solanaResolveTokenRenderer,
  search: searchRenderer,
  fetch: fetchRenderer,
  codex_start: codexStartRenderer,
  codex_reply: codexReplyRenderer,
  codex_exec: codexExecRenderer,
  stream_get_scene: streamGetSceneRenderer,
  stream_set_scene: streamSetSceneRenderer,
  solana_swap_preview: solanaSwapPreviewRenderer,
  solana_swap_execute: solanaSwapExecuteRenderer,
  twitter_topic_analysis: twitterSearchRenderer,
  stream_public_shout: streamPublicShoutRenderer,
  stream_shout_feed: streamPublicShoutRenderer,
};

export function getToolNoteRenderer(toolName?: string | null): ToolNoteRenderer | undefined {
  if (!toolName) return undefined;
  const key = toolName.trim().toLowerCase();
  return TOOL_NOTE_RENDERERS[key];
}

export type { ToolNoteRenderer, ToolNoteRendererProps } from "./types";
