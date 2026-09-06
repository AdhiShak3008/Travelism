"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { estimateDaysForPlaces } from "@/lib/engine";
import { SteeringBox } from "@/components/ui/SteeringBox";
import { SectionTitle } from "@/components/ui/Primitives";
import type { Preferences } from "@/lib/types";
import { cx } from "@/lib/format";

const PACES: { key: Preferences["pace"]; label: string; desc: string; mult: number }[] = [
  { key: "comfortable", label: "Comfortable", desc: "Fewer, richer experiences. Space to breathe.", mult: 1.25 },
  { key: "balanced", label: "Balanced", desc: "A steady rhythm with room for the unexpected.", mult: 1.0 },
  { key: "fast", label: "Fast-paced", desc: "See as much as realistically possible.", mult: 0.82 },
];

export function ShapeStage() {
  const dataset = useTrip((s) => s.dataset);
  const blob = useTrip((s) => s.blob);
  const setDuration = useTrip((s) => s.setDuration);
  const setTravelers = useTrip((s) => s.setTravelers);
  const setPace = useTrip((s) => s.setPace);
  const setStage = useTrip((s) => s.setStage);

  if (!dataset) return null;
  const selected = dataset.places.filter((p) => blob.selectedPlaceIds.includes(p.id));
  const needed = estimateDaysForPlaces(selected, blob.preferences.pace);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <SectionTitle
        eyebrow="Trip shape"
        title="How long, and at what pace?"
        hint={`Your ${selected.length} selected place${selected.length !== 1 ? "s" : ""} currently need about ${needed} days including realistic travel time.`}
      />

      {/* Duration */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-eyebrow mb-1">Trip duration</div>
            <div className="font-display text-4xl font-semibold text-paper-50">
              {blob.durationDays} <span className="text-lg text-paper-200/60">days</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDuration(blob.durationDays - 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-xl hover:bg-white/[0.06]">−</button>
            <button onClick={() => setDuration(blob.durationDays + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-xl hover:bg-white/[0.06]">+</button>
          </div>
        </div>
        <input
          type="range"
          min={2}
          max={16}
          value={blob.durationDays}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-5 w-full accent-alpine-500"
        />
        {blob.durationDays < needed && (
          <div className="mt-3 rounded-lg border border-signal-warn/20 bg-signal-warn/[0.06] px-3 py-2 text-xs text-signal-warn">
            ⚠ Your selection realistically needs ~{needed} days. At {blob.durationDays} days it will feel rushed — add a day or drop a place.
          </div>
        )}
      </div>

      {/* Travelers */}
      <div className="card mt-5 flex items-center justify-between p-6">
        <div>
          <div className="label-eyebrow mb-1">Travellers</div>
          <div className="font-display text-2xl font-semibold text-paper-50">{blob.travelers}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTravelers(blob.travelers - 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-xl hover:bg-white/[0.06]">−</button>
          <button onClick={() => setTravelers(blob.travelers + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-xl hover:bg-white/[0.06]">+</button>
        </div>
      </div>

      {/* Pace */}
      <div className="mt-6">
        <div className="label-eyebrow mb-3">Choose your pace</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACES.map((p) => (
            <motion.button
              key={p.key}
              whileTap={{ scale: 0.98 }}
              onClick={() => setPace(p.key)}
              className={cx(
                "rounded-2xl border p-4 text-left transition",
                blob.preferences.pace === p.key
                  ? "border-alpine-400/50 bg-alpine-500/[0.08] shadow-glow"
                  : "border-white/[0.06] bg-ink-800/50 hover:border-white/15"
              )}
            >
              <div className="font-display text-base font-semibold text-paper-50">{p.label}</div>
              <p className="mt-1 text-sm text-paper-200/60">{p.desc}</p>
              <div className="mt-3 text-xs text-alpine-300">≈ {estimateDaysForPlaces(selected, p.key)} days</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <SteeringBox scope="itinerary" title="Any rules for how the days flow?" />
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={() => setStage("reveal")} className="btn-ghost">← Back to places</button>
        <button onClick={() => setStage("mood")} className="btn-primary">Set travel mood →</button>
      </div>
    </div>
  );
}
