import type { Config } from "tailwindcss";

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
        brand: "#007AFF",
        accent: "#007AFF",
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
    },
  },
  plugins: [],
};

export default config;
