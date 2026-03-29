"use client";

import React, { useEffect, useState } from "react";
import { TwitterLogoIcon, HeartFilledIcon, LoopIcon, ChatBubbleIcon, EyeOpenIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { LayoutGroup, motion, AnimatePresence } from "framer-motion";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  TokenIconSleek,
  SleekLoadingCard,
  SleekErrorCard
} from "./sleekVisuals";

type TwitterAuthor = {
  handle?: string | null;
  display_name?: string | null;
  profile_url?: string | null;
  avatar_url?: string | null;
  banner_image_url?: string | null;
  followers?: number | null;
  following?: number | null;
  is_verified?: boolean | null;
  bio?: string | null;
  location?: string | null;
  join_date?: string | null;
  website?: string | null;
};

type TwitterStats = {
  likes?: number | null;
  retweets?: number | null;
  replies?: number | null;
  views?: number | null;
};

type TwitterMedia = {
  has_media?: boolean;
  photos?: string[];
  videos?: string[];
};

type TwitterTweet = {
  id?: string;
  url?: string | null;
  timestamp?: string | null;
  text?: string | null;
  is_reply?: boolean;
  source_queries?: string[];
  author?: TwitterAuthor;
  stats?: TwitterStats;
  media?: TwitterMedia;
};

type TwitterSearchPayload = {
  query?: string | null;
  queries?: string[];
  ticker?: string | null;
  language?: string | null;
  include_replies?: boolean;
  media_only?: boolean;
  verified_only?: boolean;
  fetched?: number;
  tweets?: TwitterTweet[];
  searches?: Array<{ query: string; fetched: number; limit: number }>;
};

const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatNumber(value: unknown) {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value)) return undefined;
  if (value === 0) return "0";
  return compactNumber.format(value);
}

function formatRelativeTime(timestamp?: string | null) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const diff = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];

  for (const [unit, ms] of divisions) {
    if (Math.abs(diff) >= ms || unit === "second") {
      const value = Math.round(diff / ms);
      return rtf.format(value, unit);
    }
  }
  return null;
}

function resolvePrimaryQuery(payload: TwitterSearchPayload) {
  if (payload.ticker) return `$${payload.ticker}`;
  if (payload.query) return payload.query;
  if (payload.queries && payload.queries.length === 1) return payload.queries[0];
  return null;
}

function ensureTweetUrl(tweet: TwitterTweet) {
  if (tweet.url && tweet.url.trim().length > 0) return tweet.url.trim();
  if (tweet.author?.handle && tweet.id) {
    return `https://x.com/${tweet.author.handle}/status/${tweet.id}`;
  }
  if (tweet.id) {
    return `https://x.com/i/web/status/${tweet.id}`;
  }
  return null;
}

function coerceArguments(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

const TwitterSearchRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug = false }) => {
  return <TwitterSearchContent item={item} isExpanded={isExpanded} onToggle={onToggle} debug={debug} />;
};

