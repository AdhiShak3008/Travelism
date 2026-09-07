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

export function ExperienceCard({ exp }: { exp: Experience }) {
  const selected = useTrip((s) => s.blob.selectedExperienceIds.includes(exp.id));
  const toggle = useTrip((s) => s.toggleExperience);
  const lightbox = useLightbox();

  const priceLabel = exp.price > 0 ? inr(exp.price) : "Free";

  return (
    <motion.div
      layout
      className={cx(
        "group overflow-hidden rounded-2xl border bg-card transition",
        selected ? "border-brand shadow-lift ring-1 ring-brand/30" : "border-line shadow-card hover:border-line-strong"
      )}
    >
      <div
        className="relative aspect-[16/10] cursor-zoom-in overflow-hidden bg-paper-2"
        onClick={() => exp.images[0]?.url && lightbox.open(exp.images, 0, exp.name)}
      >
        {exp.images[0]?.url ? (
          <Image src={exp.images[0].url} alt={exp.name} fill sizes="420px" className="object-cover transition duration-700 group-hover:scale-[1.04]" unoptimized />
        ) : (
          <div className="grid h-full place-items-center text-3xl">🎟️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="stamp !bg-white/85 backdrop-blur">{CATEGORY_LABEL[exp.category]}</span>
          {exp.estimated && <span className="stamp !border-terra/60 !text-terra !bg-white/85 backdrop-blur">est. price</span>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toggle(exp.id); }}
          className={cx(
            "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border text-base transition active:scale-90",
            selected ? "border-brand bg-brand text-paper" : "border-white/60 bg-white/80 text-ink backdrop-blur hover:bg-white"
          )}
          aria-label={selected ? "Remove" : "Add to trip"}
        >
          {selected ? "✓" : "+"}
        </button>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="min-w-0">
            <h3 className="display text-lg font-semibold text-white drop-shadow">{exp.name}</h3>
          </div>
          <div className="shrink-0 rounded-lg bg-white/90 px-2.5 py-1 text-right">
            <div className="text-sm font-bold text-ink">{priceLabel}</div>
            <div className="text-[9px] uppercase text-ink-faint">{exp.perPerson ? "per person" : "per group"}</div>
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
        {exp.priceNote && <div className="mt-2 text-[11px] text-ink-faint">{exp.priceNote}</div>}
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
