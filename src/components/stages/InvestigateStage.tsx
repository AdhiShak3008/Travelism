"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { computeParentAgentStates, PARENT_AGENTS, type ParentAgentState } from "@/lib/parentAgents";
import { cx } from "@/lib/format";

export function InvestigateStage() {
  const agents = useTrip((s) => s.agents);
  const destination = useTrip((s) => s.blob.destinationName);
  
  // Expand all parent divisions by default so the user sees all active and queued agents immediately
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(() => {
    return new Set(PARENT_AGENTS.map((p) => p.id));
  });

  const parentStates = computeParentAgentStates(agents);

  const totalDone = agents.filter((a) => a.phase === "done").length;
  const totalAgents = agents.length;
  const overallPct = Math.round((totalDone / Math.max(1, totalAgents)) * 100);

  // Auto-expand newly working parent divisions as the investigation pipeline advances
  useEffect(() => {
    const working = parentStates.filter((p) => p.phase === "working" || p.phase === "done");
    if (working.length > 0) {
      setExpandedParentIds((prev) => {
        const next = new Set(prev);
        working.forEach((p) => next.add(p.meta.id));
        return next;
      });
    }
  }, [parentStates]);

  const toggleParent = (id: string) => {
    setExpandedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allExpanded = expandedParentIds.size === PARENT_AGENTS.length;
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedParentIds(new Set());
    } else {
      setExpandedParentIds(new Set(PARENT_AGENTS.map((p) => p.id)));
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 sm:px-6 py-12 flex flex-col justify-center">
      {/* Header Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 border border-brand/30 px-3.5 py-1 text-xs font-bold text-brand mb-4 shadow-sm">
          <span className="animate-pulse">●</span> Hierarchical Swarm Intelligence Active
        </div>

        <h1 className="display text-3xl sm:text-5xl font-extrabold tracking-tight text-ink">
          Autonomous Investigation: {destination || "Your Dream Destination"}
        </h1>
        <p className="mt-2.5 max-w-2xl mx-auto text-sm sm:text-base text-ink-soft leading-relaxed">
          5 specialized Director Parent Agents are deploying sub-agents to map places, scrape verified web photography, audit hygiene, and verify real flight routes.
        </p>
      </motion.div>

      {/* Overall Swarm Progress Bar */}
      <div className="mt-8 card p-5 shadow-card">
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span className="text-ink">Overall Swarm Intelligence Progress</span>
          <span className="text-brand font-extrabold">{overallPct}% Completed</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-paper-3">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand via-emerald-500 to-brand"
            animate={{ width: `${Math.max(6, overallPct)}%` }}
            transition={{ ease: "easeOut", duration: 0.4 }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-faint">
          <span>{totalDone} of {totalAgents} specialized sub-agents finished</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Live Web Scraping & Synthesis</span>
        </div>
      </div>

      {/* Division Controls Header */}
      <div className="mt-6 flex items-center justify-between px-1">
        <div className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-2">
          <span>🤖</span>
          <span>Parent Agent Divisions ({parentStates.length})</span>
        </div>
        <button
          onClick={toggleAll}
          className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
        >
          {allExpanded ? "Collapse All ▲" : "Expand All ▼"}
        </button>
      </div>

      {/* Hierarchical Parent Agents Grid */}
      <div className="mt-3 space-y-4">
        {parentStates.map((parent, idx) => {
          const isExpanded = expandedParentIds.has(parent.meta.id);
          const isDone = parent.phase === "done";
          const isWorking = parent.phase === "working";

          return (
            <motion.div
              key={parent.meta.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={cx(
                "rounded-2xl border transition-all duration-300 overflow-hidden bg-card",
                isWorking
                  ? "border-brand shadow-lift ring-2 ring-brand/20"
                  : isDone
                  ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                  : "border-line opacity-85"
              )}
            >
              {/* Parent Agent Header Strip */}
              <div
                onClick={() => toggleParent(parent.meta.id)}
                className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-paper-2/50 transition select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={cx(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl shadow-sm border",
                      isWorking
                        ? "bg-brand text-paper border-brand"
                        : isDone
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-paper-2 text-ink-soft border-line"
                    )}
                  >
                    {parent.meta.glyph}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                        {parent.meta.division}
                      </span>
                      {isDone && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.2 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                          Complete ✓
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-ink truncate">
                      {parent.meta.name}
                    </h3>
                    <p className="text-xs text-ink-soft truncate mt-0.5">{parent.liveStatus}</p>
                  </div>
                </div>

                {/* Progress & Expansion */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-bold text-ink">
                      {parent.completedChildrenCount}/{parent.children.length} Sub-Agents
                    </div>
                    <div className="text-[10px] text-ink-faint">
                      {isDone ? "100% verified" : isWorking ? "Active now" : "Queued"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleParent(parent.meta.id);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper text-ink-soft hover:bg-paper-2 text-xs font-bold transition"
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              {/* Sub-Agents Details Stream */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-line bg-paper-2/60 p-4 sm:p-5 space-y-2.5 overflow-hidden"
                  >
                    <div className="text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-2">
                      Managed Sub-Agents & Live Telemetry
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      {parent.children.map((child) => {
                        const childDone = child.phase === "done";
                        const childWorking = child.phase === "working";

                        return (
                          <div
                            key={child.id}
                            className={cx(
                              "rounded-xl border p-3 transition-all",
                              childWorking
                                ? "border-brand bg-brand/10 shadow-sm ring-1 ring-brand/30"
                                : childDone
                                ? "border-emerald-500/30 bg-card"
                                : "border-line bg-card/60 opacity-60"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-base">{child.glyph}</span>
                              <span
                                className={cx(
                                  "text-[10px] font-bold uppercase",
                                  childDone
                                    ? "text-emerald-600"
                                    : childWorking
                                    ? "text-brand animate-pulse"
                                    : "text-ink-faint"
                                )}
                              >
                                {childDone ? "Done ✓" : childWorking ? "Working..." : "Idle"}
                              </span>
                            </div>

                            <div className="font-bold text-xs text-ink">{child.name}</div>
                            <p className="text-[11px] text-ink-soft line-clamp-2 mt-0.5">
                              {child.status}
                            </p>

                            {child.metric && (
                              <div className="mt-2 inline-block rounded-md bg-paper-3 px-2 py-0.5 text-[10px] font-bold text-ink">
                                📊 {child.metric}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
