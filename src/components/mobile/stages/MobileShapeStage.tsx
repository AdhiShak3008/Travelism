"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { estimateDaysForPlaces, recommendStayStrategy } from "@/lib/engine";
import { SteeringBox } from "@/components/ui/SteeringBox";
import type { Preferences, StayMode } from "@/lib/types";
import { cx } from "@/lib/format";

const PACES: { key: Preferences["pace"]; label: string; desc: string; icon: string }[] = [
  { key: "comfortable", label: "Slow & Relaxed", desc: "Plenty of downtime, relaxed mornings, scenic meals.", icon: "☕" },
  { key: "balanced", label: "Balanced Rhythm", desc: "A great mix of sightseeing, experiences, and free time.", icon: "⚖️" },
  { key: "fast", label: "Action-Packed", desc: "Pack in maximum sights, activities, and day trips.", icon: "⚡" },
];

const STAY_MODES: { key: StayMode; label: string; desc: string; icon: string; tag?: string }[] = [
  { key: "hotels", label: "Hotels & Boutique Stays", desc: "Curated boutique hotels and vetted properties.", icon: "🏨" },
  { key: "wild_camping", label: "Wild Camping & Bivvies", desc: "100% self-supported. River & trail pitches with ₹0 hotel fees.", icon: "⛺", tag: "₹0 Lodging" },
  { key: "campsites_refugios", label: "Campsites & Alpine Huts", desc: "Designated tent pitches, refugios, and shelters.", icon: "🏕️" },
  { key: "homestays", label: "Local Homestays", desc: "Authentic family-run stays and village guesthouses.", icon: "🏡" },
  { key: "none", label: "No Hotel Needed", desc: "Day trip, staying with family, or self-arranged.", icon: "🚫", tag: "Zero Stays" },
];

const DURATION_PRESETS = [
  { label: "3d", days: 3 },
  { label: "5d", days: 5 },
  { label: "1 Week", days: 7 },
  { label: "10d", days: 10 },
  { label: "2 Weeks", days: 14 },
  { label: "3 Weeks", days: 21 },
  { label: "1 Month", days: 30 },
];

const TRAVELER_PRESETS = [
  { label: "Solo (1)", count: 1 },
  { label: "Couple (2)", count: 2 },
  { label: "Family (3)", count: 3 },
  { label: "Family (4)", count: 4 },
  { label: "Group (6)", count: 6 },
];

