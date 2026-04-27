import type { Config } from "tailwindcss";

/**
 * TYPOGRAPHY RULES (scaled up for 100% zoom readability):
 * - text-xs (14px): MINIMUM — captions, metadata, section labels
 * - text-sm (16px): Labels, secondary content, table headers
 * - text-base (18px): DEFAULT body text, primary data
 * - text-lg (20px+): Headers, emphasized text, buttons (size="lg")
 */

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F5F5F7",
        card: "#FFFFFF",
        brand: "#0071BA",
        accent: "#0071BA",
        "at-black": "#1D1D1F",
        "at-mid":   "#86868B",
        "at-light": "#F5F5F7",
        // CSS-var tokens
        foreground:  "hsl(var(--foreground))",
        primary:     { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary:   { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted:       { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
      },
      textColor: {
        primary:      "var(--text-primary)",      /* #1D1D1F — all body text, labels, data */
        secondary:    "var(--text-secondary)",    /* #515154 — timestamps, units, secondary info */
        interactive:  "var(--text-interactive)",  /* #0071BA — links & buttons only */
      },
      boxShadow: {
        "apple":       "0 2px 8px 0 rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        "apple-md":    "0 4px 16px 0 rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        "apple-hover": "0 8px 28px 0 rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
        "brand-glow":  "0 4px 20px 0 rgba(0,122,255,0.30)",
      },
      borderRadius: {
        sm:    "0.5rem",
        md:    "0.75rem",
        lg:    "1rem",
        xl:    "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      fontFamily: {
        sans:    ["var(--font-sans)",    "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia",   "serif"],
      },
      fontSize: {
        xs:   ["14px", { lineHeight: "1.5" }],
        sm:   ["16px", { lineHeight: "1.5" }],
        base: ["18px", { lineHeight: "1.6" }],
        lg:   ["20px", { lineHeight: "1.4" }],
        xl:   ["22px", { lineHeight: "1.4" }],
        "2xl": ["28px", { lineHeight: "1.3" }],
        "3xl": ["34px", { lineHeight: "1.2" }],
        "4xl": ["40px", { lineHeight: "1.1" }],
        "5xl": ["48px", { lineHeight: "1" }],
      },
    },
  },
  plugins: [],
};

export default config;
