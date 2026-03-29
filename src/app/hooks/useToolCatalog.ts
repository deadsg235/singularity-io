'use client';

import { useCallback, useEffect, useState } from 'react';

type AccessLevel = 'guest' | 'pro' | 'holders';
type Source = 'live' | 'cache' | 'none';

export interface ToolCatalogEntry {
  name: string;
  description: string;
  access: AccessLevel;
  tags: string[];
}

export interface ToolCatalogState {
  tools: ToolCatalogEntry[];
  loading: boolean;
  error: string | null;
  source: Source;
  lastUpdated: Date | null;
  refresh: () => void;
}

const ACCESS_MAP: Record<string, AccessLevel> = {
  public: 'guest',
  guest: 'guest',
  free: 'guest',
  demo: 'guest',
  open: 'guest',
  pro: 'pro',
  paid: 'pro',
  managed: 'pro',
  holder: 'holders',
  holders: 'holders',
  premium: 'holders',
  internal: 'holders',
};

const STORAGE_KEY = 'dexter.toolCatalog';
const STORAGE_VERSION = 1;

type CachedCatalog = {
  version: number;
  timestamp: number;
  tools: ToolCatalogEntry[];
};

function normaliseAccess(value?: string): AccessLevel {
  if (!value) return 'guest';
  const key = value.toLowerCase();
  if (ACCESS_MAP[key]) return ACCESS_MAP[key];
  if (key.includes('holder')) return 'holders';
  if (key.includes('pro') || key.includes('paid')) return 'pro';
  return 'guest';
}

function extractDescription(tool: any): string {
  return (
    tool?.description ||
    tool?.summary ||
    tool?._meta?.summary ||
    tool?._meta?.description ||
    ''
  );
}

function extractTags(tool: any): string[] {
  if (Array.isArray(tool?._meta?.tags)) {
    return tool._meta.tags.filter((tag: any) => typeof tag === 'string');
  }
  return [];
}

function transformCatalog(raw: any): ToolCatalogEntry[] {
  const list = Array.isArray(raw?.tools)
    ? raw.tools
    : Array.isArray(raw)
    ? raw
    : [];

  return list
    .map((item: any) => {
      const name = typeof item?.name === 'string' ? item.name : null;
      if (!name) return null;
      return {
        name,
        description: extractDescription(item),
        access: normaliseAccess(item?._meta?.access || item?.access),
        tags: extractTags(item),
      } as ToolCatalogEntry;
    })
    .filter(Boolean) as ToolCatalogEntry[];
}

function readCachedCatalog(): { source: Source; tools: ToolCatalogEntry[]; lastUpdated: Date | null } {
  if (typeof window === 'undefined') {
    return { source: 'none', tools: [], lastUpdated: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { source: 'none', tools: [], lastUpdated: null };

    const parsed = JSON.parse(raw) as CachedCatalog;
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.tools)) {
      return { source: 'none', tools: [], lastUpdated: null };
    }

    return {
      source: 'cache',
      tools: parsed.tools,
      lastUpdated: parsed.timestamp ? new Date(parsed.timestamp) : null,
    };
  } catch (error) {
    console.warn('[dexter-agents] Failed to read cached tool catalog:', error);
    return { source: 'none', tools: [], lastUpdated: null };
  }
}

function writeCachedCatalog(tools: ToolCatalogEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedCatalog = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      tools,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[dexter-agents] Failed to persist tool catalog cache:', error);
  }
}

export function useToolCatalog(): ToolCatalogState {
  const [state, setState] = useState<Omit<ToolCatalogState, 'refresh'>>({
    tools: [],
    loading: true,
    error: null,
    source: 'none',
    lastUpdated: null,
  });

  const fetchCatalog = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await fetch('/api/tools', { credentials: 'include' });
      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        const message = `${response.status} ${response.statusText}`;
        throw new Error(message || 'Failed to load tools');
      }

      const catalog = transformCatalog(data);
      if (!catalog.length) {
        throw new Error('Tool catalog returned no entries');
      }

      writeCachedCatalog(catalog);
      setState({
        tools: catalog,
        loading: false,
        error: null,
        source: 'live',
        lastUpdated: new Date(),
      });
    } catch (error: any) {
      const cache = readCachedCatalog();
      if (cache.source === 'cache' && cache.tools.length) {
        setState({
          tools: cache.tools,
          loading: false,
          error: error?.message || 'Unable to refresh tool catalog; showing cached list.',
          source: 'cache',
          lastUpdated: cache.lastUpdated,
        });
      } else {
        setState({
          tools: [],
          loading: false,
          error: error?.message || 'Failed to load tools',
          source: 'none',
          lastUpdated: null,
        });
      }
    }
  }, []);

  useEffect(() => {
    const cache = readCachedCatalog();
    if (cache.source === 'cache' && cache.tools.length) {
      setState({
        tools: cache.tools,
        loading: false,
        error: null,
        source: 'cache',
        lastUpdated: cache.lastUpdated,
      });
    }
    fetchCatalog();
  }, [fetchCatalog]);

  return {
    ...state,
    refresh: fetchCatalog,
  };
}
