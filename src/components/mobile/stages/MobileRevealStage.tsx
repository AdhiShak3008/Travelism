"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { useLightbox } from "@/components/ui/Lightbox";
import { inr, cx } from "@/lib/format";
import type { PlaceCategory } from "@/lib/types";

type FilterTab = "all" | PlaceCategory;

const GROUPS: { key: FilterTab; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "✨" },
  { key: "core", label: "Must-See", icon: "⭐" },
  { key: "adventure", label: "Outdoors", icon: "🧗" },
  { key: "enroute", label: "Stops", icon: "🚗" },
];

export function MobileRevealStage() {
  const dataset = useTrip((s) => s.dataset);
  const blob = useTrip((s) => s.blob);
  const toggleSelectPlace = useTrip((s) => s.toggleSelectPlace);
  const toggleExperience = useTrip((s) => s.toggleExperience);
  const setStage = useTrip((s) => s.setStage);
  const lightbox = useLightbox();

  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  if (!dataset) return null;
  const { meta, places, experiences } = dataset;

  const filteredPlaces = places.filter((p) => {
    const matchesTab = tab === "all" || p.category === tab;
    const matchesSearch =
      !search.trim() ||
      p.canonicalName.toLowerCase().includes(search.toLowerCase()) ||
      p.blurb.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const selectedCount = blob.selectedPlaceIds.length;
  const expCount = blob.selectedExperienceIds.length;
  const totalChosen = selectedCount + expCount;

  return (
    <div className="pb-32 bg-paper min-h-screen">
      {/* Mobile Destination Hero */}
      <div className="relative h-52 w-full overflow-hidden">
        <Image src={meta.hero} alt={meta.name} fill priority className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="rounded-full border border-white/30 bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
              📍 {meta.region || meta.name}
            </span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-600/90 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
              ✓ {places.length} Sights Verified
            </span>
          </div>
          <h1 className="display text-2xl font-extrabold text-white">{meta.name}</h1>
          <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{meta.tagline}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="sticky top-[49px] z-30 border-b border-line bg-paper/95 p-3 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setTab(g.key)}
              className={cx(
                "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all shadow-xs",
                tab === g.key
                  ? "bg-brand text-white"
                  : "border border-line bg-paper-2 text-ink-soft hover:text-ink"
              )}
            >
              <span>{g.icon}</span> <span className="ml-1">{g.label}</span>
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter places or keywords..."
          className="mt-2 w-full rounded-xl border border-line bg-paper-2 px-3 py-1.5 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-brand"
        />
      </div>

      {/* Places Feed */}
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between text-xs text-ink-soft font-semibold">
          <span>{filteredPlaces.length} Verified Highlights</span>
          <span>{selectedCount} Selected</span>
        </div>

        <div className="grid gap-4">
          {filteredPlaces.map((place) => {
            const isSelected = blob.selectedPlaceIds.includes(place.id);
            const mainImg = place.images[0];

            return (
              <div
                key={place.id}
                className={cx(
                  "overflow-hidden rounded-2xl border transition-all shadow-sm",
                  isSelected
                    ? "border-emerald-500 bg-emerald-500/[0.04] ring-2 ring-emerald-500/25"
                    : "border-line bg-card"
                )}
              >
                {/* Place Image */}
                <div className="relative h-44 w-full bg-paper-3">
                  {mainImg?.url ? (
                    <Image
                      src={mainImg.url}
                      alt={place.canonicalName}
                      fill
                      sizes="100vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-3xl">📍</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {/* High Contrast Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                    {place.category === "core" && (
                      <span className="rounded-full border border-white/30 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                        ⭐ Must-See
                      </span>
                    )}
                    {place.category === "adventure" && (
                      <span className="rounded-full border border-white/30 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                        🧗 Outdoor
                      </span>
                    )}
                    {place.difficulty && (
                      <span className="rounded-full border border-white/30 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md capitalize">
                        {place.difficulty}
                      </span>
                    )}
                  </div>

                  {place.permitRequired && (
                    <span className="absolute top-2.5 right-2.5 rounded-full border border-amber-400/40 bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black backdrop-blur-md">
                      Permit Required
                    </span>
                  )}

                  <div className="absolute bottom-2.5 left-3 right-3">
                    <h3 className="text-base font-extrabold text-white leading-tight drop-shadow-sm">
                      {place.canonicalName}
                    </h3>
                    <p className="text-[11px] text-white/90 line-clamp-1 mt-0.5 drop-shadow-sm">
                      {place.blurb}
                    </p>
                  </div>
                </div>

                {/* Details & Action */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-ink-soft">
                    <span>⏱ {place.durationHours}h visit</span>
                    {place.distanceKm && <span className="ml-2">🚗 {place.distanceKm}km</span>}
                  </div>

                  <button
                    onClick={() => toggleSelectPlace(place.id)}
                    className={cx(
                      "rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs active:scale-95",
                      isSelected
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-brand/50 bg-brand/10 text-brand hover:bg-brand hover:text-white"
                    )}
                  >
                    {isSelected ? "✓ Added to Trip" : "+ Add to Trip"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bookable Experiences Section */}
        {experiences.length > 0 && (
          <div className="mt-8 pt-6 border-t border-line">
            <h3 className="display text-lg font-bold text-ink mb-1">Bookable Activities</h3>
            <p className="text-xs text-ink-soft mb-4">Add verified tours, adventure passes, and watersports</p>

            <div className="grid gap-3">
              {experiences.map((exp) => {
                const isSelected = blob.selectedExperienceIds.includes(exp.id);
                return (
                  <div
                    key={exp.id}
                    className={cx(
                      "flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition",
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/[0.05] ring-2 ring-emerald-500/25"
                        : "border-line bg-card"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-ink truncate">{exp.name}</div>
                      <div className="text-[11px] text-brand font-semibold mt-0.5">{inr(exp.price)}</div>
                      <p className="text-[10px] text-ink-soft line-clamp-1 mt-0.5">{exp.blurb}</p>
                    </div>

                    <button
                      onClick={() => toggleExperience(exp.id)}
                      className={cx(
                        "shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95",
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "border border-line bg-paper-2 text-ink hover:border-brand"
                      )}
                    >
                      {isSelected ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Tray */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3.5 backdrop-blur-xl shadow-lift">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-ink">
              {totalChosen > 0 ? `${totalChosen} Item${totalChosen > 1 ? "s" : ""} Chosen` : "Select Sights"}
            </div>
            <div className="text-[10px] text-ink-faint">Ready to customize schedule</div>
          </div>

          <button
            onClick={() => setStage("shape")}
            disabled={totalChosen === 0}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-40 active:scale-95 transition"
          >
            <span>Next: Dates & Style →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
