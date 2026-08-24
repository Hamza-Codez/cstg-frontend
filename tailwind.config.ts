import type { Config } from "tailwindcss";

/**
 * Maps the CSS variables in src/styles/tokens.css into the Tailwind theme.
 *
 * `borderRadius` and `fontWeight` are *replaced*, not extended, so only the steps
 * named in docs/UIUX_FRONTEND.md §2.3–2.4 exist. Anything outside them generates
 * no CSS at all. Tailwind does not error on an unknown utility, so this does not
 * fail the build — it makes a violation render visibly unstyled rather than ship a
 * subtly wrong value.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      canvas: "var(--color-canvas)",
      surface: "var(--color-surface)",
      structure: "var(--color-structure)",
      accent: "var(--color-accent)",
      "accent-hover": "var(--color-accent-hover)",
      // Text sitting ON the accent: the gold is too light for white (2.36:1).
      "on-accent": "var(--color-text-on-accent)",
      header: "var(--color-header)",
      "header-alt": "var(--color-header-alt)",
      text: "var(--color-text)",
      "text-inverse": "var(--color-text-inverse)",
      border: "var(--color-border)",
      // Status signalling only — see tokens.css §2.2.
      "on-track": "var(--color-on-track)",
      "at-risk": "var(--color-at-risk)",
      overdue: "var(--color-overdue)",
      // Chart series — identity only; never reused for UI state.
      "chart-1": "var(--chart-1)",
      "chart-2": "var(--chart-2)",
      "chart-3": "var(--chart-3)",
      "chart-4": "var(--chart-4)",
      "chart-seq-1": "var(--chart-seq-1)",
      "chart-seq-2": "var(--chart-seq-2)",
      "chart-seq-3": "var(--chart-seq-3)",
      "chart-seq-4": "var(--chart-seq-4)",
      "chart-grid": "var(--chart-grid)",
    },
    borderRadius: {
      none: "0",
      sm: "var(--radius-sm)",
      md: "var(--radius-md)",
      lg: "var(--radius-lg)",
      xl: "var(--radius-xl)",
      full: "var(--radius-full)",
      DEFAULT: "var(--radius-md)",
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700", // brand wordmark and hero titles
    },
    extend: {
      backgroundImage: {
        "gradient-header": "var(--gradient-header)",
        "gradient-sidebar": "var(--gradient-sidebar)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-structure": "var(--gradient-structure)",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        6: "var(--space-6)",
        8: "var(--space-8)",
      },
      maxWidth: {
        content: "var(--content-max-width)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
      },
    },
  },
  plugins: [],
};

export default config;
