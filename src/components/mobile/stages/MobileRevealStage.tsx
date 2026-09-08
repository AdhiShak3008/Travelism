"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { useLightbox } from "@/components/ui/Lightbox";
import { RefineBox } from "@/components/ui/RefineBox";
import { VideoRow } from "@/components/ui/VideoRow";
import { InteractiveMapView } from "@/components/ui/InteractiveMapView";
import { ExperienceCard } from "@/components/ui/ExperienceCard";
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
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  if (!dataset) return null;
  const { meta, places, experiences, videos, hotels } = dataset;

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
    <div className="pb-36 bg-paper min-h-screen">
      {/* Cinematic Destination Hero Banner */}
      <div className="relative h-60 w-full overflow-hidden">
        <Image src={meta.hero} alt={meta.name} fill priority className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="rounded-full border border-white/30 bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
              📍 {meta.region || meta.name}
            </span>
            <span className="rounded-full border border-white/30 bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
              🛬 {meta.gateway}
            </span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-600/90 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
              ✓ {places.length} Sights · {experiences.length} Experiences
            </span>
          </div>
          <h1 className="display text-3xl font-extrabold text-white leading-tight">{meta.name}</h1>
          <p className="text-xs text-white/90 line-clamp-2 mt-1 leading-relaxed">{meta.tagline}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Wish Box prominently featured (Matches PC) */}
        <div>
          <RefineBox
            title={`Wish Box · Customize your ${meta.name} discovery`}
            hint="Tell our AI scout what you want more of (e.g. 'Show water sports & boat rentals', 'Add rooftop lounges', 'Find quiet beaches')."
          />
        </div>

        {/* 4K Video Walkthroughs Row (Matches PC) */}
        {videos.length > 0 ? (
          <div>
            <VideoRow videos={videos} title={`4K Video Walkthroughs · ${meta.name}`} />
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-card/70 p-3.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-600 text-white font-bold text-sm shadow-xs">
                ▶
              </div>
              <div>
                <h4 className="font-bold text-xs text-ink">4K Travel Guides on YouTube</h4>
                <p className="text-[11px] text-ink-soft">Explore authentic footage and vlog tours of {meta.name}.</p>
              </div>
            </div>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${meta.name} travel guide 4k vlog`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-rose-600/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 shrink-0"
            >
              Watch ↗
            </a>
          </div>
        )}

        {/* Grid vs Map View Toggle */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h3 className="display text-lg font-bold text-ink">Places to Visit</h3>
            <p className="text-[11px] text-ink-soft">Select places to include in your customized schedule.</p>
          </div>

          <div className="rounded-xl border border-line bg-paper-2 p-1 flex items-center gap-1 shadow-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={cx(
                "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                viewMode === "grid" ? "bg-brand text-white shadow-xs" : "text-ink-soft"
              )}
            >
              🔲 Feed
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={cx(
                "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                viewMode === "map" ? "bg-brand text-white shadow-xs" : "text-ink-soft"
              )}
            >
              🗺️ Map
            </button>
          </div>
        </div>

        {/* Interactive Map View Mode */}
        {viewMode === "map" ? (
          <div className="rounded-2xl overflow-hidden border border-line shadow-card">
            <InteractiveMapView
              destinationName={meta.name}
              places={places}
              hotels={hotels}
            />
          </div>
        ) : (
          <>
            {/* Filter Tabs & Search Bar */}
            <div className="sticky top-[49px] z-20 -mx-4 border-y border-line bg-paper/95 px-4 py-2.5 backdrop-blur-md">
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
                placeholder={`Search spots in ${meta.name}...`}
                className="mt-2 w-full rounded-xl border border-line bg-paper-2 px-3 py-1.5 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-brand"
              />
            </div>

            {/* Places Feed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-ink-soft font-semibold px-1">
                <span>{filteredPlaces.length} Highlights</span>
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

                        {/* Photo Count Gallery Trigger */}
                        {place.images.length > 1 && (
                          <button
                            onClick={() => lightbox.open(place.images)}
                            className="absolute bottom-2.5 right-2.5 rounded-full border border-white/30 bg-black/65 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md shadow-xs active:scale-95 transition"
                          >
                            📷 {place.images.length} photos
                          </button>
                        )}
                      </div>

                      {/* Content Card Body */}
                      <div className="p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="display text-base font-bold text-ink leading-tight">
                              {place.canonicalName}
                            </h3>
                            {place.altNames?.length > 0 && (
                              <p className="text-[11px] text-ink-faint mt-0.5">
                                Also known as {place.altNames.join(", ")}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => toggleSelectPlace(place.id)}
                            className={cx(
                              "shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-xs",
                              isSelected
                                ? "bg-emerald-600 text-white shadow-emerald-500/20"
                                : "border border-line bg-paper-2 text-ink hover:border-brand/40"
                            )}
                          >
                            {isSelected ? "✓ Added" : "+ Add"}
                          </button>
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                          {place.blurb}
                        </p>

                        {/* Details Chips */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-line/60">
                          {place.travelTime && (
                            <span className="rounded-lg bg-paper-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                              ⏱️ {place.travelTime}
                            </span>
                          )}
                          {place.durationHours && (
                            <span className="rounded-lg bg-paper-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                              ⏳ {place.durationHours}h visit
                            </span>
                          )}
                          {place.bestTime && (
                            <span className="rounded-lg bg-paper-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                              🌅 {place.bestTime}
                            </span>
                          )}
                          {place.distanceKm && (
                            <span className="rounded-lg bg-paper-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                              📍 {place.distanceKm} km
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Curated Experiences & Activities Section (Matches PC Experience) */}
        {experiences.length > 0 && (
          <div className="pt-6 border-t border-line space-y-4">
            <div>
              <div className="label-eyebrow text-[10px]">Guided Experiences & Tours</div>
              <h3 className="display text-lg font-bold text-ink">Bookable Activities</h3>
              <p className="text-xs text-ink-soft">Add curated excursions, cooking classes, or wilderness guides.</p>
            </div>

            <div className="grid gap-3">
              {experiences.map((exp) => (
                <ExperienceCard key={exp.id} exp={exp} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Dock (Mobile Native) */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-paper/95 p-3.5 backdrop-blur-xl shadow-lift">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <div className="text-xs font-bold text-ink">
              {totalChosen > 0 ? (
                <span>
                  <span className="text-brand font-extrabold">{totalChosen}</span> item{totalChosen !== 1 ? "s" : ""} selected
                </span>
              ) : (
                <span className="text-ink-soft">No places picked yet</span>
              )}
            </div>
            <div className="text-[10px] text-ink-faint">
              {selectedCount} place{selectedCount !== 1 ? "s" : ""}, {expCount} activit{expCount !== 1 ? "ies" : "y"}
            </div>
          </div>

          <button
            onClick={() => setStage("shape")}
            disabled={selectedCount === 0}
            className="btn-primary !px-6 !py-2.5 text-xs font-extrabold shadow-md disabled:opacity-40"
          >
            <span>Shape Trip Schedule</span>
            <span className="ml-1">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
