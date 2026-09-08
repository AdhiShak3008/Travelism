"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, type TravelPreferences } from "@/store/authStore";
import { useTrip } from "@/store/tripStore";
import { cx } from "@/lib/format";
import type { StayMode } from "@/lib/types";

const CURRENCIES = [
  { code: "INR", label: "₹ INR (Indian Rupee)", symbol: "₹" },
  { code: "USD", label: "$ USD (US Dollar)", symbol: "$" },
  { code: "EUR", label: "€ EUR (Euro)", symbol: "€" },
  { code: "GBP", label: "£ GBP (British Pound)", symbol: "£" },
  { code: "JPY", label: "¥ JPY (Japanese Yen)", symbol: "¥" },
  { code: "AED", label: "AED (UAE Dirham)", symbol: "AED" },
];

const BUDGET_TIERS: { key: TravelPreferences["budgetTier"]; label: string; desc: string; icon: string }[] = [
  { key: "economical", label: "Value Hunter", desc: "Clean budget stays, authentic local street food, and smart transit.", icon: "🏷️" },
  { key: "balanced", label: "Smart Comfort", desc: "Boutique 3–4★ properties, great balance of comfort and adventure.", icon: "⚖️" },
  { key: "premium", label: "Luxury & High-End", desc: "5★ heritage retreats, Taj/Oberoi, private SUVs, and fine dining.", icon: "👑" },
];

const PACES: { key: TravelPreferences["travelPace"]; label: string; desc: string; icon: string }[] = [
  { key: "comfortable", label: "Slow & Leisurely", desc: "1–2 spots per day, relaxed mornings, scenic cafes.", icon: "☕" },
  { key: "balanced", label: "Balanced Rhythm", desc: "2–4 spots per day with good downtime and flexible flow.", icon: "⚖️" },
  { key: "fast", label: "Action-Packed", desc: "Packed daily schedule from sunrise to sunset.", icon: "⚡" },
];

const STAY_MODES: { key: StayMode; label: string; desc: string; icon: string; tag?: string }[] = [
  { key: "hotels", label: "Hotels & Boutique Stays", desc: "Curated boutique hotels and vetted stays.", icon: "🏨" },
  { key: "wild_camping", label: "Wild Camping & Bivvies", desc: "100% self-supported river and ridge pitches.", icon: "⛺", tag: "₹0 Lodging" },
  { key: "campsites_refugios", label: "Campsites & Alpine Huts", desc: "Designated tent pitches, refugios, and shelters.", icon: "🏕️" },
  { key: "homestays", label: "Local Homestays", desc: "Authentic family-run stays and village guesthouses.", icon: "🏡" },
  { key: "none", label: "No Hotel Needed", desc: "Day trips, staying with family, or self-arranged.", icon: "🚫", tag: "Zero Stays" },
];

const DIETARY_OPTIONS = [
  "🥗 Vegetarian Friendly",
  "🌱 Vegan",
  "🥟 Street Food & Night Markets",
  "🥩 Local Gourmet & BBQ",
  "🍷 Fine Dining & Wine",
  "☕ Specialty Coffee & Bakeries",
  "🌾 Gluten-Free",
  "✨ Halal Friendly",
  "🌿 Jain Friendly",
];

const VIBE_TAGS = [
  "🏔️ Mountain Passes & Lakes",
  "🌊 Coastlines & Ocean Views",
  "📸 Golden Hour & Photography",
  "🛕 Monasteries & Heritage",
  "🚵 Bikepacking & Wilderness Trails",
  "🧖 Spas & Thermal Springs",
  "🌃 Rooftop Lounges & Nightlife",
  "🌲 Pine Forests & Quiet Hikes",
  "🏛️ Art Museums & Architecture",
  "🛶 River Rafting & Kayaking",
];

