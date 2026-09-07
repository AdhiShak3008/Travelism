"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SignalScope, SteeringSignal } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { cx } from "@/lib/format";

const PLACEHOLDERS: Record<string, string> = {
  trip: "e.g. I care about scenery more than museums, and the bathroom needs to be genuinely clean.",
  hotel: "e.g. The room looks lovely but I hate tiny bathrooms.",
  flight: "e.g. I really dislike early morning flights.",
  transport: "e.g. I don't mind long drives if they're scenic.",
  place: "e.g. This looks great — find more like it.",
  itinerary: "e.g. I'd rather not change hotels every night.",
  food: "e.g. Good food, but nothing too fancy.",
  destination: "e.g. Lean into the mountain scenery.",
  activity: "e.g. Keep this, but I'd rather not walk far.",
  stage: "Tell us what you're imagining.",
};

export function SteeringBox({
  scope,
  entityId,
  title = "Tell us what you're imagining",
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
    <div className={cx("rounded-2xl border border-brand/25 bg-brand/[0.05] p-4", compact && "p-3")}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-brand">✎</span>
        <span className="text-sm font-semibold text-ink">{title}</span>
      </div>
      {!compact && (
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">
          Anything you note here gently guides what we look into next.
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
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint/70 focus:border-brand/50"
        />
        <button onClick={submit} disabled={!text.trim()} className="btn-primary !px-4 !py-2.5">
          Note it
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
              <div key={s.id} className="rounded-xl border border-brand/25 bg-card p-3">
                <p className="text-sm text-ink">{s.interpretation}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
