export type VadSettings = {
  threshold: number;
  prefixPaddingMs: number;
  silenceDurationMs: number;
  autoRespond: boolean;
};

export const DEFAULT_VAD_SETTINGS: VadSettings = {
  threshold: 0.95,
  prefixPaddingMs: 320,
  silenceDurationMs: 520,
  autoRespond: true,
};

export const VAD_LIMITS = {
  threshold: { min: 0.2, max: 0.98, step: 0.01 },
  prefixPaddingMs: { min: 0, max: 1200, step: 10 },
  silenceDurationMs: { min: 200, max: 2000, step: 10 },
} as const;

export const clampVadSettings = (settings: VadSettings): VadSettings => {
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

  return {
    threshold: parseFloat(
      clamp(settings.threshold, VAD_LIMITS.threshold.min, VAD_LIMITS.threshold.max).toFixed(2),
    ),
    prefixPaddingMs: Math.round(
      clamp(
        settings.prefixPaddingMs,
        VAD_LIMITS.prefixPaddingMs.min,
        VAD_LIMITS.prefixPaddingMs.max,
      ),
    ),
    silenceDurationMs: Math.round(
      clamp(
        settings.silenceDurationMs,
        VAD_LIMITS.silenceDurationMs.min,
        VAD_LIMITS.silenceDurationMs.max,
      ),
    ),
    autoRespond: Boolean(settings.autoRespond),
  };
};