const POPULAR_ORIGINS = [
  "Hyderabad", "Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Dubai", "London", "New York"
];

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
  const exps = (dataset.experiences ?? []).filter((e) => blob.selectedExperienceIds.includes(e.id));
  const needed = estimateDaysForPlaces(selected, blob.preferences.pace);

  const stayRec = recommendStayStrategy(
    selected,
    blob.durationDays,
    blob.preferences.stayMode,
    blob.preferences.isSelfSupported
  );
  const activeStayMode: StayMode = blob.preferences.stayMode || (blob.preferences.isSelfSupported ? "wild_camping" : "hotels");

  return (
    <div className="pb-36 bg-paper min-h-screen px-4 py-5 space-y-6">
      {/* Stage Header */}
      <div>
        <div className="label-eyebrow text-[10px]">Trip Schedule & Logistics</div>
        <h1 className="display text-2xl font-bold text-ink">Shape Your Schedule</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Customize duration, traveler count, pace, and stay style for {blob.destinationName}.
        </p>
      </div>

      {/* 1. DURATION SECTION */}
      <div className="card p-4 shadow-sm border-line">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-eyebrow text-[10px]">Total Vacation Length</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="display text-3xl font-extrabold text-ink">{blob.durationDays}</span>
              <span className="text-base font-semibold text-ink-soft">days</span>
              <span className="text-xs text-ink-faint">({Math.max(1, blob.durationDays - 1)} nights)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDuration(Math.max(1, blob.durationDays - 1))}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-paper-2 text-lg font-bold text-ink active:scale-95 shadow-xs"
            >
              −
            </button>
            <span className="font-bold text-base text-ink w-6 text-center">{blob.durationDays}</span>
            <button
              onClick={() => setDuration(Math.min(45, blob.durationDays + 1))}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-paper-2 text-lg font-bold text-ink active:scale-95 shadow-xs"
            >
              +
            </button>
          </div>
        </div>

        <input
          type="range"
          min={1}
          max={35}
          value={blob.durationDays}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-4 w-full accent-[hsl(var(--brand))] cursor-pointer"
        />

        {/* Quick Presets */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.days}
              onClick={() => setDuration(preset.days)}
              className={cx(
                "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs",
                blob.durationDays === preset.days
                  ? "bg-brand text-white"
                  : "border border-line bg-paper-2 text-ink-soft"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. ACCOMMODATION & STAY STYLE SELECTOR (Matches PC Experience) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="display text-base font-bold text-ink">Accommodation & Stay Style</h3>
          <span className="text-[11px] font-semibold text-brand">
            {stayRec.recommendedHotelCount === 0 ? "0 Hotels (₹0)" : `${stayRec.recommendedHotelCount} Stay Base(s)`}
          </span>
        </div>

        <div className="grid gap-2">
          {STAY_MODES.map((mode) => {
            const isSelected = activeStayMode === mode.key;
            return (
              <button
                key={mode.key}
                onClick={() => setStayMode(mode.key)}
                className={cx(
                  "flex items-start gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] shadow-xs",
                  isSelected
                    ? "border-emerald-500 bg-emerald-500/[0.06] ring-2 ring-emerald-500/20"
                    : "border-line bg-card hover:border-brand/40"
                )}
              >
                <span className="text-2xl shrink-0 mt-0.5">{mode.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-ink">{mode.label}</span>
                    {mode.tag && (
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        {mode.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-soft mt-0.5 leading-relaxed">{mode.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Route Strategy Advisory */}
        <div className="rounded-2xl border border-brand/30 bg-brand/[0.04] p-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">🧭</span>
            <div>
              <div className="font-bold text-xs text-ink">{stayRec.badge}</div>
              <p className="text-[11px] text-ink-soft mt-0.5">{stayRec.reason}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TRAVELERS COUNT */}
      <div className="card p-4 shadow-sm border-line space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-eyebrow text-[10px]">Travelers</div>
            <div className="text-base font-bold text-ink mt-0.5">
              {blob.travelers} Person{blob.travelers > 1 ? "s" : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTravelers(Math.max(1, blob.travelers - 1))}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-paper-2 text-lg font-bold text-ink active:scale-95 shadow-xs"
            >
              −
            </button>
            <span className="font-bold text-base text-ink w-6 text-center">{blob.travelers}</span>
            <button
              onClick={() => setTravelers(Math.min(20, blob.travelers + 1))}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-paper-2 text-lg font-bold text-ink active:scale-95 shadow-xs"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {TRAVELER_PRESETS.map((p) => (
            <button
              key={p.count}
              onClick={() => setTravelers(p.count)}
              className={cx(
                "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs",
                blob.travelers === p.count
                  ? "bg-brand text-white"
                  : "border border-line bg-paper-2 text-ink-soft"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. TRAVEL PACE */}
      <div className="space-y-2.5">
        <h3 className="display text-base font-bold text-ink">Trip Pace & Intensity</h3>
        <div className="grid gap-2">
          {PACES.map((p) => {
            const isSelected = blob.preferences.pace === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setPace(p.key)}
                className={cx(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] shadow-xs",
                  isSelected
                    ? "border-brand bg-brand/10 ring-2 ring-brand/20"
                    : "border-line bg-card hover:border-brand/40"
                )}
              >
                <span className="text-xl shrink-0">{p.icon}</span>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-ink">{p.label}</div>
                  <div className="text-[11px] text-ink-soft leading-tight mt-0.5">{p.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. DEPARTURE CITY */}
      <div className="card p-4 shadow-sm border-line space-y-3">
        <div>
          <div className="label-eyebrow text-[10px]">Origin Airport / City</div>
          <input
            value={blob.origin || ""}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Type your departure city (e.g. London, Mumbai, New York)..."
            className="mt-1.5 w-full rounded-xl border border-line bg-paper-2 px-3 py-2 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {POPULAR_ORIGINS.map((city) => (
            <button
              key={city}
              onClick={() => setOrigin(city)}
              className={cx(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition shadow-2xs",
                blob.origin === city
                  ? "bg-brand text-white"
                  : "border border-line bg-paper-2 text-ink-soft"
              )}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* 6. NATURAL LANGUAGE STEERING BOX (Matches PC Experience) */}
      <div>
        <SteeringBox scope="itinerary" title="Any specific timing preferences or schedule rules?" />
      </div>

      {/* 7. SELECTED SIGHTS RECAP */}
      <div className="rounded-2xl border border-line bg-card p-3.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-ink">
          <span>{selected.length} Places & {exps.length} Activities Bookmarked</span>
          <span className="text-[11px] text-brand font-bold">~{needed} days suggested</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map((p) => (
            <span key={p.id} className="rounded-lg bg-paper-2 border border-line px-2 py-0.5 text-[10px] font-medium text-ink-soft">
              {p.canonicalName}
            </span>
          ))}
          {exps.map((e) => (
            <span key={e.id} className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              🎟️ {e.name}
            </span>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Next Button */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-paper/95 p-3.5 backdrop-blur-xl shadow-lift">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <div className="text-xs font-bold text-ink">
              {blob.durationDays} Days · {blob.travelers} Traveler{blob.travelers > 1 ? "s" : ""}
            </div>
            <div className="text-[10px] text-ink-faint">
              {activeStayMode === "wild_camping" ? "⛺ Wild Camping (₹0)" : activeStayMode === "none" ? "🚫 0 Hotels" : "🏨 Hotels"} · {blob.origin || "Origin"}
            </div>
          </div>

          <button
            onClick={() => setStage("mood")}
            className="btn-primary !px-6 !py-2.5 text-xs font-extrabold shadow-md"
          >
            <span>Set Travel Mood</span>
            <span className="ml-1">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
