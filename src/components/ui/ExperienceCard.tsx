"use client";

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

// Clean category glyph + tint used when we have no real activity photo —
// intentional and honest, never a mismatched destination image.
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
  const lightbox = useLightbox();

  const hasPrice = exp.price > 0;
  const priceLabel = hasPrice ? inr(exp.price) : exp.price === 0 && exp.priceNote?.includes("free") ? "Free" : "Price on booking";
  const hasImage = !!exp.images[0]?.url;

  return (
    <motion.div
      layout
      className={cx(
        "group overflow-hidden rounded-2xl border bg-card transition",
        selected ? "border-brand shadow-lift ring-1 ring-brand/30" : "border-line shadow-card hover:border-line-strong"
      )}
    >
      <div
        className={cx("relative aspect-[16/10] overflow-hidden", hasImage && "cursor-zoom-in")}
        onClick={() => hasImage && lightbox.open(exp.images, 0, exp.name)}
      >
        {hasImage ? (
          <>
            <Image src={exp.images[0].url} alt={exp.name} fill sizes="420px" className="object-cover transition duration-700 group-hover:scale-[1.04]" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        ) : (
          // clean category card — honest, never a mismatched photo
          <div className={cx("absolute inset-0 grid place-items-center bg-gradient-to-br", CATEGORY_TINT[exp.category])}>
            <span className="text-5xl opacity-70">{CATEGORY_GLYPH[exp.category]}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className={cx("stamp backdrop-blur", hasImage ? "!bg-white/85" : "!bg-card")}>{CATEGORY_LABEL[exp.category]}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toggle(exp.id); }}
          className={cx(
            "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border text-base transition active:scale-90",
            selected ? "border-brand bg-brand text-paper" : "border-line bg-card text-ink backdrop-blur hover:bg-paper-2"
          )}
          aria-label={selected ? "Remove" : "Add to trip"}
        >
          {selected ? "✓" : "+"}
        </button>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <h3 className={cx("display min-w-0 text-lg font-semibold", hasImage ? "text-white drop-shadow" : "text-ink")}>{exp.name}</h3>
          <div className="shrink-0 rounded-lg border border-line bg-card px-2.5 py-1 text-right shadow-card">
            <div className="text-sm font-bold text-ink">{priceLabel}</div>
            {hasPrice && <div className="text-[9px] uppercase text-ink-faint">{exp.perPerson ? "per person" : "per group"}</div>}
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="line-clamp-2 text-sm text-ink-soft">{exp.blurb}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-soft">
          {exp.durationHours && <span>🕒 {exp.durationHours}h</span>}
          {exp.difficulty && <span className={cx("font-medium capitalize", DIFF_TONE[exp.difficulty])}>{exp.difficulty}</span>}
          {exp.familyFriendly !== undefined && (
            <span className={exp.familyFriendly ? "text-good" : "text-ink-faint"}>
              {exp.familyFriendly ? "👨‍👩‍👧 Family-friendly" : "Adults-oriented"}
            </span>
          )}
          {exp.minAge ? <span>Min age {exp.minAge}</span> : null}
        </div>
        {exp.priceNote && !/original price|before discount|discount/i.test(exp.priceNote) && (
          <div className="mt-2 text-[11px] text-ink-faint">{exp.priceNote}</div>
        )}
        {!hasPrice && <div className="mt-2 text-[11px] text-ink-faint">Price shown at booking</div>}
        <div className="mt-3 flex items-center justify-between">
          <SourceChips sourceIds={exp.sourceIds.slice(0, 2)} />
          <button
            onClick={() => toggle(exp.id)}
            className={selected ? "btn-ghost !py-1.5 !text-xs !border-brand/50 !text-brand" : "btn-primary !py-1.5 !text-xs"}
          >
            {selected ? "Added ✓" : "Add to trip"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
