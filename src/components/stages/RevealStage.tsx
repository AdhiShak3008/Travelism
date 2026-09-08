"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { TripTray } from "@/components/ui/TripTray";
import { RefineBox } from "@/components/ui/RefineBox";
import { VideoRow } from "@/components/ui/VideoRow";
import { ExperienceCard } from "@/components/ui/ExperienceCard";
import { SectionTitle } from "@/components/ui/Primitives";
import { InteractiveMapView } from "@/components/ui/InteractiveMapView";
import { cx } from "@/lib/format";
import type { PlaceCategory } from "@/lib/types";

type FilterTab = "all" | PlaceCategory;

const GROUPS: { key: FilterTab; label: string; icon: string }[] = [
  { key: "all", label: "All Highlights", icon: "✨" },
  { key: "core", label: "Must-See", icon: "⭐" },
  { key: "adventure", label: "Outdoor & Adventure", icon: "🧗" },
  { key: "enroute", label: "Day Trips & Stops", icon: "🚗" },
];

export function RevealStage() {
  const dataset = useTrip((s) => s.dataset);
  const blob = useTrip((s) => s.blob);
  const setStage = useTrip((s) => s.setStage);
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  if (!dataset) return null;
  const { meta, places, videos, experiences, hotels } = dataset;
  const destVideos = videos.filter((v) => v.relatesTo.startsWith("dest_"));

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

  return (
    <div className="pb-44">
      {/* Cinematic destination hero */}
      <div className="relative h-[58vh] min-h-[440px] w-full overflow-hidden">
        <Image src={meta.hero} alt={meta.name} fill priority className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 sm:px-6 pb-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-sm">
                📍 {meta.region || meta.name}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-sm">
                🛬 Gateway: {meta.gateway}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-sm">
                🗓 Best Season: {meta.bestSeason}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-600/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-md shadow-sm">
                ✓ {places.length} Sights · {experiences.length} Activities · {hotels.length} Stays
              </span>
            </div>
            <h1 className="display text-4xl sm:text-6xl font-bold tracking-tight text-white drop-shadow-md">
              {meta.name}
            </h1>
            <p className="mt-2.5 max-w-3xl text-base sm:text-lg text-white/95 drop-shadow leading-relaxed">
              {meta.tagline}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Wish Box prominently featured */}
        <div className="mt-8">
          <RefineBox
            title={`Wish Box · Customize your ${meta.name} discovery`}
            hint="Tell our AI scout what you want more of (e.g. 'Show water sports & boat rentals', 'Add rooftop lounges', 'Find quiet beaches') and we will look again."
          />
        </div>

        {videos.length > 0 ? (
          <div className="mt-10">
            <VideoRow videos={videos} title={`4K Video Walkthroughs & Vlogs · ${meta.name}`} />
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-line bg-card/60 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-600 text-white font-bold text-lg shadow-sm">
                ▶
              </div>
              <div>
                <h4 className="font-bold text-sm text-ink">Watch 4K Travel Vlogs & Drone Tours</h4>
                <p className="text-xs text-ink-soft">Explore authentic traveller footage and walking tours of {meta.name} on YouTube.</p>
              </div>
            </div>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${meta.name} travel guide 4k vlog`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost !text-xs !border-rose-600/40 !text-rose-600 dark:!text-rose-400 font-semibold"
            >
              Watch on YouTube ↗
            </a>
          </div>
        )}

        {/* Places to Visit Section */}
        <div className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <SectionTitle
              eyebrow="Curated Attractions"
              title={`The best places in ${meta.name}`}
              hint="Tap '+' on anything you want in your trip. Pick as many as you like and customize your vacation duration next."
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-line bg-paper-2 p-1 flex items-center gap-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cx(
                    "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                    viewMode === "grid" ? "bg-brand text-paper shadow-sm" : "text-ink-soft hover:text-ink"
                  )}
                >
                  🔲 Grid View
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={cx(
                    "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                    viewMode === "map" ? "bg-brand text-paper shadow-sm" : "text-ink-soft hover:text-ink"
                  )}
                >
                  🗺️ Interactive Map
                </button>
              </div>

              {selectedCount > 0 && (
                <div className="rounded-full bg-brand/10 border border-brand/30 px-4 py-1.5 text-xs font-bold text-brand shadow-sm">
                  {selectedCount} place{selectedCount !== 1 ? "s" : ""} selected for trip
                </div>
              )}
            </div>
          </div>

          {viewMode === "map" ? (
            <div className="mb-10">
              <InteractiveMapView
                destinationName={meta.name}
                places={places}
                hotels={hotels}
              />
            </div>
          ) : (
            <>
              {/* Filter Bar & Search */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {GROUPS.map((g) => {
                    const count = g.key === "all" ? places.length : places.filter((p) => p.category === g.key).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={g.key}
                        onClick={() => setTab(g.key)}
                        className={
                          tab === g.key
                            ? "rounded-full bg-brand px-4 py-2 text-xs sm:text-sm font-bold text-paper shadow-md transition-all"
                            : "rounded-full border border-line bg-paper px-3.5 py-2 text-xs sm:text-sm font-medium text-ink-soft hover:text-ink hover:bg-paper-2 transition-all"
                        }
                      >
                        <span>{g.icon} {g.label}</span> <span className="opacity-75 text-xs font-normal">({count})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search spots by name or keyword..."
                    className="w-full rounded-full border border-line bg-paper px-4 py-2 text-xs text-ink outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20 placeholder:text-ink-faint transition"
                  />
                </div>
              </div>

              <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPlaces.map((p) => (
                  <PlaceCard key={p.id} place={p} />
                ))}
              </motion.div>

              {filteredPlaces.length === 0 && (
                <div className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-ink-soft shadow-sm">
                  <span className="text-2xl block mb-2">🔍</span>
                  No spots found matching your search. Try another keyword or switch category tabs above.
                </div>
              )}
            </>
          )}
        </div>

        {/* Bookable Experiences Section */}
        {experiences.length > 0 && (
          <div className="mt-16 border-t border-line pt-12">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <SectionTitle
                eyebrow="Bookable Activities & Adventures"
                title="Experiences with verified pricing"
                hint="Water sports, guided tours, boat charters, adventure safaris, and museum passes. Add any to include them in your daily itinerary."
              />
              {expCount > 0 && (
                <div className="rounded-full bg-gold/15 border border-gold/40 px-4 py-1.5 text-xs font-bold text-ink shadow-sm">
                  {expCount} activity{expCount !== 1 ? "ies" : ""} added
                </div>
              )}
            </div>

            <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {experiences.map((e) => (
                <ExperienceCard key={e.id} exp={e} />
              ))}
            </motion.div>
          </div>
        )}

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-line">
          <button onClick={() => setStage("dream")} className="btn-ghost">
            ← Change Destination
          </button>
          <button onClick={() => setStage("shape")} className="btn-primary !px-8 !py-3.5 text-base font-bold shadow-lift">
            Continue to Schedule & Duration →
          </button>
        </div>
      </div>

      <TripTray onContinue={() => setStage("shape")} />
    </div>
  );
}
