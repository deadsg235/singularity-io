"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/app/auth-context";
import {
  PromptModule,
  PromptModuleRevision,
  PromptModuleError,
  listPromptModules,
  fetchPromptModuleHistory,
  updatePromptModule,
  createPromptModule,
} from "@/app/lib/promptModules";

interface SuperAdminModalProps {
  open: boolean;
  onClose: () => void;
}

type DraftState = {
  slug: string;
  title: string;
  segment: string;
  notes: string;
};

type HistoryMap = Record<
  string,
  {
    status: "idle" | "loading" | "ready" | "error";
    entries: PromptModuleRevision[];
    error: string | null;
  }
>;

const EMPTY_DRAFT: DraftState = {
  slug: "",
  title: "",
  segment: "",
  notes: "",
};

function sortModules(modules: PromptModule[]): PromptModule[] {
  return [...modules].sort((a, b) => a.slug.localeCompare(b.slug));
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEditorSubtitle(module: PromptModule | null): string {
  if (!module) return "";
  const versionLabel = `v${module.version}`;
  if (!module.updatedAt) return versionLabel;
  return `${versionLabel} • ${formatDate(module.updatedAt)}`;
}

function moduleEditorDirty(draft: DraftState, original: PromptModule | null, isCreatingNew: boolean): boolean {
  if (isCreatingNew) {
    return Boolean(draft.slug.trim() || draft.title.trim() || draft.segment.trim());
  }
  if (!original) return false;
  const normalizedTitle = draft.title.trim();
  const originalTitle = original.title ?? "";
  return normalizedTitle !== originalTitle || draft.segment !== original.segment;
}

function getDisplayName(module: PromptModule): string {
  return module.title || module.slug;
}

export function SuperAdminModal({ open, onClose }: SuperAdminModalProps) {
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const [modules, setModules] = useState<PromptModule[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error" | "unauthorized" | "token">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [original, setOriginal] = useState<PromptModule | null>(null);
  const [filter, setFilter] = useState("");

  const [historyVisibility, setHistoryVisibility] = useState(false);
  const [history, setHistory] = useState<HistoryMap>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => setSaveMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

  useEffect(() => {
    if (!open) return;
    if (!accessToken) {
      if (authLoading) {
        setLoadState("token");
        setLoadError("Authenticating…");
      } else {
        setLoadState("unauthorized");
        setLoadError("Sign in with a superadmin account to load prompt modules.");
      }
      return;
    }

    let cancelled = false;
    setLoadState("loading");
    setLoadError(null);

    listPromptModules({ accessToken })
      .then((fetched) => {
        if (cancelled) return;
        const ordered = sortModules(fetched);
        setModules(ordered);
        setLoadState("ready");
        if (ordered.length) {
          const nextSlug = ordered.some((m) => m.slug === selectedSlug)
            ? selectedSlug
            : ordered[0].slug;
          setIsCreatingNew(false);
          setSelectedSlug(nextSlug);
        } else {
          setIsCreatingNew(true);
          setSelectedSlug(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof PromptModuleError && error.status === 403) {
          setLoadState("unauthorized");
          setLoadError("Superadmin access required to manage prompt modules.");
        } else {
          setLoadState("error");
          setLoadError(error instanceof Error ? error.message : "Failed to load prompt modules.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, accessToken, authLoading]);

  useEffect(() => {
    if (!open) return;
    if (isCreatingNew) {
      setOriginal(null);
      setDraft(EMPTY_DRAFT);
      setHistoryVisibility(false);
      return;
    }
    if (!selectedSlug) return;
    const selected = modules.find((module) => module.slug === selectedSlug);
    if (!selected) return;
    setOriginal(selected);
    setDraft({
      slug: selected.slug,
      title: selected.title ?? "",
      segment: selected.segment,
      notes: "",
    });
    setHistoryVisibility(false);
  }, [open, modules, selectedSlug, isCreatingNew]);

  useEffect(() => {
    if (!open) return;
    if (!modules.length && !isCreatingNew && loadState === "ready") {
      setIsCreatingNew(true);
      setSelectedSlug(null);
    }
  }, [modules.length, isCreatingNew, loadState, open]);

  const filteredModules = useMemo(() => {
    if (!filter.trim()) return modules;
    const query = filter.trim().toLowerCase();
    return modules.filter((module) => {
      return (
        module.slug.toLowerCase().includes(query) ||
        (module.title || "").toLowerCase().includes(query)
      );
    });
  }, [modules, filter]);

  const currentHistory = selectedSlug ? history[selectedSlug] : undefined;

  const isDirty = moduleEditorDirty(draft, original, isCreatingNew);
  const canSave = isCreatingNew
    ? Boolean(draft.slug.trim() && draft.segment.trim()) && !saving
    : isDirty && !saving;

  const editorSubtitle = isCreatingNew ? "Create new prompt module" : getEditorSubtitle(original);
  const editorTitle = isCreatingNew
    ? "New prompt module"
    : original
    ? getDisplayName(original)
    : modules.length
    ? "Select a module"
    : "No modules yet";

  const handleSelectModule = useCallback((slug: string) => {
    setIsCreatingNew(false);
    setSelectedSlug(slug);
    setSaveError(null);
    setSaveMessage(null);
  }, []);

  const handleCreateNew = useCallback(() => {
    setIsCreatingNew(true);
    setSelectedSlug(null);
    setDraft(EMPTY_DRAFT);
    setOriginal(null);
    setSaveError(null);
    setSaveMessage(null);
  }, []);

  const resetDraft = useCallback(() => {
    if (isCreatingNew) {
      setDraft(EMPTY_DRAFT);
      return;
    }
    if (!original) return;
    setDraft({
      slug: original.slug,
      title: original.title ?? "",
      segment: original.segment,
      notes: "",
    });
    setSaveError(null);
  }, [isCreatingNew, original]);

  const upsertModuleLocally = useCallback((updated: PromptModule) => {
    setModules((prev) => {
      const existing = prev.some((module) => module.slug === updated.slug);
      const next = existing
        ? prev.map((module) => (module.slug === updated.slug ? updated : module))
        : [...prev, updated];
      return sortModules(next);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!accessToken) {
      setSaveError("Sign in again to continue.");
      return;
    }
    if (!canSave) return;

    setSaving(true);
    setSaveError(null);

    try {
      if (isCreatingNew) {
        const slug = draft.slug.trim();
        const segment = draft.segment;
        if (!slug || !segment.trim()) {
          setSaveError("Slug and segment are required.");
          return;
        }
        const created = await createPromptModule({
          slug,
          title: draft.title.trim() || null,
          segment,
          notes: draft.notes.trim() ? draft.notes.trim() : null,
          accessToken,
        });
        upsertModuleLocally(created);
        setIsCreatingNew(false);
        setSelectedSlug(created.slug);
        setOriginal(created);
        setDraft({
          slug: created.slug,
          title: created.title ?? "",
          segment: created.segment,
          notes: "",
        });
        setHistory((prev) => ({
          ...prev,
          [created.slug]: { status: "idle", entries: [], error: null },
        }));
        setSaveMessage("Prompt module created.");
      } else if (original) {
        const updated = await updatePromptModule({
          slug: original.slug,
          title: draft.title.trim() || null,
          segment: draft.segment,
          version: original.version,
          notes: draft.notes.trim() ? draft.notes.trim() : null,
          accessToken,
        });
        upsertModuleLocally(updated);
        setOriginal(updated);
        setDraft({
          slug: updated.slug,
          title: updated.title ?? "",
          segment: updated.segment,
          notes: "",
        });
        setHistory((prev) => ({
          ...prev,
          [updated.slug]: { status: "idle", entries: [], error: null },
        }));
        setSaveMessage("Changes saved.");
      }
    } catch (error: any) {
      if (error instanceof PromptModuleError) {
        if (error.code === 'version_conflict' && error.details && typeof error.details === 'object' && 'currentVersion' in error.details) {
          const currentVersion = (error.details as { currentVersion?: number }).currentVersion;
          setSaveError(
            typeof currentVersion === 'number'
              ? `Version conflict detected. Server reports version v${currentVersion}. Reload before retrying.`
              : 'Version conflict detected. Reload before retrying.'
          );
        } else {
          setSaveError(error.message || 'Failed to save changes.');
        }
      } else {
        setSaveError(error?.message || 'Failed to save changes.');
      }
    } finally {
      setSaving(false);
    }
  }, [accessToken, canSave, draft, isCreatingNew, original, upsertModuleLocally]);

  const toggleHistory = useCallback(() => {
    if (!selectedSlug) return;
    setHistoryVisibility((prev) => {
      const next = !prev;
      if (next) {
        setHistory((current) => {
          const currentEntry = current[selectedSlug];
          if (currentEntry && currentEntry.status === "ready") {
            return current;
          }
          return {
            ...current,
            [selectedSlug]: {
              status: "loading",
              entries: currentEntry?.entries ?? [],
              error: null,
            },
          };
        });
        fetchPromptModuleHistory(selectedSlug, { accessToken })
          .then((entries) => {
            setHistory((current) => ({
              ...current,
              [selectedSlug]: {
                status: "ready",
                entries,
                error: null,
              },
            }));
          })
          .catch((error) => {
            const message =
              error instanceof PromptModuleError
                ? error.message
                : error instanceof Error
                ? error.message
                : 'Failed to load history.';
            setHistory((current) => ({
              ...current,
              [selectedSlug]: {
                status: "error",
                entries: [],
                error: message,
              },
            }));
          });
      }
      return next;
    });
  }, [selectedSlug, accessToken]);

  const refreshHistory = useCallback(() => {
    if (!selectedSlug || !historyVisibility) return;
    setHistory((current) => ({
      ...current,
      [selectedSlug]: {
        status: "loading",
        entries: current[selectedSlug]?.entries ?? [],
        error: null,
      },
    }));
    fetchPromptModuleHistory(selectedSlug, { accessToken })
      .then((entries) => {
        setHistory((current) => ({
          ...current,
          [selectedSlug]: {
            status: "ready",
            entries,
            error: null,
          },
        }));
      })
      .catch((error) => {
        const message =
          error instanceof PromptModuleError
            ? error.message
            : error instanceof Error
            ? error.message
            : 'Failed to load history.';
        setHistory((current) => ({
          ...current,
          [selectedSlug]: {
            status: "error",
            entries: [],
            error: message,
          },
        }));
      });
  }, [selectedSlug, historyVisibility, accessToken]);

  if (!open || !isMounted) {
    return null;
  }

  const modalContent = (
    <>
      <div
        className="fixed inset-0 z-[10998] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-[10999] flex items-center justify-center px-2 py-6 sm:px-4 sm:py-8">
        <div
          className="relative flex h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-amber-400/60 bg-neutral-950/95 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:h-[90vh]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-display font-semibold tracking-[0.08em] text-amber-200/80">
                  Superadmin Tools
                </p>
                <h2 className="mt-2 font-display text-lg text-amber-100">
                  Prompt Segment Workbench
                </h2>
                <p className="mt-1 text-xs text-amber-100/70">
                  Inspect, edit, and publish backend prompt modules live.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="self-start rounded-full border border-amber-300/40 p-1 text-amber-200 transition hover:border-amber-200/60 hover:text-amber-50"
                aria-label="Close superadmin panel"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 5l10 10" />
                  <path d="M15 5l-10 10" />
                </svg>
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-display font-semibold tracking-[0.08em] text-amber-200/70">
                  Modules
                </label>
                <input
                  type="search"
                  placeholder="Filter modules"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-amber-400/30 bg-neutral-900/70 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/40 focus:border-amber-300/70 focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="max-h-[360px] overflow-y-auto rounded-lg border border-amber-400/20 bg-neutral-900/40">
                  {loadState === "loading" && (
                    <div className="p-4 text-sm text-amber-100/70">Loading modules…</div>
                  )}
                  {loadState === "error" && loadError && (
                    <div className="p-4 text-sm text-rose-200/80">{loadError}</div>
                  )}
                  {loadState === "unauthorized" && loadError && (
                    <div className="p-4 text-sm text-rose-200/80">{loadError}</div>
                  )}
                  {loadState === "token" && loadError && (
                    <div className="p-4 text-sm text-amber-100/80">{loadError}</div>
                  )}
                  {loadState === "ready" && !filteredModules.length && (
                    <div className="p-4 text-sm text-amber-100/70">
                      {modules.length
                        ? "No modules match your filter."
                        : "No prompt modules found yet."}
                    </div>
                  )}
                  {loadState === "ready" && filteredModules.length > 0 && (
                    <ul className="divide-y divide-amber-400/10">
                      {filteredModules.map((module) => {
                        const isActive = !isCreatingNew && selectedSlug === module.slug;
                        return (
                          <li key={module.slug}>
                            <button
                              type="button"
                              onClick={() => handleSelectModule(module.slug)}
                              className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition ${
                                isActive
                                  ? "bg-amber-400/15 text-amber-100"
                                  : "text-amber-50/80 hover:bg-amber-400/10 hover:text-amber-50"
                              }`}
                            >
                              <span className="text-sm font-medium">{getDisplayName(module)}</span>
                              <span className="font-display text-[11px] font-semibold tracking-[0.08em] text-amber-200/60">
                                {module.slug}
                              </span>
                              <span className="text-[10px] text-amber-200/40">
                                v{module.version} • {formatDate(module.updatedAt)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateNew}
                className="rounded-lg border border-amber-400/50 px-3 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300 hover:text-amber-50"
              >
                + New prompt module
              </button>
            </aside>

            <section className="flex flex-col overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-amber-400/20 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-amber-100">
                    {editorTitle}
                  </h3>
                  <span className="text-xs font-semibold tracking-[0.2em] text-amber-200/50">
                    {editorSubtitle}
                  </span>
                </div>
                {saveError && (
                  <div className="rounded border border-rose-400/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                    {saveError}
                  </div>
                )}
                {saveMessage && (
                  <div className="rounded border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                    {saveMessage}
                  </div>
                )}
              </div>

              <div className="mt-4 flex-1 space-y-4 overflow-auto pr-1">
                {loadState !== "ready" && (
                  <p className="text-sm text-amber-100/70">{loadError ?? "Select a module to begin."}</p>
                )}

                {loadState === "ready" && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-display font-semibold tracking-[0.08em] text-amber-200/70">
                          Slug
                        </label>
                        <input
                          type="text"
                          value={draft.slug}
                          onChange={(event) =>
                            setDraft((prev) => {
                              setSaveError(null);
                              return { ...prev, slug: event.target.value };
                            })
                          }
                          disabled={!isCreatingNew}
                          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300/70 ${
                            isCreatingNew
                              ? "border-amber-400/40 bg-neutral-900/70"
                              : "border-amber-400/20 bg-neutral-900/40 text-amber-200/70"
                          }`}
                          placeholder="agent.my_prompt.instructions"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-display font-semibold tracking-[0.08em] text-amber-200/70">
                          Title (optional)
                        </label>
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(event) =>
                            setDraft((prev) => {
                              setSaveError(null);
                              return { ...prev, title: event.target.value };
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-amber-400/40 bg-neutral-900/70 px-3 py-2 text-sm text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                          placeholder="Dexter Concierge Instructions"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-display font-semibold tracking-[0.08em] text-amber-200/70">
                        Prompt segment
                      </label>
                      <textarea
                        value={draft.segment}
                        onChange={(event) =>
                          setDraft((prev) => {
                            setSaveError(null);
                            return { ...prev, segment: event.target.value };
                          })
                        }
                        className="mt-1 h-64 w-full resize-y rounded-lg border border-amber-400/40 bg-neutral-900/60 px-3 py-3 font-mono text-sm text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                        spellCheck={false}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {!isCreatingNew && original && (
                        <div className="rounded-lg border border-amber-400/20 bg-neutral-900/50 p-3 text-xs text-amber-200/60">
                          <p>
                            <span className="font-semibold text-amber-200/80">Updated by:</span>{" "}
                            {original.updatedBy?.email ?? original.updatedBy?.id ?? "Unknown"}
                          </p>
                          <p className="mt-1">
                            <span className="font-semibold text-amber-200/80">Checksum:</span>{" "}
                            {original.checksum ?? "—"}
                          </p>
                          <p className="mt-1">
                            <span className="font-semibold text-amber-200/80">Created:</span>{" "}
                            {formatDate(original.createdAt)}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-display font-semibold tracking-[0.08em] text-amber-200/70">
                          Revision notes
                        </label>
                        <textarea
                          value={draft.notes}
                          onChange={(event) =>
                            setDraft((prev) => {
                              setSaveError(null);
                              return { ...prev, notes: event.target.value };
                            })
                          }
                          className="mt-1 h-20 w-full resize-none rounded-lg border border-amber-400/30 bg-neutral-900/60 px-3 py-2 text-sm text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                          placeholder="Optional context for this change"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        className={`rounded-lg border px-4 py-2 text-xs font-semibold font-display font-semibold tracking-[0.08em] transition ${
                          canSave
                            ? "border-amber-300/70 bg-amber-400/20 text-amber-50 hover:border-amber-200 hover:text-amber-100"
                            : "border-neutral-700 bg-neutral-800/60 text-neutral-500"
                        }`}
                      >
                        {saving
                          ? "Saving…"
                          : isCreatingNew
                          ? "Create module"
                          : "Save changes"}
                      </button>
                      <button
                        type="button"
                        onClick={resetDraft}
                        disabled={saving || (!isCreatingNew && !isDirty && !draft.notes)}
                        className="rounded-lg border border-amber-300/30 px-4 py-2 text-xs font-semibold font-display font-semibold tracking-[0.08em] text-amber-100/70 transition hover:border-amber-200/60 hover:text-amber-50 disabled:opacity-40"
                      >
                        Reset
                      </button>
                      {!isCreatingNew && original && (
                        <button
                          type="button"
                          onClick={toggleHistory}
                          className={`rounded-lg border px-4 py-2 text-xs font-semibold font-display font-semibold tracking-[0.08em] transition ${
                            historyVisibility
                              ? "border-amber-300/70 text-amber-100"
                              : "border-amber-300/40 text-amber-100/70 hover:border-amber-200/60 hover:text-amber-50"
                          }`}
                        >
                          {historyVisibility ? "Hide history" : "View history"}
                        </button>
                      )}
                      {historyVisibility && selectedSlug && (
                        <button
                          type="button"
                          onClick={refreshHistory}
                          className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-semibold font-display font-semibold tracking-[0.08em] text-amber-100/70 transition hover:border-amber-200/60 hover:text-amber-50"
                        >
                          Refresh
                        </button>
                      )}
                    </div>

                    {historyVisibility && selectedSlug && (
                      <div className="mt-2 space-y-3 rounded-lg border border-amber-400/20 bg-neutral-900/40 p-3">
                        {currentHistory?.status === "loading" && (
                          <p className="text-sm text-amber-100/70">Loading history…</p>
                        )}
                        {currentHistory?.status === "error" && currentHistory.error && (
                          <p className="text-sm text-rose-200/80">{currentHistory.error}</p>
                        )}
                        {currentHistory?.status === "ready" && currentHistory.entries.length === 0 && (
                          <p className="text-sm text-amber-100/70">No history recorded for this module yet.</p>
                        )}
                        {currentHistory?.status === "ready" && currentHistory.entries.length > 0 && (
                          <div className="space-y-3">
                            {currentHistory.entries.map((entry) => (
                              <div
                                key={`${entry.id}-${entry.version}`}
                                className="rounded border border-amber-400/15 bg-neutral-950/70 p-3 text-xs text-amber-100/80"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-amber-100">Version {entry.version}</span>
                                  <span className="text-amber-200/60">{formatDate(entry.createdAt)}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-amber-200/60">
                                  <span>{entry.updatedBy?.email ?? entry.updatedBy?.id ?? "Unknown"}</span>
                                  {entry.notes && <span>• {entry.notes}</span>}
                                </div>
                                <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-neutral-900/70 p-2 font-mono text-[11px] leading-relaxed text-amber-100/90">
{entry.segment}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end border-t border-amber-400/20 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-amber-300/60 px-4 py-2 text-xs font-semibold font-display font-semibold tracking-[0.08em] text-amber-100 transition hover:border-amber-200 hover:text-amber-50"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

export default SuperAdminModal;
