"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { SteeringBox } from "@/components/ui/SteeringBox";
import { SectionTitle } from "@/components/ui/Primitives";
import type { MoodKey } from "@/lib/types";

const MOODS: { key: MoodKey; label: string; glyph: string }[] = [
  { key: "scenic", label: "Mountain & Nature Scenery", glyph: "🏔️" },
  { key: "photography", label: "Photography & Viewpoints", glyph: "📷" },
  { key: "food", label: "Culinary & Dining", glyph: "🍜" },
  { key: "comfort", label: "Luxury & Room Comfort", glyph: "🛏️" },
  { key: "adventure", label: "Outdoor & Adventure", glyph: "🥾" },
  { key: "culture", label: "Heritage & Temples", glyph: "🛕" },
  { key: "nightlife", label: "Evening Vibes & Lounges", glyph: "🌃" },
  { key: "rushing", label: "Fast-Paced Sightseeing", glyph: "⏱️" },
];

export function MoodStage() {
  const mood = useTrip((s) => s.blob.mood);
  const setMoodKey = useTrip((s) => s.setMoodKey);
  const setStage = useTrip((s) => s.setStage);
  const runInvestigation = useTrip((s) => s.runInvestigation);
  const addComment = useTrip((s) => s.addComment);
  const prefs = useTrip((s) => s.blob.preferences);
  const signals = useTrip((s) => s.blob.signals);
  const [customNote, setCustomNote] = useState("");

  const handleDeploy = () => {
    if (customNote.trim()) {
      addComment(customNote.trim(), "trip");
      setCustomNote("");
    }
    runInvestigation();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <SectionTitle
        eyebrow="Atmosphere & Vibe Tuning"
        title="What makes a trip feel truly perfect to you?"
        hint="Adjust each slider to your personal preference. Our 5 parent director agents weight your hotel selection, dining recommendations, and pacing accordingly."
      />

      <div className="card p-6 shadow-card">
        <div className="space-y-4">
          {MOODS.map((m, i) => (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4"
            >
              <div className="flex w-44 shrink-0 items-center gap-2.5 text-sm font-semibold text-ink">
                <span className="text-lg">{m.glyph}</span>
                <span className="text-xs sm:text-sm truncate">{m.label}</span>
              </div>
              <div className="flex flex-1 gap-1.5 py-1">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const isActive = idx < mood[m.key];
                  return (
                    <button
                      key={idx}
                      onClick={() => setMoodKey(m.key, idx + 1)}
                      className="h-7 flex-1 rounded-md transition-all hover:scale-105"
                      style={{
                        background: isActive
                          ? `linear-gradient(180deg, hsl(var(--brand-soft)), hsl(var(--brand)))`
                          : "hsl(var(--paper-3))",
                        boxShadow: isActive ? "0 2px 8px -2px hsl(var(--brand) / 0.4)" : "none",
                      }}
                      aria-label={`${m.label} ${idx + 1}`}
                      title={`${m.label}: ${idx + 1}/10`}
                    />
                  );
                })}
              </div>
              <span className="w-8 text-right text-sm font-extrabold tabular-nums text-brand">{mood[m.key]}/10</span>
            </motion.div>
          ))}
        </div>
      </div>

      {(prefs.priorities.length > 0 || prefs.deprioritized.length > 0 || prefs.accessibilityNeeds.length > 0 || signals.length > 0) && (
        <div className="mt-6 rounded-2xl border border-brand/25 bg-brand/[0.04] p-4 shadow-sm">
          <div className="mb-2 label-eyebrow">Active Trip Intelligence Profiles & Steering</div>
          <div className="flex flex-wrap gap-2">
            {prefs.priorities.map((p) => (
              <span key={p} className="chip !text-emerald-600 dark:!text-emerald-400 font-bold">↑ {p.replace(/_/g, " ")}</span>
            ))}
            {prefs.deprioritized.map((p) => (
              <span key={p} className="chip !text-rose-600 dark:!text-rose-400 font-bold">↓ {p}</span>
            ))}
            {prefs.accessibilityNeeds.map((p) => (
              <span key={p} className="chip !text-terra font-bold">♿ {p.replace(/_/g, " ")}</span>
            ))}
            <span className="chip font-semibold">Budget: {prefs.budgetTier}</span>
            <span className="chip font-semibold">Pace: {prefs.pace}</span>
            {signals.slice(-3).map((s) => (
              <span key={s.id} className="chip !bg-brand/15 !border-brand/30 text-xs font-semibold">
                💬 {s.text.slice(0, 30)}{s.text.length > 30 ? "…" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <SteeringBox
          scope="trip"
          title="Any custom requests, dietary needs, or special milestones?"
          value={customNote}
          onChangeText={setCustomNote}
        />
      </div>

      <div className="mt-10 flex items-center justify-between pt-6 border-t border-line">
        <button onClick={() => setStage("shape")} className="btn-ghost">
          ← Back to Schedule
        </button>
        <button
          onClick={handleDeploy}
          className="btn-primary !px-8 !py-3.5 text-base font-bold shadow-lift"
        >
          Deploy Swarm & Build Trip →
        </button>
      </div>
    </div>
  );
}

