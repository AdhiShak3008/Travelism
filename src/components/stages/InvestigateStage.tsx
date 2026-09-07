"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { cx } from "@/lib/format";

// Warm, human-worded lines shown to travellers — no agent jargon by default.
const FRIENDLY_LINES = [
  "Getting to know the place…",
  "Finding the spots worth your time…",
  "Reading what recent travellers say…",
  "Looking for clean, comfortable stays…",
  "Checking the best time to go…",
  "Sniffing out the good food…",
  "Sorting out permits and paperwork…",
  "Pulling it all together…",
];

export function InvestigateStage() {
  const agents = useTrip((s) => s.agents);
  const destination = useTrip((s) => s.blob.destinationName);
  const [showBehind, setShowBehind] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);

  const done = agents.filter((a) => a.phase === "done").length;
  const total = agents.length;
  const pct = Math.round((done / Math.max(1, total)) * 100);

  useEffect(() => {
    const t = setInterval(() => setLineIdx((i) => (i + 1) % FRIENDLY_LINES.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="stamp mx-auto mb-5">Putting your trip together</div>
        <h1 className="display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Looking into {destination || "your trip"}
        </h1>

        {/* Rotating friendly line */}
        <div className="mt-4 h-7">
          <AnimatePresence mode="wait">
            <motion.p
              key={lineIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="text-ink-soft"
            >
              {FRIENDLY_LINES[lineIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Calm progress bar */}
      <div className="mt-8">
        <div className="h-1.5 overflow-hidden rounded-full bg-paper-3">
          <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${Math.max(8, pct)}%` }} transition={{ ease: "easeOut" }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
          <span>This usually takes under a minute</span>
          <button onClick={() => setShowBehind((s) => !s)} className="font-medium text-brand hover:underline">
            {showBehind ? "Hide the details" : "Peek behind the scenes"}
          </button>
        </div>
      </div>

      {/* Behind-the-scenes: the actual agent activity, opt-in */}
      <AnimatePresence>
        {showBehind && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-1.5 overflow-hidden"
          >
            {agents.map((a) => (
              <div
                key={a.id}
                className={cx(
                  "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition",
                  a.phase === "working" ? "border-brand/40 bg-brand/[0.05]" : "border-line bg-paper-2"
                )}
              >
                <span>{a.glyph}</span>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-ink">{a.name}</span>
                  <span className="ml-2 text-ink-soft">{a.status}</span>
                </div>
                {a.metric && a.phase === "done" && <span className="text-xs text-ink-faint">{a.metric}</span>}
                {a.phase === "done" ? (
                  <span className="text-good">✓</span>
                ) : a.phase === "working" ? (
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
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
