"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { estimateDaysForPlaces } from "@/lib/engine";
import { SteeringBox } from "@/components/ui/SteeringBox";
import { SectionTitle } from "@/components/ui/Primitives";
import type { Preferences } from "@/lib/types";
import { cx } from "@/lib/format";

const PACES: { key: Preferences["pace"]; label: string; desc: string }[] = [
  { key: "comfortable", label: "Easy does it", desc: "Fewer, richer days. Room to breathe." },
  { key: "balanced", label: "Just right", desc: "A steady rhythm with a little slack." },
  { key: "fast", label: "See it all", desc: "As much as realistically fits." },
];

export function ShapeStage() {
  const dataset = useTrip((s) => s.dataset);
  const blob = useTrip((s) => s.blob);
  const setDuration = useTrip((s) => s.setDuration);
  const setTravelers = useTrip((s) => s.setTravelers);
  const setPace = useTrip((s) => s.setPace);
  const setOrigin = useTrip((s) => s.setOrigin);
  const setStage = useTrip((s) => s.setStage);

  if (!dataset) return null;
  const selected = dataset.places.filter((p) => blob.selectedPlaceIds.includes(p.id));
  const needed = estimateDaysForPlaces(selected, blob.preferences.pace);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <SectionTitle
        eyebrow="Your trip, shaped"
        title="How long, and how relaxed?"
        hint={`Your ${selected.length} pick${selected.length !== 1 ? "s" : ""} comfortably fill about ${needed} days once we count the travel.`}
      />

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-eyebrow mb-1">How many days</div>
            <div className="display text-4xl font-semibold text-ink">
              {blob.durationDays} <span className="text-lg text-ink-faint">days</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDuration(blob.durationDays - 1)} className="grid h-11 w-11 place-items-center rounded-full border border-line-strong text-xl text-ink hover:bg-paper-2">−</button>
            <button onClick={() => setDuration(blob.durationDays + 1)} className="grid h-11 w-11 place-items-center rounded-full border border-line-strong text-xl text-ink hover:bg-paper-2">+</button>
          </div>
        </div>
        <input
          type="range"
          min={2}
          max={16}
          value={blob.durationDays}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-5 w-full accent-[hsl(var(--brand))]"
        />
        {blob.durationDays < needed && (
          <div className="mt-3 rounded-lg border border-warn/30 bg-warn/[0.08] px-3 py-2 text-xs text-warn">
            Heads up: your picks really want ~{needed} days. At {blob.durationDays} it&rsquo;ll feel rushed — add a day or drop a stop.
          </div>
        )}
      </div>

      <div className="card mt-5 flex items-center justify-between p-6">
        <div>
          <div className="label-eyebrow mb-1">Who&rsquo;s going</div>
          <div className="display text-2xl font-semibold text-ink">{blob.travelers} {blob.travelers > 1 ? "travellers" : "traveller"}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTravelers(blob.travelers - 1)} className="grid h-11 w-11 place-items-center rounded-full border border-line-strong text-xl text-ink hover:bg-paper-2">−</button>
          <button onClick={() => setTravelers(blob.travelers + 1)} className="grid h-11 w-11 place-items-center rounded-full border border-line-strong text-xl text-ink hover:bg-paper-2">+</button>
        </div>
      </div>

      {/* Flying from */}
      <div className="card mt-5 p-6">
        <div className="label-eyebrow mb-2">Flying from</div>
        <input
          value={blob.origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Your departure city — e.g. Mumbai"
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-lg text-ink outline-none placeholder:text-ink-faint/70 focus:border-brand/50"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Kolkata", "Chennai"].map((c) => (
            <button
              key={c}
              onClick={() => setOrigin(c)}
              className={
                blob.origin.toLowerCase() === c.toLowerCase()
                  ? "rounded-full bg-brand px-3 py-1 text-xs font-semibold text-paper"
                  : "rounded-full border border-line-strong bg-paper-2 px-3 py-1 text-xs text-ink-soft hover:text-ink"
              }
            >
              {c}
            </button>
          ))}
        </div>
        {!blob.origin.trim() && (
          <p className="mt-2 text-xs text-ink-faint">We&rsquo;ll route your flights from here. Without it, flights just show the destination gateway.</p>
        )}
      </div>

      <div className="mt-6">
        <div className="label-eyebrow mb-3">Your pace</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACES.map((p) => (
            <motion.button
              key={p.key}
              whileTap={{ scale: 0.98 }}
              onClick={() => setPace(p.key)}
              className={cx(
                "rounded-2xl border p-4 text-left transition",
                blob.preferences.pace === p.key ? "border-brand bg-brand/[0.06] shadow-card" : "border-line bg-card hover:border-line-strong"
              )}
            >
              <div className="display text-base font-semibold text-ink">{p.label}</div>
              <p className="mt-1 text-sm text-ink-soft">{p.desc}</p>
              <div className="mt-3 text-xs text-brand">≈ {estimateDaysForPlaces(selected, p.key)} days</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <SteeringBox scope="itinerary" title="Any rules for how the days flow?" />
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={() => setStage("reveal")} className="btn-ghost">← Back to places</button>
        <button onClick={() => setStage("mood")} className="btn-primary">Next: your vibe →</button>
      </div>
    </div>
  );
}
