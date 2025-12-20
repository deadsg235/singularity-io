import type { Config } from "tailwindcss";

const withOpacityValue = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withOpacityValue("--color-background"),
        foreground: withOpacityValue("--color-foreground"),
        surface: {
          base: withOpacityValue("--color-surface-base"),
          raised: withOpacityValue("--color-surface-raised"),
          glass: withOpacityValue("--color-surface-glass"),
        },
        header: withOpacityValue("--color-header-bg"),
        "header-border": withOpacityValue("--color-header-border"),
        footer: withOpacityValue("--color-footer-bg"),
        "footer-border": withOpacityValue("--color-footer-border"),
        border: {
          subtle: withOpacityValue("--color-border-subtle"),
          strong: withOpacityValue("--color-border-strong"),
        },
        primary: {
          DEFAULT: withOpacityValue("--color-primary"),
          bright: withOpacityValue("--color-primary-bright"),
          muted: withOpacityValue("--color-primary-muted"),
        },
        flux: withOpacityValue("--color-flux"),
        iris: withOpacityValue("--color-iris"),
        accent: {
          info: withOpacityValue("--color-accent-info"),
          success: withOpacityValue("--color-accent-success"),
          warn: withOpacityValue("--color-accent-warn"),
          critical: withOpacityValue("--color-accent-critical"),
        },
        neutral: {
          100: withOpacityValue("--color-neutral-100"),
          200: withOpacityValue("--color-neutral-200"),
          300: withOpacityValue("--color-neutral-300"),
          400: withOpacityValue("--color-neutral-400"),
          500: withOpacityValue("--color-neutral-500"),
          600: withOpacityValue("--color-neutral-600"),
          700: withOpacityValue("--color-neutral-700"),
          800: withOpacityValue("--color-neutral-800"),
          900: withOpacityValue("--color-neutral-900"),
        },
      },
      fontFamily: {
        display: ["Satoshi", "Space Grotesk", "Inter", "sans-serif"],
        body: ["IBM Plex Sans", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "20px",
        pill: "999px",
      },
      boxShadow: {
        elevated: "0 24px 60px rgba(13, 23, 46, 0.45)",
        "glow-flux": "0 0 20px rgba(91, 255, 186, 0.45)",
        "glow-iris": "0 0 20px rgba(124, 92, 255, 0.45)",
      },
      transitionDuration: {
        swift: "120ms",
        default: "200ms",
        modal: "360ms",
      },
      spacing: {
        1.5: "4px",
        2.5: "10px",
        3.5: "14px",
        7.5: "30px",
        9: "72px",
        11: "88px",
      },
      backgroundImage: {
        'gradient-fade-dark': 'linear-gradient(180deg, rgb(var(--color-background) / 0) 0%, rgb(var(--color-background) / 0.9) 45%, rgb(var(--color-background) / 0.96) 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
