import type { Config } from "tailwindcss";

// Mirrors Origin/Design/DesignTokens.swift exactly.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark palette (default theme for v1)
        bg: {
          0: "#0A0F18",
          1: "#101828",
          2: "#182030",
          3: "#202C3E",
          4: "#2A3850",
        },
        ink: {
          1: "#EEF2F6",
          2: "#8FA4B8",
          3: "#52687A",
          4: "#2C3D4C",
        },
        line: {
          1: "#162030",
          2: "#1E2D3E",
          3: "#2C3E52",
        },
        accent: {
          DEFAULT: "#7A90C4",
          ink: "#0A0F18",
        },
      },
      fontFamily: {
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      fontSize: {
        // From TypeSize enum
        xxs: "10px",
        sm: "12px",
        base: "14px",
        md: "16px",
        lg: "20px",
        xl: "26px",
        "2xl": "34px",
        "3xl": "42px",
        "4xl": "52px",
      },
      letterSpacing: {
        label: "0.1em",
        chip: "0.08em",
        display: "0.02em",
        mono: "-0.02em",
      },
      spacing: {
        s1: "4px",
        s2: "8px",
        s3: "12px",
        s4: "16px",
        s5: "20px",
        s6: "24px",
        s7: "32px",
        s8: "48px",
        s9: "64px",
      },
      borderRadius: {
        r1: "2px",
        r2: "3px",
        r3: "4px",
        r4: "8px",
        pill: "999px",
      },
      transitionDuration: {
        fast: "100ms",
        base: "180ms",
        slow: "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