function TwitterSearchContent({ item, isExpanded, onToggle, debug = false }: Parameters<ToolNoteRenderer>[0]) {
  const originalData = (item.data as Record<string, unknown> | undefined) || {};
  const normalized = normalizeOutput(originalData) || {};
  const payload = unwrapStructured(normalized) as TwitterSearchPayload;

  const [hydratedPayload, setHydratedPayload] = useState<TwitterSearchPayload | null>(null);
  const [hydrationState, setHydrationState] = useState<"idle" | "loading" | "done" | "error">("idle");

  // Expansion state for Master-Detail view
  const [expandedTweetId, setExpandedTweetId] = useState<string | null>(null);

  const effectivePayload = hydratedPayload ?? payload;
  const tweets = Array.isArray(effectivePayload?.tweets) ? effectivePayload.tweets : [];
  const visibleTweets = isExpanded ? tweets : tweets.slice(0, 4); 
  const hasMore = tweets.length > visibleTweets.length;

  useEffect(() => {
    if (tweets.length > 0) return;
    if (hydrationState === "loading" || hydrationState === "done") return;

    const baseArgs = coerceArguments(originalData?.arguments);
    if (!baseArgs) return;

    const args: Record<string, unknown> = { ...baseArgs };
    delete args.__issuer;
    delete args.__sub;
    delete args.__email;
    if (Object.keys(args).length === 0) return;

    let cancelled = false;
    const hydrate = async () => {
      setHydrationState("loading");
      try {
        const response = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tool: "twitter_topic_analysis", arguments: args }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = await response.json();
        const structured =
          (body?.structuredContent as TwitterSearchPayload | undefined) ??
          (body?.structured_content as TwitterSearchPayload | undefined) ??
          (body?.result as TwitterSearchPayload | undefined) ??
          (Array.isArray(body?.content) ? undefined : (body as TwitterSearchPayload));
        if (!cancelled && structured) {
          setHydratedPayload(structured);
        }
        if (!cancelled) {
          setHydrationState("done");
        }
      } catch (error) {
        console.warn("[twitter-search] hydration failed", error);
        if (!cancelled) {
          setHydrationState("error");
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [tweets.length, hydrationState, originalData]);

  const primaryQuery = resolvePrimaryQuery(effectivePayload);
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (visibleTweets.length === 0 && hydrationState === "loading") {
    return <SleekLoadingCard />;
  }

  if (visibleTweets.length === 0 && hydrationState !== "loading" && hydrationState !== "idle") {
    return <SleekErrorCard message="No tweets found for this topic." />;
  }

  return (
    <div className="w-full max-w-4xl space-y-4">
      <header className="flex items-center justify-between px-1">
         <div className="flex items-center gap-2">
            <TwitterLogoIcon className="w-4 h-4 text-sky-500" />
            <SleekLabel>Social Pulse</SleekLabel>
         </div>
         <div className="flex gap-3 items-center">
            {primaryQuery && <span className="text-xs font-bold text-white tracking-tight">{primaryQuery}</span>}
            {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
         </div>
      </header>

      <LayoutGroup>
        {/* items-start prevents "stretching" whitespace */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {visibleTweets.map((tweet, index) => {
            const authorName = tweet.author?.display_name?.trim() || tweet.author?.handle || "Unknown";
            const handle = tweet.author?.handle ? `@${tweet.author.handle}` : null;
            const avatar = tweet.author?.avatar_url ?? tweet.author?.banner_image_url ?? null;
            const isVerified = tweet.author?.is_verified === true;
            const tweetUrl = ensureTweetUrl(tweet);
            const relativeTime = formatRelativeTime(tweet.timestamp);
            const stats = tweet.stats ?? {};
            const imageMedia = Array.isArray(tweet.media?.photos) ? tweet.media?.photos : [];
            
            const uniqueKey = tweet.id ?? `tweet-${index}`;
            const isCardExpanded = expandedTweetId === uniqueKey;

            return (
              <SleekCard 
                key={uniqueKey}
                layout
                onClick={() => setExpandedTweetId(isCardExpanded ? null : uniqueKey)}
                className={`relative overflow-hidden flex flex-col p-5 gap-4 cursor-pointer transition-colors hover:bg-[#0A0A0A] hover:ring-1 hover:ring-sky-500/20 ${
                    isCardExpanded ? 'col-span-1 sm:col-span-2 bg-black ring-1 ring-sky-500/30' : ''
                }`}
              >
                 {/* Header */}
                 <div className="flex items-center gap-3">
                    <div className="shrink-0">
                       <TokenIconSleek symbol={authorName.slice(0,2)} imageUrl={avatar ?? undefined} size={40} />
                    </div>
                    <div className="flex flex-col min-w-0">
                       <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm truncate">{authorName}</span>
                          {isVerified && <div className="w-3 h-3 rounded-full bg-sky-500 text-[8px] flex items-center justify-center text-white">✓</div>}
                       </div>
                       <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                          {handle && <span>{handle}</span>}
                          <span>·</span>
                          <span>{relativeTime}</span>
                       </div>
                    </div>
                    {/* Expand/Collapse Indicator */}
                    <div className="ml-auto text-neutral-600">
                        {isCardExpanded ? <ExternalLinkIcon className="w-3 h-3 text-sky-500" /> : <span className="text-xl leading-none">›</span>}
                    </div>
                 </div>

                 {/* Body - Truncated when collapsed */}
                 <p className={`text-sm text-neutral-300 leading-relaxed font-sans ${isCardExpanded ? '' : 'line-clamp-4'}`}>
                    {tweet.text}
                 </p>

                 {/* Media */}
                 {imageMedia.length > 0 && (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-neutral-900 mt-1">
                       <img src={imageMedia[0]} className="w-full h-full object-cover" />
                       {imageMedia.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white font-bold">
                             +{imageMedia.length - 1}
                          </div>
                       )}
                    </div>
                 )}

                 {/* Footer Stats - Always visible */}
                 <div className="flex items-center gap-4 mt-auto pt-2 text-neutral-500 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                       <HeartFilledIcon className="w-3 h-3 text-neutral-600 group-hover:text-rose-500 transition-colors" />
                       <span>{formatNumber(stats.likes ?? 0)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <LoopIcon className="w-3 h-3 text-neutral-600 group-hover:text-emerald-500 transition-colors" />
                       <span>{formatNumber(stats.retweets ?? 0)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <EyeOpenIcon className="w-3 h-3" />
                       <span>{formatNumber(stats.views ?? 0)}</span>
                    </div>
                 </div>

                 {/* Expanded Actions */}
                 <AnimatePresence>
                    {isCardExpanded && (
                       <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/5 pt-4 mt-2"
                       >
                          <a 
                            href={tweetUrl ?? '#'} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()} // Allow clicking button without toggling card
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-wider hover:bg-sky-500/20 transition-colors"
                          >
                             Open on X
                             <ExternalLinkIcon className="w-3 h-3" />
                          </a>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </SleekCard>
            );
          })}
        </div>
      </LayoutGroup>

      {hasMore && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full py-3 rounded-2xl border border-white/5 bg-white/5 text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isExpanded ? "Collapse" : `Show ${tweets.length - visibleTweets.length} more tweets`}
        </button>
      )}

      {debug && (
        <details className="mt-4 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(effectivePayload, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default TwitterSearchRenderer;
