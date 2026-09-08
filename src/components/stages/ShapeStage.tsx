"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { estimateDaysForPlaces, recommendStayStrategy } from "@/lib/engine";
import { SteeringBox } from "@/components/ui/SteeringBox";
import { SectionTitle } from "@/components/ui/Primitives";
import type { Preferences, StayMode } from "@/lib/types";
import { cx } from "@/lib/format";

const PACES: { key: Preferences["pace"]; label: string; desc: string; icon: string }[] = [
  { key: "comfortable", label: "Slow & Leisurely", desc: "Plenty of downtime, relaxed mornings, scenic meals.", icon: "☕" },
  { key: "balanced", label: "Balanced Rhythm", desc: "A great mix of sightseeing, experiences, and free time.", icon: "⚖️" },
  { key: "fast", label: "Action-Packed", desc: "Pack in maximum sights, activities, and day trips.", icon: "⚡" },
];

const STAY_MODES: { key: StayMode; label: string; desc: string; icon: string; tag?: string }[] = [
  { key: "hotels", label: "Hotels & Boutique Stays", desc: "Curated hotels, resorts, and vetted properties.", icon: "🏨" },
  { key: "wild_camping", label: "Wild Camping & Bivvies", desc: "100% self-supported. River & trail pitches with ₹0 hotel fees.", icon: "⛺", tag: "₹0 Lodging" },
  { key: "campsites_refugios", label: "Campsites & Alpine Huts", desc: "Designated tent pitches, refugios, and backcountry shelters.", icon: "🏕️" },
  { key: "homestays", label: "Local Homestays", desc: "Authentic family-run stays and mountain village guesthouses.", icon: "🏡" },
  { key: "none", label: "No Hotel Needed", desc: "Day trip, staying with friends/family, or self-arranged lodging.", icon: "🚫", tag: "Zero Stays" },
];

const DURATION_PRESETS = [
  { label: "Long Weekend (3d)", days: 3 },
  { label: "5 Days", days: 5 },
  { label: "1 Week (7d)", days: 7 },
  { label: "10 Days", days: 10 },
  { label: "2 Weeks (14d)", days: 14 },
  { label: "16 Days", days: 16 },
  { label: "3 Weeks (21d)", days: 21 },
  { label: "1 Month (30d)", days: 30 },
];

const TRAVELER_PRESETS = [
  { label: "Solo (1)", count: 1 },
  { label: "Couple (2)", count: 2 },
  { label: "Family of 3", count: 3 },
  { label: "Family of 4", count: 4 },
  { label: "Friends Group (6)", count: 6 },
];

const POPULAR_ORIGINS = [
  "Hyderabad",
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Chennai",
  "Kolkata",
  "Dubai",
  "London",
  "New York",
  "San Francisco",
];

