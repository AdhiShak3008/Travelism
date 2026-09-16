"use client";

import React, { useState } from "react";
import { useTrip } from "@/store/tripStore";
import { countTravelerMemoryFacts } from "@/lib/memory";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  compact?: boolean;
}

export function MemoryBadge({ compact = false }: Props) {
  const memory = useTrip((s) => s.travelerMemory);
  const clearChatMemory = useTrip((s) => s.clearChatMemory);
  const [showDrawer, setShowDrawer] = useState(false);

  const count = countTravelerMemoryFacts(memory);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDrawer((v) => !v)}
        title="View remembered traveler preferences & context"
        className={`group flex items-center gap-1.5 rounded-full border transition-all ${
          count > 0
            ? "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50"
            : "border-line bg-paper-2 text-ink-soft hover:text-ink hover:border-brand/40"
        } ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}
      >
        <span className="text-xs">🧠</span>
        <span className="font-semibold">{count > 0 ? `${count} Memor${count === 1 ? "y" : "ies"}` : "Memory"}</span>
        {count > 0 && (
          <span className="flex h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {showDrawer && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-line bg-card/95 p-4 shadow-xl backdrop-blur-md z-50 text-xs text-ink"
          >
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">🧠</span>
                <div>
                  <h4 className="font-bold text-[13px] text-ink">Active Traveler Memory</h4>
                  <p className="text-[10px] text-ink-faint">Persistent across conversations & steps</p>
                </div>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="text-ink-soft hover:text-ink text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {count === 0 ? (
              <div className="py-4 text-center text-ink-soft">
                <p className="text-xs">No memories stored yet.</p>
                <p className="text-[11px] text-ink-faint mt-1">
                  Tell the concierge about your dietary needs, pacing, budget, or preferred stay style!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {memory.dietaryRequirements?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-faint">🥗 Dietary</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {memory.dietaryRequirements.map((d, i) => (
                        <span key={i} className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {memory.travelStyle?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-faint">🏨 Travel Style</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {memory.travelStyle.map((s, i) => (
                        <span key={i} className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {memory.pacingAndRhythm?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-faint">⏰ Pacing</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {memory.pacingAndRhythm.map((p, i) => (
                        <span key={i} className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {memory.interestsAndVibes?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-faint">✨ Vibes & Interests</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {memory.interestsAndVibes.map((v, i) => (
                        <span key={i} className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300 border border-sky-500/20">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {memory.budgetConstraints?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-faint">💰 Budget Focus</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {memory.budgetConstraints.map((b, i) => (
                        <span key={i} className="rounded-md bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-300 border border-green-500/20">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {memory.companionship?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-faint">👥 Companionship</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {memory.companionship.map((c, i) => (
                        <span key={i} className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {memory.keyNotes?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-faint">📌 Synthesized Notes</span>
                    <ul className="mt-1 space-y-1">
                      {memory.keyNotes.map((n, i) => (
                        <li key={i} className="text-[11px] text-ink/80 flex items-start gap-1">
                          <span className="text-brand">•</span>
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 border-t border-line/60 pt-2.5 flex items-center justify-between">
              <span className="text-[10px] text-ink-faint">LLM auto-enriches on every chat</span>
              {count > 0 && (
                <button
                  onClick={() => {
                    clearChatMemory();
                    setShowDrawer(false);
                  }}
                  className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Reset Memory
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
