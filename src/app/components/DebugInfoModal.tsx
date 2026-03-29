"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { RealtimeAgent } from "@openai/agents/realtime";
import { createPortal } from "react-dom";
import { UserBadge } from "@/app/components/UserBadge";
import type { UserBadgeVariant } from "@/app/components/UserBadge";

type WalletSummaryEntry = {
  symbol: string | null;
  label: string | null;
  amountUi: number | null;
  usdValue: number | null;
};

type WalletSummary = {
  solBalanceFormatted: string | null;
  totalUsdFormatted: string | null;
  tokenCount: number | null;
  balances: WalletSummaryEntry[];
  lastUpdatedIso: string | null;
  lastUpdatedLabel: string | null;
};

interface WalletDebugInfo {
  address: string | null;
  formattedLabel: string | null;
  secondaryText: string | null;
  status: "idle" | "loading" | "ready" | "error";
  pending: boolean;
  error: string | null;
  summary: WalletSummary | null;
}

interface DebugInfoModalProps {
  open: boolean;
  onClose: () => void;
  connectionStatus: string;
  identityLabel: string;
  mcpStatus: string;
  mcpDetail: string | null;
  roleLabel: string;
  roleVariant: UserBadgeVariant;
  authEmail: string | null;
  walletStatus: string;
  walletInfo: WalletDebugInfo;
  supabaseRoles: string[];
  mcpRoles: string[];
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (value: boolean) => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (value: boolean) => void;
  codec: string;
  onCodecChange: (codec: string) => void;
  buildTag: string;
  agents: RealtimeAgent[];
  selectedAgentName: string;
  onAgentChange: (agentName: string) => void;
  canManageAgents: boolean;
}

type InfoRow = {
  label: string;
  value: React.ReactNode;
  alignTop?: boolean;
};

type RoleDiff = {
  missingInMcp: string[];
  missingInSupabase: string[];
};

const formatNumber = (value: number | null, options?: Intl.NumberFormatOptions): string | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", options).format(value);
};

const formatRoles = (roles: string[]): string => (roles.length ? roles.join(", ") : "—");

