"use client";

import { useEffect, useMemo, useState } from "react";
import type { PromptProfileDraft, PromptProfileRecord } from "@/app/hooks/usePromptProfiles";
import { DEFAULT_TOOL_SLUGS } from "@/app/hooks/usePromptProfiles";
import type { ResolvedConciergeProfile } from "@/app/agentConfigs/customerServiceRetail/promptProfile";

export type PersonaPreset = {
  id: string;
  label: string;
  description: string;
  instructionSlug: string;
  handoffSlug: string;
  guestSlug: string;
  toolSlugs: Record<string, string>;
  voiceKey?: string | null;
  metadata?: Record<string, any>;
};

export type AgentPersonaModalProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  profiles: PromptProfileRecord[];
  activeResolvedProfile: ResolvedConciergeProfile | null;
  onCreate: (draft: PromptProfileDraft) => Promise<PromptProfileRecord>;
  onUpdate: (id: string, draft: PromptProfileDraft) => Promise<PromptProfileRecord>;
  onActivate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPreview: (draft: PromptProfileDraft) => Promise<ResolvedConciergeProfile>;
  presets: PersonaPreset[];
};

type DraftState = {
  profileId: string | null;
  draft: PromptProfileDraft;
};

const PREVIEW_DEBOUNCE_MS = 350;

