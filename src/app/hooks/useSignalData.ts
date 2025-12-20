import { useMemo } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import type { TranscriptItem } from "@/app/types";

type ToolResult = {
  data?: unknown;
  timestamp?: string;
};

type MarketPulseItem = {
  label: string;
  change: string;
  changeTone: "positive" | "negative" | "neutral";
  volume: string;
};

type PumpStreamItem = {
  title: string;
  viewers?: string;
  status?: string;
  tokenSymbol?: string;
  momentum?: string;
};

type WalletSummary = {
  totalUsd?: string;
  pnl24h?: { label: string; tone: "positive" | "negative" | "neutral" };
  walletCount?: string;
  activeWallet?: string;
};

type MarketPulse = {
  items: MarketPulseItem[];
  status: "idle" | "loading" | "empty" | "ready";
  lastUpdated?: string;
};

type PumpStreams = {
  items: PumpStreamItem[];
  status: "idle" | "loading" | "empty" | "ready";
  lastUpdated?: string;
};

type WalletSignals = {
  summary: WalletSummary;
  status: "idle" | "loading" | "empty" | "ready";
  lastUpdated?: string;
};

type SignalData = {
  marketPulse: MarketPulse;
  pumpStreams: PumpStreams;
  wallet: WalletSignals;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
});

function tryParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[") ) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch (err) {
    console.warn("Failed to parse JSON from tool payload", err, value);
    return value;
  }
}

function unwrapStructuredPayload(raw: unknown): unknown {
  if (!raw) return undefined;

  if (Array.isArray(raw)) {
    if (raw.length === 1) {
      return unwrapStructuredPayload(raw[0]);
    }
    return raw.map((entry) => unwrapStructuredPayload(entry));
  }

  if (typeof raw === "string") {
    return tryParseJson(raw);
  }

  if (typeof raw !== "object") {
    return raw;
  }

  const obj = raw as Record<string, unknown>;

  if ("structuredContent" in obj && obj.structuredContent) {
    return unwrapStructuredPayload(obj.structuredContent);
  }

  if ("content" in obj && Array.isArray(obj.content)) {
    for (const entry of obj.content) {
      if (!entry || typeof entry !== "object") continue;
      const entryObj = entry as Record<string, unknown>;
      if ("json" in entryObj && entryObj.json) {
        return unwrapStructuredPayload(entryObj.json);
      }
      if ("object" in entryObj && entryObj.object) {
        return unwrapStructuredPayload(entryObj.object);
      }
      if ("data" in entryObj && entryObj.data) {
        return unwrapStructuredPayload(entryObj.data);
      }
      if ("result" in entryObj && entryObj.result) {
        return unwrapStructuredPayload(entryObj.result);
      }
      if ("text" in entryObj && typeof entryObj.text === "string") {
        const parsed = tryParseJson(entryObj.text);
        if (parsed && typeof parsed === "object") {
          return unwrapStructuredPayload(parsed);
        }
      }
    }
    // As a last resort return the raw content array
    return obj.content;
  }

  return obj;
}

function findLatestToolResult(transcriptItems: TranscriptItem[], toolName: string): ToolResult | undefined {
  for (let i = transcriptItems.length - 1; i >= 0; i -= 1) {
    const item = transcriptItems[i];

    if (item.type === 'TOOL_NOTE' && item.title === toolName) {
      const raw = item.data as any;
      const payload = raw && typeof raw === 'object' && 'output' in raw ? raw.output : raw;
      return {
        data: unwrapStructuredPayload(payload),
        timestamp: item.timestamp,
      };
    }
  }
  return undefined;
}

function asArray(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.streams)) return obj.streams;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.list)) return obj.list;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.entries)) return obj.entries;
  }
  return [];
}

function extractMarketPulse(toolResult?: ToolResult): MarketPulse {
  if (!toolResult) {
    return {
      status: "idle",
      items: [],
    };
  }

  const data = toolResult.data;
  const streams = asArray(data);

  const pulseItems: MarketPulseItem[] = [];

  streams.forEach((item: any) => {
    if (!item || typeof item !== "object") return;
    const token = (item.token ?? item.asset ?? item.symbol ?? item.pair) as any;

    const symbol = typeof token === "string"
      ? token
      : token?.symbol || token?.ticker || token?.pair;

    const changeValue = item.change_24h ?? item.change24h ?? item.priceChange ?? item.momentum ?? token?.change_24h ?? token?.momentum;
    const changeLabel = typeof changeValue === "number"
      ? `${changeValue >= 0 ? "+" : ""}${changeValue.toFixed(2)}%`
      : typeof changeValue === "string"
        ? changeValue
        : "—";

    const tone: "positive" | "negative" | "neutral" = changeLabel.startsWith("-")
      ? "negative"
      : changeLabel === "—"
        ? "neutral"
        : "positive";

    const volumeValue = item.volume24h ?? item.volume_24h ?? item.notionalVolume ?? token?.volume24h;
    const volumeLabel = typeof volumeValue === "number"
      ? currencyFormatter.format(volumeValue)
      : typeof volumeValue === "string"
        ? volumeValue
        : "";

    if (!symbol) return;

    pulseItems.push({
      label: symbol,
      change: changeLabel,
      changeTone: tone,
      volume: volumeLabel,
    });
  });

  return {
    status: pulseItems.length === 0 ? "empty" : "ready",
    items: pulseItems.slice(0, 4),
    lastUpdated: toolResult.timestamp,
  };
}

