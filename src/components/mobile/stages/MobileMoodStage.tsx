"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { SteeringBox } from "@/components/ui/SteeringBox";
import type { MoodKey } from "@/lib/types";

const MOODS: { key: MoodKey; label: string; glyph: string; desc: string }[] = [
  { key: "scenic", label: "Nature & Mountain Views", glyph: "🏔️", desc: "Panoramic passes, lakes, and lookout points" },
  { key: "adventure", label: "Outdoor & Adventure", glyph: "🥾", desc: "Hiking, trails, gravel passes, and sports" },
  { key: "food", label: "Dining & Culinary", glyph: "🍜", desc: "Local food spots, regional dining, and street bites" },
  { key: "comfort", label: "Luxury & Room Comfort", glyph: "🛏️", desc: "Plush bedding, heating, and top amenities" },
  { key: "photography", label: "Photo & Golden Hour", glyph: "📷", desc: "Sunrise spots and scenic viewpoints" },
  { key: "culture", label: "Heritage & Temples", glyph: "🛕", desc: "Monasteries, museums, and historic streets" },
  { key: "nightlife", label: "Evening Vibes & Lounges", glyph: "🌃", desc: "Cafes, rooftop lounges, and live music" },
  { key: "rushing", label: "Fast-Paced Sightseeing", glyph: "⏱️", desc: "Pack in maximum daily attractions" },
];

export function MobileMoodStage() {
  const blob = useTrip((s) => s.blob);
  const setMoodKey = useTrip((s) => s.setMoodKey);
  const runInvestigation = useTrip((s) => s.runInvestigation);
  const setStage = useTrip((s) => s.setStage);
  const prefs = blob.preferences;

  return (
    <div className="pb-36 bg-paper px-4 py-5 space-y-6 min-h-screen">
      <div>
        <div className="label-eyebrow text-[10px]">Atmosphere & Vibe Tuning</div>
        <h1 className="display text-2xl font-bold text-ink">Tune Your Vacation Vibe</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Adjust priorities so our autonomous agents prioritize your stays, routes, and pacing.
        </p>
      </div>

      {/* Mood Sliders Card */}
      <div className="card p-4 shadow-sm border-line space-y-4">
        {MOODS.map((m, i) => {
          const val = blob.mood[m.key] ?? 5;
          return (
            <div key={m.key} className="space-y-1.5 pb-3 border-b border-line/50 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{m.glyph}</span>
                  <span className="font-bold text-xs text-ink">{m.label}</span>
                </div>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                  {val}/10
                </span>
              </div>

              <input
                type="range"
                min={1}
                max={10}
                value={val}
                onChange={(e) => setMoodKey(m.key, Number(e.target.value))}
                className="w-full accent-[hsl(var(--brand))] cursor-pointer"
              />

              <div className="text-[10px] text-ink-faint">
                {m.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Intelligence Profiles (Matches PC) */}
      {(prefs.priorities.length > 0 || prefs.deprioritized.length > 0 || prefs.accessibilityNeeds.length > 0) && (
        <div className="rounded-2xl border border-brand/25 bg-brand/[0.04] p-3.5 shadow-xs space-y-2">
          <div className="label-eyebrow text-[10px]">Active Trip Steering Signals</div>
          <div className="flex flex-wrap gap-1.5">
            {prefs.priorities.map((p) => (
              <span key={p} className="chip !text-[10px] !text-emerald-600 dark:!text-emerald-400 font-bold">
                ↑ {p.replace(/_/g, " ")}
              </span>
            ))}
            {prefs.deprioritized.map((p) => (
              <span key={p} className="chip !text-[10px]">
                ↓ {p}
              </span>
            ))}
            {prefs.accessibilityNeeds.map((p) => (
              <span key={p} className="chip !text-[10px] !text-terra font-bold">
                ♿ {p.replace(/_/g, " ")}
              </span>
            ))}
            <span className="chip !text-[10px] font-semibold">Budget: {prefs.budgetTier}</span>
            <span className="chip !text-[10px] font-semibold">Pace: {prefs.pace}</span>
          </div>
        </div>
      )}

      {/* Steering Box (Matches PC) */}
      <div>
        <SteeringBox scope="trip" title="Any custom dietary needs, milestones, or requests?" />
      </div>

      {/* Sticky Bottom Action Dock */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 p-3.5 backdrop-blur-xl shadow-lift">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <button onClick={() => setStage("shape")} className="btn-ghost !text-xs !py-2.5">
            ← Schedule
          </button>
          <button
            onClick={runInvestigation}
            className="btn-primary flex-1 !py-2.5 text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5"
          >
            <span>Launch Deep Investigation</span>
            <span className="ml-1">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
