"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";

const EXAMPLES = [
  "More water sports & boat cruises",
  "Rooftop lounges & fine dining",
  "Scenic coastal trails & hidden beaches",
  "Cultural arts, museums & music",
  "Family-friendly attractions & parks",
];

export function RefineBox({ title, hint }: { title?: string; hint?: string }) {
  const refine = useTrip((s) => s.refineInvestigation);
  const refining = useTrip((s) => s.refining);
  const lastMessage = useTrip((s) => s.lastMessage);
  const [text, setText] = useState("");

  function submit(v?: string) {
    const q = (v ?? text).trim();
    if (!q || refining) return;
    refine(q);
    setText("");
  }

  return (
    <div className="rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/[0.07] via-paper-2 to-gold/[0.07] p-5 shadow-card">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-lg">✨</span>
        <span className="text-base font-semibold text-ink">
          {title ?? "Wish Box · Tell us what else you'd love to see"}
        </span>
      </div>
      <p className="mb-3.5 text-xs leading-relaxed text-ink-soft">
        {hint ?? "Type any wish or activity style (e.g. 'Show me scuba diving', 'More art galleries', 'Offbeat nature spots') and we will scout fresh places for you."}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          disabled={refining}
          placeholder="e.g. Find jet ski rentals, coral reef snorkeling, and top seafood restaurants..."
          className="min-h-[50px] flex-1 resize-none rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint/70 focus:border-brand/50 disabled:opacity-50"
        />
        <button
          onClick={() => submit()}
          disabled={!text.trim() || refining}
          className="btn-primary !px-5 !py-3 whitespace-nowrap"
        >
          {refining ? "Scouting..." : "Scout Spots →"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-ink-faint mr-1">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => submit(ex)}
            disabled={refining}
            className="rounded-full border border-line-strong bg-paper-2 px-3 py-1 text-xs text-ink-soft transition hover:border-brand/40 hover:text-ink disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {refining && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-2 overflow-hidden text-sm text-brand font-medium"
          >
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-brand"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </span>
            Scouting the web for fresh places & activities…
          </motion.div>
        )}
      </AnimatePresence>

      {!refining && lastMessage && (
        <div className="mt-3 rounded-xl border border-brand/25 bg-card p-3 text-xs text-ink font-medium">
          💡 {lastMessage}
        </div>
      )}
    </div>
  );
}
