"use client";

import React, { useState } from "react";
import { MagnifyingGlassIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  TokenIconSleek
} from "./sleekVisuals";

type SearchResult = {
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
  favicon?: string;
  content?: string | null;
  raw_content?: string | null;
  score?: number | null;
  published_at?: string | null;
};

type SearchPayload = {
  results?: SearchResult[];
  answer?: string | null;
  response_time?: number | null;
  responseTime?: number | null;
  images?: Array<{ url?: string | null; description?: string | null }>;
};

type SearchArgs = {
  query?: string;
};

function extractHostname(url?: string | null) {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function resolveFaviconUrl(favicon?: string | null, pageUrl?: string | null) {
  if (!favicon) return null;
  const trimmed = favicon.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (pageUrl) {
    try {
      const base = new URL(pageUrl);
      if (trimmed.startsWith("/")) {
        return `${base.origin}${trimmed}`;
      }
      return new URL(trimmed, `${base.origin}/`).toString();
    } catch {
      // ignore
    }
  }
  return trimmed;
}

function formatResponseTime(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (value >= 1200) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")} s`;
  }
  return `${Math.round(value)} ms`;
}

const searchRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as SearchPayload | SearchResult[];
  const args = ((item.data as any)?.arguments ?? {}) as SearchArgs;

  const results: SearchResult[] = Array.isArray((payload as SearchPayload)?.results)
    ? ((payload as SearchPayload).results as SearchResult[])
    : Array.isArray(payload)
      ? (payload as SearchResult[])
      : [];

  const answer = typeof (payload as SearchPayload)?.answer === "string" && (payload as SearchPayload).answer?.trim().length
    ? (payload as SearchPayload).answer!.trim()
    : null;
  const query = typeof args.query === "string" && args.query.trim().length > 0 ? args.query.trim() : undefined;
  
  const rawImages = Array.isArray((payload as SearchPayload)?.images) ? ((payload as SearchPayload).images ?? []) : [];
  const imageResults = rawImages.filter(
    (img): img is { url: string; description?: string | null } =>
      Boolean(img && typeof img.url === "string" && img.url.trim().length),
  );

  const timestamp = formatTimestampDisplay(item.timestamp);

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-6 w-full max-w-4xl">
      <header className="flex items-center justify-between">
         <div className="flex items-center gap-2">
            <MagnifyingGlassIcon className="w-4 h-4 text-neutral-500" />
            <SleekLabel>Search Results</SleekLabel>
         </div>
         <div className="flex gap-3">
            {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
         </div>
      </header>

      {query && (
        <div className="text-xl font-bold text-white tracking-tight">
           “{query}”
        </div>
      )}

      {answer && (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-sm text-neutral-300 leading-relaxed">
           <SleekLabel>AI Summary</SleekLabel>
           <p className="mt-2">{answer}</p>
        </div>
      )}

      {imageResults.length > 0 && (
        <div className="flex flex-col gap-3">
           <SleekLabel>Visuals</SleekLabel>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imageResults.slice(0, 4).map((img, idx) => (
                 <a 
                   key={idx} 
                   href={img.url} 
                   target="_blank" 
                   rel="noreferrer" 
                   className="relative aspect-square rounded-xl overflow-hidden border border-white/5 group"
                 >
                    <img src={img.url} alt="Search result" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                 </a>
              ))}
           </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
         {results.map((result, index) => {
            const title = result.title?.trim() || `Result ${index + 1}`;
            const snippet = result.snippet?.trim();
            const url = result.url?.trim();
            const hostname = extractHostname(url);
            const label = hostname ? hostname.slice(0, 2).toUpperCase() : title.slice(0, 2).toUpperCase();
            const faviconUrl = resolveFaviconUrl(result.favicon, url);

            return (
               <a 
                 key={index}
                 href={url} 
                 target="_blank" 
                 rel="noreferrer"
                 className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/10 transition-all group"
               >
                  <div className="shrink-0 pt-1">
                     <TokenIconSleek symbol={label} imageUrl={faviconUrl ?? undefined} size={40} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                     <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider text-neutral-500">{hostname}</span>
                        <ExternalLinkIcon className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                     <h3 className="text-base font-bold text-white leading-tight truncate pr-4">{title}</h3>
                     {snippet && <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{snippet}</p>}
                  </div>
               </a>
            );
         })}
      </div>

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(normalized, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

export default searchRenderer;
