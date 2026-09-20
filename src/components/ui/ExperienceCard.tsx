"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Experience } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { inr, cx } from "@/lib/format";
import { SourceChips } from "./Provenance";
import { useLightbox } from "./Lightbox";

const CATEGORY_LABEL: Record<Experience["category"], string> = {
  theme_park: "Theme park",
  water: "Water",
  adventure: "Adventure",
  wildlife: "Wildlife",
  tour: "Tour",
  cultural: "Cultural",
  wellness: "Wellness",
  food_exp: "Food",
  nightlife: "Nightlife",
};

const DIFF_TONE: Record<string, string> = {
  easy: "text-good",
  moderate: "text-warn",
  hard: "text-bad",
};

const CATEGORY_GLYPH: Record<Experience["category"], string> = {
  theme_park: "🎢",
  water: "🌊",
  adventure: "🧗",
  wildlife: "🦁",
  tour: "🧭",
  cultural: "🛕",
  wellness: "🧘",
  food_exp: "🍽️",
  nightlife: "🌃",
};

const CATEGORY_TINT: Record<Experience["category"], string> = {
  theme_park: "from-terra/25 to-gold/15",
  water: "from-brand/25 to-brand/5",
  adventure: "from-terra/25 to-brand/10",
  wildlife: "from-good/20 to-gold/10",
  tour: "from-brand/20 to-paper-3",
  cultural: "from-gold/20 to-terra/10",
  wellness: "from-brand/15 to-good/10",
  food_exp: "from-gold/25 to-terra/10",
  nightlife: "from-ink-soft/20 to-paper-3",
};

export function ExperienceCard({ exp }: { exp: Experience }) {
  const selected = useTrip((s) => s.blob.selectedExperienceIds.includes(exp.id));
  const toggle = useTrip((s) => s.toggleExperience);
  const destinationName = useTrip((s) => s.blob.destinationName) || "";
  const lightbox = useLightbox();

  const hasPrice = exp.price > 0;
  const priceLabel = hasPrice ? inr(exp.price) : exp.price === 0 && exp.priceNote?.includes("free") ? "Free" : "Price on booking";
  const fallbackExpUrl = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80";
  const [imgSrc, setImgSrc] = useState(exp.images[0]?.url || fallbackExpUrl);

  useEffect(() => {
    setImgSrc(exp.images[0]?.url || fallbackExpUrl);
  }, [exp.images]);

  const bookingSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${exp.name} tickets booking ${destinationName}`)}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exp.name} ${destinationName}`)}`;

  return (
    <motion.div
      layout
      className={cx(
        "group overflow-hidden rounded-2xl border bg-card transition-all duration-300 flex flex-col justify-between",
        selected
          ? "border-brand shadow-lift ring-2 ring-brand/30"
          : "border-line shadow-card hover:border-line-strong hover:shadow-lift"
      )}
    >
      <div>
        <div
          className="relative aspect-[16/10] overflow-hidden cursor-zoom-in"
          onClick={() => lightbox.open(exp.images.length > 0 ? exp.images : [{ id: `fallback_${exp.id}`, url: imgSrc, category: "attraction", credit: "Travelism", provenance: "editorial" }], 0, exp.name)}
        >
          <Image
            src={imgSrc}
            alt={exp.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            onError={() => {
              if (imgSrc !== fallbackExpUrl) setImgSrc(fallbackExpUrl);
            }}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          <div className="absolute left-3 top-3 flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border border-white/30 bg-black/60 text-white">
              {CATEGORY_LABEL[exp.category]}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle(exp.id);
            }}
            className={cx(
              "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border text-base font-bold shadow-md backdrop-blur-md transition-all active:scale-90",
              selected
                ? "border-brand bg-brand text-paper ring-2 ring-white/60"
                : "border-line bg-card/90 text-ink hover:bg-paper-2 hover:scale-105"
            )}
            aria-label={selected ? "Remove" : "Add to trip"}
            title={selected ? "Remove from selected experiences" : "Add to trip"}
          >
            {selected ? "✓" : "+"}
          </button>

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <h3 className="display min-w-0 text-lg font-semibold text-white drop-shadow-md">
              {exp.name}
            </h3>
            <div className="shrink-0 rounded-xl border border-line/60 bg-card/95 backdrop-blur-md px-2.5 py-1 text-right shadow-md">
              <div className="text-sm font-bold text-ink">{priceLabel}</div>
              {hasPrice && (
                <div className="text-[9px] uppercase tracking-wider text-ink-faint">
                  {exp.perPerson ? "per person" : "per group"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="line-clamp-2 text-sm text-ink-soft leading-relaxed">{exp.blurb}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-soft">
            {exp.durationHours && <span className="font-medium">🕒 {exp.durationHours}h</span>}
            {exp.difficulty && (
              <span className={cx("font-semibold capitalize", DIFF_TONE[exp.difficulty])}>
                {exp.difficulty}
              </span>
            )}
            {exp.familyFriendly !== undefined && (
              <span className={exp.familyFriendly ? "text-good font-medium" : "text-ink-faint"}>
                {exp.familyFriendly ? "👨‍👩‍👧 Family-friendly" : "Adults-oriented"}
              </span>
            )}
            {exp.minAge ? <span>Min age {exp.minAge}</span> : null}
          </div>
          {exp.priceNote && !/original price|before discount|discount/i.test(exp.priceNote) && (
            <div className="mt-2 text-[11px] text-ink-faint">{exp.priceNote}</div>
          )}
        </div>
      </div>

      <div className="p-4 pt-0 border-t border-line/50 mt-2">
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SourceChips sourceIds={exp.sourceIds.slice(0, 2)} />
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link !text-[11px] !text-rose-600 dark:!text-rose-400 font-semibold"
              title="Watch activity video on YouTube"
            >
              ▶ Video ↗
            </a>
            <a
              href={bookingSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link !text-[11px]"
              title="Search booking options on Google (Right click for new tab)"
            >
              Book ↗
            </a>
          </div>
          <button
            onClick={() => toggle(exp.id)}
            className={
              selected
                ? "btn-ghost !py-1.5 !px-3 !text-xs !border-brand/60 !text-brand !bg-brand/5 font-semibold"
                : "btn-primary !py-1.5 !px-3.5 !text-xs font-semibold shadow-sm hover:brightness-110"
            }
          >
            {selected ? "Added ✓" : "Add to trip"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
