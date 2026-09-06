"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { cx } from "@/lib/format";

export function InvestigateStage() {
  const agents = useTrip((s) => s.agents);
  const destination = useTrip((s) => s.blob.destinationName);

  const active = agents.filter((a) => a.phase === "working");
  const done = agents.filter((a) => a.phase === "done").length;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="label-eyebrow mb-2">Building your trip</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-paper-50">
          The team is investigating {destination}
        </h1>
        <p className="mt-2 text-paper-200/60">
          {active.length > 0
            ? `${active.map((a) => a.name).join(", ")} working now…`
            : done === agents.length
            ? "Assembling your Trip Blob…"
            : "Assigning agents based on what you told us…"}
        </p>
      </motion.div>

      <div className="mt-8 space-y-2">
        {agents.map((a) => (
          <motion.div
            layout
            key={a.id}
            className={cx(
              "flex items-center gap-3 rounded-xl border px-4 py-3 transition",
              a.phase === "working"
                ? "border-alpine-400/40 bg-alpine-500/[0.06]"
                : a.phase === "done"
                ? "border-white/[0.06] bg-ink-800/40"
                : "border-white/[0.04] bg-ink-900/30"
            )}
          >
            <span className="text-xl">{a.glyph}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-paper-50">{a.name}</span>
                {a.priority > 0.8 && a.phase !== "done" && (
                  <span className="chip !border-alpine-400/30 !bg-alpine-500/10 !text-alpine-200 !text-[10px]">priority</span>
                )}
              </div>
              <div className="text-xs text-paper-200/60">{a.status}</div>
            </div>
            {a.metric && a.phase === "done" && (
              <span className="text-xs text-paper-200/50">{a.metric}</span>
            )}
            <AgentIndicator phase={a.phase} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AgentIndicator({ phase }: { phase: string }) {
  if (phase === "done")
    return <span className="grid h-5 w-5 place-items-center rounded-full bg-signal-good/20 text-xs text-signal-good">✓</span>;
  if (phase === "working")
    return (
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
    );
  return <span className="h-1.5 w-1.5 rounded-full bg-white/15" />;
}
