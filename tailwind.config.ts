import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium editorial dark canvas
        ink: {
          950: "#08090c",
          900: "#0b0d12",
          850: "#0f121a",
          800: "#141822",
          700: "#1b2130",
          600: "#232b3d",
          500: "#2f3a52",
        },
        paper: {
          50: "#f7f8fb",
          100: "#eef1f6",
          200: "#dfe4ee",
        },
        // Signature accent: alpine teal + aurora
        alpine: {
          300: "#7fe7d4",
          400: "#3fd6bd",
          500: "#14c2a3",
          600: "#0b9e86",
        },
        aurora: {
          300: "#b9a3ff",
          400: "#9b7bff",
          500: "#7c53f5",
        },
        ember: {
          400: "#ffb37a",
          500: "#ff9448",
        },
        signal: {
          good: "#34d399",
          warn: "#fbbf24",
          bad: "#fb7185",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.2), 0 8px 24px -8px rgba(0,0,0,0.5)",
        lift: "0 20px 60px -20px rgba(0,0,0,0.7)",
        glow: "0 0 0 1px rgba(63,214,189,0.25), 0 12px 40px -12px rgba(20,194,163,0.35)",
      },
      backgroundImage: {
        "hero-fade": "linear-gradient(180deg, rgba(8,9,12,0) 0%, rgba(8,9,12,0.7) 60%, #08090c 100%)",
        "aurora-sheen": "linear-gradient(120deg, rgba(124,83,245,0.15), rgba(20,194,163,0.15))",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        pulseDot: {
          "0%,100%": { opacity: "0.4", transform: "scale(0.85)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        floatUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s infinite",
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
        floatUp: "floatUp 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
