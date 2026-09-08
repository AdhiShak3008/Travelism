"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Place } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { cx } from "@/lib/format";
import { SourceChips } from "./Provenance";
import { VideoRow } from "./VideoRow";
import { SteeringBox } from "./SteeringBox";
import { useLightbox } from "./Lightbox";

const CATEGORY_LABEL: Record<Place["category"], string> = {
  core: "Must-see",
  adventure: "Adventure",
  enroute: "On the way",
  food: "Culinary",
  stay: "Stay",
};

const DIFFICULTY_TONE: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-amber-600 dark:text-amber-400",
  hard: "text-rose-600 dark:text-rose-400",
};

export function PlaceCard({ place }: { place: Place }) {
  const selected = useTrip((s) => s.blob.selectedPlaceIds.includes(place.id));
  const toggle = useTrip((s) => s.toggleSelectPlace);
  const destinationName = useTrip((s) => s.blob.destinationName) || "";
  const dataset = useTrip((s) => s.dataset);
  const lightbox = useLightbox();
  const [expanded, setExpanded] = useState(false);

  const videos = dataset?.videos.filter((v) => place.videoIds.includes(v.id)) ?? [];
  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.canonicalName} ${destinationName}`)}`;
  const hasImages = place.images.length > 0;

  const youtubeUrl = videos[0]?.searchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${place.canonicalName} ${destinationName} travel`)}`;

  return (
    <motion.div
      layout
      className={cx(
        "group overflow-hidden rounded-3xl border bg-card transition-all duration-300 flex flex-col justify-between",
        selected
          ? "border-emerald-500 shadow-lift ring-2 ring-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.03] to-card"
          : "border-line shadow-card hover:border-brand/40 hover:shadow-lift"
      )}
    >
      <div>
        {/* Postcard photo */}
        <div
          className="relative aspect-[16/10] cursor-zoom-in overflow-hidden bg-gradient-to-br from-brand/15 to-paper-3"
          onClick={() => hasImages && lightbox.open(place.images, 0, place.canonicalName)}
        >
          {hasImages ? (
            <Image
              src={place.images[0].url}
              alt={place.canonicalName}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-4xl opacity-60">📍</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          
          {/* Category stamps & photo count */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-black/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm">
              {CATEGORY_LABEL[place.category]}
            </span>
            {place.permitRequired && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/60 bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md shadow-sm">
                Permit
              </span>
            )}
            {place.images.length > 1 && (
              <span className="rounded-full bg-black/60 border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                📷 {place.images.length}
              </span>
            )}
          </div>

          {/* Selection toggle button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle(place.id);
            }}
            className={cx(
              "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border text-base font-bold shadow-md backdrop-blur-md transition-all active:scale-90",
              selected
                ? "border-emerald-500 bg-emerald-600 text-white ring-2 ring-white/60"
                : "border-line bg-card/90 text-ink hover:bg-paper-2 hover:scale-105"
            )}
            aria-label={selected ? "Remove from trip" : "Add to trip"}
            title={selected ? "Remove from selected sights" : "Add to trip selection"}
          >
            {selected ? "✓" : "+"}
          </button>

          {/* Place Title & Quick Blurb */}
          <div className="absolute bottom-3 left-3.5 right-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="display text-xl font-bold text-white drop-shadow-md">
                {place.canonicalName}
              </h3>
              <a
                href={mapSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded-full bg-white/20 p-1.5 text-white backdrop-blur-md hover:bg-white/40 transition"
                title="Open location in Google Maps (Right click for new tab)"
              >
                <span className="text-xs">🗺️</span>
              </a>
            </div>
            <p className="line-clamp-1 text-xs text-white/90 drop-shadow mt-0.5">{place.blurb}</p>
          </div>
        </div>

        {/* Caption & Metric strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-xs text-ink-soft">
          <span className="font-semibold text-ink/90">🕒 {place.durationHours}h visit</span>
          {place.travelTime && <span>🚗 {place.travelTime}</span>}
          {place.bestTime && <span>☀ {place.bestTime}</span>}
          {place.difficulty && (
            <span className={cx("font-bold capitalize", DIFFICULTY_TONE[place.difficulty])}>
              {place.difficulty}
            </span>
          )}
        </div>
      </div>

      <div>
        {/* Source Provenance and Details Button */}
        <div className="flex items-center justify-between border-t border-line/70 px-4 py-2.5 bg-paper-2/40">
          <SourceChips sourceIds={place.sourceIds.slice(0, 2)} />
          <div className="flex items-center gap-2.5">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link !text-[11px] !text-rose-600 dark:!text-rose-400 font-semibold"
              title="Watch video walkthrough on YouTube"
            >
              ▶ Video ↗
            </a>
            <a
              href={mapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link !text-[11px]"
              title="Explore on Google Maps"
            >
              Maps ↗
            </a>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs font-bold text-brand hover:underline"
            >
              {expanded ? "Less ▲" : "Intel ▼"}
            </button>
          </div>
        </div>

        {/* Expanded Intelligence Drawer */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-line bg-paper-2/60"
            >
              <div className="space-y-4 p-4 sm:p-5">
                <p className="text-sm leading-relaxed text-ink">{place.description}</p>

                {place.images.length > 1 && (
                  <div>
                    <div className="text-[11px] font-extrabold text-ink-soft uppercase tracking-wider mb-2">
                      Verified Photography Gallery
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {place.images.map((im, idx) => (
                        <button
                          key={im.id}
                          onClick={() => lightbox.open(place.images, idx, place.canonicalName)}
                          className="relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-2xl border border-line transition-transform hover:scale-105 shadow-sm"
                        >
                          <Image
                            src={im.url}
                            alt={im.category}
                            fill
                            sizes="144px"
                            className="object-cover"
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {place.facts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-extrabold text-ink-soft uppercase tracking-wider">
                      Traveler Insights
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {place.facts.map((f, i) => (
                        <span key={i} className="chip !text-xs !bg-paper">💡 {f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {videos.length > 0 && <VideoRow videos={videos} />}

                <SteeringBox scope="place" entityId={place.id} title="Tell us about this spot" compact />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

