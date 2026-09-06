"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";

const EXAMPLES = [
  "Find more scenic viewpoints",
  "Add Buddhist monasteries and temples",
  "More offbeat, less touristy spots",
  "Places good for photography at sunrise",
];

// Steering box on the reveal stage that actually sends the agents back out to
// discover NEW places (targeted re-investigation), then merges them in.
export function RefineBox() {
  const refine = useTrip((s) => s.refineInvestigation);
  const refining = useTrip((s) => s.refining);
  const lastMessage = useTrip((s) => s.lastMessage);
  const liveMode = useTrip((s) => s.liveMode);
  const [text, setText] = useState("");

  function submit(v?: string) {
    const q = (v ?? text).trim();
    if (!q || refining) return;
    refine(q);
    setText("");
  }

  return (
    <div className="rounded-2xl border border-alpine-500/20 bg-alpine-500/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-alpine-300">🎙️</span>
        <span className="text-sm font-semibold text-paper-50">Shape the investigation</span>
        {liveMode && <span className="chip !border-alpine-400/30 !bg-alpine-500/10 !text-alpine-200 !text-[10px]">sends agents back out</span>}
      </div>
      <p className="mb-3 text-xs leading-relaxed text-paper-200/60">
        Ask for more of something and the agents will crawl the web again to discover new places — they&rsquo;ll appear as new cards below.
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
          placeholder="e.g. Find more scenic viewpoints and Buddhist monasteries"
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-paper-50 outline-none transition placeholder:text-paper-200/30 focus:border-alpine-400/50 disabled:opacity-50"
        />
        <button onClick={() => submit()} disabled={!text.trim() || refining} className="btn-primary !px-4 !py-2.5">
          {refining ? "Searching…" : "Send agents →"}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => submit(ex)}
            disabled={refining}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-paper-200/70 transition hover:bg-white/[0.06] disabled:opacity-40"
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
            className="mt-3 flex items-center gap-2 overflow-hidden text-sm text-alpine-300"
          >
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-alpine-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </span>
            Agents are crawling the web for new places…
          </motion.div>
        )}
      </AnimatePresence>

      {!refining && lastMessage && (
        <div className="mt-3 rounded-xl border border-alpine-400/25 bg-alpine-500/[0.06] p-3 text-sm text-paper-100">
          {lastMessage}
        </div>
      )}
    </div>
  );
}
