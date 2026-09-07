"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";

const EXAMPLES = [
  "Find more scenic viewpoints",
  "Add temples and monasteries",
  "More offbeat, less touristy spots",
  "Places lovely at sunrise",
];

export function RefineBox() {
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
    <div className="rounded-2xl border border-brand/25 bg-brand/[0.05] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-brand">✎</span>
        <span className="text-sm font-semibold text-ink">Want to see more?</span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-ink-soft">
        Ask for more of something and we&rsquo;ll look again — new places will appear below.
      </p>

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={2}
          disabled={refining}
          placeholder="e.g. Find more scenic viewpoints and quiet temples"
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint/70 focus:border-brand/50 disabled:opacity-50"
        />
        <button onClick={() => submit()} disabled={!text.trim() || refining} className="btn-primary !px-4 !py-2.5">
          {refining ? "Looking…" : "Look again →"}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => submit(ex)}
            disabled={refining}
            className="rounded-full border border-line-strong bg-paper-2 px-3 py-1 text-xs text-ink-soft transition hover:text-ink disabled:opacity-40"
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
            className="mt-3 flex items-center gap-2 overflow-hidden text-sm text-brand"
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
            Looking around for more places…
          </motion.div>
        )}
      </AnimatePresence>

      {!refining && lastMessage && (
        <div className="mt-3 rounded-xl border border-brand/25 bg-card p-3 text-sm text-ink">{lastMessage}</div>
      )}
    </div>
  );
}
