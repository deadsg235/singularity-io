import React from "react";

import pumpstreamRenderer from "../app/components/toolNotes/renderers/pumpstream";
import resolveWalletRenderer from "../app/components/toolNotes/renderers/walletResolve";
import walletListRenderer from "../app/components/toolNotes/renderers/walletList";
import walletOverrideRenderer from "../app/components/toolNotes/renderers/walletOverride";
import walletAuthRenderer from "../app/components/toolNotes/renderers/walletAuth";
import solanaBalancesRenderer from "../app/components/toolNotes/renderers/solanaBalances";
import solanaTokenRenderer from "../app/components/toolNotes/renderers/solanaToken";
import searchRenderer from "../app/components/toolNotes/renderers/search";
import fetchRenderer from "../app/components/toolNotes/renderers/fetch";
import { codexStartRenderer, codexReplyRenderer, codexExecRenderer } from "../app/components/toolNotes/renderers/codex";
import { streamGetSceneRenderer, streamSetSceneRenderer } from "../app/components/toolNotes/renderers/streamScene";
import { solanaSwapPreviewRenderer, solanaSwapExecuteRenderer } from "../app/components/toolNotes/renderers/solanaSwap";
import twitterSearchRenderer from "../app/components/toolNotes/renderers/twitterSearch";

import { ToolNoteStoryWrapper } from "./ToolNoteStoryWrapper";
import { makeToolNoteItem } from "./makeTranscriptItem";
import { toolFixtures } from "./fixtures";

type StoryConfig = {
  exportName: string;
  storyName: string;
  toolName: keyof typeof toolFixtures;
  renderer: Parameters<typeof ToolNoteStoryWrapper>[0]["renderer"];
  expanded?: boolean;
  debug?: boolean;
};

const stories: StoryConfig[] = [
  {
    exportName: "PumpstreamLiveSummary",
    storyName: "Pumpstream – Live Summary",
    toolName: "pumpstream_live_summary",
    renderer: pumpstreamRenderer,
  },
  {
    exportName: "ResolveWallet",
    storyName: "Wallet – Active Resolver",
    toolName: "resolve_wallet",
    renderer: resolveWalletRenderer,
  },
  {
    exportName: "ListWallets",
    storyName: "Wallet – Linked Wallets",
    toolName: "list_my_wallets",
    renderer: walletListRenderer,
  },
  {
    exportName: "WalletOverride",
    storyName: "Wallet – Session Override",
    toolName: "set_session_wallet_override",
    renderer: walletOverrideRenderer,
  },
  {
    exportName: "WalletAuth",
    storyName: "Wallet – Auth Diagnostics",
    toolName: "auth_info",
    renderer: walletAuthRenderer,
  },
  {
    exportName: "SolanaBalances",
    storyName: "Solana – Balances",
    toolName: "solana_list_balances",
    renderer: solanaBalancesRenderer,
  },
  {
    exportName: "SolanaToken",
    storyName: "Solana – Token Lookup",
    toolName: "solana_resolve_token",
    renderer: solanaTokenRenderer,
  },
  {
    exportName: "SearchResults",
    storyName: "Search",
    toolName: "search",
    renderer: searchRenderer,
  },
  {
    exportName: "FetchWebPage",
    storyName: "Fetch – Web Page",
    toolName: "fetch",
    renderer: fetchRenderer,
  },
  {
    exportName: "TwitterSearch",
    storyName: "Twitter Search",
    toolName: "twitter_topic_analysis",
    renderer: twitterSearchRenderer,
    expanded: true,
  },
  {
    exportName: "CodexStart",
    storyName: "Codex – Start Session",
    toolName: "codex_start",
    renderer: codexStartRenderer,
  },
  {
    exportName: "CodexReply",
    storyName: "Codex – Reply",
    toolName: "codex_reply",
    renderer: codexReplyRenderer,
  },
  {
    exportName: "CodexExec",
    storyName: "Codex – Exec",
    toolName: "codex_exec",
    renderer: codexExecRenderer,
  },
  {
    exportName: "StreamGetScene",
    storyName: "Stream – Current Scene",
    toolName: "stream_get_scene",
    renderer: streamGetSceneRenderer,
  },
  {
    exportName: "StreamSetScene",
    storyName: "Stream – Set Scene",
    toolName: "stream_set_scene",
    renderer: streamSetSceneRenderer,
  },
  {
    exportName: "SolanaSwapPreview",
    storyName: "Solana – Swap Preview",
    toolName: "solana_swap_preview",
    renderer: solanaSwapPreviewRenderer,
    expanded: true,
  },
  {
    exportName: "SolanaSwapExecute",
    storyName: "Solana – Swap Execute",
    toolName: "solana_swap_execute",
    renderer: solanaSwapExecuteRenderer,
    expanded: true,
  },
];

const makeStory = ({ renderer, toolName, storyName, expanded, debug }: StoryConfig) => {
  const StoryComponent = () => (
    <ToolNoteStoryWrapper
      renderer={renderer}
      item={makeToolNoteItem(toolName, toolFixtures[toolName])}
      expanded={expanded}
      debug={debug}
    />
  );
  StoryComponent.storyName = storyName;
  return StoryComponent;
};

const storyExports: Record<string, React.FC> = {};
for (const config of stories) {
  storyExports[config.exportName] = makeStory(config);
}

const meta = {
  title: "Tool Notes",
};

export default meta;

export const PumpstreamLiveSummary = storyExports.PumpstreamLiveSummary;
export const ResolveWallet = storyExports.ResolveWallet;
export const ListWallets = storyExports.ListWallets;
export const WalletOverride = storyExports.WalletOverride;
export const WalletAuth = storyExports.WalletAuth;
export const SolanaBalances = storyExports.SolanaBalances;
export const SolanaToken = storyExports.SolanaToken;
export const SearchResults = storyExports.SearchResults;
export const FetchWebPage = storyExports.FetchWebPage;
export const TwitterSearch = storyExports.TwitterSearch;
export const CodexStart = storyExports.CodexStart;
export const CodexReply = storyExports.CodexReply;
export const CodexExec = storyExports.CodexExec;
export const StreamGetScene = storyExports.StreamGetScene;
export const StreamSetScene = storyExports.StreamSetScene;
export const SolanaSwapPreview = storyExports.SolanaSwapPreview;
export const SolanaSwapExecute = storyExports.SolanaSwapExecute;
