"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { SteeringBox } from "@/components/ui/SteeringBox";
import { SectionTitle } from "@/components/ui/Primitives";
import type { MoodKey } from "@/lib/types";

const MOODS: { key: MoodKey; label: string; glyph: string }[] = [
  { key: "scenic", label: "Scenery", glyph: "🏔️" },
  { key: "photography", label: "Photography", glyph: "📷" },
  { key: "food", label: "Food", glyph: "🍜" },
  { key: "comfort", label: "Comfort", glyph: "🛏️" },
  { key: "adventure", label: "Adventure", glyph: "🥾" },
  { key: "culture", label: "Culture", glyph: "🛕" },
  { key: "nightlife", label: "Nightlife", glyph: "🌃" },
  { key: "rushing", label: "Fast pace", glyph: "⏱️" },
];

export function MoodStage() {
  const mood = useTrip((s) => s.blob.mood);
  const setMoodKey = useTrip((s) => s.setMoodKey);
  const setStage = useTrip((s) => s.setStage);
  const runInvestigation = useTrip((s) => s.runInvestigation);
  const prefs = useTrip((s) => s.blob.preferences);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <SectionTitle
        eyebrow="Your travel vibe"
        title="What makes a trip feel right to you?"
        hint="Slide these to taste. We use it gently to lean the choices your way — there's no wrong answer."
      />

      <div className="card p-6">
        <div className="space-y-4">
          {MOODS.map((m, i) => (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4"
            >
              <div className="flex w-36 shrink-0 items-center gap-2 text-sm text-ink">
                <span>{m.glyph}</span>
                <span className="text-[13px]">{m.label}</span>
              </div>
              <div className="flex flex-1 gap-1">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMoodKey(m.key, idx + 1)}
                    className="h-6 flex-1 rounded-[3px] transition"
                    style={{
                      background: idx < mood[m.key] ? `hsl(var(--brand) / ${0.4 + (idx / 10) * 0.55})` : "hsl(var(--paper-3))",
                    }}
                    aria-label={`${m.label} ${idx + 1}`}
                  />
                ))}
              </div>
              <span className="w-6 text-right text-sm font-semibold tabular-nums text-ink">{mood[m.key]}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {(prefs.priorities.length > 0 || prefs.deprioritized.length > 0 || prefs.accessibilityNeeds.length > 0) && (
        <div className="mt-5 rounded-2xl border border-brand/25 bg-brand/[0.05] p-4">
          <div className="mb-2 label-eyebrow">What we&rsquo;ve picked up so far</div>
          <div className="flex flex-wrap gap-2">
            {prefs.priorities.map((p) => (
              <span key={p} className="chip !text-good">↑ {p.replace(/_/g, " ")}</span>
            ))}
            {prefs.deprioritized.map((p) => (
              <span key={p} className="chip">↓ {p}</span>
            ))}
            {prefs.accessibilityNeeds.map((p) => (
              <span key={p} className="chip !text-terra">♿ {p.replace(/_/g, " ")}</span>
            ))}
            <span className="chip">Flights: {prefs.budgetTier}</span>
            <span className="chip">Pace: {prefs.pace}</span>
          </div>
        </div>
      )}

      <div className="mt-6">
        <SteeringBox scope="trip" title="Anything else we should keep in mind?" />
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={() => setStage("shape")} className="btn-ghost">← Back</button>
        <button onClick={() => runInvestigation()} className="btn-primary">Build my trip →</button>
      </div>
    </div>
  );
}
