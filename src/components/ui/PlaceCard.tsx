"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Place } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { research } from "@/lib/research/provider";
import { cx } from "@/lib/format";
import { SourceChips } from "./Provenance";
import { VideoRow } from "./VideoRow";
import { SteeringBox } from "./SteeringBox";

const CATEGORY_LABEL: Record<Place["category"], string> = {
  core: "Core",
  adventure: "Adventure",
  enroute: "En-route",
  food: "Food",
  stay: "Stay",
};

const DIFFICULTY_TONE: Record<string, string> = {
  easy: "!text-signal-good !border-signal-good/25",
  moderate: "!text-signal-warn !border-signal-warn/25",
  hard: "!text-signal-bad !border-signal-bad/25",
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
        "group overflow-hidden rounded-2xl border bg-ink-800/60 transition",
        selected ? "border-alpine-400/50 shadow-glow" : "border-white/[0.06] hover:border-white/15"
      )}
    >
      {/* Media */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={place.images[0]?.url}
          alt={place.canonicalName}
          fill
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="chip !border-white/15 !bg-black/40 backdrop-blur">{CATEGORY_LABEL[place.category]}</span>
          {place.permitRequired && (
            <span className="chip !border-signal-warn/30 !bg-black/40 !text-signal-warn backdrop-blur">Permit</span>
          )}
        </div>

        {/* Select toggle */}
        <button
          onClick={() => toggle(place.id)}
          className={cx(
            "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border backdrop-blur transition active:scale-90",
            selected
              ? "border-alpine-300 bg-alpine-500 text-ink-950"
              : "border-white/20 bg-black/40 text-white hover:bg-black/60"
          )}
          aria-label={selected ? "Remove from trip" : "Add to trip"}
        >
          {selected ? "✓" : "+"}
        </button>

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-xl font-semibold text-paper-50">{place.canonicalName}</h3>
          <p className="line-clamp-1 text-sm text-paper-200/80">{place.blurb}</p>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-xs text-paper-200/70">
        <span>🕒 {place.durationHours}h</span>
        {place.travelTime && <span>🚗 {place.travelTime}</span>}
        {place.bestTime && <span>☀ {place.bestTime}</span>}
        {place.difficulty && (
          <span className={cx("chip !text-[11px]", DIFFICULTY_TONE[place.difficulty])}>{place.difficulty}</span>
        )}
        {place.accessible && (
          <span className="text-paper-200/50">
            ♿ {place.accessible === "yes" ? "Accessible" : place.accessible === "partial" ? "Partial" : "Limited"}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
        <SourceChips sourceIds={place.sourceIds.slice(0, 3)} />
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs font-semibold text-alpine-300 hover:text-alpine-200"
        >
          {expanded ? "Less" : "Details & evidence"}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="space-y-4 p-4">
              <p className="text-sm leading-relaxed text-paper-100">{place.description}</p>

              {place.images.length > 1 && (
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {place.images.map((im) => (
                    <div key={im.id} className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg">
                      <Image src={im.url} alt={im.category} fill sizes="144px" className="object-cover" unoptimized />
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] uppercase text-white/80">
                        {im.provenance}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {place.facts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {place.facts.map((f, i) => (
                    <span key={i} className="chip !text-[11px]">💡 {f}</span>
                  ))}
                </div>
              )}

              {videos.length > 0 && <VideoRow videos={videos} />}

              <SteeringBox scope="place" entityId={place.id} title="Comment on this place" compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
