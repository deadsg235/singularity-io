"use client";

import { useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

interface TurnstileWidgetProps {
  siteKey?: string | null;
  onToken: (token: string | null) => void;
  action?: string;
  cData?: string;
  className?: string;
  refreshKey?: number;
  onReadyChange?: (ready: boolean) => void;
}

export function TurnstileWidget({
  siteKey,
  onToken,
  action,
  cData,
  className,
  refreshKey = 0,
  onReadyChange,
}: TurnstileWidgetProps) {
  useEffect(() => {
    if (!siteKey) {
      onToken(null);
    }
  }, [siteKey, onToken]);

  useEffect(() => {
    if (!siteKey) return;
    onReadyChange?.(false);
  }, [siteKey, refreshKey, onReadyChange]);

  if (!siteKey) return null;

  return (
    <Turnstile
      key={`${siteKey}:${refreshKey}`}
      siteKey={siteKey}
      options={{ theme: "dark", action, cData }}
      onWidgetLoad={() => onReadyChange?.(true)}
      onSuccess={(token) => {
        onReadyChange?.(true);
        onToken(token);
      }}
      onError={() => {
        onReadyChange?.(false);
        onToken(null);
      }}
      onExpire={() => {
        onReadyChange?.(false);
        onToken(null);
      }}
      className={className}
    />
  );
}