export function DebugInfoModal(props: DebugInfoModalProps) {
  const {
    open,
    onClose,
    connectionStatus,
    identityLabel,
    mcpStatus,
    mcpDetail,
    roleLabel,
    roleVariant,
    authEmail,
    walletStatus,
    walletInfo,
    supabaseRoles,
    mcpRoles,
    isAudioPlaybackEnabled,
    setIsAudioPlaybackEnabled,
    isEventsPaneExpanded,
    setIsEventsPaneExpanded,
    codec,
    onCodecChange,
    buildTag,
    agents,
    selectedAgentName,
    onAgentChange,
    canManageAgents,
  } = props;

  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setCopiedAddress(false);
    }
  }, [open]);

  const shouldShowAgentSelector = canManageAgents && agents.length > 0;
  const walletBalances = walletInfo.summary?.balances ?? [];

  const walletStatusLabel = useMemo(() => {
    if (walletInfo.error) return walletInfo.error;
    if (walletInfo.pending || walletInfo.status === "loading") return "Syncing…";
    if (walletInfo.status === "error") return "Balance error";
    return walletInfo.secondaryText || walletStatus;
  }, [walletInfo.error, walletInfo.pending, walletInfo.secondaryText, walletInfo.status, walletStatus]);

  const supabaseRolesNormalized = useMemo(
    () => supabaseRoles.map((value) => String(value).toLowerCase()),
    [supabaseRoles],
  );

  const mcpRolesNormalized = useMemo(
    () => mcpRoles.map((value) => String(value).toLowerCase()),
    [mcpRoles],
  );

  const roleDiff: RoleDiff = useMemo(() => {
    const supSet = new Set(supabaseRolesNormalized);
    const mcpSet = new Set(mcpRolesNormalized);
    return {
      missingInMcp: [...supSet].filter((role) => !mcpSet.has(role)),
      missingInSupabase: [...mcpSet].filter((role) => !supSet.has(role)),
    };
  }, [supabaseRolesNormalized, mcpRolesNormalized]);

  const rolesInSync = roleDiff.missingInMcp.length === 0 && roleDiff.missingInSupabase.length === 0;

  const handleCopyAddress = async () => {
    if (!walletInfo.address) return;
    try {
      await navigator.clipboard.writeText(walletInfo.address);
      setCopiedAddress(true);
      window.setTimeout(() => setCopiedAddress(false), 1600);
    } catch {
      setCopiedAddress(false);
    }
  };

  const getAgentDisplayName = (agentName: string) => {
    const displayNames: Record<string, string> = {
      dexterVoice: "Dexter Voice",
    };
    return displayNames[agentName] || agentName;
  };

  if (!open) return null;

  const sessionRows: InfoRow[] = [
    { label: "Identity", value: identityLabel },
    authEmail ? { label: "Email", value: <span title={authEmail}>{authEmail}</span> } : null,
    { label: "Supabase roles", value: formatRoles(supabaseRoles), alignTop: true },
    { label: "MCP JWT roles", value: formatRoles(mcpRoles), alignTop: true },
  ].filter(Boolean) as InfoRow[];

  const walletRows: InfoRow[] = [
    walletInfo.address
      ? {
          label: "Address",
          value: (
            <button
              type="button"
              onClick={handleCopyAddress}
              className="inline-flex items-center gap-1 rounded-full border border-neutral-700/60 px-3 py-1 text-xs text-neutral-200 transition hover:border-flux/60 hover:text-flux"
            >
              {copiedAddress ? "Copied" : "Copy"}
            </button>
          ),
        }
      : {
          label: "Address",
          value: "Guest session – shared demo wallet",
        },
    walletStatusLabel
      ? {
          label: "Status",
          value: walletStatusLabel,
          alignTop: true,
        }
      : null,
    walletInfo.summary?.solBalanceFormatted || walletInfo.summary?.totalUsdFormatted
      ? {
          label: "SOL / USD",
          value: [walletInfo.summary?.solBalanceFormatted, walletInfo.summary?.totalUsdFormatted]
            .filter(Boolean)
            .join(" • "),
        }
      : null,
    walletInfo.summary?.tokenCount
      ? {
          label: "Tokens tracked",
          value: walletInfo.summary.tokenCount,
        }
      : null,
    walletInfo.summary?.lastUpdatedLabel
      ? {
          label: "Updated",
          value: walletInfo.summary.lastUpdatedLabel,
        }
      : null,
  ].filter(Boolean) as InfoRow[];

  const connectionRows: InfoRow[] = [
    { label: "Connection", value: connectionStatus },
    { label: "MCP", value: mcpStatus },
    mcpDetail ? { label: "Detail", value: mcpDetail, alignTop: true } : null,
    { label: "Build", value: buildTag },
  ].filter(Boolean) as InfoRow[];

  const walletTokens = walletBalances.slice(0, 5);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        <div
          className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-800/60 bg-surface-glass/95 shadow-elevated backdrop-blur-xl"
          style={{ maxHeight: "calc(100vh - 4rem)" }}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-800/60 bg-surface-glass/95/95 px-4 py-3 sm:px-6 sm:py-4">
            <div>
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-neutral-200 sm:text-base sm:tracking-[0.12em]">
                Debug Control Room
              </h2>
              <p className="mt-1 text-[11px] text-neutral-500 sm:text-xs">
                Inspect live session state, wallet telemetry, role alignment, and audio controls.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral-500 transition hover:text-neutral-200"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              <DebugSection
              title="Session"
              badge={
                <span className="inline-flex items-center gap-2 text-sm text-neutral-200">
                  <UserBadge variant={roleVariant} size="sm" />
                  <span>{roleLabel}</span>
                </span>
              }
              rows={sessionRows}
              footer={!rolesInSync ? <RoleDiffNotice diff={roleDiff} /> : null}
            />

              <DebugSection
              title="Connection"
              badge={
                <span className="rounded-full bg-neutral-800/70 px-3 py-0.5 text-xs font-semibold text-neutral-100">
                  {connectionStatus}
                </span>
              }
              rows={connectionRows}
            />

              <DebugSection
              title="Wallet"
              badge={
                <span className="rounded-full bg-neutral-800/70 px-3 py-0.5 text-xs font-semibold text-neutral-100">
                  {walletInfo.formattedLabel ?? walletStatus}
                </span>
              }
              rows={walletRows}
            >
              {walletTokens.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Top balances</p>
                  <ul className="space-y-2">
                    {walletTokens.map((token, index) => (
                      <li
                        key={`${token.symbol ?? token.label ?? index}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-neutral-800/50 bg-neutral-900/30 px-3 py-2 text-xs text-neutral-200"
                      >
                        <span>{token.symbol || token.label || "Token"}</span>
                        <span className="text-right text-neutral-100">
                          {formatNumber(token.amountUi) ?? "—"}
                          {formatNumber(token.usdValue, { style: "currency", currency: "USD", maximumFractionDigits: 2 }) ? (
                            <span className="ml-2 text-neutral-500">
                              {formatNumber(token.usdValue, { style: "currency", currency: "USD", maximumFractionDigits: 2 })}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                    {walletBalances.length > walletTokens.length ? (
                      <li className="text-xs text-neutral-500">+ {walletBalances.length - walletTokens.length} more</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </DebugSection>

              <DebugSection title="Controls" rows={[]}>
              <div className="space-y-4 text-sm text-neutral-300">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-neutral-400">Audio playback</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-flux cursor-pointer"
                    checked={isAudioPlaybackEnabled}
                    onChange={(event) => setIsAudioPlaybackEnabled(event.target.checked)}
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-neutral-400">Event logs</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-iris cursor-pointer"
                    checked={isEventsPaneExpanded}
                    onChange={(event) => setIsEventsPaneExpanded(event.target.checked)}
                  />
                </label>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">Audio codec</span>
                  <select
                    value={codec}
                    onChange={(event) => onCodecChange(event.target.value)}
                    className="rounded-md border border-neutral-800/80 bg-surface-glass/60 px-3 py-1.5 text-xs text-neutral-200 outline-none transition focus:border-flux/60 focus:ring-2 focus:ring-flux/30"
                  >
                    <option value="opus">Opus (48k)</option>
                    <option value="pcmu">PCMU (8k)</option>
                    <option value="pcma">PCMA (8k)</option>
                  </select>
                </div>

                {shouldShowAgentSelector ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-400">Agent</span>
                    <select
                      value={selectedAgentName}
                      onChange={(event) => onAgentChange(event.target.value)}
                      className="rounded-md border border-neutral-800/80 bg-surface-glass/60 px-3 py-1.5 text-xs text-neutral-200 outline-none transition focus:border-rose-400/60 focus:ring-2 focus:ring-rose-300/30"
                    >
                      {agents.map((agent) => (
                        <option key={agent.name} value={agent.name} className="bg-neutral-900 text-rose-100">
                          {getAgentDisplayName(agent.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              </DebugSection>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function DebugSection({
  title,
  badge,
  rows,
  children,
  footer,
}: {
  title: string;
  badge?: React.ReactNode;
  rows: InfoRow[];
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-800/60 bg-neutral-900/30 px-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-xs font-semibold tracking-[0.12em] text-neutral-400 uppercase">
          {title}
        </span>
        {badge ? <div className="text-xs text-neutral-100">{badge}</div> : null}
      </header>
      {rows.length ? <InfoList rows={rows} /> : null}
      {children}
      {footer}
    </section>
  );
}

function InfoList({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="space-y-2 text-sm text-neutral-300">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-start justify-between gap-3 ${row.alignTop ? "" : "items-center"}`}
        >
          <dt className="text-neutral-400">{row.label}</dt>
          <dd className="max-w-[65%] text-right text-neutral-100">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RoleDiffNotice({ diff }: { diff: RoleDiff }) {
  return (
    <div className="rounded-md border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <p className="font-semibold text-amber-100">Role mismatch detected</p>
      {diff.missingInMcp.length ? (
        <p className="mt-1">Missing in MCP token: {formatRoles(diff.missingInMcp)}</p>
      ) : null}
      {diff.missingInSupabase.length ? (
        <p className="mt-1">Missing in Supabase profile: {formatRoles(diff.missingInSupabase)}</p>
      ) : null}
    </div>
  );
}
