"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import type { HeroControlsProps } from "../components/HeroControls";
import type TopRibbonComponent from "../components/shell/TopRibbon";
import type BottomStatusRailComponent from "../components/shell/BottomStatusRail";
import type SignalStackComponent from "../components/signals/SignalStack";
import type SignalsDrawerComponent from "../components/signals/SignalsDrawer";
import type { DebugInfoModal as DebugInfoModalComponent } from "../components/DebugInfoModal";
import type SuperAdminModalComponent from "../components/SuperAdminModal";
import type { TranscriptMessages as TranscriptMessagesComponent } from "../components/TranscriptMessages";
import type { InputBar as InputBarComponent } from "../components/InputBar";
import type { VadControlPanelProps } from "../components/shell/VadControlPanel";
import { DEFAULT_VAD_SETTINGS, clampVadSettings, type VadSettings } from "../config/vad";

declare global {
  interface Window {
    __DEXTER_DISABLE_SYNTHETIC_GREETING?: boolean;
  }
}

// Types
import { SessionStatus } from "@/app/types";
import type { DexterUserBadge } from "@/app/types";
import type { UserBadgeVariant } from "@/app/components/UserBadge";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";
import { useSignalData } from "./useSignalData";
import { useAuth } from "../auth-context";

type DexterSessionUser = {
  id?: string | null;
  email?: string | null;
  roles?: string[];
  isSuperAdmin?: boolean;
};

export type DexterSessionSummary = {
  type: "guest" | "user";
  user: DexterSessionUser | null;
  guestProfile?: { label?: string; instructions?: string } | null;
  wallet?: { public_key: string | null; label?: string | null } | null;
};

type WalletBalanceEntry = {
  mint: string | null;
  symbol: string | null;
  label: string | null;
  decimals: number | null;
  amountUi: number | null;
  usdValue: number | null;
};

type WalletPortfolioSnapshot = {
  address: string | null;
  label?: string | null;
  solBalance: number | null;
  solBalanceFormatted: string | null;
  totalUsd: number | null;
  totalUsdFormatted: string | null;
  tokenCount: number;
  balances: WalletBalanceEntry[];
  fetchedAt: string;
};

type McpStatusState = {
  state: "loading" | "user" | "fallback" | "guest" | "none" | "error";
  label: string;
  detail?: string;
  minted?: boolean | null;
};

type ComposerAttachmentState = {
  id: string;
  label: string;
  description?: string;
  mimeType: string;
  dataUrl: string;
  size: number;
};

const IMAGE_MIME_PATTERN = /^image\//i;

function isSupportedImageFile(file: File) {
  if (IMAGE_MIME_PATTERN.test(file.type)) return true;
  const name = file.name || "";
  const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() : undefined;
  if (!extension) return false;
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "heic", "heif", "avif"].includes(extension);
}

function formatFileSize(bytes: number | null | undefined) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return undefined;
  }
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(gb >= 10 ? 1 : 2)} GB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unsupported attachment result"));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read attachment"));
    };
    reader.readAsDataURL(file);
  });
}

type TopRibbonProps = ComponentProps<typeof TopRibbonComponent>;
type BottomStatusRailProps = ComponentProps<typeof BottomStatusRailComponent>;
type SignalStackComponentProps = ComponentProps<typeof SignalStackComponent>;
type SignalsDrawerProps = ComponentProps<typeof SignalsDrawerComponent>;
type DebugInfoModalProps = ComponentProps<typeof DebugInfoModalComponent>;
type SuperAdminModalProps = ComponentProps<typeof SuperAdminModalComponent>;
type TranscriptMessagesProps = ComponentProps<typeof TranscriptMessagesComponent>;
type InputBarProps = ComponentProps<typeof InputBarComponent>;

type SignalStackLayoutProps = Pick<SignalStackComponentProps, "showLogs" | "toolCatalog">;
type SignalsDrawerShellProps = Omit<SignalsDrawerProps, "children">;

export interface DexterAppController {
  topRibbonProps: TopRibbonProps;
  heroContainerClassName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroLoading: boolean;
  heroCollapsed: boolean;
  heroControlsProps: HeroControlsProps;
  transcriptProps: TranscriptMessagesProps;
  inputBarProps: InputBarProps;
  signalStackProps: SignalStackLayoutProps;
  bottomStatusProps: BottomStatusRailProps;
  signalsDrawerProps: SignalsDrawerShellProps;
  debugModalProps: DebugInfoModalProps;
  superAdminModalProps: SuperAdminModalProps;
  personaModalProps: AgentPersonaModalProps;
  vadPanelProps: VadControlPanelProps;
  hasConnectedOnce: boolean;
}

import { resolveConciergeProfile, type ResolvedConciergeProfile } from '@/app/agentConfigs/customerServiceRetail/promptProfile';
import type { AgentPersonaModalProps, PersonaPreset } from '@/app/components/AgentPersonaModal';
import { usePromptProfiles, DEFAULT_TOOL_SLUGS } from './usePromptProfiles';

const DEFAULT_GUEST_SESSION_INSTRUCTIONS =
  'Operate using the shared Dexter demo wallet backed by house funds. Avoid destructive actions, note that balances are shared, and coordinate with the team before promising dedicated access.';

const createGuestIdentity = (instructions: string = DEFAULT_GUEST_SESSION_INSTRUCTIONS): DexterSessionSummary => ({
  type: "guest",
  user: null,
  guestProfile: { label: "Dexter Demo Wallet", instructions },
  wallet: null,
});

const resolveSessionRoleVariant = (
  identity: DexterSessionSummary,
  explicitBadge: DexterUserBadge | null,
): UserBadgeVariant => {
  if (explicitBadge === 'dev' || explicitBadge === 'pro') {
    return explicitBadge;
  }

  if (identity.type !== 'user') {
    return 'demo';
  }

  const normalizedRoles = (identity.user?.roles ?? []).map((role) => role.toLowerCase());
  if (identity.user?.isSuperAdmin || normalizedRoles.includes('superadmin')) {
    return 'dev';
  }
  if (normalizedRoles.includes('admin')) {
    return 'admin';
  }
  return 'user';
};

const resolveSessionRoleLabel = (variant: UserBadgeVariant): string => {
  switch (variant) {
    case 'dev':
      return 'Dev';
    case 'pro':
      return 'Pro';
    case 'admin':
      return 'Admin';
    case 'user':
      return 'User';
    default:
      return 'Demo';
  }
};

const formatWalletAddress = (address?: string | null): string => {
  if (!address || address === 'Auto' || address.trim().length === 0) {
    return 'Auto';
  }
  const trimmed = address.trim();
  if (trimmed.length <= 10) {
    return trimmed;
  }
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
};

const SOLANA_NATIVE_MINT = 'So11111111111111111111111111111111111111112';

const HERO_RETURNING_PROMPTS = [
  'Need a portfolio checkup?',
  'Want to scan fresh Solana pairs?',
  'Ready to continue where we left off?',
];

const USD_COMPACT_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const USD_PRECISE_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const SOL_LARGE_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const SOL_SMALL_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: 'dexter-classic',
    label: 'Dexter Classic',
    description: 'Balanced tone tuned for portfolio updates and quick trades.',
    instructionSlug: 'agent.concierge.instructions',
    handoffSlug: 'agent.concierge.handoff',
    guestSlug: 'agent.concierge.guest',
    toolSlugs: { ...DEFAULT_TOOL_SLUGS },
  },
  {
    id: 'dexter-scout',
    label: 'Alpha Scout',
    description: 'Prioritize market intel and watchlist synopses.',
    instructionSlug: 'agent.concierge.instructions',
    handoffSlug: 'agent.concierge.handoff',
    guestSlug: 'agent.concierge.guest',
    toolSlugs: { ...DEFAULT_TOOL_SLUGS },
    metadata: { agentName: 'Dexter Scout' },
  },
  {
    id: 'dexter-guardian',
    label: 'Risk Guardian',
    description: 'Cautious persona that emphasizes safeguards and confirmations.',
    instructionSlug: 'agent.concierge.instructions',
    handoffSlug: 'agent.concierge.handoff',
    guestSlug: 'agent.concierge.guest',
    toolSlugs: { ...DEFAULT_TOOL_SLUGS },
    metadata: { agentName: 'Dexter Guardian' },
  },
];

function formatUsdDisplay(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return USD_COMPACT_FORMATTER.format(value);
  }
  return USD_PRECISE_FORMATTER.format(value);
}

function formatSolDisplay(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const abs = Math.abs(value);
  const formatter = abs >= 1 ? SOL_LARGE_FORMATTER : SOL_SMALL_FORMATTER;
  return `${formatter.format(value)} SOL`;
}

function pickNumber(...values: Array<unknown>): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function pickString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function extractStructuredPayload(result: any): any {
  if (result === null || result === undefined) return undefined;
  if (Array.isArray(result)) return result;
  if (typeof result !== 'object') return result;

  if ('structuredContent' in result && result.structuredContent) {
    return extractStructuredPayload(result.structuredContent);
  }
  if ('structured_content' in result && (result as any).structured_content) {
    return extractStructuredPayload((result as any).structured_content);
  }
  if ('structured' in result && (result as any).structured) {
    return extractStructuredPayload((result as any).structured);
  }
  if ('output' in result && (result as any).output) {
    return extractStructuredPayload((result as any).output);
  }
  if ('result' in result && (result as any).result) {
    return extractStructuredPayload((result as any).result);
  }
  if ('data' in result && (result as any).data) {
    return extractStructuredPayload((result as any).data);
  }

  if (Array.isArray((result as any).content)) {
    for (const entry of (result as any).content) {
      if (!entry || typeof entry !== 'object') continue;
      if ('json' in entry && entry.json) {
        const unwrapped = extractStructuredPayload(entry.json);
        if (unwrapped !== undefined) return unwrapped;
      }
      if ('object' in entry && entry.object) {
        const unwrapped = extractStructuredPayload(entry.object);
        if (unwrapped !== undefined) return unwrapped;
      }
      if ('data' in entry && entry.data) {
        const unwrapped = extractStructuredPayload(entry.data);
        if (unwrapped !== undefined) return unwrapped;
      }
      if ('result' in entry && entry.result) {
        const unwrapped = extractStructuredPayload(entry.result);
        if (unwrapped !== undefined) return unwrapped;
      }
      if ('text' in entry && typeof entry.text === 'string') {
        try {
          const parsed = JSON.parse(entry.text);
          const unwrapped = extractStructuredPayload(parsed);
          if (unwrapped !== undefined) return unwrapped;
        } catch {
          // ignore
        }
      }
    }
  }

  return result;
}

