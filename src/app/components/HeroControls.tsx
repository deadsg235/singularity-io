"use client";

import React from "react";

import AdminDock from "./AdminDock";
import type { DexterUserBadge, SessionStatus } from "@/app/types";

export interface HeroControlsProps {
  sessionStatus: SessionStatus;
  onOpenSignals: () => void;
  onCopyTranscript: () => Promise<void>;
  onDownloadAudio: () => void;
  onSaveLog: () => void;
  onOpenPersonaModal?: () => void;
  canUseAdminTools: boolean;
  showSuperAdminTools: boolean;
  onOpenSuperAdmin?: () => void;
  className?: string;
  renderAdminConsole?: () => React.ReactNode;
  adminConsoleMetadata?: {
    toolCount: number;
    lastUpdated: Date | null;
    source: "live" | "cache" | "none";
  };
  userBadge?: DexterUserBadge | null;
  dossierSupabaseUserId: string | null;
}

export default function HeroControls(props: HeroControlsProps) {
  if (!props.canUseAdminTools) {
    return null;
  }

  return (
    <AdminDock
      canUseAdminTools={props.canUseAdminTools}
      showSuperAdminTools={props.showSuperAdminTools}
      onOpenSuperAdmin={props.onOpenSuperAdmin}
      onOpenSignals={props.onOpenSignals}
      onCopyTranscript={props.onCopyTranscript}
      onDownloadAudio={props.onDownloadAudio}
      onSaveLog={props.onSaveLog}
      onOpenPersonaModal={props.onOpenPersonaModal}
      renderAdminConsole={props.renderAdminConsole}
      adminConsoleMetadata={props.adminConsoleMetadata}
      dossierSupabaseUserId={props.dossierSupabaseUserId}
      userBadge={props.userBadge}
    />
  );
}
