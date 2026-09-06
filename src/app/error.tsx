"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // surface to the browser console for debugging
    console.error("Travelism render error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="mt-3 font-display text-2xl font-semibold text-paper-50">Something broke while rendering</h2>
      <p className="mt-2 text-sm text-paper-200/60">
        {error?.message || "An unexpected error occurred."}
      </p>
      {error?.stack && (
        <pre className="mt-4 max-h-64 overflow-auto rounded-xl border border-white/10 bg-ink-900/60 p-3 text-left text-[11px] text-paper-200/60">
          {error.stack}
        </pre>
      )}
      <button onClick={reset} className="btn-primary mt-5">
        Try again
      </button>
    </div>
  );
}
