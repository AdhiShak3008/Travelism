"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { AGENTS } from "@/lib/agents";

export function MobileInvestigateStage() {
  const agents = useTrip((s) => s.agents);
  const blob = useTrip((s) => s.blob);

  return (
    <div className="min-h-screen bg-paper px-4 py-8 flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Autonomous Swarm Active
          </span>
        </div>

        <h1 className="display text-2xl font-bold text-ink">
          Investigating {blob.destinationName || "Your Trip"}
        </h1>
        <p className="text-xs text-ink-soft mt-1">
          Crawling live permits, flight routes, verified stays, and trails...
        </p>
      </div>

      {/* Agents Feed */}
      <div className="my-6 space-y-2.5">
        {agents.map((act) => {
          const info = AGENTS[act.id];
          const isDone = act.phase === "done";
          const isWorking = act.phase === "working";

          return (
            <div
              key={act.id}
              className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                isDone
                  ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                  : isWorking
                  ? "border-brand bg-brand/[0.06] shadow-xs"
                  : "border-line bg-card/60 opacity-60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg shrink-0">{info?.glyph || "🤖"}</span>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-ink">{info?.role || act.id}</div>
                  <div className="text-[11px] text-ink-soft truncate">{act.status}</div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                {isDone && (
                  <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                    {act.metric || "✓ Done"}
                  </span>
                )}
                {isWorking && (
                  <span className="h-2 w-2 rounded-full bg-brand animate-ping inline-block" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-ink-faint">
        Extracting grounded facts with zero hallucinations · Assembling your package
      </div>
    </div>
  );
}
