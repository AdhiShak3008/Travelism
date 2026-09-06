"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { SteeringBox } from "@/components/ui/SteeringBox";
import { SectionTitle } from "@/components/ui/Primitives";
import type { MoodKey } from "@/lib/types";

const MOODS: { key: MoodKey; label: string; glyph: string }[] = [
  { key: "scenic", label: "Scenic", glyph: "🏔️" },
  { key: "photography", label: "Photography", glyph: "📷" },
  { key: "food", label: "Food", glyph: "🍜" },
  { key: "comfort", label: "Comfort", glyph: "🛏️" },
  { key: "adventure", label: "Adventure", glyph: "🥾" },
  { key: "culture", label: "Culture", glyph: "🛕" },
  { key: "nightlife", label: "Nightlife", glyph: "🌃" },
  { key: "rushing", label: "Rushing", glyph: "⏱️" },
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
        eyebrow="Travel mood"
        title="How do you like to travel?"
        hint="This becomes a soft preference vector. The agents use it when ranking candidates — no single answer is right or wrong."
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
              <div className="flex w-36 shrink-0 items-center gap-2 text-sm text-paper-100">
                <span>{m.glyph}</span>
                <span className="uppercase tracking-wide text-[12px] text-paper-200/80">{m.label}</span>
              </div>
              <div className="relative flex-1">
                <div className="flex gap-1">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMoodKey(m.key, idx + 1)}
                      className="h-6 flex-1 rounded-[3px] transition"
                      style={{
                        background:
                          idx < mood[m.key]
                            ? `rgba(63,214,189,${0.35 + (idx / 10) * 0.5})`
                            : "rgba(255,255,255,0.05)",
                      }}
                      aria-label={`${m.label} ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
              <span className="w-6 text-right text-sm font-semibold tabular-nums text-paper-100">{mood[m.key]}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Derived preferences preview */}
      {(prefs.priorities.length > 0 || prefs.deprioritized.length > 0 || prefs.accessibilityNeeds.length > 0) && (
        <div className="mt-5 rounded-2xl border border-alpine-500/20 bg-alpine-500/[0.04] p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-alpine-300/80">
            What we&rsquo;ve understood so far
          </div>
          <div className="flex flex-wrap gap-2">
            {prefs.priorities.map((p) => (
              <span key={p} className="chip !border-signal-good/30 !text-signal-good">↑ {p.replace(/_/g, " ")}</span>
            ))}
            {prefs.deprioritized.map((p) => (
              <span key={p} className="chip !text-paper-200/50">↓ {p}</span>
            ))}
            {prefs.accessibilityNeeds.map((p) => (
              <span key={p} className="chip !border-aurora-400/30 !text-aurora-300">♿ {p.replace(/_/g, " ")}</span>
            ))}
            <span className="chip">Flights: {prefs.budgetTier}</span>
            <span className="chip">Pace: {prefs.pace}</span>
            {prefs.avoidEarlyFlights && <span className="chip">No early flights</span>}
            {prefs.minimizeHotelChanges && <span className="chip">Minimize hotel changes</span>}
          </div>
        </div>
      )}

      <div className="mt-6">
        <SteeringBox scope="trip" title="Anything else the agents should know?" />
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={() => setStage("shape")} className="btn-ghost">← Back</button>
        <button
          onClick={() => runInvestigation()}
          className="btn-primary"
        >
          Send in the agents →
        </button>
      </div>
    </div>
  );
}
