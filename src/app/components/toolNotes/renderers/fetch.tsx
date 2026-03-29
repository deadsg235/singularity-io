"use client";

import React, { useState } from "react";
import { FileTextIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  TokenIconSleek
} from "./sleekVisuals";

type DocumentPayload = {
  title?: string;
  url?: string;
  text?: string;
  snippet?: string;
  images?: string[];
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

const fetchRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const doc = unwrapStructured(normalized) as DocumentPayload;

  const title = doc.title?.trim() || "Document";
  const url = doc.url?.trim();
  const hostname = extractHostname(url);
  const snippet = doc.snippet?.trim();
  const text = doc.text ?? "";
  const paragraphs = text
    ? text
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : [];
  const timestamp = formatTimestampDisplay(item.timestamp);

  const images = Array.isArray(doc.images) ? doc.images : [];
  
  const [isExpanded, setIsExpanded] = useState(false);
  const showReadMore = paragraphs.length > 3;
  const visibleParagraphs = isExpanded ? paragraphs : paragraphs.slice(0, 3);

  return (
    <SleekCard 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`relative overflow-visible p-6 flex flex-col gap-6 w-full max-w-4xl cursor-pointer group transition-colors hover:bg-[#0A0A0A] ${isExpanded ? 'bg-black' : ''}`}
    >
      <header className="flex items-center justify-between">
         <div className="flex items-center gap-2">
            <FileTextIcon className="w-4 h-4 text-neutral-500" />
            <SleekLabel>Page Summary</SleekLabel>
         </div>
         {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      <div className="flex items-start gap-5">
         <TokenIconSleek symbol={(hostname ?? title).slice(0, 2).toUpperCase()} size={56} />
         <div className="flex flex-col gap-1 flex-1 min-w-0 pt-0.5">
            {url ? (
               <a 
                 href={url} 
                 target="_blank" 
                 rel="noreferrer" 
                 onClick={(e) => e.stopPropagation()}
                 className="group/link flex items-start gap-2"
               >
                  <h1 className="text-xl font-bold text-white tracking-tight leading-snug group-hover/link:underline decoration-neutral-600 decoration-2 underline-offset-4 transition-all">
                     {title}
                  </h1>
                  <ExternalLinkIcon className="w-4 h-4 text-neutral-600 mt-1 opacity-0 group-hover/link:opacity-100 transition-opacity" />
               </a>
            ) : (
               <h1 className="text-xl font-bold text-white tracking-tight leading-snug">{title}</h1>
            )}
            
            {hostname && (
               <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 mt-1">{hostname}</div>
            )}
         </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
           {images.slice(0, isExpanded ? 6 : 3).map((img, idx) => (
              <a 
                key={idx} 
                href={img}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="relative aspect-video rounded-xl overflow-hidden bg-neutral-800 border border-white/5 hover:border-white/20 transition-colors"
              >
                 <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
              </a>
           ))}
        </div>
      )}

      {/* Content Body - No Container */}
      {paragraphs.length > 0 ? (
        <div className="space-y-4 text-sm text-neutral-300 leading-relaxed font-sans pt-2 border-t border-white/5">
           {visibleParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
           ))}
           
           {showReadMore && !isExpanded && (
              <div className="pt-2">
                 <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 group-hover:text-white transition-colors">
                    Read Full Content ↓
                 </span>
              </div>
           )}
           
           {isExpanded && (
              <div className="pt-4">
                 <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 group-hover:text-white transition-colors">
                    Collapse ↑
                 </span>
              </div>
           )}
        </div>
      ) : (
        <div className="text-sm text-neutral-500 italic pt-2 border-t border-white/5">
           No content extracted from this page.
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono" onClick={(e) => e.stopPropagation()}>
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{text || JSON.stringify(normalized, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

export default fetchRenderer;
