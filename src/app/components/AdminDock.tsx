"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipboardCopyIcon,
  DownloadIcon,
  MixerHorizontalIcon,
  ReaderIcon,
  ChevronDownIcon,
  FileTextIcon,
  MagicWandIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";

import { MEMORY_LIMITS } from "@/app/config/memory";
import type { DexterUserBadge } from "@/app/types";

interface AdminDockProps {
  canUseAdminTools: boolean;
  showSuperAdminTools: boolean;
  onOpenSuperAdmin?: () => void;
  onOpenSignals: () => void;
  onCopyTranscript: () => Promise<void>;
  onDownloadAudio: () => void;
  onSaveLog: () => void;
  onOpenPersonaModal?: () => void;
  renderAdminConsole?: () => React.ReactNode;
  adminConsoleMetadata?: {
    toolCount: number;
    lastUpdated: Date | null;
    source: "live" | "cache" | "none";
  };
  dossierSupabaseUserId: string | null;
  userBadge?: DexterUserBadge | null;
}

type MemoryEntry = {
  id: string;
  summary: string;
  facts: string[];
  followUps: string[];
  createdAt: string | null;
  sessionId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  status: "summarized" | "skipped";
};

type DossierPayload = {
  ok: boolean;
  user: {
    id: string;
    email: string | null;
    roles: string[];
    isSuperAdmin: boolean;
    isAdmin: boolean;
  };
  target: {
    supabaseUserId: string;
    preferredName: string | null;
    displayName: string | null;
    twitterHandle: string | null;
    metadata: Record<string, any> | null;
    updatedAt: string | null;
    onboardedAt: string | null;
  };
  dossier: any;
  stats: {
    memoriesTotal: number;
    skippedTotal: number;
  };
};

const DOCK_POSITION_STORAGE_KEY = "dexter-admin-dock-position";

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

function formatTimestamp(iso: string | null) {
  if (!iso) return "Recently";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const dockButtonClass =
  'pointer-events-auto inline-flex h-7 items-center gap-1 rounded-sm px-2 py-0 text-[10px] font-semibold font-display font-semibold tracking-[0.08em] leading-none transition disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FEE2E2]/70';

const adminButtonTone =
  'bg-[#C81E1E] text-[#FEFBF4] hover:bg-[#EF4444] focus-visible:ring-offset-1 focus-visible:ring-offset-[#280404]';

const superAdminButtonTone =
  'bg-[#FACC15] text-[#2C1A00] hover:bg-[#EAB308] focus-visible:ring-offset-1 focus-visible:ring-offset-[#2C1500]';

const CrownGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
    className={className}
    fill="currentColor"
    stroke="none"
  >
    <path d="M4 17.25h16v2.25H4zm1.6-8.9 3.43 4.22 2.19-2.74 2.18 2.74 3.44-4.22 1.66 7.4H3.95z" />
  </svg>
);

const panelContainerBase =
  "rounded-2xl border border-neutral-800/70 bg-surface-raised/95 shadow-elevated backdrop-blur-xl";

