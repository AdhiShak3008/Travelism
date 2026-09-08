"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import type { MoodKey } from "@/lib/types";

const MOOD_ITEMS: { key: MoodKey; label: string; icon: string; low: string; high: string }[] = [
  { key: "scenic", label: "Natural Scenery", icon: "🏔️", low: "Urban", high: "Jaw-dropping Views" },
  { key: "adventure", label: "Adventure & Outdoor", icon: "🧗", low: "Gentle walks", high: "Extreme & High Passes" },
  { key: "food", label: "Culinary & Dining", icon: "🍜", low: "Quick bites", high: "Local Feast & Cafes" },
  { key: "photography", label: "Photo & Golden Hour", icon: "📸", low: "Casual snaps", high: "Epic Visual Spots" },
  { key: "culture", label: "Heritage & Monasteries", icon: "🏛️", low: "Minimal", high: "Deep Local History" },
  { key: "comfort", label: "Rest & Wellness", icon: "☕", low: "Active push", high: "Maximum Leisure" },
];

export function MobileMoodStage() {
  const blob = useTrip((s) => s.blob);
  const setMoodKey = useTrip((s) => s.setMoodKey);
  const runInvestigation = useTrip((s) => s.runInvestigation);
  const setStage = useTrip((s) => s.setStage);

  return (
    <div className="pb-32 bg-paper px-4 py-4 space-y-5 min-h-screen">
      <div>
        <span className="label-eyebrow">Atmosphere & Vibe</span>
        <h2 className="display text-2xl font-bold text-ink">Tune Your Vacation Vibe</h2>
        <p className="text-xs text-ink-soft mt-1">
          Adjust priorities so our 5 agents weight the best passes, stays, and trails for you.
        </p>
      </div>

      <div className="space-y-3.5">
        {MOOD_ITEMS.map((item) => {
          const val = blob.mood[item.key] ?? 5;
          return (
            <div key={item.key} className="card p-3.5 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-bold text-xs text-ink">{item.label}</span>
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
                onChange={(e) => setMoodKey(item.key, Number(e.target.value))}
                className="w-full accent-[hsl(var(--brand))] cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-ink-faint mt-1">
                <span>{item.low}</span>
                <span>{item.high}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3.5 backdrop-blur-xl shadow-lift flex items-center justify-between gap-3">
        <button onClick={() => setStage("shape")} className="btn-ghost !text-xs !py-2">
          ← Dates
        </button>
        <button
          onClick={runInvestigation}
          className="flex-1 rounded-xl bg-brand py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition text-center flex items-center justify-center gap-1.5"
        >
          <span>⚡ Launch Investigation →</span>
        </button>
      </div>
    </div>
  );
}