const FLIGHT_HABITS = [
  "🌅 Avoid early mornings (<8 AM)",
  "💺 Window Seat Preference",
  "🧳 Carry-on Only (No Checked Bags)",
  "🚗 Prefer Self-Drive Rentals",
  "🚕 Prefer Private Chauffeur / Cabs",
];

const ACCESSIBILITY_OPTIONS = [
  "♿ Step-Free & Elevator Access",
  "🚶 Gentle Walking Only (No Steep Climbs)",
  "🏔️ High Altitude Acclimatization Buffer",
  "🚗 Direct Curbside Drop-off",
];

export function PreferencesPage() {
  const { user, isPreferencesOpen, closePreferences, updatePreferences } = useAuth();
  const setStayMode = useTrip((s) => s.setStayMode);
  const setPace = useTrip((s) => s.setPace);

  // Local state initialized with user preferences or defaults
  const [currency, setCurrency] = useState<TravelPreferences["currency"]>(user?.preferences.currency || "INR");
  const [budgetTier, setBudgetTier] = useState<TravelPreferences["budgetTier"]>(user?.preferences.budgetTier || "balanced");
  const [travelPace, setTravelPace] = useState<TravelPreferences["travelPace"]>(user?.preferences.travelPace || "balanced");
  const [stayMode, setStayModeLocal] = useState<StayMode>(user?.preferences.stayMode || "hotels");
  const [dietary, setDietary] = useState<string[]>(user?.preferences.dietary || ["Vegetarian Friendly"]);
  const [vibePriorities, setVibePriorities] = useState<string[]>(
    user?.preferences.vibePriorities || ["Mountain Passes & Lakes", "Golden Hour & Photography"]
  );
  const [flightPreferences, setFlightPreferences] = useState<string[]>(
    user?.preferences.flightPreferences || ["Avoid early mornings (<8 AM)"]
  );
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>(
    user?.preferences.accessibilityNeeds || []
  );

  const [savedToast, setSavedToast] = useState(false);

  if (!isPreferencesOpen) return null;

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = () => {
    const updated: TravelPreferences = {
      currency,
      budgetTier,
      travelPace,
      stayMode,
      dietary,
      vibePriorities,
      flightPreferences,
      accessibilityNeeds,
    };

    updatePreferences(updated);

    // Also synchronize to active trip store
    setStayMode(stayMode);
    setPace(travelPace);

    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      closePreferences();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-paper text-ink"
      >
        {/* Ambient background glow */}
        <div className="pointer-events-none fixed -top-40 -left-40 h-96 w-96 rounded-full bg-brand/15 blur-[120px]" />
        <div className="pointer-events-none fixed top-1/2 -right-40 h-96 w-96 rounded-full bg-terra/10 blur-[130px]" />

        {/* Sticky Header Bar */}
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-xl px-4 py-3.5 sm:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <button
              onClick={closePreferences}
              className="flex items-center gap-2 rounded-xl border border-line bg-paper-2 px-3 py-1.5 text-xs font-bold text-ink hover:border-brand/40 active:scale-95 transition shadow-xs"
            >
              <span>← Back</span>
            </button>

            <div className="text-center">
              <div className="label-eyebrow text-[10px]">Travel DNA & Preferences</div>
              <h1 className="display text-base sm:text-lg font-bold text-ink">Personal Travel Profile</h1>
            </div>

            <button
              onClick={handleSave}
              className="btn-primary !px-5 !py-1.5 text-xs font-extrabold shadow-md active:scale-95 transition"
            >
              💾 Save Profile
            </button>
          </div>
        </header>

        {/* Main Content Form */}
        <main className="mx-auto max-w-4xl px-4 sm:px-8 py-8 space-y-8 pb-32">
          {/* Welcome Banner */}
          <div className="rounded-3xl border border-brand/30 bg-gradient-to-r from-brand/10 via-card to-emerald-500/10 p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-xs font-bold text-brand shadow-xs mb-2">
                  <span>✨ Autonomous Agent Steering Profile</span>
                </div>
                <h2 className="display text-2xl font-bold text-ink">Your Personal Travel DNA</h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-2xl leading-relaxed">
                  These global preferences automatically pre-tune our 17 AI research agents (Scout, Pillow, Foodie, Toilet Inspector) whenever you investigate any destination worldwide.
                </p>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-4xl">🧬</span>
              </div>
            </div>
          </div>

          {/* 1. CURRENCY & BUDGET TIER */}
          <section className="space-y-4">
            <div className="border-b border-line pb-2">
              <h3 className="display text-lg font-bold text-ink">1. Currency & Budget Style</h3>
              <p className="text-xs text-ink-soft">Select your preferred transaction currency and spending tier.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              {/* Currency Dropdown */}
              <div className="card p-4 space-y-2 border-line">
                <label className="label-eyebrow text-[10px]">Display Currency</label>
                <div className="grid gap-1.5">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code as TravelPreferences["currency"])}
                      className={cx(
                        "rounded-xl px-3 py-2 text-left text-xs font-bold transition flex items-center justify-between",
                        currency === c.code
                          ? "bg-brand text-white shadow-xs"
                          : "border border-line bg-paper-2 text-ink-soft hover:text-ink"
                      )}
                    >
                      <span>{c.label}</span>
                      {currency === c.code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Tiers */}
              <div className="grid gap-2.5">
                {BUDGET_TIERS.map((tier) => (
                  <button
                    key={tier.key}
                    onClick={() => setBudgetTier(tier.key)}
                    className={cx(
                      "flex items-start gap-3.5 rounded-2xl border p-4 text-left transition active:scale-[0.99]",
                      budgetTier === tier.key
                        ? "border-brand bg-brand/[0.07] ring-2 ring-brand/30 shadow-sm"
                        : "border-line bg-card hover:border-brand/40"
                    )}
                  >
                    <span className="text-2xl shrink-0 mt-0.5">{tier.icon}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-ink">{tier.label}</div>
                      <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">{tier.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 2. TRAVEL PACE & RHYTHM */}
          <section className="space-y-4">
            <div className="border-b border-line pb-2">
              <h3 className="display text-lg font-bold text-ink">2. Travel Pace & Daily Rhythm</h3>
              <p className="text-xs text-ink-soft">Controls how many attractions and transit hours are scheduled each day.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {PACES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setTravelPace(p.key)}
                  className={cx(
                    "flex flex-col justify-between rounded-2xl border p-4 text-left transition active:scale-[0.99]",
                    travelPace === p.key
                      ? "border-brand bg-brand/[0.07] ring-2 ring-brand/30 shadow-sm"
                      : "border-line bg-card hover:border-brand/40"
                  )}
                >
                  <div>
                    <span className="text-2xl">{p.icon}</span>
                    <div className="font-bold text-sm text-ink mt-2">{p.label}</div>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                  {travelPace === p.key && (
                    <div className="mt-3 text-[11px] font-bold text-brand">✓ Selected Pace</div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* 3. DEFAULT STAY STYLE */}
          <section className="space-y-4">
            <div className="border-b border-line pb-2">
              <h3 className="display text-lg font-bold text-ink">3. Preferred Accommodation Style</h3>
              <p className="text-xs text-ink-soft">From luxury boutique hotels to zero-hotel bikepacking expeditions.</p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {STAY_MODES.map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setStayModeLocal(mode.key)}
                  className={cx(
                    "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99]",
                    stayMode === mode.key
                      ? "border-emerald-500 bg-emerald-500/[0.06] ring-2 ring-emerald-500/25 shadow-xs"
                      : "border-line bg-card hover:border-brand/40"
                  )}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{mode.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs sm:text-sm text-ink">{mode.label}</span>
                      {mode.tag && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          {mode.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">{mode.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 4. DIETARY & DINING PASSIONS */}
          <section className="space-y-4">
            <div className="border-b border-line pb-2">
              <h3 className="display text-lg font-bold text-ink">4. Dietary & Culinary Passions</h3>
              <p className="text-xs text-ink-soft">Steers our Foodie agent towards verified local cuisines and dietary choices.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((item) => {
                const isSelected = dietary.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleItem(dietary, setDietary, item)}
                    className={cx(
                      "rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 shadow-xs",
                      isSelected
                        ? "bg-brand text-white shadow-brand/20"
                        : "border border-line bg-card text-ink-soft hover:text-ink hover:bg-paper-2"
                    )}
                  >
                    {item} {isSelected ? "✓" : "+"}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 5. VIBE & ATMOSPHERE PRIORITIES */}
          <section className="space-y-4">
            <div className="border-b border-line pb-2">
              <h3 className="display text-lg font-bold text-ink">5. Favorite Vibe & Scenery Priorities</h3>
              <p className="text-xs text-ink-soft">Tap the atmospheres you are most drawn to when traveling.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {VIBE_TAGS.map((tag) => {
                const isSelected = vibePriorities.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleItem(vibePriorities, setVibePriorities, tag)}
                    className={cx(
                      "rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 shadow-xs",
                      isSelected
                        ? "bg-brand text-white shadow-brand/20"
                        : "border border-line bg-card text-ink-soft hover:text-ink hover:bg-paper-2"
                    )}
                  >
                    {tag} {isSelected ? "✓" : "+"}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 6. FLIGHT & TRANSIT HABITS */}
          <section className="space-y-4">
            <div className="border-b border-line pb-2">
              <h3 className="display text-lg font-bold text-ink">6. Flight & Transit Quirks</h3>
              <p className="text-xs text-ink-soft">Steers Wingman and Roadrunner agents during flight/cab scouting.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {FLIGHT_HABITS.map((item) => {
                const isSelected = flightPreferences.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleItem(flightPreferences, setFlightPreferences, item)}
                    className={cx(
                      "flex items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-semibold transition active:scale-[0.99]",
                      isSelected
                        ? "border-brand bg-brand/[0.07] text-ink"
                        : "border-line bg-card text-ink-soft hover:text-ink"
                    )}
                  >
                    <span>{item}</span>
                    <span className={cx("text-sm font-bold", isSelected ? "text-brand" : "text-ink-faint")}>
                      {isSelected ? "✓ Active" : "Off"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 7. ACCESSIBILITY & HEALTH */}
          <section className="space-y-4">
            <div className="border-b border-line pb-2">
              <h3 className="display text-lg font-bold text-ink">7. Accessibility & Health Needs</h3>
              <p className="text-xs text-ink-soft">Flags step-free access, gentle walking, and altitude requirements.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {ACCESSIBILITY_OPTIONS.map((item) => {
                const isSelected = accessibilityNeeds.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleItem(accessibilityNeeds, setAccessibilityNeeds, item)}
                    className={cx(
                      "flex items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-semibold transition active:scale-[0.99]",
                      isSelected
                        ? "border-terra bg-terra/10 text-terra font-bold"
                        : "border-line bg-card text-ink-soft hover:text-ink"
                    )}
                  >
                    <span>{item}</span>
                    <span>{isSelected ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Bottom Save Action Bar */}
          <div className="pt-6 border-t border-line flex items-center justify-between gap-4">
            <button
              onClick={closePreferences}
              className="btn-ghost !text-xs !py-3"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary !px-8 !py-3 text-sm font-extrabold shadow-lift"
            >
              <span>Save & Apply to Swarm</span>
              <span className="ml-1.5">✓</span>
            </button>
          </div>
        </main>

        {/* Saved Success Toast */}
        <AnimatePresence>
          {savedToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed bottom-6 inset-x-0 mx-auto w-fit z-50 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-2xl"
            >
              <span>✓</span>
              <span>Travel Preferences Saved & Synchronized!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
