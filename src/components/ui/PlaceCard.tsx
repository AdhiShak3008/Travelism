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

const CATEGORY_LABEL: Record<Place["category"], string> = {
  core: "Must-see",
  adventure: "Adventure",
  enroute: "On the way",
  food: "Food",
  stay: "Stay",
};

const DIFFICULTY_TONE: Record<string, string> = {
  easy: "text-good",
  moderate: "text-warn",
  hard: "text-bad",
};

export function PlaceCard({ place }: { place: Place }) {
  const selected = useTrip((s) => s.blob.selectedPlaceIds.includes(place.id));
  const toggle = useTrip((s) => s.toggleSelectPlace);
  const dataset = useTrip((s) => s.dataset);
  const [expanded, setExpanded] = useState(false);

  const videos = dataset?.videos.filter((v) => place.videoIds.includes(v.id)) ?? [];

  return (
    <motion.div
      layout
      className={cx(
        "group overflow-hidden rounded-2xl border bg-card transition",
        selected ? "border-brand shadow-lift ring-1 ring-brand/30" : "border-line shadow-card hover:border-line-strong"
      )}
    >
      {/* Postcard photo */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={place.images[0]?.url}
          alt={place.canonicalName}
          fill
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="stamp !bg-white/85 backdrop-blur">{CATEGORY_LABEL[place.category]}</span>
          {place.permitRequired && <span className="stamp !border-warn/60 !text-warn !bg-white/85 backdrop-blur">Permit</span>}
        </div>

        <button
          onClick={() => toggle(place.id)}
          className={cx(
            "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border text-base transition active:scale-90",
            selected ? "border-brand bg-brand text-paper" : "border-white/60 bg-white/80 text-ink backdrop-blur hover:bg-white"
          )}
          aria-label={selected ? "Remove from trip" : "Add to trip"}
        >
          {selected ? "✓" : "+"}
        </button>

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="display text-xl font-semibold text-white drop-shadow">{place.canonicalName}</h3>
          <p className="line-clamp-1 text-sm text-white/85 drop-shadow">{place.blurb}</p>
        </div>
      </div>

      {/* Caption strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-xs text-ink-soft">
        <span>🕒 {place.durationHours}h</span>
        {place.travelTime && <span>🚗 {place.travelTime}</span>}
        {place.bestTime && <span>☀ {place.bestTime}</span>}
        {place.difficulty && (
          <span className={cx("font-medium capitalize", DIFFICULTY_TONE[place.difficulty])}>{place.difficulty}</span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
        <SourceChips sourceIds={place.sourceIds.slice(0, 2)} />
        <button onClick={() => setExpanded((e) => !e)} className="text-xs font-semibold text-brand hover:underline">
          {expanded ? "Close" : "Read more"}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-line"
          >
            <div className="space-y-4 p-4">
              <p className="text-sm leading-relaxed text-ink">{place.description}</p>

              {place.images.length > 1 && (
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {place.images.map((im) => (
                    <div key={im.id} className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg border border-line">
                      <Image src={im.url} alt={im.category} fill sizes="144px" className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              )}

              {place.facts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {place.facts.map((f, i) => (
                    <span key={i} className="chip">💡 {f}</span>
                  ))}
                </div>
              )}

              {videos.length > 0 && <VideoRow videos={videos} />}

              <SteeringBox scope="place" entityId={place.id} title="Tell us about this spot" compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
