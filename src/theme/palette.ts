import type { CSSProperties } from "react";

type SurfaceSet = {
  base: string;
  raised: string;
  glass: string;
};

type BoundarySet = {
  background: string;
  border: string;
};

type NeutralScale = {
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

type AccentSet = {
  info: string;
  success: string;
  warn: string;
  critical: string;
};

type PrimarySet = {
  base: string;
  bright: string;
  muted: string;
};

export interface ThemePalette {
  name: string;
  background: string;
  foreground: string;
  surface: SurfaceSet;
  header: BoundarySet;
  footer: BoundarySet;
  borders: {
    subtle: string;
    strong: string;
  };
  neutrals: NeutralScale;
  accent: AccentSet;
  primary: PrimarySet;
  flux: string;
  iris: string;
  focusRing: string;
  gradient: {
    warmSpot: string;
    emberSpot: string;
  };
}

const hexToRgb = (hex: string) => {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) {
    return "0 0 0"; // Fallback
  }
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
};

export const midnightPalette: ThemePalette = {
  name: "midnight",
  background: "#000000", // True Pitch Black
  foreground: "#FFFFFF", // Pure White
  surface: {
    base: "#050505", // Deepest Void
    raised: "#0A0A0A", // Layer 1
    glass: "#111111", // Layer 2
  },
  header: {
    background: "#000000",
    border: "#1F1F1F",
  },
  footer: {
    background: "#000000",
    border: "#1F1F1F",
  },
  borders: {
    subtle: "#262626",
    strong: "#404040",
  },
  neutrals: {
    // Standard Dark Mode Scale
    100: "#FFFFFF", // Lightest
    200: "#E5E5E5",
    300: "#D4D4D4",
    400: "#A3A3A3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0A0A0A", // Darkest
  },
  accent: {
    info: "#38BDF8", // Sky
    success: "#34D399", // Emerald
    warn: "#FBBF24", // Amber
    critical: "#F87171", // Rose
  },
  primary: {
    base: "#FF6500", // Neon Dexter Orange
    bright: "#FF8533",
    muted: "#1A0500", // Deepest Ember (for gradients)
  },
  flux: "#0EA5E9", // Sky Blue
  iris: "#6366F1", // Indigo
  focusRing: "#FF6500",
  gradient: {
    warmSpot: "#FF6500",
    emberSpot: "#D03801",
  },
};

export const paletteCssVariables = (palette: ThemePalette): CSSProperties => {
  const cssVariables: Record<string, string> = {
    "--color-background": hexToRgb(palette.background),
    "--color-foreground": hexToRgb(palette.foreground),
    "--color-surface-base": hexToRgb(palette.surface.base),
    "--color-surface-raised": hexToRgb(palette.surface.raised),
    "--color-surface-glass": hexToRgb(palette.surface.glass),
    "--color-header-bg": hexToRgb(palette.header.background),
    "--color-header-border": hexToRgb(palette.header.border),
    "--color-footer-bg": hexToRgb(palette.footer.background),
    "--color-footer-border": hexToRgb(palette.footer.border),
    "--color-border-subtle": hexToRgb(palette.borders.subtle),
    "--color-border-strong": hexToRgb(palette.borders.strong),
    "--color-primary": hexToRgb(palette.primary.base),
    "--color-primary-bright": hexToRgb(palette.primary.bright),
    "--color-primary-muted": hexToRgb(palette.primary.muted),
    "--color-accent-info": hexToRgb(palette.accent.info),
    "--color-accent-success": hexToRgb(palette.accent.success),
    "--color-accent-warn": hexToRgb(palette.accent.warn),
    "--color-accent-critical": hexToRgb(palette.accent.critical),
    "--color-flux": hexToRgb(palette.flux),
    "--color-iris": hexToRgb(palette.iris),
    "--color-focus-ring": hexToRgb(palette.focusRing),
    "--color-gradient-warm": hexToRgb(palette.gradient.warmSpot),
    "--color-gradient-ember": hexToRgb(palette.gradient.emberSpot),
  };

  Object.entries(palette.neutrals).forEach(([step, value]) => {
    cssVariables[`--color-neutral-${step}`] = hexToRgb(value);
  });

  return cssVariables as CSSProperties;
};

export const activeThemeVariables = paletteCssVariables(midnightPalette);