function deriveActiveWalletMeta(payload: any): { address: string | null; label: string | null } {
  const attemptFromString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^[1-9A-HJ-NP-Za-km-z]{20,60}$/.test(trimmed)) {
      return trimmed;
    }
    return null;
  };

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const fromArray = attemptFromString(entry);
      if (fromArray) {
        return { address: fromArray, label: null };
      }
      if (entry && typeof entry === 'object') {
        const maybeText = attemptFromString((entry as any).text);
        if (maybeText) {
          return { address: maybeText, label: null };
        }
        const maybeValue = attemptFromString((entry as any).value);
        if (maybeValue) {
          return { address: maybeValue, label: null };
        }
      }
    }
  }

  const stringCandidate = attemptFromString(payload);
  if (stringCandidate) {
    return { address: stringCandidate, label: null };
  }

  if (!payload || typeof payload !== 'object') {
    return { address: null, label: null };
  }

  const active =
    (typeof (payload as any).active_wallet === 'object' && (payload as any).active_wallet) ||
    (typeof (payload as any).wallet === 'object' && (payload as any).wallet) ||
    undefined;

  const address =
    pickString(
      active?.address,
      active?.public_key,
      (payload as any).wallet_address,
      (payload as any).public_key,
      (payload as any).address,
      (payload as any).active_wallet_address,
    ) ?? null;

  const label =
    pickString(
      active?.label,
      (payload as any).wallet_label,
      (payload as any).label,
    ) ?? null;

  return { address, label };
}

function normalizeBalancesPayload(payload: any): { balances: WalletBalanceEntry[]; solBalance: number | null; totalUsd: number | null; tokenCount: number | null } {
  const root = extractStructuredPayload(payload);

  let sourceList: any[] = [];
  if (Array.isArray(root?.balances)) {
    sourceList = root.balances as any[];
  } else if (Array.isArray(root?.tokens)) {
    sourceList = root.tokens as any[];
  } else if (Array.isArray(root?.entries)) {
    sourceList = root.entries as any[];
  } else if (Array.isArray(root?.data)) {
    sourceList = root.data as any[];
  } else if (Array.isArray(root?.items)) {
    sourceList = root.items as any[];
  } else if (Array.isArray(root)) {
    sourceList = root as any[];
  }

  if (!Array.isArray(sourceList) || sourceList.length === 0) {
    if (root && typeof root === 'object') {
      const maybeBalancesObj = root?.balances ?? root?.tokens ?? root?.entries;
      if (maybeBalancesObj && typeof maybeBalancesObj === 'object') {
        sourceList = Object.values(maybeBalancesObj);
      }
    }
  }

  const normalized: WalletBalanceEntry[] = [];
  let solBalance: number | null = null;
  let totalUsd = 0;
  let hasUsdValues = false;

  sourceList.slice(0, 30).forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;

    const mint = pickString(entry.mint, entry.mintAddress, entry.publicKey, entry.address, entry.id) ?? null;
    const tokenMeta = typeof entry.token === 'object' && entry.token ? entry.token : undefined;
    const symbol =
      pickString(
        entry.symbol,
        entry.ticker,
        entry.asset_symbol,
        tokenMeta?.symbol,
        tokenMeta?.ticker,
      ) || (mint ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : null);
    const label = pickString(
      entry.label,
      entry.name,
      entry.asset_name,
      tokenMeta?.name,
      tokenMeta?.label,
      symbol,
    ) ?? null;
    const decimals = pickNumber(entry.decimals, tokenMeta?.decimals) ?? null;

    const lamports = pickNumber(entry.lamports, entry.amountLamports, entry.amount_lamports, entry.balanceLamports);
    let amountUi =
      pickNumber(
        entry.amountUi,
        entry.amount_ui,
        entry.uiAmount,
        entry.ui_amount,
        entry.balanceUi,
        entry.balance_ui,
      ) ?? null;
    if (amountUi === null && lamports !== undefined && lamports !== null) {
      amountUi = lamports / 1_000_000_000;
    }

    let usdValue = pickNumber(
      entry.usdValue,
      entry.usd_value,
      entry.valueUsd,
      entry.totalUsd,
      entry.total_value_usd,
    );
    const priceUsd = pickNumber(entry.priceUsd, entry.price_usd, tokenMeta?.priceUsd, tokenMeta?.price_usd);
    if ((usdValue === undefined || usdValue === null) && amountUi !== null && priceUsd !== undefined) {
      usdValue = amountUi * priceUsd;
    }

    if (usdValue !== undefined && usdValue !== null && Number.isFinite(usdValue)) {
      totalUsd += usdValue;
      hasUsdValues = true;
    }

    const normalizedEntry: WalletBalanceEntry = {
      mint,
      symbol,
      label,
      decimals,
      amountUi,
      usdValue: usdValue !== undefined && usdValue !== null && Number.isFinite(usdValue) ? usdValue : null,
    };
    normalized.push(normalizedEntry);

    const candidateMint = mint ?? '';
    const candidateSymbol = symbol ? symbol.toUpperCase() : null;
    const isNative = Boolean(entry.isNative || entry.native || entry.is_sol);
    if (solBalance === null) {
      if (isNative || candidateSymbol === 'SOL' || candidateMint === SOLANA_NATIVE_MINT) {
        if (amountUi !== null) {
          solBalance = amountUi;
        } else if (lamports !== undefined && lamports !== null) {
          solBalance = lamports / 1_000_000_000;
        }
      }
    }
  });

  const totalUsdValue = normalized.length === 0
    ? null
    : hasUsdValues
      ? totalUsd
      : null;

  const summaryNode = typeof root?.summary === 'object' && root.summary ? root.summary : root && typeof root === 'object' ? root : undefined;

  if ((solBalance === null || Number.isNaN(solBalance)) && summaryNode) {
    const summarySol = pickNumber(
      (summaryNode as any).solBalance,
      (summaryNode as any).sol_balance,
      (summaryNode as any).sol,
      (summaryNode as any).solana,
      (summaryNode as any).nativeBalance,
      (summaryNode as any).native_balance,
      (summaryNode as any).native,
    );
    if (summarySol !== undefined) {
      solBalance = summarySol;
    }
  }

  let aggregatedUsd = totalUsdValue;
  if ((aggregatedUsd === null || Number.isNaN(aggregatedUsd)) && summaryNode) {
    const summaryUsd = pickNumber(
      (summaryNode as any).totalUsd,
      (summaryNode as any).total_usd,
      (summaryNode as any).usdTotal,
      (summaryNode as any).usd_total,
      (summaryNode as any).portfolioUsd,
      (summaryNode as any).portfolio_usd,
      (summaryNode as any).valueUsd,
      (summaryNode as any).value_usd,
    );
    if (summaryUsd !== undefined) {
      aggregatedUsd = summaryUsd;
    } else if (summaryNode && typeof summaryNode === 'object' && 'total' in summaryNode) {
      const totalField = (summaryNode as any).total;
      const numericTotal = pickNumber(totalField, totalField?.usd, totalField?.usd_value);
      if (numericTotal !== undefined) {
        aggregatedUsd = numericTotal;
      }
    }
  }

  const summaryTokenCount = pickNumber(
    (summaryNode as any)?.tokenCount,
    (summaryNode as any)?.tokens,
    (summaryNode as any)?.balances,
    (summaryNode as any)?.walletCount,
  );

  const sortedBalances = normalized.sort((a, b) => {
    const aUsd = a.usdValue ?? 0;
    const bUsd = b.usdValue ?? 0;
    if (Number.isFinite(bUsd) && Number.isFinite(aUsd) && bUsd !== aUsd) {
      return bUsd - aUsd;
    }
    const aAmount = a.amountUi ?? 0;
    const bAmount = b.amountUi ?? 0;
    return bAmount - aAmount;
  });

  return {
    balances: sortedBalances,
    solBalance,
    totalUsd: aggregatedUsd,
    tokenCount: summaryTokenCount ?? (sortedBalances.length > 0 ? sortedBalances.length : null),
  };
}

function buildPortfolioSnapshot(
  meta: { address: string | null; label: string | null },
  balancesPayload: any,
): WalletPortfolioSnapshot {
  const normalized = normalizeBalancesPayload(balancesPayload);
  const solFormatted = formatSolDisplay(normalized.solBalance ?? null);
  const totalUsdFormatted = formatUsdDisplay(normalized.totalUsd ?? null);

  return {
    address: meta.address,
    label: meta.label ?? undefined,
    solBalance: normalized.solBalance ?? null,
    solBalanceFormatted: solFormatted,
    totalUsd: normalized.totalUsd ?? null,
    totalUsdFormatted,
    tokenCount: normalized.tokenCount ?? normalized.balances.length,
    balances: normalized.balances,
    fetchedAt: new Date().toISOString(),
  };
}

// Agent configs
import { scenarioLoaders, defaultAgentSetKey } from "@/app/agentConfigs";
import { dexterTradingCompanyName } from "@/app/agentConfigs/customerServiceRetail";
import { CONFIG } from "@/app/config/env";
import { MODEL_IDS } from "@/app/config/models";

import useAudioDownload from "./useAudioDownload";
import { useHandleSessionHistory } from "./useHandleSessionHistory";
import {
  getMcpStatusSnapshot,
  setMcpStatusError,
  subscribeMcpStatus,
  updateMcpStatusFromPayload,
} from "../state/mcpStatusStore";
import { useToolCatalog } from "./useToolCatalog";

