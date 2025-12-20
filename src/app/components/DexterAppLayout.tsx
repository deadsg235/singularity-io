"use client";

import React from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";

import Hero from "./Hero";
import AdminDock from "./AdminDock";
import TranscriptMessages from "./TranscriptMessages";
import InputBar from "./InputBar";
import Events from "./Events";
import DexterShell from "./shell/DexterShell";
import TopRibbon from "./shell/TopRibbon";
import BottomStatusRail from "./shell/BottomStatusRail";
import SignalStack from "./signals/SignalStack";
import SignalsDrawer from "./signals/SignalsDrawer";
import { DebugInfoModal } from "./DebugInfoModal";
import SuperAdminModal from "./SuperAdminModal";
import AgentPersonaModal from "./AgentPersonaModal";
import { ConnectionStatusControl } from "./shell/ConnectionStatusControl";
import VadControlPanel from "./shell/VadControlPanel";

import type { SessionStatus } from "@/app/types";

import type { DexterAppController } from "../hooks/useDexterAppController";

export type DexterAppLayoutProps = DexterAppController;

export function DexterAppLayout({
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
}: DexterAppLayoutProps) {
  const { showLogs, toolCatalog } = signalStackProps;

  const renderSignalStack = () => (
    <SignalStack
      showLogs={showLogs}
      toolCatalog={toolCatalog}
      renderLogs={({ isExpanded }) => <Events isExpanded={isExpanded} />}
    />
  );

  const heroSection = <Hero title={heroTitle} subtitle={heroSubtitle} loading={heroLoading} />;

  const mobileSignalsOverlay = heroControlsProps.canUseAdminTools ? (
    <SignalsDrawer {...signalsDrawerProps}>
      {renderSignalStack()}
    </SignalsDrawer>
  ) : null;

  const desktopSignalsPanel = null;

  return (
    <>
      <DexterShell
        topBar={<TopRibbon {...topRibbonProps} />}
        hero={heroSection}
        heroCollapsed={heroCollapsed}
        heroControls={null}
        heroWrapperClassName={heroContainerClassName}
        messages={<TranscriptMessages {...transcriptProps} />}
        inputBar={<InputBar {...inputBarProps} />}
        signals={desktopSignalsPanel}
        statusBar={<BottomStatusRail {...bottomStatusProps} />}
        mobileOverlay={mobileSignalsOverlay}
      />

      <DebugInfoModal {...debugModalProps} />
      <SuperAdminModal {...superAdminModalProps} />
      <AgentPersonaModal {...personaModalProps} />
      <VadControlPanel {...vadPanelProps} />
      <FloatingConnectionStatus
        sessionStatus={topRibbonProps.sessionStatus}
        onToggleConnection={topRibbonProps.onToggleConnection}
        heroCollapsed={heroCollapsed}
        hasConnectedOnce={hasConnectedOnce}
      />
      <AdminDock
        canUseAdminTools={heroControlsProps.canUseAdminTools}
        showSuperAdminTools={heroControlsProps.showSuperAdminTools}
        onOpenSuperAdmin={heroControlsProps.onOpenSuperAdmin}
        onOpenSignals={heroControlsProps.onOpenSignals}
        onCopyTranscript={heroControlsProps.onCopyTranscript}
        onDownloadAudio={heroControlsProps.onDownloadAudio}
        onSaveLog={heroControlsProps.onSaveLog}
        renderAdminConsole={heroControlsProps.canUseAdminTools ? renderSignalStack : undefined}
        adminConsoleMetadata={{
          toolCount: toolCatalog.tools.length,
          lastUpdated: toolCatalog.lastUpdated,
          source: toolCatalog.source,
        }}
        dossierSupabaseUserId={heroControlsProps.dossierSupabaseUserId}
        userBadge={heroControlsProps.userBadge}
        onOpenPersonaModal={heroControlsProps.onOpenPersonaModal}
      />
    </>
  );
}

export default DexterAppLayout;

type FloatingConnectionStatusProps = {
  sessionStatus: SessionStatus;
  onToggleConnection?: () => void;
  heroCollapsed: boolean;
  hasConnectedOnce: boolean;
};

function FloatingConnectionStatus({
  sessionStatus,
  onToggleConnection,
  heroCollapsed,
  hasConnectedOnce,
}: FloatingConnectionStatusProps) {
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 132, left: 24 });

  const updatePosition = React.useCallback(() => {
    if (typeof window === "undefined") return;

    const target = document.querySelector('[data-hero-anchor]');

    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect();
      const nextTop = Math.max(rect.top - 10, 60);
      const nextLeft = Math.max(rect.left + 20, 16);

      setPosition((prev) => {
        const diffTop = Math.abs(prev.top - nextTop);
        const diffLeft = Math.abs(prev.left - nextLeft);
        if (diffTop < 1 && diffLeft < 1) {
          return prev;
        }
        return { top: nextTop, left: nextLeft };
      });
    }
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    updatePosition();
    const handle = () => updatePosition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, { passive: true });

    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle);
    };
  }, [mounted, updatePosition]);

  React.useEffect(() => {
    if (!mounted) return;
    const raf = window.requestAnimationFrame(() => updatePosition());
    return () => window.cancelAnimationFrame(raf);
  }, [mounted, heroCollapsed, sessionStatus, updatePosition]);

  const shouldDisplay = sessionStatus !== "DISCONNECTED" || hasConnectedOnce;

  if (!mounted || typeof window === "undefined" || !shouldDisplay) {
    return null;
  }

  return createPortal(
    <motion.div
      className="pointer-events-none fixed z-40"
      style={{ top: position.top, left: position.left }}
      initial={{ opacity: 0, y: -10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1], delay: 0.1 }}
    >
      <div className="pointer-events-auto">
        <ConnectionStatusControl
          sessionStatus={sessionStatus}
          onToggleConnection={onToggleConnection}
          allowReconnect={hasConnectedOnce}
        />
      </div>
    </motion.div>,
    document.body,
  );
}
