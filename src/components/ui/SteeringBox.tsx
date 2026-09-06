"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SignalScope, SteeringSignal } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { AGENTS } from "@/lib/agents";
import { cx } from "@/lib/format";

const PLACEHOLDERS: Record<string, string> = {
  trip: "e.g. I care about scenery more than museums. Don't rush me, and the bathroom needs to be genuinely clean.",
  hotel: "e.g. The room looks nice but I hate tiny bathrooms.",
  flight: "e.g. I hate early morning flights.",
  transport: "e.g. I don't mind long drives if they're scenic.",
  place: "e.g. This looks great — find more like it.",
  itinerary: "e.g. I don't want to change hotels every night.",
  food: "e.g. Good food but not expensive restaurants.",
  destination: "e.g. Focus on the high-altitude scenery.",
  activity: "e.g. Keep this, but I'd rather not walk far.",
  stage: "Anything you write here will influence what we investigate next.",
};

export function SteeringBox({
  scope,
  entityId,
  title = "Shape the investigation",
  compact = false,
}: {
  scope: SignalScope;
  entityId?: string;
  title?: string;
  compact?: boolean;
}) {
  const addComment = useTrip((s) => s.addComment);
  const [text, setText] = useState("");
  const [acked, setAcked] = useState<SteeringSignal[] | null>(null);

  function submit() {
    if (!text.trim()) return;
    const signals = addComment(text, scope, entityId);
    setAcked(signals);
    setText("");
    setTimeout(() => setAcked(null), 6500);
  }

  return (
    <div className={cx("rounded-2xl border border-alpine-500/20 bg-alpine-500/[0.04] p-4", compact && "p-3")}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-alpine-300">🎙️</span>
        <span className="text-sm font-semibold text-paper-50">{title}</span>
      </div>
      {!compact && (
        <p className="mb-3 text-xs leading-relaxed text-paper-200/60">
          Anything you tell the agents here will influence what they investigate and prioritize next.
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={compact ? 2 : 3}
          placeholder={PLACEHOLDERS[scope] ?? PLACEHOLDERS.stage}
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-paper-50 outline-none transition placeholder:text-paper-200/30 focus:border-alpine-400/50"
        />
        <button onClick={submit} disabled={!text.trim()} className="btn-primary !px-4 !py-2.5">
          Steer →
        </button>
      </div>

      <AnimatePresence>
        {acked && acked.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            {acked.map((s) => (
              <div key={s.id} className="rounded-xl border border-alpine-400/25 bg-alpine-500/[0.06] p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="chip !border-alpine-400/30 !bg-alpine-500/10 !text-alpine-200 !text-[10px] uppercase tracking-wide">
                    {s.category}
                  </span>
                  <span className="text-[11px] text-paper-200/50">→ {s.scope}</span>
                </div>
                <p className="text-sm text-paper-100">{s.interpretation}</p>
                {s.affectedAgents.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.affectedAgents.map((a) => (
                      <span key={a} className="inline-flex items-center gap-1 text-[11px] text-paper-200/60">
                        {AGENTS[a].glyph} {AGENTS[a].name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
