'use client';

import { useEffect, useMemo, useState } from 'react';

interface McpTool {
  name?: string;
  description?: string;
  summary?: string;
  input_schema?: unknown;
  output_schema?: unknown;
  parameters?: unknown;
}

export default function ToolsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [filter, setFilter] = useState('');
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/tools', { credentials: 'include' });
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        if (!response.ok) {
          if (active) {
            setError(`${response.status} ${response.statusText} — ${text.slice(0, 400)}`);
            setRaw(text);
          }
          return;
        }
        let data: unknown;
        try {
          data = contentType.includes('json') ? JSON.parse(text) : JSON.parse(text);
        } catch {
          data = { raw: text };
        }
        if (!active) return;
        setRaw(data);
        const arr: McpTool[] = Array.isArray((data as any)?.tools)
          ? ((data as any).tools as McpTool[])
          : Array.isArray(data)
          ? (data as McpTool[])
          : [];
        setTools(arr);
      } catch (err: any) {
        if (active) setError(err?.message || String(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return tools;
    return tools.filter((tool) => {
      const name = tool.name || '';
      const desc = tool.description || tool.summary || '';
      return name.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
    });
  }, [tools, filter]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">MCP Tools</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-300">
        Inspect hosted MCP tool definitions by hitting <code>/api/tools</code> via Dexter API.
      </p>

      <div className="mb-4 mt-6 flex items-center gap-3">
        <input
          className="flex-1 rounded-md border border-border-subtle bg-surface-base/90 px-3 py-2.5 text-sm text-foreground placeholder:text-neutral-500 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Filter by name or description"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="rounded-md border border-border-subtle bg-surface-raised/80 px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
        >
          {showRaw ? 'Hide Raw' : 'Show Raw'}
        </button>
      </div>

      {loading && <div>Loading tools…</div>}
      {error && (
        <div className="mb-4 rounded-lg border border-accent-critical/40 bg-accent-critical/10 px-4 py-3 text-sm text-accent-critical">
          <div className="font-semibold uppercase tracking-wide">Error</div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{error}</div>
          <div className="mt-2 text-xs text-accent-critical/80">
            If you see 401/403, confirm the MCP token or session cookies.
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-sm text-neutral-400">No tools found.</div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {filtered.map((tool, index) => (
          <div
            key={`${tool.name || 'tool'}:${index}`}
            className="rounded-lg border border-border-subtle/80 bg-surface-base/80 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
          >
            <div className="text-lg font-semibold text-foreground">
              {tool.name || '(unnamed tool)'}
            </div>
            {tool.description || tool.summary ? (
              <div className="mt-2 text-sm text-neutral-300">
                {tool.description || tool.summary}
              </div>
            ) : null}
            <SchemaBlock title="Input Schema" value={(tool as any).input_schema ?? (tool as any).parameters} />
            <SchemaBlock title="Output Schema" value={(tool as any).output_schema} />
          </div>
        ))}
      </div>

      {showRaw && (
        <div className="mt-8">
          <div className="mb-2 text-xs uppercase tracking-wide text-neutral-400">Raw response</div>
          <pre className="whitespace-pre-wrap rounded-lg border border-border-subtle/80 bg-surface-base/80 p-4 text-xs text-neutral-200">
            {safeStringify(raw)}
          </pre>
        </div>
      )}
    </div>
  );
}

function SchemaBlock({ title, value }: { title: string; value: unknown }) {
  if (!value) return null;
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs uppercase tracking-wide text-neutral-400">{title}</div>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-border-subtle/70 bg-surface-base/80 p-3 text-xs text-neutral-200">
        {safeStringify(value)}
      </pre>
    </div>
  );
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