export default function AdminDock({
  canUseAdminTools,
  showSuperAdminTools,
  onOpenSuperAdmin,
  onOpenSignals,
  onCopyTranscript,
  onDownloadAudio,
  onSaveLog,
  onOpenPersonaModal,
  renderAdminConsole,
  adminConsoleMetadata,
  dossierSupabaseUserId,
  userBadge,
}: AdminDockProps) {
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isDockExpanded, setIsDockExpanded] = useState(false);
  const [dockPosition, setDockPosition] = useState<{ x: number; y: number } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const consoleButtonRef = useRef<HTMLButtonElement | null>(null);
  const consolePanelRef = useRef<HTMLDivElement | null>(null);
  const memoriesButtonRef = useRef<HTMLButtonElement | null>(null);
  const memoriesPanelRef = useRef<HTMLDivElement | null>(null);
  const dossierButtonRef = useRef<HTMLButtonElement | null>(null);
  const dossierPanelRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const ignoreClickRef = useRef(false);
  const wasDraggedRef = useRef(false);

  const clampPosition = useCallback(
    (position: { x: number; y: number }, dimensions?: { width: number; height: number }) => {
      if (typeof window === "undefined") return position;

      const margin = 12;
      const dockWidth = dimensions?.width ?? dockRef.current?.offsetWidth ?? 96;
      const dockHeight = dimensions?.height ?? dockRef.current?.offsetHeight ?? 96;

      let leftOverflow = 0;
      let rightOverflow = 0;
      let bottomOverflow = 0;

      if (isDockExpanded && dockRef.current && panelRef.current) {
        const dockRect = dockRef.current.getBoundingClientRect();
        const panelRect = panelRef.current.getBoundingClientRect();

        leftOverflow = Math.max(0, dockRect.left - panelRect.left);
        rightOverflow = Math.max(0, panelRect.right - dockRect.right);
        bottomOverflow = Math.max(0, panelRect.bottom - dockRect.bottom);
      }

      const minX = margin + leftOverflow;
      const maxX = Math.max(window.innerWidth - margin - dockWidth - rightOverflow, margin);
      const minY = margin;
      const maxY = Math.max(window.innerHeight - margin - dockHeight - bottomOverflow, margin);

      const nextX = Math.min(Math.max(position.x, minX), maxX);
      const nextY = Math.min(Math.max(position.y, minY), maxY);

      return { x: nextX, y: nextY };
    },
    [isDockExpanded],
  );

  const persistPosition = useCallback((position: { x: number; y: number }) => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(DOCK_POSITION_STORAGE_KEY, JSON.stringify(position));
    } catch (error) {
      console.warn("[admin-dock] failed to persist position", error);
    }
  }, []);

  const handleDragPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isHydrated || !dockRef.current) return;
    if (event.button && event.button !== 0) return;
    ignoreClickRef.current = false;
    const rect = dockRef.current.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [isHydrated]);

  const handleDragPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || !dockRef.current) {
      return;
    }

    const deltaX = Math.abs(event.clientX - dragState.startX);
    const deltaY = Math.abs(event.clientY - dragState.startY);
    if (!dragState.moved && (deltaX > 3 || deltaY > 3)) {
      dragState.moved = true;
    }

    const bounds = {
      width: dockRef.current.offsetWidth,
      height: dockRef.current.offsetHeight,
    };

    const nextPosition = clampPosition({
      x: event.clientX - dragState.offsetX,
      y: event.clientY - dragState.offsetY,
    }, bounds);

    setDockPosition((prev) => {
      if (prev && prev.x === nextPosition.x && prev.y === nextPosition.y) {
        return prev;
      }
      return nextPosition;
    });
  }, [clampPosition]);

  const handleDragPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      const finalPosition = clampPosition({ x: rect.left, y: rect.top }, {
        width: rect.width,
        height: rect.height,
      });
      setDockPosition(finalPosition);
      persistPosition(finalPosition);
    }

    if (dragState.moved) {
      ignoreClickRef.current = true;
      wasDraggedRef.current = true;
      window.setTimeout(() => {
        ignoreClickRef.current = false;
        wasDraggedRef.current = false;
      }, 120);
    }
  }, [clampPosition, persistPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsHydrated(true);

    let storedPosition: { x: number; y: number } | null = null;
    const stored = window.sessionStorage.getItem(DOCK_POSITION_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.x === "number" && typeof parsed.y === "number") {
          storedPosition = clampPosition(parsed);
        }
      } catch (error) {
        console.warn("[admin-dock] failed to parse stored position", error);
      }
    }

    const defaultWidth = 80;
    const defaultHeight = 96;
    const initialPosition = storedPosition
      ?? clampPosition({
        x: Math.max(window.innerWidth - defaultWidth - 32, 16),
        y: Math.max(window.innerHeight - defaultHeight - 32, 16),
      });

    setDockPosition((prev) => {
      if (prev) return prev;
      if (!storedPosition) {
        persistPosition(initialPosition);
      }
      return initialPosition;
    });

    const handleResize = () => {
      setDockPosition((prev) => {
        if (!prev) return prev;
        const clamped = clampPosition(prev);
        if (clamped.x === prev.x && clamped.y === prev.y) {
          return prev;
        }
        persistPosition(clamped);
        return clamped;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [clampPosition, persistPosition]);

  useEffect(() => {
    if (!dockPosition) return;
    setDockPosition((prev) => {
      if (!prev) return prev;
      const clamped = clampPosition(prev);
      if (clamped.x === prev.x && clamped.y === prev.y) {
        return prev;
      }
      persistPosition(clamped);
      return clamped;
    });
  }, [isDockExpanded, clampPosition, dockPosition, persistPosition]);

  const closeAllPanels = useCallback(() => {
    setIsAdminConsoleOpen(false);
    setIsMemoriesOpen(false);
    setIsDossierOpen(false);
  }, []);

  useEffect(() => {
    if (!isDockExpanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (dockRef.current?.contains(target)) return;
      setIsDockExpanded(false);
      closeAllPanels();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDockExpanded(false);
        closeAllPanels();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDockExpanded, closeAllPanels]);

  const [consolePlacement, setConsolePlacement] = useState<
    | {
        top: number;
        right: number;
        width: number;
        maxHeight: number;
      }
    | null
  >(null);
  const [memoriesPlacement, setMemoriesPlacement] = useState<
    | {
        top: number;
        width: number;
        maxHeight: number;
        left?: number;
      }
    | null
  >(null);
  const [dossierPlacement, setDossierPlacement] = useState<
    | {
        top: number;
        width: number;
        maxHeight: number;
        left?: number;
      }
    | null
  >(null);

  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [memoriesError, setMemoriesError] = useState<string | null>(null);
  const [totalMemories, setTotalMemories] = useState<number | null>(null);
  const [totalSkipped, setTotalSkipped] = useState<number | null>(null);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);

  const [isDossierLoading, setIsDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<DossierPayload | null>(null);

  useEffect(() => {
    if (!isDockExpanded) {
      closeAllPanels();
    }
  }, [isDockExpanded, closeAllPanels]);

  const updateConsolePlacement = useCallback(() => {
    if (!consoleButtonRef.current) return;
    const rect = consoleButtonRef.current.getBoundingClientRect();
    const horizontalMargin = 16;
    const verticalMargin = 16;
    const desiredTop = rect.bottom + 12;
    const panelMaxHeight = 520;
    const width = Math.min(420, window.innerWidth - horizontalMargin * 2);

    let top = desiredTop;
    if (top + panelMaxHeight + verticalMargin > window.innerHeight) {
      top = Math.max(verticalMargin, window.innerHeight - panelMaxHeight - verticalMargin);
    }

    const availableHeight = Math.max(window.innerHeight - top - verticalMargin, 280);
    const maxHeight = Math.min(panelMaxHeight, availableHeight);
    const right = Math.max(window.innerWidth - rect.right - horizontalMargin, horizontalMargin);

    setConsolePlacement({ top, right, width, maxHeight });
  }, []);

  const updateMemoriesPlacement = useCallback(() => {
    if (!memoriesButtonRef.current) return;

    const rect = memoriesButtonRef.current.getBoundingClientRect();
    const horizontalMargin = 16;
    const verticalMargin = 16;
    const desiredTop = rect.bottom + 12;
    const panelMaxHeight = 520;

    let width = Math.min(420, window.innerWidth - horizontalMargin * 2);

    let top = desiredTop;
    if (top + panelMaxHeight + verticalMargin > window.innerHeight) {
      top = Math.max(verticalMargin, window.innerHeight - panelMaxHeight - verticalMargin);
    }

    const availableHeight = Math.max(window.innerHeight - top - verticalMargin, 280);
    const maxHeight = Math.min(panelMaxHeight, availableHeight);
    const preferFullWidth = window.innerWidth <= 640;
    let left: number | undefined;

    if (preferFullWidth) {
      width = window.innerWidth - horizontalMargin * 2;
      left = horizontalMargin;
    } else {
      const candidateLeft = Math.min(rect.left, window.innerWidth - width - horizontalMargin);
      left = Math.max(candidateLeft, horizontalMargin);
    }

    setMemoriesPlacement({ top, width, maxHeight, left });
  }, []);

  const updateDossierPlacement = useCallback(() => {
    if (!dossierButtonRef.current) return;

    const rect = dossierButtonRef.current.getBoundingClientRect();
    const horizontalMargin = 16;
    const verticalMargin = 16;
    const desiredTop = rect.bottom + 12;
    const panelMaxHeight = 520;

    let width = Math.min(460, window.innerWidth - horizontalMargin * 2);

    let top = desiredTop;
    if (top + panelMaxHeight + verticalMargin > window.innerHeight) {
      top = Math.max(verticalMargin, window.innerHeight - panelMaxHeight - verticalMargin);
    }

    const availableHeight = Math.max(window.innerHeight - top - verticalMargin, 280);
    const maxHeight = Math.min(panelMaxHeight, availableHeight);
    const preferFullWidth = window.innerWidth <= 720;
    let left: number | undefined;

    if (preferFullWidth) {
      width = window.innerWidth - horizontalMargin * 2;
      left = horizontalMargin;
    } else {
      const candidateLeft = Math.min(rect.left, window.innerWidth - width - horizontalMargin);
      left = Math.max(candidateLeft, horizontalMargin);
    }

    setDossierPlacement({ top, width, maxHeight, left });
  }, []);

  const loadMemories = useCallback(async () => {
    try {
      setIsLoadingMemories(true);
      setMemoriesError(null);
      const response = await fetch('/api/realtime/memories', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const payload = await response.json();
      const timestamp = Date.now();
      const savedItems: MemoryEntry[] = Array.isArray(payload?.memories)
        ? payload.memories.map((entry: any, index: number) => ({
            id: entry?.id ? String(entry.id) : `memory-${index}-${timestamp}`,
            summary: typeof entry?.summary === 'string' && entry.summary.trim().length
              ? entry.summary.trim()
              : 'No summary recorded.',
            facts: Array.isArray(entry?.facts)
              ? entry.facts
                  .filter((item: unknown) => typeof item === 'string' && item.trim().length)
                  .map((item: string) => item.trim())
              : [],
            followUps: Array.isArray(entry?.followUps)
              ? entry.followUps
                  .filter((item: unknown) => typeof item === 'string' && item.trim().length)
                  .map((item: string) => item.trim())
              : [],
            createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : null,
            sessionId: typeof entry?.sessionId === 'string' && entry.sessionId.trim().length
              ? entry.sessionId.trim()
              : null,
            startedAt: typeof entry?.startedAt === 'string' && entry.startedAt.trim().length
              ? entry.startedAt.trim()
              : null,
            endedAt: typeof entry?.endedAt === 'string' && entry.endedAt.trim().length
              ? entry.endedAt.trim()
              : null,
            status: 'summarized',
          }))
        : [];
      const skippedItems: MemoryEntry[] = Array.isArray(payload?.skipped)
        ? payload.skipped.map((entry: any, index: number) => ({
            id: entry?.id ? String(entry.id) : `skipped-${index}-${timestamp}`,
            summary: typeof entry?.summary === 'string' && entry.summary.trim().length
              ? entry.summary.trim()
              : 'Session skipped (no retained content)',
            facts: [],
            followUps: [],
            createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : null,
            sessionId: typeof entry?.sessionId === 'string' && entry.sessionId.trim().length
              ? entry.sessionId.trim()
              : null,
            startedAt: typeof entry?.startedAt === 'string' && entry.startedAt.trim().length
              ? entry.startedAt.trim()
              : null,
            endedAt: typeof entry?.endedAt === 'string' && entry.endedAt.trim().length
              ? entry.endedAt.trim()
              : null,
            status: 'skipped',
          }))
        : [];

      const combined = [...savedItems, ...skippedItems].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      setMemories(combined);
      setExpandedMemoryId(combined.length ? combined[0].id : null);
      const total = typeof payload?.total === 'number' ? payload.total : savedItems.length;
      setTotalMemories(total);
      const skippedTotal = typeof payload?.totalSkipped === 'number' ? payload.totalSkipped : skippedItems.length;
      setTotalSkipped(skippedTotal);
    } catch (error: any) {
      console.error('[memories] load failed', error);
      setMemoriesError(error?.message || 'Failed to load memories');
      setMemories([]);
      setTotalSkipped(null);
      setTotalMemories(null);
    } finally {
      setIsLoadingMemories(false);
    }
  }, []);

  const loadDossier = useCallback(async () => {
    if (!dossierSupabaseUserId) {
      setDossierError('No authenticated user session.');
      setDossierData(null);
      return;
    }

    try {
      setIsDossierLoading(true);
      setDossierError(null);
      const params = new URLSearchParams();
      params.set('supabaseUserId', dossierSupabaseUserId);
      const response = await fetch(`/api/admin/dossier?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Request failed (${response.status}) ${text.slice(0, 120)}`);
      }
      const payload = (await response.json()) as DossierPayload;
      if (!payload?.ok) {
        setDossierError('No dossier available for this user.');
        setDossierData(null);
        return;
      }
      setDossierData(payload);
    } catch (error: any) {
      console.error('[dossier] load failed', error);
      setDossierError(error?.message || 'Failed to load dossier.');
      setDossierData(null);
    } finally {
      setIsDossierLoading(false);
    }
  }, [dossierSupabaseUserId]);

  useEffect(() => {
    if (!isAdminConsoleOpen) {
      setConsolePlacement(null);
      return;
    }

    updateConsolePlacement();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        consolePanelRef.current?.contains(target) ||
        consoleButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsAdminConsoleOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAdminConsoleOpen(false);
      }
    };

    const handleReposition = () => updateConsolePlacement();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isAdminConsoleOpen, updateConsolePlacement]);

  useEffect(() => {
    if (!isMemoriesOpen) {
      setMemoriesPlacement(null);
      return;
    }

    updateMemoriesPlacement();
    void loadMemories();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        memoriesPanelRef.current?.contains(target) ||
        memoriesButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsMemoriesOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMemoriesOpen(false);
      }
    };

    const handleReposition = () => updateMemoriesPlacement();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isMemoriesOpen, updateMemoriesPlacement, loadMemories]);

  useEffect(() => {
    if (!isDossierOpen) {
      setDossierPlacement(null);
      return;
    }

    updateDossierPlacement();
    void loadDossier();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dossierPanelRef.current?.contains(target) ||
        dossierButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsDossierOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDossierOpen(false);
      }
    };

    const handleReposition = () => updateDossierPlacement();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isDossierOpen, updateDossierPlacement, loadDossier]);

  const handleMemoriesToggle = useCallback(() => {
    setIsMemoriesOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsAdminConsoleOpen(false);
        setIsDossierOpen(false);
      }
      return next;
    });
  }, []);

  const handleDossierToggle = useCallback(() => {
    setIsDossierOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsAdminConsoleOpen(false);
        setIsMemoriesOpen(false);
      }
      return next;
    });
  }, []);

  const handleAdminConsoleToggle = useCallback(() => {
    setIsAdminConsoleOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsMemoriesOpen(false);
        setIsDossierOpen(false);
      }
      return next;
    });
  }, []);

  const badgeCount = totalMemories ?? memories.filter((entry) => entry.status === 'summarized').length;
  const badgeLabel = badgeCount > MEMORY_LIMITS.adminPanel.recentCount
    ? `${MEMORY_LIMITS.adminPanel.recentCount}+`
    : `${badgeCount}`;
  const savedDisplayed = memories.filter((entry) => entry.status === 'summarized').length;
  const skippedDisplayed = memories.filter((entry) => entry.status === 'skipped').length;
  const skippedCountDisplay = totalSkipped ?? skippedDisplayed;

  const headerText = useMemo(() => {
    if (isLoadingMemories) return 'Loading…';
    if (memoriesError) return 'Failed to load';
    if (badgeCount === 0 && skippedCountDisplay === 0) return 'No memories yet';

    const parts: string[] = [];
    if (badgeCount > 0) {
      const segment = totalMemories && totalMemories > savedDisplayed
        ? `${savedDisplayed} of ${badgeCount} saved`
        : `${badgeCount} saved`;
      parts.push(segment);
    }
    if (skippedCountDisplay > 0) {
      const segment = totalSkipped && totalSkipped > skippedDisplayed
        ? `${skippedDisplayed} of ${skippedCountDisplay} skipped`
        : `${skippedCountDisplay} skipped`;
      parts.push(segment);
    }
    return parts.join(' • ');
  }, [isLoadingMemories, memoriesError, badgeCount, skippedCountDisplay, savedDisplayed, skippedDisplayed, totalMemories, totalSkipped]);

  const dossierIdentity = useMemo(() => {
    const source = dossierData?.dossier?.identity;
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
    return source as Record<string, any>;
  }, [dossierData]);

  const dossierHoldings = useMemo(() => {
    const source = dossierData?.dossier?.holdings;
    if (!Array.isArray(source)) return [];
    return source as Array<Record<string, any>>;
  }, [dossierData]);

  const dossierPreferences = useMemo(() => {
    const source = dossierData?.dossier?.preferences;
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
    return source as Record<string, any>;
  }, [dossierData]);

  const renderKeyValueList = useCallback((value: Record<string, any> | null) => {
    if (!value) return null;
    const entries = Object.entries(value);
    if (!entries.length) return null;
    return (
      <dl className="space-y-1.5 text-[13px] leading-relaxed">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-start gap-2">
            <dt className="mt-0.5 w-28 shrink-0 font-display text-[11px] font-semibold tracking-[0.08em] text-neutral-500">
              {key}
            </dt>
            <dd className="flex-1 break-words text-neutral-100">
              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }, []);

  const adminConsoleStatus = useMemo(() => {
    if (!adminConsoleMetadata) return null;
    if (adminConsoleMetadata.lastUpdated) {
      return `Updated ${adminConsoleMetadata.lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (adminConsoleMetadata.source === 'cache') {
      return 'Showing cached data';
    }
    if (adminConsoleMetadata.source === 'live') {
      return 'Live feed';
    }
    return null;
  }, [adminConsoleMetadata]);

  const adminConsole = isAdminConsoleOpen && renderAdminConsole
    ? renderAdminConsole()
    : null;

  if (!canUseAdminTools) {
    return null;
  }

  const handleDockToggle = () => {
    if (ignoreClickRef.current || wasDraggedRef.current) return;
    setIsDockExpanded((prev) => !prev);
  };

  const dockStyle: React.CSSProperties = dockPosition
    ? { top: dockPosition.y, left: dockPosition.x }
    : { bottom: 24, right: 24 };

  return (
    <>
      <div ref={dockRef} className="fixed z-40" style={dockStyle}>
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            className={`group flex h-12 w-12 touch-none items-center justify-center rounded-full border border-[#EF4444]/55 bg-gradient-to-br from-[#F87171] via-[#EF4444] to-[#B91C1C] shadow-[0_18px_38px_rgba(220,38,38,0.45)] transition focus:outline-none focus:ring-2 focus:ring-[#FEE2E2]/70 focus:ring-offset-2 focus:ring-offset-[#2C0A00] ${isDockExpanded ? 'ring-2 ring-[#FEE2E2]/45' : ''}`}
            aria-expanded={isDockExpanded}
            aria-controls="admin-dock-panel"
            onClick={handleDockToggle}
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerUp}
          >
            {isDockExpanded ? (
              <Cross2Icon className="h-4 w-4 text-[#FDFEF9]" />
            ) : (
              <CrownGlyph className="h-3.5 w-3.5 text-[#FDFEF9]" />
            )}
            <span className="sr-only">{isDockExpanded ? 'Hide admin tools' : 'Show admin tools'}</span>
          </button>

          <AnimatePresence>
            {isDockExpanded && (
              <motion.div
                key="admin-dock-panel"
                initial={{ opacity: 0, y: -8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.94 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2"
              >
                <div
                  ref={panelRef}
                  id="admin-dock-panel"
                  className="pointer-events-auto flex max-w-[15rem] flex-wrap justify-start gap-1"
                >
                  <button
                    type="button"
                    ref={memoriesButtonRef}
                    onClick={handleMemoriesToggle}
                    className={`${dockButtonClass} ${adminButtonTone}`}
                    title="View stored memories"
                    aria-haspopup="dialog"
                    aria-expanded={isMemoriesOpen}
                    aria-label="Open memories panel"
                  >
                    <ReaderIcon className="h-3 w-3" />
                    <span className="text-[10px]">Memories</span>
                    {!isLoadingMemories && badgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#F87171]/70 px-1 text-[9px] font-semibold leading-none tracking-[0.08em] text-[#FDFEF9]">
                        {badgeLabel}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    ref={dossierButtonRef}
                    onClick={handleDossierToggle}
                    className={`${dockButtonClass} ${adminButtonTone}`}
                    title="Inspect dossier"
                    aria-haspopup="dialog"
                    aria-expanded={isDossierOpen}
                    aria-label="Open dossier panel"
                    disabled={!dossierSupabaseUserId}
                  >
                    <FileTextIcon className="h-3 w-3" />
                    <span className="text-[10px]">Dossier</span>
                  </button>

                  {onOpenPersonaModal && (
                    <button
                      type="button"
                      onClick={() => {
                        closeAllPanels();
                        onOpenPersonaModal();
                      }}
                      className={`${dockButtonClass} ${adminButtonTone}`}
                      title="Customize Dexter persona"
                      aria-label="Customize Dexter persona"
                    >
                      <MagicWandIcon className="h-3 w-3" />
                      <span className="text-[10px]">Persona</span>
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      await onCopyTranscript();
                    }}
                    className={`${dockButtonClass} ${adminButtonTone}`}
                    title="Copy transcript"
                  >
                    <ClipboardCopyIcon className="h-3 w-3" />
                    <span className="text-[10px]">Copy</span>
                  </button>

                  <button
                    onClick={onDownloadAudio}
                    className={`${dockButtonClass} ${adminButtonTone}`}
                    title="Download audio"
                  >
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    <span className="text-[10px]">Audio</span>
                  </button>

                  <button
                    onClick={onSaveLog}
                    className={`${dockButtonClass} ${adminButtonTone}`}
                    title="Save conversation log"
                  >
                    <DownloadIcon className="h-3 w-3" />
                    <span className="text-[10px]">Log</span>
                  </button>

                  {renderAdminConsole && (
                    <button
                      type="button"
                      ref={consoleButtonRef}
                      onClick={handleAdminConsoleToggle}
                      className={`${dockButtonClass} ${adminButtonTone} ${isAdminConsoleOpen ? 'ring-1 ring-[#FEE2E2]/60' : ''}`}
                      title="Open admin console"
                      aria-haspopup="dialog"
                      aria-expanded={isAdminConsoleOpen}
                      aria-label="Open admin console"
                    >
                      <MixerHorizontalIcon className="h-3 w-3" />
                      <span className="text-[10px]">Console</span>
                      {typeof adminConsoleMetadata?.toolCount === 'number' && (
                        <span className="absolute -top-1.5 -right-1.5 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#F87171]/70 px-1 text-[9px] font-semibold leading-none tracking-[0.08em] text-[#FDFEF9]">
                          {adminConsoleMetadata.toolCount}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      closeAllPanels();
                      onOpenSignals();
                    }}
                    className={`${dockButtonClass} ${adminButtonTone}`}
                    title="Open signals"
                  >
                    <MixerHorizontalIcon className="h-3 w-3 rotate-90" />
                    <span className="text-[10px]">Signals</span>
                  </button>

                  {showSuperAdminTools && onOpenSuperAdmin && (
                    <button
                      onClick={() => {
                        closeAllPanels();
                        onOpenSuperAdmin();
                      }}
                      className={`${dockButtonClass} ${superAdminButtonTone}`}
                      title="Open superadmin panel"
                    >
                      <CrownGlyph className="h-3 w-3" />
                      <span className="text-[10px]">Super</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {typeof window !== 'undefined' && isAdminConsoleOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div
                className="pointer-events-auto"
                style={{
                  position: 'fixed',
                  top: consolePlacement?.top ?? 96,
                  right: consolePlacement?.right ?? 24,
                  width: consolePlacement?.width ?? Math.min(420, window.innerWidth - 32),
                  maxHeight: consolePlacement?.maxHeight ?? 520,
                }}
              >
                <div
                  ref={consolePanelRef}
                  className="rounded-2xl border border-neutral-800/70 bg-surface-raised/95 shadow-elevated backdrop-blur-xl"
                  style={{ maxHeight: consolePlacement?.maxHeight ?? 520 }}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-neutral-800/60 px-5 py-4">
                    <div>
                      <div className="font-display text-sm font-display tracking-[0.08em] text-neutral-300">
                        Admin Console
                      </div>
                      {adminConsoleStatus && (
                        <div className="mt-1 text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">
                          {adminConsoleStatus}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAdminConsoleOpen(false)}
                      className="rounded-md border border-neutral-800/60 px-2 py-1 text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-300 transition hover:border-flux/50 hover:text-flux"
                    >
                      Close
                    </button>
                  </div>
                  <div
                    className="max-h-[520px] overflow-y-auto px-5 pb-5 pt-4"
                    style={{ maxHeight: consolePlacement?.maxHeight ?? 520 }}
                  >
                    {adminConsole}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {typeof window !== 'undefined' && isMemoriesOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div
                className="pointer-events-auto"
                style={{
                  position: 'fixed',
                  top: memoriesPlacement?.top ?? 96,
                  width: memoriesPlacement?.width ?? Math.min(420, window.innerWidth - 32),
                  maxHeight: memoriesPlacement?.maxHeight ?? 520,
                  ...(typeof memoriesPlacement?.left === 'number'
                    ? { left: memoriesPlacement.left }
                    : { right: 24 }),
                }}
              >
                <div
                  ref={memoriesPanelRef}
                  className="rounded-2xl border border-neutral-800/70 bg-surface-raised/95 shadow-elevated backdrop-blur-xl"
                  style={{ maxHeight: memoriesPlacement?.maxHeight ?? 520 }}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-neutral-800/60 px-5 py-4">
                    <div>
                      <div className="font-display text-sm font-display tracking-[0.08em] text-neutral-300">
                        Memories
                      </div>
                      <div className="mt-1 text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">
                        {headerText}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMemoriesOpen(false)}
                      className="rounded-md border border-neutral-800/60 px-2 py-1 text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-300 transition hover:border-flux/50 hover:text-flux"
                    >
                      Close
                    </button>
                  </div>
                  <div
                    className="max-h-[520px] overflow-y-auto px-5 pb-5 pt-4"
                    style={{ maxHeight: memoriesPlacement?.maxHeight ?? 520 }}
                  >
                    {isLoadingMemories ? (
                      <div className="text-sm text-neutral-400">Loading memories…</div>
                    ) : memoriesError ? (
                      <div className="text-sm text-accent-critical">{memoriesError}</div>
                    ) : memories.length === 0 ? (
                      <div className="text-sm text-neutral-400">No memories stored yet.</div>
                    ) : (
                      <ul className="space-y-3">
                        {memories.map((entry) => {
                          const isExpanded = expandedMemoryId === entry.id;
                          const isSkipped = entry.status === 'skipped';
                          const cardClassNames = [
                            'rounded-2xl border bg-surface-base/70',
                            isSkipped ? 'border-rose-500/50 bg-rose-500/10' : 'border-neutral-800/60',
                          ].join(' ');
                          const buttonHoverClass = isSkipped
                            ? 'hover:bg-rose-500/10'
                            : 'hover:bg-surface-glass/50';
                          return (
                            <li key={entry.id} className={cardClassNames}>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedMemoryId((prev) => (prev === entry.id ? null : entry.id))
                                }
                                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition ${buttonHoverClass}`}
                              >
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-neutral-100 line-clamp-2">
                                    {entry.summary || 'No summary recorded.'}
                                  </div>
                                  <div className="mt-2 text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">
                                    {formatTimestamp(entry.createdAt)}
                                  </div>
                                </div>
                                <ChevronDownIcon
                                  className={`mt-1 h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                              {isExpanded && (
                                <div className="space-y-4 border-t border-neutral-800/60 px-4 py-4 text-sm text-neutral-200">
                                  {entry.status === 'skipped' && (
                                    <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-[13px] leading-relaxed text-rose-100">
                                      This session ended before anything memorable, so it was skipped automatically.
                                    </div>
                                  )}
                                  {(entry.sessionId || entry.startedAt || entry.endedAt) && (
                                    <div>
                                      <div className="text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">
                                        Session details
                                      </div>
                                      <dl className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
                                        {entry.sessionId && (
                                          <div className="flex items-start gap-2">
                                            <dt className="mt-0.5 w-24 font-display text-[11px] font-semibold tracking-[0.08em] text-neutral-500">
                                              Session ID
                                            </dt>
                                            <dd className="flex-1 break-all text-neutral-200">{entry.sessionId}</dd>
                                          </div>
                                        )}
                                        {entry.startedAt && (
                                          <div className="flex items-start gap-2">
                                            <dt className="mt-0.5 w-24 font-display text-[11px] font-semibold tracking-[0.08em] text-neutral-500">
                                              Started
                                            </dt>
                                            <dd className="flex-1 text-neutral-200">{formatTimestamp(entry.startedAt)}</dd>
                                          </div>
                                        )}
                                        {entry.endedAt && (
                                          <div className="flex items-start gap-2">
                                            <dt className="mt-0.5 w-24 font-display text-[11px] font-semibold tracking-[0.08em] text-neutral-500">
                                              Ended
                                            </dt>
                                            <dd className="flex-1 text-neutral-200">{formatTimestamp(entry.endedAt)}</dd>
                                          </div>
                                        )}
                                      </dl>
                                    </div>
                                  )}
                                  {entry.facts.length > 0 && (
                                    <div>
                                      <div className="text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">
                                        Facts
                                      </div>
                                      <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
                                        {entry.facts.map((fact, index) => (
                                          <li key={`${entry.id}-fact-${index}`} className="flex items-start gap-2">
                                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-500" />
                                            <span>{fact}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {entry.followUps.length > 0 && (
                                    <div>
                                      <div className="text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">
                                        Follow-ups
                                      </div>
                                      <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
                                        {entry.followUps.map((followUp, index) => (
                                          <li key={`${entry.id}-follow-${index}`} className="flex items-start gap-2">
                                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-500" />
                                            <span>{followUp}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {typeof window !== 'undefined' && isDossierOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div
                className="pointer-events-auto"
                style={{
                  position: 'fixed',
                  top: dossierPlacement?.top ?? 96,
                  width: dossierPlacement?.width ?? Math.min(460, window.innerWidth - 32),
                  maxHeight: dossierPlacement?.maxHeight ?? 520,
                  ...(typeof dossierPlacement?.left === 'number'
                    ? { left: dossierPlacement.left }
                    : { right: 24 }),
                }}
              >
                <div
                  ref={dossierPanelRef}
                  className={panelContainerBase}
                  style={{ maxHeight: dossierPlacement?.maxHeight ?? 520 }}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-rose-500/40 px-5 py-4 text-rose-100">
                    <div>
                      <div className="font-display text-sm font-display tracking-[0.08em]">Dossier Inspector</div>
                      <div className="mt-1 text-[11px] font-display font-semibold tracking-[0.08em] text-rose-200/80">
                        {isDossierLoading
                          ? 'Loading…'
                          : dossierError
                          ? 'Failed to load'
                          : dossierData?.target?.preferredName
                          ? `User: ${dossierData.target.preferredName}`
                          : dossierData?.target?.supabaseUserId
                          ? `User: ${dossierData.target.supabaseUserId}`
                          : 'No dossier'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDossierOpen(false)}
                      className="rounded-md border border-rose-500/40 px-2 py-1 text-[11px] font-display font-semibold tracking-[0.08em] text-rose-100 transition hover:border-rose-300/70 hover:text-rose-50"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-[520px] overflow-y-auto px-5 pb-5 pt-4 text-sm text-neutral-100">
                    {isDossierLoading ? (
                      <div className="text-neutral-300">Loading dossier…</div>
                    ) : dossierError ? (
                      <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-rose-100">
                        {dossierError}
                      </div>
                    ) : dossierData ? (
                      <div className="space-y-5">
                        <section>
                          <div className="text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">Summary</div>
                          <div className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
                            <div><span className="text-neutral-400">Email:</span> {dossierData.target.displayName || dossierData.user.email || '—'}</div>
                            <div><span className="text-neutral-400">Supabase ID:</span> {dossierData.target.supabaseUserId}</div>
                            {userBadge && <div><span className="text-neutral-400">Badge:</span> {userBadge.toUpperCase()}</div>}
                            <div><span className="text-neutral-400">Memories:</span> {dossierData.stats.memoriesTotal}</div>
                            <div><span className="text-neutral-400">Skipped Sessions:</span> {dossierData.stats.skippedTotal}</div>
                          </div>
                        </section>

                        {dossierIdentity && (
                          <section>
                            <div className="text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">Identity</div>
                            <div className="mt-2">
                              {renderKeyValueList(dossierIdentity)}
                            </div>
                          </section>
                        )}

                        {dossierHoldings.length > 0 && (
                          <section>
                            <div className="text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">Holdings</div>
                            <ul className="mt-2 space-y-3">
                              {dossierHoldings.map((holding, index) => (
                                <li key={index} className="rounded-md border border-neutral-800/60 bg-surface-glass/20 p-3">
                                  <div className="text-sm font-medium text-neutral-100">
                                    {holding.symbol || 'Unknown asset'}
                                  </div>
                                  <div className="mt-1 text-[12px] text-neutral-300">
                                    {holding.usdValue ? `Value: ${holding.usdValue}` : null}
                                    {holding.portfolioWeightPct ? ` • ${holding.portfolioWeightPct}` : null}
                                  </div>
                                  <div className="mt-2 break-words text-[12px] text-neutral-400">
                                    {holding.mintAddress || ''}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {dossierPreferences && (
                          <section>
                            <div className="text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">Preferences</div>
                            <div className="mt-2">
                              {renderKeyValueList(dossierPreferences)}
                            </div>
                          </section>
                        )}

                        <section>
                          <div className="text-[11px] font-display font-semibold tracking-[0.08em] text-neutral-500">Raw JSON</div>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-neutral-800/60 bg-black/40 p-3 text-[12px] leading-snug text-neutral-200">
                            {JSON.stringify(dossierData.dossier ?? {}, null, 2)}
                          </pre>
                        </section>
                      </div>
                    ) : (
                      <div className="text-neutral-300">No dossier available.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
