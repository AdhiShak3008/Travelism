"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("travelism-theme", theme);
  } catch {
    /* ignore */
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("travelism-theme")) as Theme | null;
    const initial: Theme = stored ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
    setTheme(initial);
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      apply(next);
      return next;
    });
  };

  return [theme, toggle];
}

export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="grid h-9 w-9 place-items-center rounded-full border border-line-strong bg-paper-2 text-ink-soft transition hover:text-ink"
      title={theme === "light" ? "Switch to evening lookbook" : "Switch to daylight brochure"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

/** Inline script string that sets the theme class before first paint (no flash). */
export const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('travelism-theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
