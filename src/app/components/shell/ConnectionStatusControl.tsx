import React from "react";
import { SessionStatus } from "@/app/types";

interface ConnectionStatusControlProps {
  sessionStatus: SessionStatus;
  onToggleConnection?: () => void;
  className?: string;
  allowReconnect?: boolean;
}

function getStatusVisual(sessionStatus: SessionStatus) {
  switch (sessionStatus) {
    case "CONNECTED":
      return { label: "Live", dotClass: "bg-[#16C98C]", textClass: "text-[#F87171]" };
    case "CONNECTING":
      return { label: "Linking", dotClass: "bg-[#26B5FF]", textClass: "text-[#7FD0FF]" };
    case "ERROR":
      return { label: "Fault", dotClass: "bg-[#FF4D69]", textClass: "text-[#FF96AD]" };
    default:
      return { label: "Offline", dotClass: "bg-[#FF3B30]", textClass: "text-[#FF8A7F]" };
  }
}

function getConnectionLabel(sessionStatus: SessionStatus, allowReconnect: boolean) {
  if (sessionStatus === "CONNECTED") return "Disconnect";
  if (sessionStatus === "CONNECTING") return "Connecting…";
  if (sessionStatus === "ERROR") return "Retry";
  if (sessionStatus === "DISCONNECTED" && allowReconnect) return "Connect";
  return "";
}

export function ConnectionStatusControl({
  sessionStatus,
  onToggleConnection,
  className,
  allowReconnect = false,
}: ConnectionStatusControlProps) {
  const { label, dotClass, textClass } = getStatusVisual(sessionStatus);
  const buttonLabel = getConnectionLabel(sessionStatus, allowReconnect);
  const showLabel = buttonLabel.trim().length > 0;
  const buttonAriaLabel = showLabel
    ? buttonLabel
    : sessionStatus === "DISCONNECTED" && allowReconnect
      ? "Connect"
      : "Connection control";

  const containerClassName = [
    "flex flex-shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap font-display text-[10px] font-semibold tracking-[0.08em] text-[#FFF3E3]/85 scrollbar-hide",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <span className="flex flex-shrink-0 items-center gap-2" title={`Connection status: ${label}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>

      {onToggleConnection ? (
        <button
          type="button"
          onClick={onToggleConnection}
          className={`flex flex-shrink-0 items-center gap-2 underline decoration-[#FEFBF4]/45 underline-offset-[4px] transition hover:decoration-[#FEFBF4] ${showLabel ? textClass : "text-[#FFF3E3]/60"}`}
          aria-label={buttonAriaLabel}
        >
          {showLabel ? buttonLabel : null}
        </button>
      ) : null}
    </div>
  );
}

export default ConnectionStatusControl;
