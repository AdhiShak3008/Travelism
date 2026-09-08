"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { estimateDaysForPlaces, recommendStayStrategy } from "@/lib/engine";
import { SectionTitle } from "@/components/ui/Primitives";
import type { Preferences, StayMode } from "@/lib/types";
import { cx } from "@/lib/format";

const PACES: { key: Preferences["pace"]; label: string; desc: string; icon: string }[] = [
  { key: "comfortable", label: "Slow & Leisurely", desc: "Plenty of downtime & scenic meals.", icon: "☕" },
  { key: "balanced", label: "Balanced Rhythm", desc: "A great mix of sights & free time.", icon: "⚖️" },
  { key: "fast", label: "Action-Packed", desc: "Pack in maximum sights & day trips.", icon: "⚡" },
];

const STAY_MODES: { key: StayMode; label: string; desc: string; icon: string; tag?: string }[] = [
  { key: "hotels", label: "Hotels & Stays", desc: "Curated hotels & verified properties.", icon: "🏨" },
  { key: "wild_camping", label: "Wild Camping", desc: "100% self-supported. River bivvies.", icon: "⛺", tag: "₹0 Lodging" },
  { key: "campsites_refugios", label: "Campsites & Huts", desc: "Designated pitches & refugios.", icon: "🏕️" },
  { key: "homestays", label: "Homestays", desc: "Authentic local family guesthouses.", icon: "🏡" },
  { key: "none", label: "No Hotel Needed", desc: "Day trip / Self-arranged lodging.", icon: "🚫", tag: "Zero Stays" },
];

const DURATION_CHIPS = [3, 5, 7, 10, 14, 21];
const POPULAR_ORIGINS = ["Hyderabad", "Mumbai", "Delhi", "Bengaluru", "Dubai", "London", "New York"];

