import type { Config } from "tailwindcss";

/** Helper to build an hsl() referencing a CSS var, with optional opacity. */
const v = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: v("paper"),
        "paper-2": v("paper-2"),
        "paper-3": v("paper-3"),
        card: v("card"),
        ink: v("ink"),
        "ink-soft": v("ink-soft"),
        "ink-faint": v("ink-faint"),
        line: v("line"),
        "line-strong": v("line-strong"),
        brand: v("brand"),
        "brand-soft": v("brand-soft"),
        terra: v("terra"),
        gold: v("gold"),
        good: v("good"),
        warn: v("warn"),
        bad: v("bad"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
      },
      borderColor: {
        DEFAULT: v("line"),
      },
      keyframes: {
        pulseDot: {
          "0%,100%": { opacity: "0.4", transform: "scale(0.85)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        floatUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
        floatUp: "floatUp 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