export function useDexterAppController(): DexterAppController {
  const searchParams = useSearchParams()!;
  const {
    session: authSession,
    loading: authLoading,
    signOut: authSignOut,
    sendMagicLink,
  } = useAuth();

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const [guestInstructions, setGuestInstructions] = useState<string>(DEFAULT_GUEST_SESSION_INSTRUCTIONS);
  const [activeConciergeProfile, setActiveConciergeProfile] = useState<ResolvedConciergeProfile | null>(null);
  const promptProfiles = usePromptProfiles();
  const { refresh: refreshPromptProfiles } = promptProfiles;
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [sessionIdentity, setSessionIdentity] = useState<DexterSessionSummary>(() => createGuestIdentity(guestInstructions));
  const [mcpStatus, setMcpStatus] = useState<McpStatusState>(getMcpStatusSnapshot());
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [walletPortfolio, setWalletPortfolio] = useState<WalletPortfolioSnapshot | null>(null);
  const [walletPortfolioStatus, setWalletPortfolioStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [walletPortfolioError, setWalletPortfolioError] = useState<string | null>(null);
  const [walletPortfolioPending, setWalletPortfolioPending] = useState(false);

  const realtimeSessionIdRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const sessionMetadataRef = useRef<Record<string, any>>({});
  const sessionUsageRef = useRef<Record<string, any> | null>(null);
  const sessionStatusPrevRef = useRef<SessionStatus>('DISCONNECTED');
  const sessionFlushInFlightRef = useRef(false);
  const hasFlushedSessionRef = useRef(false);

  const authEmail = useMemo(() => {
    if (!authSession) return null;
    return (
      (authSession.user.email as string | null | undefined) ??
      (authSession.user.user_metadata?.email as string | null | undefined) ??
      null
    );
  }, [authSession]);

  const resetSessionIdentity = useCallback(() => {
    setSessionIdentity(createGuestIdentity(guestInstructions));
  }, [guestInstructions]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        if (!authSession) {
          const defaultResponse = await fetch('/api/prompt-profiles/default', {
            method: 'GET',
            signal: controller.signal,
          });
          if (defaultResponse.ok) {
            const defaultData = await defaultResponse.json();
            const defaultProfile: ResolvedConciergeProfile | null = defaultData?.profile ?? null;
            if (!cancelled && defaultProfile) {
              setActiveConciergeProfile(defaultProfile);
              if (defaultProfile.guestInstructions) {
                setGuestInstructions((current) =>
                  current === defaultProfile.guestInstructions ? current : defaultProfile.guestInstructions,
                );
              }
              return;
            }
          }
          throw new Error('prompt_profile_guest_load_failed');
        }
        const response = await fetch('/api/prompt-profiles/active', {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        });
        if (response.status === 401) {
          throw new Error('prompt_profile_unauthenticated');
        }
        if (!response.ok) {
          throw new Error(`Active profile request failed (${response.status})`);
        }
        const data = await response.json();
        if (cancelled) return;
        const resolved: ResolvedConciergeProfile | null = data?.resolvedProfile ?? null;
        if (resolved) {
          setActiveConciergeProfile(resolved);
          if (resolved.guestInstructions) {
            setGuestInstructions((current) => (current === resolved.guestInstructions ? current : resolved.guestInstructions));
          }
          return;
        }
        const fallback = await resolveConciergeProfile();
        if (cancelled) return;
        setActiveConciergeProfile(fallback);
        if (fallback.guestInstructions) {
          setGuestInstructions((current) => (current === fallback.guestInstructions ? current : fallback.guestInstructions));
        }
      } catch (error) {
        if (cancelled) return;
        console.warn('Failed to fetch active prompt profile', error);
        resolveConciergeProfile()
          .then((profile) => {
            if (cancelled) return;
            setActiveConciergeProfile(profile);
            if (profile.guestInstructions) {
              setGuestInstructions((current) => (current === profile.guestInstructions ? current : profile.guestInstructions));
            }
          })
          .catch((fallbackError) => {
            if (!cancelled) {
              console.error('Prompt profile fallback failed', fallbackError);
            }
          });
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authSession?.user?.id]);

  useEffect(() => {
    setSessionIdentity((previous) => {
      if (previous.type !== 'guest') return previous;
      if (previous.guestProfile?.instructions === guestInstructions) {
        return previous;
      }
      return createGuestIdentity(guestInstructions);
    });
  }, [guestInstructions]);

  useEffect(() => {
    if (promptProfiles.activeResolvedProfile) {
      setActiveConciergeProfile(promptProfiles.activeResolvedProfile);
    }
  }, [promptProfiles.activeResolvedProfile]);

  useEffect(() => {
    if (isPersonaModalOpen) {
      refreshPromptProfiles();
    }
  }, [isPersonaModalOpen, refreshPromptProfiles]);

  const syncIdentityToAuthSession = useCallback((walletOverride?: { public_key: string | null; label?: string | null } | null) => {
    if (!authSession) {
      resetSessionIdentity();
      return;
    }

    const rawRoles = authSession.user.app_metadata?.roles as unknown;
    const roles = Array.isArray(rawRoles)
      ? rawRoles.map((value) => String(value))
      : typeof rawRoles === 'string'
        ? [rawRoles]
        : [];
    const isSuperAdmin = roles.map((r) => r.toLowerCase()).includes('superadmin');

    setSessionIdentity((current) => {
      if (
        current.type === 'user' &&
        current.user?.id === authSession.user.id &&
        current.user?.email === authSession.user.email &&
        JSON.stringify(current.user?.roles ?? []) === JSON.stringify(roles) &&
        Boolean(current.user?.isSuperAdmin) === isSuperAdmin
      ) {
        if (walletOverride === undefined) {
          return current;
        }
      }

      return {
        type: 'user',
        user: {
          id: authSession.user.id,
          email: authSession.user.email ?? null,
          roles,
          isSuperAdmin,
        },
        guestProfile: null,
        wallet:
          walletOverride !== undefined
            ? walletOverride
            : current.type === 'user'
              ? current.wallet ?? null
              : null,
      };
    });
  }, [authSession, resetSessionIdentity]);

  const normalizedRoles = (sessionIdentity.user?.roles ?? []).map((role) => (typeof role === 'string' ? role.toLowerCase() : String(role || '').toLowerCase()));
  const isAdminRole = normalizedRoles.includes('admin');
  const isSuperAdmin = Boolean(sessionIdentity.user?.isSuperAdmin || normalizedRoles.includes('superadmin'));
  const hasProRole = normalizedRoles.includes('pro');
  const hasProAccess = isSuperAdmin || hasProRole;
  const userBadge: DexterUserBadge | null = isSuperAdmin ? 'dev' : hasProRole ? 'pro' : null;
  const canUseAdminTools = sessionIdentity.type === 'user' && (isSuperAdmin || isAdminRole);
  const canViewDebugPayloads = process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === 'true'
    && sessionIdentity.type === 'user'
    && (isSuperAdmin || isAdminRole);

  const callMcpTool = useCallback(async (toolName: string, args: Record<string, unknown> = {}) => {
    const superAdminOnlyTools = new Set(['codex_start', 'codex_reply', 'codex_exec']);
    const proOnlyTools = new Set(['stream_set_scene']);

    if (superAdminOnlyTools.has(toolName) && !isSuperAdmin) {
      throw new Error('This tool is available to super admins only.');
    }

    if (proOnlyTools.has(toolName) && !hasProAccess) {
      throw new Error('This tool is available to pro members.');
    }

    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tool: toolName, arguments: args ?? {} }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`MCP ${toolName} failed (${response.status}): ${text.slice(0, 200)}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(error?.message || `MCP ${toolName} failed`);
    }
  }, [isSuperAdmin, hasProAccess]);

  const walletFetchIdRef = useRef(0);
  const lastFetchedWalletRef = useRef<string | null>(null);
  const walletSignalRefreshRef = useRef<string | undefined>(undefined);

  const fetchActiveWallet = useCallback(async () => {
    try {
      const response = await fetch('/api/wallet/active', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn('[wallet] /api/wallet/active non-200', response.status);
        return null;
      }
      const data = await response.json();
      const wallet = data?.wallet;
      if (wallet && typeof wallet === 'object') {
        console.log('[wallet] active wallet payload', wallet);
        return {
          public_key: typeof wallet.public_key === 'string' ? wallet.public_key : null,
          label: typeof wallet.label === 'string' ? wallet.label : null,
        };
      }
    } catch (error) {
      console.warn('Failed to fetch active wallet', error);
    }
    return null;
  }, []);

  const fetchWalletPortfolio = useCallback(async (reason: 'initial' | 'refresh' = 'initial') => {
    if (sessionIdentity.type !== 'user') {
      setWalletPortfolio(null);
      setWalletPortfolioStatus('idle');
      setWalletPortfolioError(null);
      setWalletPortfolioPending(false);
      return;
    }

    const lastKnownAddress = sessionIdentity.wallet?.public_key;
    const lastKnownLabel = sessionIdentity.wallet?.label ?? null;
    console.log('[wallet] portfolio fetch start', { reason, lastKnownAddress, lastKnownLabel, status: walletPortfolioStatus });
    if (!lastKnownAddress) {
      setWalletPortfolio(null);
      setWalletPortfolioStatus('idle');
      setWalletPortfolioError(null);
      setWalletPortfolioPending(false);
      return;
    }

    walletFetchIdRef.current += 1;
    const requestId = walletFetchIdRef.current;

    if (reason === 'initial') {
      setWalletPortfolioStatus('loading');
    } else {
      setWalletPortfolioStatus((prev) => (prev === 'idle' ? 'loading' : prev));
    }
    setWalletPortfolioError(null);

    try {
      let effectiveAddress: string | null = lastKnownAddress ?? null;
      let effectiveLabel: string | null = lastKnownLabel ?? null;

      try {
        const resolveResult = await callMcpTool('resolve_wallet');
        const resolvePayload = extractStructuredPayload(resolveResult);
        const meta = deriveActiveWalletMeta(resolvePayload);
        if (meta.address && typeof meta.address === 'string') {
          effectiveAddress = meta.address;
        }
        if (meta.label && typeof meta.label === 'string') {
          effectiveLabel = meta.label;
        }
      } catch (resolveError) {
        console.warn('resolve_wallet failed or returned unexpected payload', resolveError);
      }

      if (!effectiveAddress) {
        try {
          const walletsResult = await callMcpTool('list_my_wallets');
          const walletsPayload = extractStructuredPayload(walletsResult);
          const walletsArray = Array.isArray((walletsPayload as any)?.wallets)
            ? (walletsPayload as any).wallets
            : Array.isArray(walletsPayload)
              ? walletsPayload
              : [];
          const preferredWallet = walletsArray.find((entry: any) => entry?.is_default) || walletsArray[0];
          const addressCandidate = typeof preferredWallet?.address === 'string'
            ? preferredWallet.address
            : typeof preferredWallet?.public_key === 'string'
              ? preferredWallet.public_key
              : typeof preferredWallet?.wallet_address === 'string'
                ? preferredWallet.wallet_address
                : null;
          if (addressCandidate) {
            effectiveAddress = addressCandidate;
          }
          if (!effectiveLabel && typeof preferredWallet?.label === 'string') {
            effectiveLabel = preferredWallet.label;
          }
        } catch (listError) {
          console.warn('list_my_wallets fallback failed', listError);
        }
      }

      if (!effectiveAddress) {
        throw new Error('No wallet address available for balance fetch.');
      }

      const balancesResult = await callMcpTool('solana_list_balances', {
        wallet_address: effectiveAddress,
        limit: 30,
      });

      const snapshot = buildPortfolioSnapshot({ address: effectiveAddress, label: effectiveLabel }, balancesResult);

      if (walletFetchIdRef.current === requestId) {
        setWalletPortfolio(snapshot);
        setWalletPortfolioStatus('ready');
        setWalletPortfolioPending(false);
      }
    } catch (error: any) {
      console.error('Failed to load wallet portfolio', error);
      if (walletFetchIdRef.current === requestId) {
        setWalletPortfolioStatus('error');
        setWalletPortfolioError(error?.message || 'Unable to load wallet balances.');
        setWalletPortfolioPending(false);
      }
    }
  }, [callMcpTool, sessionIdentity.type, sessionIdentity.wallet?.label, sessionIdentity.wallet?.public_key, walletPortfolioStatus]);

  useEffect(() => {
    let cancelled = false;

    const hydrateIdentity = async () => {
      if (!authSession) {
        resetSessionIdentity();
        return;
      }

      const wallet = await fetchActiveWallet();
      if (!cancelled) {
        syncIdentityToAuthSession(wallet);
      }
    };

    hydrateIdentity();

    return () => {
      cancelled = true;
    };
  }, [authSession, fetchActiveWallet, resetSessionIdentity, syncIdentityToAuthSession]);

  useEffect(() => {
    if (sessionIdentity.type !== 'user') {
      lastFetchedWalletRef.current = null;
      setWalletPortfolio(null);
      setWalletPortfolioStatus('idle');
      setWalletPortfolioError(null);
      setWalletPortfolioPending(false);
      return;
    }

    const activeAddress = sessionIdentity.wallet?.public_key;
    if (!activeAddress) {
      lastFetchedWalletRef.current = null;
      setWalletPortfolio(null);
      setWalletPortfolioStatus('idle');
      setWalletPortfolioError(null);
      setWalletPortfolioPending(false);
      return;
    }

    if (mcpStatus.state !== 'user') {
      setWalletPortfolioPending(true);
      if (!walletPortfolio || walletPortfolio.address !== activeAddress) {
        setWalletPortfolioStatus((prev) => (prev === 'ready' ? prev : 'loading'));
      }
      return;
    }

    setWalletPortfolioPending(false);

    if (lastFetchedWalletRef.current === activeAddress && walletPortfolioStatus === 'ready') {
      return;
    }

    lastFetchedWalletRef.current = activeAddress;
    fetchWalletPortfolio('initial');
  }, [sessionIdentity.type, sessionIdentity.wallet?.public_key, mcpStatus.state, walletPortfolio, walletPortfolioStatus, fetchWalletPortfolio]);

  useEffect(() => {
    fetch("/api/mcp/status", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => updateMcpStatusFromPayload(data || {}))
      .catch(() => setMcpStatusError());
  }, [sessionIdentity.type, sessionIdentity.user?.id, sessionIdentity.guestProfile?.label]);

  // ---------------------------------------------------------------------
  // Codec selector – lets you toggle between wide-band Opus (48 kHz)
  // and narrow-band PCMU/PCMA (8 kHz) to hear what the agent sounds like on
  // a traditional phone line and to validate ASR / VAD behaviour under that
  // constraint.
  //
  // We read the `?codec=` query-param and rely on the `changePeerConnection`
  // hook (configured in `useRealtimeSession`) to set the preferred codec
  // before the offer/answer negotiation.
  // ---------------------------------------------------------------------
  const urlCodec = searchParams.get("codec") || "opus";

  // Agents SDK doesn't currently support codec selection so it is now forced 
  // via global codecPatch at module load 

  const {
    addTranscriptMessage,
    addTranscriptBreadcrumb,
  } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [scenarioMap, setScenarioMap] = useState<Record<string, RealtimeAgent[]>>({});
  const scenarioCacheRef = useRef<Record<string, RealtimeAgent[]>>({});

  useEffect(() => {
    scenarioCacheRef.current = {};
    setScenarioMap({});
  }, [activeConciergeProfile?.id]);

  const ensureScenarioLoaded = useCallback(async (key: string) => {
    if (scenarioCacheRef.current[key]) {
      return scenarioCacheRef.current[key];
    }
    const loader = scenarioLoaders[key];
    if (!loader) {
      throw new Error(`Unknown agent set: ${key}`);
    }
    const agents = await loader({ resolvedProfile: activeConciergeProfile ?? undefined });
    scenarioCacheRef.current = { ...scenarioCacheRef.current, [key]: agents };
    setScenarioMap((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: agents };
    });
    return agents;
  }, [activeConciergeProfile]);

  const scenarioAgents = scenarioMap[defaultAgentSetKey] ?? [];
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");

  useEffect(() => {
    ensureScenarioLoaded(defaultAgentSetKey).catch((error) => {
      console.error('Failed to preload agent scenario', error);
    });
  }, [ensureScenarioLoaded]);

  useEffect(() => {
    if (!selectedAgentName && scenarioAgents.length > 0) {
      setSelectedAgentName(scenarioAgents[0].name);
    }
  }, [scenarioAgents, selectedAgentName]);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Ref to identify whether the latest agent switch came from an automatic handoff
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendUserMessage,
    sendUserText,
    sendEvent,
    updateTranscriptionSession,
    updateSessionConfig,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setSelectedAgentName(agentName);
      },
    onUsage: (usage) => {
      if (usage && typeof usage === 'object') {
        sessionUsageRef.current = { ...(usage as Record<string, any>) };
      } else {
        sessionUsageRef.current = null;
      }
    },
  });

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");
  const [hasConnectedOnce, setHasConnectedOnce] = useState<boolean>(false);
  const isAdminSession = useMemo(() => {
    if (sessionIdentity.type !== 'user') {
      return false;
    }
    const roles = (sessionIdentity.user?.roles ?? [])
      .filter((role): role is string => typeof role === 'string')
      .map((role) => role.toLowerCase());
    if (sessionIdentity.user?.isSuperAdmin) {
      return true;
    }
    return roles.includes('admin') || roles.includes('superadmin');
  }, [sessionIdentity]);

  const debugTranscriptEnabled = process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === 'true';

  type McpReadyCallbackEntry = {
    requireUserIdentity: boolean;
    resolve: () => void;
    reject: (error: Error) => void;
  };

  const mcpReadyCallbacksRef = useRef<McpReadyCallbackEntry[]>([]);

  const isMcpReadyForSession = useCallback(
    (status: McpStatusState, requireUserIdentity: boolean) => {
      if (requireUserIdentity) {
        return status.state === 'user';
      }
      return status.state === 'user' || status.state === 'fallback' || status.state === 'guest';
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = subscribeMcpStatus((snapshot) => {
      setMcpStatus({ state: snapshot.state, label: snapshot.label, detail: snapshot.detail, minted: snapshot.minted });

      const remaining: McpReadyCallbackEntry[] = [];
      mcpReadyCallbacksRef.current.forEach((entry) => {
        if (isMcpReadyForSession(snapshot, entry.requireUserIdentity)) {
          entry.resolve();
          return;
        }

        if (snapshot.state === 'error' || snapshot.state === 'none') {
          entry.reject(
            new Error(
              snapshot.state === 'error'
                ? 'MCP token unavailable (error state).'
                : 'MCP token missing for this session.',
            ),
          );
          return;
        }

        remaining.push(entry);
      });
      mcpReadyCallbacksRef.current = remaining;
    });
    return unsubscribe;
  }, [isMcpReadyForSession]);

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachmentState[]>([]);
  const [vadSettings, setVadSettings] = useState<VadSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage?.getItem('dexter:vadSettings');
        if (stored) {
          const parsed = JSON.parse(stored);
          return clampVadSettings({
            threshold: typeof parsed?.threshold === 'number' ? parsed.threshold : DEFAULT_VAD_SETTINGS.threshold,
            prefixPaddingMs:
              typeof parsed?.prefixPaddingMs === 'number'
                ? parsed.prefixPaddingMs
                : DEFAULT_VAD_SETTINGS.prefixPaddingMs,
            silenceDurationMs:
              typeof parsed?.silenceDurationMs === 'number'
                ? parsed.silenceDurationMs
                : DEFAULT_VAD_SETTINGS.silenceDurationMs,
            autoRespond:
              typeof parsed?.autoRespond === 'boolean'
                ? parsed.autoRespond
                : DEFAULT_VAD_SETTINGS.autoRespond,
          });
        }
      } catch (error) {
        console.warn('Failed to read stored VAD settings; falling back to defaults.', error);
      }
    }
    return { ...DEFAULT_VAD_SETTINGS };
  });
  const [isVadPanelOpen, setIsVadPanelOpen] = useState<boolean>(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [isMobileSignalsOpen, setIsMobileSignalsOpen] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );
  const [hasActivatedSession, setHasActivatedSession] = useState<boolean>(false);
  const [pendingAutoConnect, setPendingAutoConnect] = useState<boolean>(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);
  const [crestOrigin, setCrestOrigin] = useState<{
    pageLeft: number;
    pageTop: number;
    width: number;
    height: number;
  } | null>(null);
  const [mcpJwtRoles, setMcpJwtRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!hasActivatedSession) {
      setCrestOrigin(null);
      setMcpJwtRoles([]);
    }
  }, [hasActivatedSession]);

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  const signalData = useSignalData();
  const rawToolCatalog = useToolCatalog();

  const filteredToolCatalog = useMemo(() => {
    const superAdminOnlyTools = new Set(['codex_start', 'codex_reply', 'codex_exec']);
    const proOnlyTools = new Set(['stream_set_scene']);

    return {
      ...rawToolCatalog,
      tools: rawToolCatalog.tools.filter((tool) => {
        if (superAdminOnlyTools.has(tool.name) && !isSuperAdmin) {
          return false;
        }
        if (proOnlyTools.has(tool.name) && !hasProAccess) {
          return false;
        }
        return true;
      }),
    };
  }, [rawToolCatalog, isSuperAdmin, hasProAccess]);

  useEffect(() => {
    const lastUpdated = signalData.wallet.lastUpdated;
    if (!lastUpdated || sessionIdentity.type !== 'user') {
      return;
    }

    if (walletSignalRefreshRef.current === lastUpdated) {
      return;
    }

    if (mcpStatus.state !== 'user') {
      setWalletPortfolioPending(true);
      return;
    }

    walletSignalRefreshRef.current = lastUpdated;
    fetchWalletPortfolio('refresh');
  }, [signalData.wallet.lastUpdated, sessionIdentity.type, mcpStatus.state, fetchWalletPortfolio]);

  const walletPortfolioSummary = useMemo(() => {
    if (!walletPortfolio && walletPortfolioStatus === 'idle' && !walletPortfolioPending) {
      return null;
    }

    let lastUpdatedLabel: string | null = null;
    const lastUpdatedIso = walletPortfolio?.fetchedAt ?? null;
    if (lastUpdatedIso) {
      try {
        lastUpdatedLabel = new Date(lastUpdatedIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      } catch {
        lastUpdatedLabel = null;
      }
    }

    return {
      status: walletPortfolioStatus,
      solBalanceFormatted: walletPortfolio?.solBalanceFormatted ?? null,
      totalUsdFormatted: walletPortfolio?.totalUsdFormatted ?? null,
      tokenCount: walletPortfolio?.tokenCount ?? walletPortfolio?.balances.length ?? 0,
      lastUpdatedLabel,
      lastUpdatedIso,
      error: walletPortfolioError,
      balances: walletPortfolio?.balances ?? [],
      pending: walletPortfolioPending,
    };
  }, [walletPortfolio, walletPortfolioStatus, walletPortfolioError, walletPortfolioPending]);

  const handleSignIn = useCallback(async (email: string, captchaToken: string | null): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await sendMagicLink(email, {
        captchaToken: captchaToken ?? undefined,
      });
      return result;
    } catch (err) {
      console.error("Sign-in error:", err);
      return { success: false, message: "Something went wrong sending the magic link." };
    }
  }, [sendMagicLink]);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentName
    ) {
      const currentAgent = scenarioAgents.find(
        (a) => a.name === selectedAgentName
      );
      if (debugTranscriptEnabled && isAdminSession) {
        addTranscriptBreadcrumb(
          `Session started with ${selectedAgentName}`,
          currentAgent ? { name: currentAgent.name } : undefined,
        );
      }
      const isHandoff = handoffTriggeredRef.current;
      updateSession(false);
      if (!isHandoff) {
        setHasActivatedSession(false);
      }
      // Reset flag after handling so subsequent effects behave normally
      handoffTriggeredRef.current = false;
    }
  }, [scenarioAgents, selectedAgentName, sessionStatus, isAdminSession, debugTranscriptEnabled]);

  useEffect(() => {
    if (pendingAutoConnect && sessionStatus === "DISCONNECTED" && selectedAgentName) {
      connectToRealtime();
      setPendingAutoConnect(false);
    }
  }, [pendingAutoConnect, sessionStatus, selectedAgentName]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isVoiceMuted, vadSettings, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      setHasConnectedOnce(true);
    }
  }, [sessionStatus]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session", {
      method: "GET",
      credentials: "include",
      headers: authSession?.access_token
        ? {
            Authorization: `Bearer ${authSession.access_token}`,
          }
        : undefined,
    });
    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text().catch(() => "");
      console.error("Failed to fetch session token:", tokenResponse.status, errorBody);
      resetSessionIdentity();
      setSessionStatus("DISCONNECTED");
      return null;
    }

    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    const sessionIdCandidate =
      typeof data?.id === 'string'
        ? data.id
        : typeof data?.session?.id === 'string'
          ? data.session.id
          : typeof data?.session_id === 'string'
            ? data.session_id
            : typeof data?.client_secret?.session_id === 'string'
              ? data.client_secret.session_id
              : null;
    realtimeSessionIdRef.current = sessionIdCandidate;
    sessionMetadataRef.current = {
      model: typeof data?.model === 'string' ? data.model : MODEL_IDS.realtime,
      voice:
        typeof data?.voice === 'string'
          ? data.voice
          : typeof data?.voice_id === 'string'
            ? data.voice_id
            : CONFIG.dexterVoicePrimary,
      instructionsHash: typeof data?.instructions_hash === 'string' ? data.instructions_hash : undefined,
      issuedAt: new Date().toISOString(),
      dexterSessionType: data?.dexter_session?.type ?? null,
    };
    sessionUsageRef.current = null;
    hasFlushedSessionRef.current = false;

    const dexterSession = data?.dexter_session;
    const normalizedMcpRoles = Array.isArray(dexterSession?.user?.roles)
      ? (dexterSession.user.roles as unknown[]).map((value) => String(value).toLowerCase())
      : [];
    setMcpJwtRoles(normalizedMcpRoles);
    const walletFromSession =
      dexterSession && typeof dexterSession.wallet !== 'undefined'
        ? (dexterSession.wallet ?? null)
        : undefined;

    if (authSession) {
      syncIdentityToAuthSession(walletFromSession);
    } else if (dexterSession) {
      setSessionIdentity({
        type: dexterSession.type === 'user' ? 'user' : 'guest',
        user:
          dexterSession.type === 'user'
            ? {
                id: dexterSession.user?.id ?? null,
                email: dexterSession.user?.email ?? null,
                roles: Array.isArray(dexterSession.user?.roles)
                  ? (dexterSession.user.roles as string[])
                  : [],
                isSuperAdmin: false,
              }
            : null,
        guestProfile:
          dexterSession.type !== 'user'
            ? dexterSession.guest_profile ?? {
                label: 'Dexter Demo Wallet',
                instructions: guestInstructions,
              }
            : null,
        wallet: walletFromSession ?? null,
      });
    } else {
      resetSessionIdentity();
    }

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const deleteRealtimeSession = useCallback(async () => {
    const sessionId = realtimeSessionIdRef.current;
    const accessToken = authSession?.access_token;
    if (!sessionId || !accessToken) {
      return;
    }

    try {
      const response = await fetch(`/api/realtime/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.warn('Failed to delete realtime session', response.status, text.slice(0, 120));
        return;
      }
    } catch (error) {
      console.warn('Error deleting realtime session', error);
    }
  }, [authSession?.access_token]);

  const connectToRealtime = async () => {
    const agentSetKey = defaultAgentSetKey;
    if (sessionStatus !== "DISCONNECTED") return;
    setHasActivatedSession(false);
    setSessionStatus("CONNECTING");

    try {
      const scenario = await ensureScenarioLoaded(agentSetKey);
      if (!scenario?.length) {
        throw new Error(`No agents configured for scenario ${agentSetKey}`);
      }
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) return;

      // Ensure the selectedAgentName is first so that it becomes the root
      const activeAgentName = selectedAgentName || scenario[0]?.name || '';
      if (!selectedAgentName && activeAgentName) {
        setSelectedAgentName(activeAgentName);
      }
      const reorderedAgents = [...scenario];
      const idx = reorderedAgents.findIndex((a) => a.name === activeAgentName);
      if (idx > 0) {
        const [agent] = reorderedAgents.splice(idx, 1);
        reorderedAgents.unshift(agent);
      }

      const guardrail = createModerationGuardrail(
        dexterTradingCompanyName,
      );

      await connect({
        getEphemeralKey: async () => EPHEMERAL_KEY,
        initialAgents: reorderedAgents,
        audioElement: sdkAudioElement,
        outputGuardrails: [guardrail],
      });

      // Prime session configuration before the first user turn.
      updateSession(false);
    } catch (err) {
      console.error("Error connecting via SDK:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = (options?: { resetIdentity?: boolean }) => {
    disconnect();
    void deleteRealtimeSession();
    setSessionStatus("DISCONNECTED");
    if (options?.resetIdentity) {
      resetSessionIdentity();
      setHasConnectedOnce(false);
    } else {
      void fetchActiveWallet().then((wallet) => {
        syncIdentityToAuthSession(wallet);
      });
    }
    setHasActivatedSession(false);
    setPendingAutoConnect(false);
  };

  const handleSignOut = useCallback(async () => {
    try {
      await authSignOut();
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Logout endpoint returned ${response.status}`);
      }
      disconnectFromRealtime({ resetIdentity: true });
    } catch (err) {
      console.error('Sign-out error:', err);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  }, [authSignOut, disconnectFromRealtime]);

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const shouldSkipSyntheticGreeting = () => {
    if (process.env.NEXT_PUBLIC_DISABLE_SYNTHETIC_GREETING === 'true') {
      return true;
    }
    if (typeof window !== 'undefined') {
      if (window.__DEXTER_DISABLE_SYNTHETIC_GREETING === true) {
        return true;
      }
      try {
        return window.localStorage?.getItem('dexter:disableSyntheticGreeting') === 'true';
      } catch (error) {
        console.warn('Failed to read synthetic greeting preference:', error);
      }
    }
    return false;
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Reflect the mute toggle by enabling or disabling server VAD on the
    // backend. The Realtime SDK supports live session updates via the
    // `session.update` event.
    const activeVadSettings = vadSettings;
    const turnDetection = {
      type: 'server_vad',
      threshold: activeVadSettings.threshold,
      prefix_padding_ms: activeVadSettings.prefixPaddingMs,
      silence_duration_ms: activeVadSettings.silenceDurationMs,
      create_response: activeVadSettings.autoRespond && !isVoiceMuted,
      interrupt_response: true,
    };

    const inputAudioUpdate: Record<string, any> = {
      format: {
        type: 'audio/pcm',
        rate: 24000,
      },
      transcription: {
        model: MODEL_IDS.transcription,
      },
      turn_detection: turnDetection,
    };

    const includeKeys = ['item.input_audio_transcription.logprobs'];

    updateTranscriptionSession({
      audioFormat: 'pcm16',
      transcriptionModel: MODEL_IDS.transcription,
      turnDetection: {
        threshold: activeVadSettings.threshold,
        prefixPaddingMs: activeVadSettings.prefixPaddingMs,
        silenceDurationMs: activeVadSettings.silenceDurationMs,
      },
    });

    updateSessionConfig({
      inputAudioFormat: 'pcm16',
      inputAudioTranscription: {
        model: MODEL_IDS.transcription,
      },
      include: includeKeys,
      audio: {
        input: inputAudioUpdate,
      },
    } as any);
    sendEvent({
      type: 'session.update',
      session: {
        audio: {
          input: inputAudioUpdate,
        },
        input_audio_format: 'pcm16',
        input_audio_transcription: {
          model: MODEL_IDS.transcription,
        },
        include: includeKeys,
      },
    });

    logClientEvent(
      {
        type: 'client.session.update',
        audio: { input: inputAudioUpdate },
        microphoneMuted: isVoiceMuted,
      },
      '(session update)'
    );

    // Send an initial 'hi' message to trigger the agent to greet the user
    if (shouldTriggerResponse && !shouldSkipSyntheticGreeting()) {
      sendSimulatedUserMessage('hi');
    }
    return;
  }

  const waitForMcpReady = async () => {
    const requireUserIdentity = sessionIdentity.type === 'user';

    if (isMcpReadyForSession(mcpStatus, requireUserIdentity)) {
      return;
    }

    if (requireUserIdentity && mcpStatus.state !== 'user') {
      void fetch('/api/mcp/status', { credentials: 'include' })
        .then((response) => response.json())
        .then((data) => updateMcpStatusFromPayload(data || {}))
        .catch(() => {
          /* non-blocking refresh */
        });
    }

  await new Promise<void>((resolve, reject) => {
    const timeoutMs = requireUserIdentity ? 15000 : 10000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const entry: McpReadyCallbackEntry = {
        requireUserIdentity,
        resolve: () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve();
        },
        reject: (error: Error) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          reject(error);
        },
      };

      timeoutId = setTimeout(() => {
        mcpReadyCallbacksRef.current = mcpReadyCallbacksRef.current.filter((cb) => cb !== entry);
        if (requireUserIdentity) {
          entry.reject(
            new Error(
              'Dexter could not mint your personal MCP token. Please sign out and back in, or run the Supabase refresh helper to regenerate credentials.',
            ),
          );
        } else {
          entry.reject(new Error('Timed out waiting for MCP session readiness.'));
        }
      }, timeoutMs);

    mcpReadyCallbacksRef.current.push(entry);
  });
};

  const handleAddComposerAttachments = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;

    const accepted: File[] = [];
    const rejected: string[] = [];

    files.forEach((file) => {
      if (isSupportedImageFile(file)) {
        accepted.push(file);
      } else {
        rejected.push(file.name || file.type || 'Unknown file');
      }
    });

    if (rejected.length) {
      addTranscriptBreadcrumb('Attachment skipped', {
        reason: 'Only image uploads are supported in realtime chats right now.',
        files: rejected,
      });
    }

    if (!accepted.length) return;

    const results = await Promise.all(
      accepted.map(async (file) => {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          return {
            id: uuidv4(),
            label: file.name?.trim() || 'Image',
            description: formatFileSize(file.size),
            mimeType: file.type || 'image/*',
            dataUrl,
            size: file.size ?? 0,
          } satisfies ComposerAttachmentState;
        } catch (error) {
          console.error('Failed to read attachment', error);
          addTranscriptBreadcrumb('Attachment failed', {
            file: file.name || 'unknown',
            reason: error instanceof Error ? error.message : 'Unknown read error',
          });
          return null;
        }
      }),
    );

    const next = results.filter(Boolean) as ComposerAttachmentState[];
    if (!next.length) return;

    setComposerAttachments((prev) => [...prev, ...next]);
  }, [addTranscriptBreadcrumb]);

  const handleRemoveComposerAttachment = useCallback((id: string) => {
    setComposerAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }, []);

  const handleSendTextMessage = async (directMessage?: string) => {
    // Use provided message or fall back to state
    const rawMessage = directMessage ?? userText;
    const messageToSend = rawMessage.trim();
    const hasAttachments = composerAttachments.length > 0;
    if (!messageToSend && !hasAttachments) return;

    if (directMessage === undefined) {
      setUserText("");
    }

    // If not connected, connect first
    if (sessionStatus !== 'CONNECTED') {
      try {
        await connectToRealtime();
      } catch (err) {
        console.error('Failed to connect', err);
        if (directMessage === undefined) {
          setUserText(rawMessage);
        }
        return;
      }
    }

    // Wait for MCP to be ready
    try {
      await waitForMcpReady();
    } catch (err) {
      console.error('MCP not ready, aborting message send', err);
      addTranscriptBreadcrumb(
        'MCP token unavailable',
        {
          detail: err instanceof Error ? err.message : 'Unknown MCP readiness failure',
          guidance: 'Sign out/in or run the Supabase refresh helper to restore your session.',
        },
      );
      if (directMessage === undefined) {
        setUserText(rawMessage);
      }
      return;
    }

    interrupt();
    setHasActivatedSession(true);

    try {
      if (hasAttachments) {
        const hasUserText = messageToSend.length > 0;
        const synthesizedText = hasUserText
          ? messageToSend
          : 'Please inspect the attached image and describe any notable details, including visible text, people, objects, and overall context.';

        const content: Array<
          | { type: 'input_text'; text: string }
          | { type: 'input_image'; image: string; providerData?: Record<string, any>; detail?: 'low' | 'high' }
        > = [{ type: 'input_text', text: synthesizedText }];

        if (hasUserText) {
          content.push({
            type: 'input_text',
            text: 'The user included image attachments—please consider them when forming your answer.',
          });
        }

        composerAttachments.forEach((attachment) => {
          content.push({
            type: 'input_image',
            image: attachment.dataUrl,
            detail: 'high',
            providerData: {
              filename: attachment.label,
              mimeType: attachment.mimeType,
              size: attachment.size,
            },
          });
        });

        sendUserMessage({
          type: 'message',
          role: 'user',
          content,
        });
        setComposerAttachments([]);
      } else {
        sendUserText(messageToSend);
      }
    } catch (err) {
      console.error('Failed to send via SDK', err);
      if (directMessage === undefined) {
        setUserText(rawMessage);
      }
      return;
    }
  };

  const resolveDisplayName = () => {
  if (sessionIdentity.type !== 'user') {
    return 'a Dexter demo guest';
  }
  const email = sessionIdentity.user?.email ?? '';
  if (email.includes('@')) {
    return email.split('@')[0] || email;
  }
    return email || 'Dexter user';
  };

  const handleStartConversation = async () => {
    if (hasActivatedSession) {
      return;
    }

    if (sessionStatus !== 'CONNECTED') {
      try {
        await connectToRealtime();
      } catch (error) {
        console.error('Failed to connect before auto-greeting', error);
        addTranscriptBreadcrumb('Connection error', {
          detail: error instanceof Error ? error.message : 'Unable to start session.',
        });
        return;
      }
    }

    try {
      await waitForMcpReady();
    } catch (error) {
      console.error('MCP not ready for auto-greeting', error);
      addTranscriptBreadcrumb('MCP token unavailable', {
        detail: error instanceof Error ? error.message : 'Unknown readiness error.',
      });
      return;
    }

    const greeting = `Hi, I'm ${resolveDisplayName()}.`;
    sendSimulatedUserMessage(greeting);
    setHasActivatedSession(true);
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      setHasActivatedSession(false);
      connectToRealtime();
    }
  };

  const handleSelectedAgentChange = (newAgentName: string) => {
    // Reconnect session with the newly selected agent as root so that tool
    // execution works correctly.
    disconnectFromRealtime();
    setSelectedAgentName(newAgentName);
    setHasActivatedSession(false);
    setPendingAutoConnect(true);
  };

  // Because we need a new connection, refresh the page when codec changes
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  const applyVadSettings = useCallback((next: VadSettings) => {
    setVadSettings((prev) => {
      const clamped = clampVadSettings(next);
      if (
        prev.threshold === clamped.threshold &&
        prev.prefixPaddingMs === clamped.prefixPaddingMs &&
        prev.silenceDurationMs === clamped.silenceDurationMs &&
        prev.autoRespond === clamped.autoRespond
      ) {
        return prev;
      }
      return clamped;
    });
  }, []);

  const resetVadSettings = useCallback(() => {
    applyVadSettings({ ...DEFAULT_VAD_SETTINGS });
  }, [applyVadSettings]);

  useEffect(() => {
    const storedVoiceMuted = localStorage.getItem("voiceMuted");
    if (storedVoiceMuted !== null) {
      setIsVoiceMuted(storedVoiceMuted === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("voiceMuted", isVoiceMuted.toString());
  }, [isVoiceMuted]);

  useEffect(() => {
    try {
      localStorage.setItem("dexter:vadSettings", JSON.stringify(vadSettings));
    } catch (error) {
      console.warn('Failed to persist VAD settings; continuing with in-memory values.', error);
    }
  }, [vadSettings]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus !== 'CONNECTED') return;
    try {
      mute(isVoiceMuted);
    } catch (err) {
      console.warn('Failed to toggle microphone mute', err);
    }
  }, [sessionStatus, isVoiceMuted]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  const { transcriptItems } = useTranscript();
  const { loggedEvents } = useEvent();

  const transcriptItemsRef = useRef(transcriptItems);
  useEffect(() => {
    transcriptItemsRef.current = transcriptItems;
  }, [transcriptItems]);

  const loggedEventsRef = useRef(loggedEvents);
  useEffect(() => {
    loggedEventsRef.current = loggedEvents;
  }, [loggedEvents]);

  const sessionIdentityRef = useRef(sessionIdentity);
  useEffect(() => {
    sessionIdentityRef.current = sessionIdentity;
  }, [sessionIdentity]);

  const selectedAgentNameRef = useRef(selectedAgentName);
  useEffect(() => {
    selectedAgentNameRef.current = selectedAgentName;
  }, [selectedAgentName]);

  const mcpStatusRef = useRef(mcpStatus);
  useEffect(() => {
    mcpStatusRef.current = mcpStatus;
  }, [mcpStatus]);

  const buildSessionLogPayload = useCallback(
    (reason?: string) => {
      const transcriptSnapshot = Array.isArray(transcriptItemsRef.current)
        ? [...transcriptItemsRef.current]
        : [];
      const sortedItems = transcriptSnapshot.sort((a, b) => a.createdAtMs - b.createdAtMs);

      const toIso = (ms: number) => new Date(ms).toISOString();

      const transcriptEntries = sortedItems
        .filter((item) => item.type === 'MESSAGE')
        .map((item, index) => ({
          id: item.itemId,
          index,
          role: item.role,
          text: item.title ?? '',
          createdAt: toIso(item.createdAtMs),
          status: item.status,
          isHidden: Boolean(item.isHidden),
          guardrailResult: item.guardrailResult ?? null,
          data: item.data ?? null,
        }));

      const toolEntries = sortedItems
        .filter((item) => item.type === 'TOOL_NOTE')
        .map((item, index) => ({
          id: item.itemId,
          index,
          name: item.title ?? null,
          status: item.status,
          createdAt: toIso(item.createdAtMs),
          arguments: item.data?.arguments ?? null,
          output: item.data?.output ?? null,
          data: item.data ?? null,
        }));

      const hasContent = transcriptEntries.length > 0 || toolEntries.length > 0;
      const sessionId = realtimeSessionIdRef.current;

      if (!hasContent && !sessionId) {
        return null;
      }

      const firstTimestampMs =
        sessionStartedAtRef.current ??
        (transcriptEntries.length > 0
          ? Date.parse(transcriptEntries[0].createdAt)
          : Date.now());
      const endedAtMs = Date.now();
      const durationMs = Math.max(0, endedAtMs - firstTimestampMs);

      const identitySnapshot = sessionIdentityRef.current;
      const identityType = identitySnapshot?.type ?? 'guest';
      const mcpSnapshot = mcpStatusRef.current;

      const assistantMessages = transcriptEntries.filter((entry) => entry.role === 'assistant' && !entry.isHidden);
      const userMessages = transcriptEntries.filter((entry) => entry.role === 'user' && !entry.isHidden);

      const compact = (obj: Record<string, any>) => {
        const next: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value === undefined) continue;
          next[key] = value;
        }
        return next;
      };

      const metadata = compact({
        ...sessionMetadataRef.current,
        logVersion: '2025-10-05',
        identity: identityType,
        identityLabel:
          identityType === 'user'
            ? identitySnapshot?.user?.email ?? null
            : identitySnapshot?.guestProfile?.label ?? 'Guest',
        guest: identityType !== 'user',
        scenario: defaultAgentSetKey,
        agentName: selectedAgentNameRef.current || null,
        assistantMessageCount: assistantMessages.length,
        userMessageCount: userMessages.length,
        toolCallCount: toolEntries.length,
        eventCount: Array.isArray(loggedEventsRef.current) ? loggedEventsRef.current.length : undefined,
        reason: reason ?? undefined,
        mcpState: mcpSnapshot?.state ?? undefined,
        mcpDetail: mcpSnapshot?.detail ?? undefined,
        mcpMintedBearer: typeof mcpSnapshot?.minted === 'boolean' ? mcpSnapshot.minted : undefined,
      });

      return {
        sessionId: sessionId ?? null,
        startedAt: new Date(firstTimestampMs).toISOString(),
        endedAt: new Date(endedAtMs).toISOString(),
        durationMs,
        transcript: transcriptEntries,
        toolCalls: toolEntries,
        metadata,
        status: 'pending_summary',
        error: null,
        usage: sessionUsageRef.current ?? undefined,
      };
    }, []);

  const flushSessionLog = useCallback(
    async (options?: { reason?: string; beacon?: boolean }) => {
      if (sessionFlushInFlightRef.current) return;
      if (hasFlushedSessionRef.current) return;

      const payload = buildSessionLogPayload(options?.reason);
      if (!payload) {
        return;
      }

      const serialized = JSON.stringify(payload);

      if (options?.beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        try {
          const blob = new Blob([serialized], { type: 'application/json' });
          const ok = navigator.sendBeacon('/api/realtime/logs', blob);
          if (ok) {
            void deleteRealtimeSession();
            hasFlushedSessionRef.current = true;
            realtimeSessionIdRef.current = null;
            sessionStartedAtRef.current = null;
            sessionMetadataRef.current = {};
            sessionUsageRef.current = null;
            return;
          }
        } catch (error) {
          console.warn('Session log beacon failed, falling back to fetch.', error);
        }
      }

      sessionFlushInFlightRef.current = true;
      try {
        const response = await fetch('/api/realtime/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: serialized,
          keepalive: Boolean(options?.beacon),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          console.warn('Session log upload failed', response.status, text.slice(0, 200));
          return;
        }

        await deleteRealtimeSession();
        hasFlushedSessionRef.current = true;
        realtimeSessionIdRef.current = null;
        sessionStartedAtRef.current = null;
        sessionMetadataRef.current = {};
        sessionUsageRef.current = null;
      } catch (error) {
        console.warn('Session log upload error', error);
      } finally {
        sessionFlushInFlightRef.current = false;
      }
    },
    [buildSessionLogPayload, deleteRealtimeSession],
  );

  useEffect(() => {
    const previous = sessionStatusPrevRef.current;
    if (sessionStatus === 'CONNECTED' && previous !== 'CONNECTED') {
      sessionStartedAtRef.current = Date.now();
      hasFlushedSessionRef.current = false;
    }
    if (previous === 'CONNECTED' && sessionStatus !== 'CONNECTED') {
      void flushSessionLog({ reason: 'status_change' });
    }
    sessionStatusPrevRef.current = sessionStatus;
  }, [sessionStatus, flushSessionLog]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePageHide = () => {
      void flushSessionLog({ reason: 'pagehide', beacon: true });
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [flushSessionLog]);

  useEffect(() => {
    return () => {
      void flushSessionLog({ reason: 'unmount', beacon: true });
    };
  }, [flushSessionLog]);

  const hasAssistantReply = useMemo(
    () =>
      transcriptItems.some(
        (item) => item.type === "MESSAGE" && item.role === "assistant" && !item.isHidden,
      ),
    [transcriptItems],
  );

  const heroCollapsed = hasAssistantReply;

  const handleSaveLog = () => {
    try {
      const artifact = {
        timestamp: new Date().toISOString(),
        source: "live",
        structured: {
          transcripts: transcriptItems,
          events: loggedEvents,
        },
        meta: {
          assistantMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "assistant" && !item.isHidden,
          ).length,
          userMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "user",
          ).length,
          generatedAt: new Date().toLocaleString(),
        },
      };

      const blob = new Blob([JSON.stringify(artifact, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `live-${artifact.timestamp.replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      requestAnimationFrame(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error("Failed to save run artifact:", error);
    }
  };

  const handleCopyTranscript = async () => {
    const transcriptRef = document.querySelector('[data-transcript-messages]');
    if (transcriptRef) {
      await navigator.clipboard.writeText(transcriptRef.textContent || '');
    }
  };

  const heroContainerClassName = [
    "px-6 sm:px-7",
    heroCollapsed ? "py-3 lg:py-4" : "py-7",
    "transition-all duration-500 ease-out",
  ].join(" ");
  const heroControlsClassName = heroCollapsed ? "mt-0 lg:mt-0" : "mt-5";

  const composerAttachmentDisplay = useMemo(
    () =>
      composerAttachments.map(({ id, label, description }) => ({
        id,
        label,
        description,
      })),
    [composerAttachments],
  );

  const [timeOfDaySlot, setTimeOfDaySlot] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const determineSlot = (hours: number): 'morning' | 'afternoon' | 'evening' | 'night' => {
      if (hours < 5) return 'night';
      if (hours < 12) return 'morning';
      if (hours < 18) return 'afternoon';
      if (hours < 22) return 'evening';
      return 'night';
    };
    setTimeOfDaySlot(determineSlot(new Date().getHours()));
  }, []);

  const resolvePreferredName = useCallback(() => {
    const email = sessionIdentity.user?.email ?? authEmail;
    if (email && email.includes('@')) {
      const name = email.split('@')[0]?.trim();
      if (name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    return 'there';
  }, [sessionIdentity.user?.email, authEmail]);

  const [nextConversationPrompt, setNextConversationPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (sessionIdentity.type !== 'user') {
      setNextConversationPrompt(null);
      return;
    }

    let cancelled = false;

    const fetchNextPrompt = async () => {
      try {
        const response = await fetch('/api/realtime/memories', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Memories request failed (${response.status})`);
        }

        const payload = await response.json();
        const value = typeof payload?.nextConversationPrompt === 'string'
          ? payload.nextConversationPrompt.trim()
          : '';

        if (!cancelled) {
          setNextConversationPrompt(value.length ? value : null);
        }
      } catch (error) {
        console.warn('[hero] failed to fetch next conversation prompt', error);
        if (!cancelled) {
          setNextConversationPrompt(null);
        }
      }
    };

    fetchNextPrompt();

    return () => {
      cancelled = true;
    };
  }, [sessionIdentity.type, sessionIdentity.user?.id]);

  const deterministicPromptIndex = useMemo(() => {
    const name = resolvePreferredName();
    const seed = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return seed % HERO_RETURNING_PROMPTS.length;
  }, [resolvePreferredName]);

  const heroLoading = authLoading;

  const heroTitle = useMemo(() => {
    if (heroLoading) {
      return '';
    }

    if (sessionIdentity.type !== 'user') {
      return "Hi, I'm Dexter.";
    }

    const slotLabel = timeOfDaySlot === 'night' ? 'evening' : timeOfDaySlot;
    const greetingPrefix = `Good ${slotLabel}`;

    const preferredName = resolvePreferredName();
    return `${greetingPrefix}, ${preferredName}.`;
  }, [heroLoading, sessionIdentity.type, timeOfDaySlot, resolvePreferredName]);

  const heroSubtitle = useMemo(() => {
    if (heroLoading) {
      return '';
    }

    if (sessionIdentity.type !== 'user') {
      // return 'You are currently using the Dexter demo wallet shared by all guests. You can check the live balance and place real trades as if it were your own. Log in to get your own Dexter wallet.';
      return 'Dexter Voice is temporarily limited while we perform upgrades. Please check back later.';
    }

    if (nextConversationPrompt && nextConversationPrompt.length) {
      return nextConversationPrompt;
    }

    return HERO_RETURNING_PROMPTS[deterministicPromptIndex];
  }, [heroLoading, sessionIdentity.type, deterministicPromptIndex, nextConversationPrompt]);

  const sessionRoleVariant = useMemo(
    () => resolveSessionRoleVariant(sessionIdentity, userBadge),
    [sessionIdentity, userBadge],
  );

  const sessionRoleLabel = useMemo(
    () => resolveSessionRoleLabel(sessionRoleVariant),
    [sessionRoleVariant],
  );

  const supabaseRolesDisplay = useMemo(
    () => (sessionIdentity.user?.roles ?? []).map((value) => String(value)),
    [sessionIdentity.user?.roles],
  );

  const walletSecondaryLabel = useMemo(() => {
    if (!walletPortfolioSummary) return null;
    if (walletPortfolioPending) return 'Syncing…';
    if (walletPortfolioStatus === 'loading') return 'Loading…';
    if (walletPortfolioStatus === 'error') return walletPortfolioError ?? 'Balance error';

    const parts: string[] = [];
    if (walletPortfolioSummary.solBalanceFormatted) {
      parts.push(walletPortfolioSummary.solBalanceFormatted);
    }
    if (walletPortfolioSummary.totalUsdFormatted) {
      parts.push(walletPortfolioSummary.totalUsdFormatted);
    }
    if (walletPortfolioSummary.tokenCount) {
      parts.push(`${walletPortfolioSummary.tokenCount} tokens`);
    }
    return parts.length ? parts.join(' • ') : null;
  }, [walletPortfolioSummary, walletPortfolioPending, walletPortfolioStatus, walletPortfolioError]);

  const heroControlsProps: HeroControlsProps = {
    sessionStatus,
    className: heroControlsClassName,
    onOpenSignals: () => setIsMobileSignalsOpen(true),
    onCopyTranscript: handleCopyTranscript,
    onDownloadAudio: downloadRecording,
    onSaveLog: handleSaveLog,
    canUseAdminTools,
    showSuperAdminTools: isSuperAdmin,
    userBadge,
    dossierSupabaseUserId: sessionIdentity.type === 'user'
      ? sessionIdentity.user?.id ?? null
      : null,
    onOpenSuperAdmin: () => setIsSuperAdminModalOpen(true),
    onOpenPersonaModal: () => setIsPersonaModalOpen(true),
  };

  const transcriptProps: TranscriptMessagesProps = {
    hasActivatedSession,
    onSendMessage: (message: string) => {
      void handleSendTextMessage(message);
    },
    canViewDebugPayloads,
    onStartConversation: () => handleStartConversation(),
    onCaptureCrestOrigin: (rect) => {
      if (rect) {
        if (typeof window !== 'undefined') {
          const scrollX = typeof window.scrollX === 'number' ? window.scrollX : window.pageXOffset;
          const scrollY = typeof window.scrollY === 'number' ? window.scrollY : window.pageYOffset;
          const viewport = window.visualViewport;
          const offsetLeft = viewport?.offsetLeft ?? 0;
          const offsetTop = viewport?.offsetTop ?? 0;

          setCrestOrigin({
            pageLeft: rect.left + scrollX + offsetLeft,
            pageTop: rect.top + scrollY + offsetTop,
            width: rect.width,
            height: rect.height,
          });
        }
      } else {
        setCrestOrigin(null);
      }
    },
  };

  const inputBarProps: InputBarProps = {
    userText,
    setUserText,
    onSendMessage: () => {
      void handleSendTextMessage();
    },
    canSend: sessionStatus !== 'CONNECTING',
    attachments: composerAttachmentDisplay,
    onRemoveAttachment: handleRemoveComposerAttachment,
    onAddAttachments: handleAddComposerAttachments,
  };

  const signalStackProps: SignalStackLayoutProps = {
    showLogs: isEventsPaneExpanded,
    toolCatalog: filteredToolCatalog,
  };

  const bottomStatusProps: BottomStatusRailProps = {
    onOpenDebugModal: () => setIsDebugModalOpen(true),
    onOpenSignals: () => setIsMobileSignalsOpen(true),
    voiceControl: {
      isLive: sessionStatus === 'CONNECTED',
      isMuted: isVoiceMuted,
      onToggleMuted: () => setIsVoiceMuted((prev) => !prev),
    },
    vadControl: {
      isOpen: isVadPanelOpen,
      onToggle: () => setIsVadPanelOpen((prev) => !prev),
    },
    canUseSignals: canUseAdminTools,
    canUseDebug: canUseAdminTools,
  };

  const signalsDrawerProps: SignalsDrawerShellProps = {
    open: isMobileSignalsOpen,
    onClose: () => setIsMobileSignalsOpen(false),
  };

  const activeWalletAddress = walletPortfolio?.address
    ?? sessionIdentity.wallet?.public_key
    ?? signalData.wallet.summary.activeWallet
    ?? null;

  const walletLabel = useMemo(
    () => formatWalletAddress(activeWalletAddress),
    [activeWalletAddress],
  );

  const walletDebugInfo = useMemo(() => ({
    address: activeWalletAddress,
    formattedLabel: walletLabel,
    secondaryText: walletSecondaryLabel,
    status: walletPortfolioStatus,
    pending: walletPortfolioPending,
    error: walletPortfolioError,
    summary: walletPortfolioSummary,
  }), [
    activeWalletAddress,
    walletLabel,
    walletSecondaryLabel,
    walletPortfolioStatus,
    walletPortfolioPending,
    walletPortfolioError,
    walletPortfolioSummary,
  ]);

  const topRibbonProps: TopRibbonProps = {
    sessionStatus,
    onToggleConnection,
    onReloadBrand: () => window.location.reload(),
    authState: {
      loading: authLoading,
      isAuthenticated: Boolean(authSession),
      email: authEmail,
    },
    sessionIdentity,
    activeWalletKey: activeWalletAddress,
    walletPortfolio: walletPortfolioSummary,
    onSignIn: handleSignIn,
    onSignOut: handleSignOut,
    turnstileSiteKey,
    userBadge,
    showHeaderCrest: hasActivatedSession,
    crestOrigin,
  };

  const identityLabel = sessionIdentity.type === "user"
    ? sessionIdentity.user?.email?.split("@")[0] || "User"
    : "Demo";

  const debugModalProps: DebugInfoModalProps = {
    open: isDebugModalOpen,
    onClose: () => setIsDebugModalOpen(false),
    connectionStatus: sessionStatus,
    identityLabel,
    mcpStatus: mcpStatus.label,
    mcpDetail: mcpStatus.detail ?? null,
    roleLabel: sessionRoleLabel,
    roleVariant: sessionRoleVariant,
    authEmail,
    walletStatus: walletLabel ?? (signalData.wallet.summary.activeWallet || "Auto"),
    walletInfo: walletDebugInfo,
    supabaseRoles: supabaseRolesDisplay,
    mcpRoles: mcpJwtRoles,
    isAudioPlaybackEnabled,
    setIsAudioPlaybackEnabled,
    isEventsPaneExpanded,
    setIsEventsPaneExpanded,
    codec: urlCodec,
    onCodecChange: handleCodecChange,
    buildTag: process.env.NEXT_PUBLIC_BUILD_TAG ?? "dev",
    agents: scenarioAgents,
    selectedAgentName,
    onAgentChange: handleSelectedAgentChange,
    canManageAgents: canUseAdminTools,
  };

  const superAdminModalProps: SuperAdminModalProps = {
    open: isSuperAdminModalOpen,
    onClose: () => setIsSuperAdminModalOpen(false),
  };

  const personaModalProps: AgentPersonaModalProps = {
    open: isPersonaModalOpen,
    onClose: () => setIsPersonaModalOpen(false),
    loading: promptProfiles.loading,
    profiles: promptProfiles.profiles,
    activeResolvedProfile: promptProfiles.activeResolvedProfile ?? activeConciergeProfile,
    onCreate: promptProfiles.createProfile,
    onUpdate: promptProfiles.updateProfile,
    onActivate: promptProfiles.activateProfile,
    onDelete: promptProfiles.deleteProfile,
    onPreview: promptProfiles.previewProfile,
    presets: PERSONA_PRESETS,
  };

  const vadPanelProps: VadControlPanelProps = {
    isOpen: isVadPanelOpen,
    onClose: () => setIsVadPanelOpen(false),
    settings: vadSettings,
    defaults: DEFAULT_VAD_SETTINGS,
    onChange: applyVadSettings,
    onReset: resetVadSettings,
  };

  return {
    topRibbonProps,
    heroContainerClassName,
    heroTitle,
    heroSubtitle,
    heroLoading,
    heroCollapsed,
    heroControlsProps,
    transcriptProps,
    inputBarProps,
    signalStackProps,
    bottomStatusProps,
    signalsDrawerProps,
    debugModalProps,
    superAdminModalProps,
    personaModalProps,
    vadPanelProps,
    hasConnectedOnce,
  };
}