export function AgentPersonaModal({
  open,
  onClose,
  loading,
  profiles,
  activeResolvedProfile,
  onCreate,
  onUpdate,
  onActivate,
  onDelete,
  onPreview,
  presets,
}: AgentPersonaModalProps) {
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [preview, setPreview] = useState<ResolvedConciergeProfile | null>(activeResolvedProfile);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultPreset = presets[0];

  useEffect(() => {
    if (!open) {
      setDraftState(null);
      setPreview(activeResolvedProfile);
      setError(null);
      return;
    }
    if (profiles.length && !draftState) {
      const currentDefault = profiles.find((profile) => profile.isDefault) ?? profiles[0];
      setDraftState({
        profileId: currentDefault.id,
        draft: {
          id: currentDefault.id,
          name: currentDefault.name,
          description: currentDefault.description ?? undefined,
          instructionSlug: currentDefault.instructionSlug,
          handoffSlug: currentDefault.handoffSlug,
          guestSlug: currentDefault.guestSlug,
          toolSlugs: { ...DEFAULT_TOOL_SLUGS, ...currentDefault.toolSlugs },
          voiceKey: currentDefault.voiceKey ?? undefined,
          metadata: currentDefault.metadata,
          isDefault: currentDefault.isDefault,
        },
      });
      setPreview(activeResolvedProfile);
    } else if (!profiles.length && !draftState && defaultPreset) {
      setDraftState({
        profileId: null,
        draft: {
          name: `${defaultPreset.label}`,
          instructionSlug: defaultPreset.instructionSlug,
          handoffSlug: defaultPreset.handoffSlug,
          guestSlug: defaultPreset.guestSlug,
          toolSlugs: { ...DEFAULT_TOOL_SLUGS, ...defaultPreset.toolSlugs },
          voiceKey: defaultPreset.voiceKey ?? undefined,
          metadata: defaultPreset.metadata ?? {},
          isDefault: true,
        },
      });
      setPreview(activeResolvedProfile);
    }
  }, [open, profiles, draftState, defaultPreset, activeResolvedProfile]);

  useEffect(() => {
    if (!open || !draftState) return;
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const resolved = await onPreview(draftState.draft);
        if (!controller.signal.aborted) {
          setPreview(resolved);
          setError(null);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          console.warn("Persona preview failed", err);
          setError(err?.message || "Failed to preview persona");
        }
      } finally {
        if (!controller.signal.aborted) {
          setPreviewLoading(false);
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [draftState, onPreview]);

  const availableProfiles = useMemo(
    () => [...profiles].sort((a, b) => a.name.localeCompare(b.name)),
    [profiles],
  );

  const handleSelectProfile = (profile: PromptProfileRecord) => {
    setDraftState({
      profileId: profile.id,
      draft: {
        id: profile.id,
        name: profile.name,
        description: profile.description ?? undefined,
        instructionSlug: profile.instructionSlug,
        handoffSlug: profile.handoffSlug,
        guestSlug: profile.guestSlug,
        toolSlugs: { ...DEFAULT_TOOL_SLUGS, ...profile.toolSlugs },
        voiceKey: profile.voiceKey ?? undefined,
        metadata: profile.metadata,
        isDefault: profile.isDefault,
      },
    });
    setError(null);
  };

  const handleSelectPreset = (preset: PersonaPreset) => {
    setDraftState({
      profileId: null,
      draft: {
        name: preset.label,
        description: preset.description,
        instructionSlug: preset.instructionSlug,
        handoffSlug: preset.handoffSlug,
        guestSlug: preset.guestSlug,
        toolSlugs: { ...DEFAULT_TOOL_SLUGS, ...preset.toolSlugs },
        voiceKey: preset.voiceKey ?? undefined,
        metadata: preset.metadata ?? {},
        isDefault: false,
      },
    });
    setError(null);
  };

  const updateDraft = (patch: Partial<PromptProfileDraft>) => {
    setDraftState((current) => {
      if (!current) return current;
      const nextToolSlugs = patch.toolSlugs
        ? { ...DEFAULT_TOOL_SLUGS, ...(current.draft.toolSlugs ?? {}), ...patch.toolSlugs }
        : current.draft.toolSlugs;
      return {
        ...current,
        draft: {
          ...current.draft,
          ...patch,
          toolSlugs: nextToolSlugs ?? current.draft.toolSlugs,
        },
      };
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!draftState) return;
    try {
      setSaving(true);
      const { profileId, draft } = draftState;
      if (profileId) {
        const updated = await onUpdate(profileId, draft);
        await onActivate(updated.id);
        setDraftState({ profileId: updated.id, draft: { ...draft, id: updated.id } });
      } else {
        const created = await onCreate(draft);
        await onActivate(created.id);
        setDraftState({ profileId: created.id, draft: { ...draft, id: created.id } });
      }
      setError(null);
      onClose();
    } catch (err: any) {
      console.error("Failed to save persona", err);
      setError(err?.message || "Failed to save persona");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draftState?.profileId) return;
    try {
      await onDelete(draftState.profileId);
      setDraftState(null);
      setPreview(activeResolvedProfile);
    } catch (err: any) {
      console.error("Failed to delete persona", err);
      setError(err?.message || "Failed to delete persona");
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex h-[92vh] w-[min(1200px,92vw)] flex-col overflow-hidden rounded-3xl border border-neutral-800/60 bg-surface-base/95 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <header className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Customize your Dexter</h2>
            <p className="text-sm text-neutral-400">Pick a preset, tune its traits, and preview how it greets you.</p>
            {loading && <p className="mt-1 text-xs text-neutral-500">Loading saved personas…</p>}
          </div>
          <div className="flex items-center gap-2">
            {error && <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs text-red-200">{error}</span>}
            <button
              type="button"
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-black transition hover:bg-primary-500 disabled:opacity-50"
              onClick={handleSave}
              disabled={saving || !draftState}
            >
              {saving ? "Saving…" : draftState?.profileId ? "Save changes" : "Create & activate"}
            </button>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[0.28fr_0.42fr_0.3fr]">
          <aside className="flex flex-col gap-4 overflow-y-auto pr-2">
            <h3 className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Your personas</h3>
            <div className="space-y-2">
              {availableProfiles.length === 0 && (
                <p className="text-sm text-neutral-500">No saved personas yet. Select a preset to get started.</p>
              )}
              {availableProfiles.map((profile) => {
                const active = draftState?.profileId === profile.id;
                const baseClasses = "w-full rounded-2xl border px-4 py-3 text-left transition";
                const stateClasses = active
                  ? "border-primary-500/70 bg-primary-500/10 text-neutral-100"
                  : "border-neutral-800/70 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/80";
                return (
                  <button
                    key={profile.id}
                    type="button"
                    className={`${baseClasses} ${stateClasses}`}
                    onClick={() => handleSelectProfile(profile)}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{profile.name}</span>
                      {profile.isDefault && <span className="font-display text-xs font-semibold tracking-[0.08em] text-primary-300">Active</span>}
                    </div>
                    {profile.description && (
                      <p className="mt-1 text-xs text-neutral-500">{profile.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 space-y-3">
              <h4 className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Presets</h4>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="w-full rounded-2xl border border-neutral-800/70 bg-neutral-900/60 px-4 py-3 text-left text-neutral-300 transition hover:border-primary-500/60 hover:bg-primary-500/5"
                  onClick={() => handleSelectPreset(preset)}
                >
                  <div className="text-sm font-medium text-neutral-200">{preset.label}</div>
                  <p className="mt-1 text-xs text-neutral-500">{preset.description}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex flex-col gap-5 overflow-y-auto px-1">
            <div>
              <label className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Persona name</label>
              <input
                className="mt-2 w-full rounded-2xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-100 outline-none transition focus:border-primary-500/60"
                value={draftState?.draft.name ?? ""}
                onChange={(event) => updateDraft({ name: event.target.value })}
                placeholder="Name your Dexter"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Instruction slug</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-100 outline-none focus:border-primary-500/60"
                  value={draftState?.draft.instructionSlug ?? ""}
                  onChange={(event) => updateDraft({ instructionSlug: event.target.value })}
                />
              </div>
              <div>
                <label className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Handoff slug</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-100 outline-none focus:border-primary-500/60"
                  value={draftState?.draft.handoffSlug ?? ""}
                  onChange={(event) => updateDraft({ handoffSlug: event.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Guest slug</label>
              <input
                className="mt-2 w-full rounded-2xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-100 outline-none focus:border-primary-500/60"
                value={draftState?.draft.guestSlug ?? ""}
                onChange={(event) => updateDraft({ guestSlug: event.target.value })}
              />
            </div>

            <div>
              <label className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Voice preset</label>
              <select
                className="mt-2 w-full rounded-2xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-100 outline-none focus:border-primary-500/60"
                value={draftState?.draft.voiceKey ?? ""}
                onChange={(event) => updateDraft({ voiceKey: event.target.value || undefined })}
              >
                <option value="">Auto (Dexter default)</option>
                <option value="cedar">Cedar</option>
                <option value="emerald">Emerald</option>
                <option value="onyx">Onyx</option>
                <option value="spruce">Spruce</option>
              </select>
            </div>

              <div className="rounded-3xl border border-neutral-800/60 bg-neutral-950/60 p-4">
              <h4 className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Tool descriptions</h4>
              <div className="mt-3 space-y-3">
                {Object.entries(draftState?.draft.toolSlugs ?? DEFAULT_TOOL_SLUGS).map(([key, slug]) => (
                  <div key={key} className="grid gap-2 lg:grid-cols-[160px_1fr]">
                    <span className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-500">{key.replace(/_/g, ' ')}</span>
                    <input
                      className="rounded-2xl border border-neutral-800/60 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-primary-500/60"
                      value={slug}
                      onChange={(event) =>
                        updateDraft({
                          toolSlugs: {
                            [key]: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {draftState?.profileId && (
              <button
                type="button"
                className="self-start rounded-full border border-red-500/60 px-4 py-2 font-display text-xs font-semibold tracking-[0.08em] text-red-200 transition hover:bg-red-500/10"
                onClick={handleDelete}
              >
                Delete persona
              </button>
            )}
          </section>

          <section className="flex flex-col gap-4 overflow-y-auto rounded-3xl border border-neutral-800/60 bg-neutral-950/50 p-5">
            <h3 className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Live preview</h3>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500/70 to-cyan-400/60" />
              <div>
                <p className="text-sm font-semibold text-neutral-100">{preview?.agentName || draftState?.draft.name || "Dexter"}</p>
                <p className="text-xs text-neutral-500">Voice: {preview?.voiceKey || draftState?.draft.voiceKey || "Default"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/80 p-4 text-sm text-neutral-200">
              {previewLoading ? "Loading preview…" : preview?.instructions || "Preview not available yet."}
            </div>

            <div className="space-y-3">
              <h4 className="font-display text-xs font-semibold tracking-[0.08em] text-neutral-400">Tool language</h4>
              <div className="space-y-2 text-xs text-neutral-400">
                {preview?.toolDescriptions
                  ? Object.entries(preview.toolDescriptions).map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-neutral-800/60 bg-neutral-900/70 p-3">
                        <div className="font-display text-[0.6rem] font-semibold tracking-[0.08em] text-neutral-500">{key}</div>
                        <p className="mt-1 text-sm text-neutral-200">{value}</p>
                      </div>
                    ))
                  : <p>No tool descriptions resolved yet.</p>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AgentPersonaModal;