export function MobileShapeStage() {
  const dataset = useTrip((s) => s.dataset);
  const blob = useTrip((s) => s.blob);
  const setDuration = useTrip((s) => s.setDuration);
  const setTravelers = useTrip((s) => s.setTravelers);
  const setPace = useTrip((s) => s.setPace);
  const setStayMode = useTrip((s) => s.setStayMode);
  const setOrigin = useTrip((s) => s.setOrigin);
  const setStage = useTrip((s) => s.setStage);

  if (!dataset) return null;
  const selected = dataset.places.filter((p) => blob.selectedPlaceIds.includes(p.id));
  const needed = estimateDaysForPlaces(selected, blob.preferences.pace);
  const stayRec = recommendStayStrategy(
    selected,
    blob.durationDays,
    blob.preferences.stayMode,
    blob.preferences.isSelfSupported
  );
  const activeStayMode: StayMode = blob.preferences.stayMode || (blob.preferences.isSelfSupported ? "wild_camping" : "hotels");

  return (
    <div className="pb-32 bg-paper px-4 py-4 space-y-5 min-h-screen">
      <div>
        <span className="label-eyebrow">Vacation Schedule</span>
        <h2 className="display text-2xl font-bold text-ink">Trip Dates & Logistics</h2>
      </div>

      {/* Duration Stepper Card */}
      <div className="card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-ink-soft">Vacation Duration</div>
            <div className="display text-3xl font-extrabold text-ink">
              {blob.durationDays} <span className="text-base font-semibold text-ink-soft">Days</span>
            </div>
            <div className="text-[11px] text-ink-faint">({Math.max(1, blob.durationDays - 1)} Nights)</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDuration(Math.max(1, blob.durationDays - 1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg font-bold text-ink active:bg-paper-2"
            >
              −
            </button>
            <span className="w-8 text-center text-lg font-bold text-ink">{blob.durationDays}</span>
            <button
              onClick={() => setDuration(Math.min(45, blob.durationDays + 1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg font-bold text-ink active:bg-paper-2"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-line/60">
          {DURATION_CHIPS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cx(
                "rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs",
                blob.durationDays === d
                  ? "bg-brand text-white"
                  : "border border-line bg-paper-2 text-ink-soft"
              )}
            >
              {d} Days
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-brand/5 border border-brand/20 p-2.5 text-[11px] text-ink-soft">
          💡 {selected.length} sights require ~{needed} days.
          {blob.durationDays > needed ? " Great relaxed pacing buffer!" : " Paced for an active journey."}
        </div>
      </div>

      {/* Travelers Card */}
      <div className="card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-ink-soft">Travel Party</div>
            <div className="display text-xl font-extrabold text-ink">
              {blob.travelers} {blob.travelers > 1 ? "Travelers" : "Solo Traveler"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTravelers(Math.max(1, blob.travelers - 1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg font-bold text-ink active:bg-paper-2"
            >
              −
            </button>
            <span className="w-8 text-center text-lg font-bold text-ink">{blob.travelers}</span>
            <button
              onClick={() => setTravelers(Math.min(20, blob.travelers + 1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg font-bold text-ink active:bg-paper-2"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Departure Origin City */}
      <div className="card p-4 shadow-card">
        <div className="text-xs font-semibold text-ink-soft mb-2">Departing From (Airport / City)</div>
        <input
          value={blob.origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="e.g. Hyderabad, Mumbai, London..."
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand"
        />
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {POPULAR_ORIGINS.map((c) => (
            <button
              key={c}
              onClick={() => setOrigin(c)}
              className={cx(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition",
                blob.origin.toLowerCase() === c.toLowerCase()
                  ? "bg-brand text-white"
                  : "border border-line bg-paper-2 text-ink-soft"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Stay Style Selection Card */}
      <div className="card p-4 shadow-card">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-xs font-semibold text-ink-soft">Stay & Lodging Mode</div>
          <span className="rounded-full bg-brand/10 border border-brand/30 px-2 py-0.5 text-[10px] font-bold text-brand">
            {stayRec.badge}
          </span>
        </div>

        <div className="grid gap-2.5 mt-3">
          {STAY_MODES.map((mode) => {
            const isSelected = activeStayMode === mode.key;
            return (
              <button
                key={mode.key}
                onClick={() => setStayMode(mode.key)}
                className={cx(
                  "flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition",
                  isSelected
                    ? "border-brand bg-brand/[0.08] ring-1 ring-brand/30"
                    : "border-line bg-paper-2 hover:border-line-strong"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{mode.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                      <span>{mode.label}</span>
                      {mode.tag && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          {mode.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-soft truncate">{mode.desc}</p>
                  </div>
                </div>
                {isSelected && <span className="text-xs font-bold text-brand shrink-0">✓</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl bg-paper-3/70 p-2.5 text-[10px] text-ink-soft">
          <strong>Route Strategy:</strong> {stayRec.reason}
        </div>
      </div>

      {/* Pace Selection */}
      <div className="card p-4 shadow-card">
        <div className="text-xs font-semibold text-ink-soft mb-2.5">Vacation Pace</div>
        <div className="grid grid-cols-3 gap-2">
          {PACES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPace(p.key)}
              className={cx(
                "flex flex-col items-center rounded-xl border p-2.5 text-center transition",
                blob.preferences.pace === p.key
                  ? "border-brand bg-brand/[0.08] ring-1 ring-brand/30"
                  : "border-line bg-paper-2"
              )}
            >
              <span className="text-xl mb-1">{p.icon}</span>
              <span className="text-[11px] font-bold text-ink">{p.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3.5 backdrop-blur-xl shadow-lift flex items-center justify-between gap-3">
        <button onClick={() => setStage("reveal")} className="btn-ghost !text-xs !py-2">
          ← Places
        </button>
        <button
          onClick={() => setStage("mood")}
          className="flex-1 rounded-xl bg-brand py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition text-center"
        >
          Next: Atmosphere & Vibe →
        </button>
      </div>
    </div>
  );
}
