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
  value,
  onChangeText,
}: {
  scope: SignalScope;
  entityId?: string;
  title?: string;
  compact?: boolean;
  value?: string;
  onChangeText?: (val: string) => void;
}) {
  const addComment = useTrip((s) => s.addComment);
  const [internalText, setInternalText] = useState("");
  const [acked, setAcked] = useState<SteeringSignal[] | null>(null);

  const currentText = value !== undefined ? value : internalText;

  function handleChange(val: string) {
    if (value === undefined) setInternalText(val);
    onChangeText?.(val);
  }

  function submit() {
    if (!currentText.trim()) return;
    const signals = addComment(currentText, scope, entityId);
    setAcked(signals);
    handleChange("");
    setTimeout(() => setAcked(null), 8000);
  }

  return (
    <div className={cx("rounded-2xl border border-brand/25 bg-brand/[0.05] p-4 shadow-sm", compact && "p-3")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-brand text-base">✎</span>
          <span className="text-sm font-semibold text-ink">{title}</span>
        </div>
        {acked && acked.length > 0 && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-pulse">
            ✓ Applied to AI Swarm
          </span>
        )}
      </div>
      {!compact && (
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">
          Anything you note here gently guides what we look into next.
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={currentText}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={compact ? 2 : 3}
          placeholder={PLACEHOLDERS[scope] ?? PLACEHOLDERS.stage}
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint/70 focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!currentText.trim()}
          className="btn-primary !px-4 !py-2.5 font-bold shadow-sm transition-all"
        >
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
