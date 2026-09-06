"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ConfidencePill } from "./Primitives";

export function WhyThis({
  title,
  reasons,
  basis,
  confidence,
}: {
  title: string;
  reasons: string[];
  basis?: string[];
  confidence: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-alpine-300 transition hover:text-alpine-200"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full border border-alpine-400/40 text-[10px]">?</span>
        Why this?
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute left-0 top-6 z-40 w-80 rounded-2xl border border-white/10 bg-ink-850 p-4 shadow-lift"
            >
              <div className="mb-3 font-display text-sm font-semibold text-paper-50">{title}</div>
              <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-paper-100">
                    <span className="mt-0.5 text-signal-good">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              {basis && basis.length > 0 && (
                <div className="mt-3 border-t border-white/[0.06] pt-3">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-paper-200/50">Based on</div>
                  <div className="flex flex-wrap gap-1.5">
                    {basis.map((b, i) => (
                      <span key={i} className="chip !text-[11px]">{b}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3">
                <ConfidencePill value={confidence} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