export function ShapeStage() {
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
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <SectionTitle
        eyebrow="Trip Schedule & Logistics"
        title="Tailor your dates & vacation schedule"
        hint="You have complete control over how many days you spend. We'll balance your itinerary and bookable experiences across your schedule."
      />

      {/* Days Selection Card */}
      <div className="card p-6 shadow-card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="label-eyebrow mb-1">Total Vacation Duration</div>
            <div className="flex items-baseline gap-2">
              <span className="display text-4xl font-bold text-ink">{blob.durationDays}</span>
              <span className="text-xl font-semibold text-ink-soft">days</span>
              <span className="text-sm font-medium text-ink-faint">({Math.max(1, blob.durationDays - 1)} nights)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDuration(Math.max(1, blob.durationDays - 1))}
              className="grid h-11 w-11 place-items-center rounded-full border border-line text-xl font-bold text-ink hover:bg-paper-2 transition active:scale-90 shadow-sm"
              aria-label="Decrease days"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={45}
              value={blob.durationDays}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-16 text-center font-bold text-xl rounded-xl border border-line bg-paper py-2 text-ink outline-none focus:border-brand shadow-inner"
            />
            <button
              onClick={() => setDuration(Math.min(45, blob.durationDays + 1))}
              className="grid h-11 w-11 place-items-center rounded-full border border-line text-xl font-bold text-ink hover:bg-paper-2 transition active:scale-90 shadow-sm"
              aria-label="Increase days"
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
          className="mt-6 w-full accent-[hsl(var(--brand))] cursor-pointer"
        />

        {/* Quick presets */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.days}
              onClick={() => setDuration(preset.days)}
              className={
                blob.durationDays === preset.days
                  ? "rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-paper shadow-sm"
                  : "rounded-full border border-line bg-paper-2 px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink hover:bg-paper-3 transition"
              }
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Friendly advisory info */}
        <div className="mt-4 rounded-xl border border-brand/20 bg-brand/[0.04] p-3.5 text-xs text-ink-soft leading-relaxed">
          💡 <strong>Pacing Intelligence:</strong> Your {selected.length} chosen spot{selected.length !== 1 ? "s" : ""}
          {exps.length > 0 ? ` and ${exps.length} activit${exps.length > 1 ? "ies" : "y"}` : ""} require ~{needed} day{needed !== 1 ? "s" : ""} of dedicated sightseeing.
          {blob.durationDays > needed
            ? ` With ${blob.durationDays} days, you'll enjoy relaxed buffer time for dining, shopping, beach downtime, and leisure!`
            : blob.durationDays < needed
            ? ` In ${blob.durationDays} days it will be a fast-paced trip. You can freely extend the days above anytime.`
            : " Perfectly matched rhythm for your selected sights."}
        </div>
      </div>

      {/* Travelers Card */}
      <div className="card mt-6 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="label-eyebrow mb-1">Travel Party</div>
            <div className="display text-2xl font-bold text-ink">
              {blob.travelers} {blob.travelers > 1 ? "Travelers" : "Solo Traveler"}
            </div>
            <p className="text-xs text-ink-faint mt-0.5">
              Flight fares, hotel rooms (1 room per 2 guests), and tickets scale automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTravelers(Math.max(1, blob.travelers - 1))}
              className="grid h-11 w-11 place-items-center rounded-full border border-line text-xl font-bold text-ink hover:bg-paper-2 transition active:scale-90 shadow-sm"
            >
              −
            </button>
            <span className="w-10 text-center font-bold text-xl text-ink">{blob.travelers}</span>
            <button
              onClick={() => setTravelers(Math.min(20, blob.travelers + 1))}
              className="grid h-11 w-11 place-items-center rounded-full border border-line text-xl font-bold text-ink hover:bg-paper-2 transition active:scale-90 shadow-sm"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-line/60">
          {TRAVELER_PRESETS.map((p) => (
            <button
              key={p.count}
              onClick={() => setTravelers(p.count)}
              className={
                blob.travelers === p.count
                  ? "rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-paper shadow-sm"
                  : "rounded-full border border-line bg-paper-2 px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink hover:bg-paper-3 transition"
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Origin City / Flights From */}
      <div className="card mt-6 p-6 shadow-card">
        <div className="label-eyebrow mb-2">Departure Airport / City</div>
        <input
          value={blob.origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Enter departure city — e.g. Hyderabad, Mumbai, London, New York"
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-lg font-bold text-ink outline-none placeholder:text-ink-faint focus:border-brand/60 focus:ring-2 focus:ring-brand/20 transition"
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-faint mr-1 py-1">Quick Select:</span>
          {POPULAR_ORIGINS.map((c) => (
            <button
              key={c}
              onClick={() => setOrigin(c)}
              className={
                blob.origin.toLowerCase() === c.toLowerCase()
                  ? "rounded-full bg-brand px-3 py-1 text-xs font-bold text-paper shadow-sm"
                  : "rounded-full border border-line bg-paper-2 px-3 py-1 text-xs font-medium text-ink-soft hover:text-ink hover:bg-paper-3 transition"
              }
            >
              {c}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-ink-faint">
          Real flight routes, layovers, and live fare estimates calculate departing from {blob.origin || "your city"}.
        </p>
      </div>

      {/* Accommodation & Lodging Preference */}
      <div className="card mt-6 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div>
            <div className="label-eyebrow mb-0.5">Accommodation & Stay Style</div>
            <div className="display text-xl font-bold text-ink">How will you stay?</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-bold text-brand shadow-xs">
            {stayRec.badge}
          </span>
        </div>
        <p className="text-xs text-ink-soft mb-4">
          Choose whether you want verified hotels, self-supported wild camping by rivers, mountain huts, or zero hotels.
        </p>

        {/* Stay Mode Buttons */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAY_MODES.map((mode) => {
            const isSelected = activeStayMode === mode.key;
            return (
              <motion.button
                key={mode.key}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStayMode(mode.key)}
                className={cx(
                  "relative rounded-2xl border p-4 text-left transition-all duration-200 flex flex-col justify-between",
                  isSelected
                    ? "border-brand bg-brand/[0.08] shadow-lift ring-2 ring-brand/30"
                    : "border-line bg-card hover:border-line-strong hover:shadow-card"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-2xl">{mode.icon}</span>
                    {mode.tag && (
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {mode.tag}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-ink">{mode.label}</div>
                  <p className="mt-1 text-[11px] text-ink-soft leading-relaxed">{mode.desc}</p>
                </div>
                {isSelected && (
                  <div className="mt-2 text-[11px] font-bold text-brand flex items-center gap-1">
                    <span>✓ Selected Mode</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Dynamic Stay Count Recommendation Box */}
        <div className="mt-4 rounded-xl border border-line-strong/60 bg-paper-2/70 p-3.5 text-xs text-ink-soft flex items-start gap-2.5">
          <span className="text-base shrink-0">📍</span>
          <div>
            <strong className="text-ink font-semibold">Route Strategy Advisory: </strong>
            <span>{stayRec.reason}</span>
          </div>
        </div>
      </div>

      {/* Pace Selection */}
      <div className="mt-8">
        <div className="label-eyebrow mb-3">Vacation Pace & Rhythm</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACES.map((p) => (
            <motion.button
              key={p.key}
              whileTap={{ scale: 0.98 }}
              onClick={() => setPace(p.key)}
              className={cx(
                "rounded-2xl border p-5 text-left transition-all duration-200",
                blob.preferences.pace === p.key
                  ? "border-brand bg-brand/[0.08] shadow-lift ring-2 ring-brand/30"
                  : "border-line bg-card hover:border-line-strong hover:shadow-card"
              )}
            >
              <div className="text-2xl mb-1.5">{p.icon}</div>
              <div className="display text-base font-bold text-ink">{p.label}</div>
              <p className="mt-1 text-xs text-ink-soft leading-relaxed">{p.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <SteeringBox scope="itinerary" title="Any specific timing preferences or schedule rules?" />
      </div>

      <div className="mt-10 flex items-center justify-between pt-6 border-t border-line">
        <button onClick={() => setStage("reveal")} className="btn-ghost">
          ← Back to Places
        </button>
        <button onClick={() => setStage("mood")} className="btn-primary !px-8 !py-3.5 text-base font-bold shadow-lift">
          Next: Atmosphere & Vibe →
        </button>
      </div>
    </div>
  );
}