function extractPumpStreams(toolResult?: ToolResult): PumpStreams {
  if (!toolResult) {
    return {
      status: "idle",
      items: [],
    };
  }

  const data = toolResult.data;
  const streams = asArray(data);
  const streamItems: PumpStreamItem[] = [];

  streams.forEach((stream: any) => {
    if (!stream || typeof stream !== "object") return;
    const title = stream.title ?? stream.name ?? stream.streamName ?? stream.channel;
    if (!title) return;

    let viewers: string | undefined;
    const rawViewers = stream.viewers ?? stream.concurrent_viewers ?? stream.viewer_count;
    if (typeof rawViewers === "number") {
      viewers = `${compactNumber.format(rawViewers)} watching`;
    } else if (typeof rawViewers === "string") {
      viewers = rawViewers.includes("watch") ? rawViewers : `${rawViewers} watching`;
    }

    const status = stream.status ?? stream.state ?? (stream.is_live ? "Live" : undefined);

    const token = stream.token ?? stream.asset;
    const tokenSymbol = typeof token === "string" ? token : token?.symbol ?? token?.ticker;

    const momentum = stream.momentum ?? stream.signal ?? token?.momentum;
    const momentumLabel = typeof momentum === "number"
      ? `${momentum >= 0 ? "+" : ""}${momentum.toFixed(2)}%`
      : typeof momentum === "string"
        ? momentum
        : undefined;

    streamItems.push({
      title,
      viewers,
      status,
      tokenSymbol,
      momentum: momentumLabel,
    });
  });

  return {
    status: streamItems.length === 0 ? "empty" : "ready",
    items: streamItems.slice(0, 3),
    lastUpdated: toolResult.timestamp,
  };
}

function extractWalletSignals(results: ToolResult[]): WalletSignals {
  if (results.length === 0) {
    return {
      status: "idle",
      summary: {},
    };
  }

  const summary: WalletSummary = {};
  let hasData = false;
  let lastUpdated: string | undefined;

  results.forEach((result) => {
    const data = result.data;
    if (!data || typeof data !== "object") return;
    hasData = true;
    lastUpdated = result.timestamp ?? lastUpdated;

    const obj = data as Record<string, unknown>;

    if (obj.active_wallet && typeof obj.active_wallet === "object") {
      const active = obj.active_wallet as Record<string, unknown>;
      const label = typeof active.label === "string"
        ? active.label
        : typeof active.address === "string"
          ? `${active.address.slice(0, 4)}…${active.address.slice(-4)}`
          : undefined;
      if (label) {
        summary.activeWallet = label;
      }
    }

    const walletsArray = Array.isArray(obj.wallets)
      ? obj.wallets
      : Array.isArray(obj.accounts)
        ? obj.accounts
        : undefined;

    if (walletsArray) {
      summary.walletCount = walletsArray.length.toString();
      const total = walletsArray.reduce((acc, wallet) => {
        if (!wallet || typeof wallet !== "object") return acc;
        const wObj = wallet as Record<string, unknown>;
        const usd = typeof wObj.balance_usd === "number"
          ? wObj.balance_usd
          : typeof wObj.balanceUsd === "number"
            ? wObj.balanceUsd
            : typeof wObj.usd === "number"
              ? wObj.usd
              : typeof wObj.total_value_usd === "number"
                ? wObj.total_value_usd
                : 0;
        return acc + usd;
      }, 0);
      if (total > 0) {
        summary.totalUsd = currencyFormatter.format(total);
      }
    }

    const pnl = obj.pnl_24h ?? obj.change24h ?? obj.pnl24h;
    if (typeof pnl === "number") {
      summary.pnl24h = {
        label: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%`,
        tone: pnl === 0 ? "neutral" : pnl > 0 ? "positive" : "negative",
      };
    } else if (typeof pnl === "string") {
      const numeric = Number.parseFloat(pnl.replace(/[^0-9.-]/g, ""));
      if (!Number.isNaN(numeric)) {
        summary.pnl24h = {
          label: pnl,
          tone: numeric === 0 ? "neutral" : numeric > 0 ? "positive" : "negative",
        };
      } else {
        summary.pnl24h = { label: pnl, tone: "neutral" };
      }
    }
  });

  return {
    status: hasData ? "ready" : "empty",
    summary,
    lastUpdated,
  };
}

export function useSignalData(): SignalData {
  const { transcriptItems } = useTranscript();

  return useMemo(() => {
    const pumpSummary = findLatestToolResult(transcriptItems, "pumpstream_live_summary");

    const marketPulse = extractMarketPulse(pumpSummary);
    const pumpStreams = extractPumpStreams(pumpSummary);

    const walletResults: ToolResult[] = [
      findLatestToolResult(transcriptItems, "list_my_wallets"),
      findLatestToolResult(transcriptItems, "resolve_wallet"),
      findLatestToolResult(transcriptItems, "set_session_wallet_override"),
    ].filter((item): item is ToolResult => Boolean(item));

    const wallet = extractWalletSignals(walletResults);

    return {
      marketPulse,
      pumpStreams,
      wallet,
    };
  }, [transcriptItems]);
}

export type { SignalData, MarketPulse, PumpStreams, WalletSignals };
