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
import type { PlaceCategory } from "@/lib/types";

const GROUPS: { key: PlaceCategory; label: string }[] = [
  { key: "core", label: "The essentials" },
  { key: "adventure", label: "For the adventurous" },
  { key: "enroute", label: "Worth a stop" },
];

export function RevealStage() {
  const dataset = useTrip((s) => s.dataset);
  const setStage = useTrip((s) => s.setStage);
  const [tab, setTab] = useState<PlaceCategory>("core");

  if (!dataset) return null;
  const { meta, places, videos, experiences } = dataset;
  const destVideos = videos.filter((v) => v.relatesTo.startsWith("dest_"));

  return (
    <div className="pb-40">
      {/* Cinematic destination hero — the brochure's inside cover */}
      <div className="relative h-[54vh] min-h-[400px] w-full overflow-hidden">
        <Image src={meta.hero} alt={meta.name} fill priority className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-6 pb-9">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="stamp mb-3 !bg-white/85 backdrop-blur">{meta.region || "Field notes"}</div>
            <h1 className="display text-5xl font-semibold tracking-tight text-white drop-shadow sm:text-6xl">{meta.name}</h1>
            <p className="mt-3 max-w-2xl text-lg text-white/90 drop-shadow">{meta.tagline}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip !bg-white/85 backdrop-blur">🛬 Fly into {meta.gateway}</span>
              <span className="chip !bg-white/85 backdrop-blur">🗓 Best {meta.bestSeason}</span>
              {meta.facts.slice(0, 1).map((f) => (
                <span key={f} className="chip !bg-white/85 backdrop-blur">{f}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        {destVideos.length > 0 && (
          <div className="mt-8">
            <VideoRow videos={destVideos} title="A glimpse before you go" />
          </div>
        )}

        <div className="mt-10">
          <SectionTitle
            eyebrow="Here's what we found"
            title={`The best of ${meta.name}`}
            hint="Browse like a brochure. Tap the + on anything you'd love to do — it drops into your itinerary at the bottom."
          />
          <div className="mb-5 flex flex-wrap gap-2">
            {GROUPS.map((g) => {
              const count = places.filter((p) => p.category === g.key).length;
              if (count === 0) return null;
              return (
                <button
                  key={g.key}
                  onClick={() => setTab(g.key)}
                  className={
                    tab === g.key
                      ? "rounded-full bg-brand px-4 py-2 text-sm font-semibold text-paper"
                      : "rounded-full border border-line-strong bg-paper-2 px-4 py-2 text-sm text-ink-soft hover:text-ink"
                  }
                >
                  {g.label} <span className="opacity-60">· {count}</span>
                </button>
              );
            })}
          </div>

          <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {places
              .filter((p) => p.category === tab)
              .map((p) => (
                <PlaceCard key={p.id} place={p} />
              ))}
          </motion.div>
        </div>

        {experiences.length > 0 && (
          <div className="mt-12">
            <SectionTitle
              eyebrow="Things to do"
              title="Bookable experiences"
              hint="Paragliding, tickets, tours, safaris and more — each with its own cost. Add any and it drops into your trip and its price into the total."
            />
            <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {experiences.map((e) => (
                <ExperienceCard key={e.id} exp={e} />
              ))}
            </motion.div>
          </div>
        )}

        <div className="mt-10">
          <RefineBox />
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={() => setStage("dream")} className="btn-ghost">
            ← Start over
          </button>
        </div>
      </div>

      <TripTray onContinue={() => setStage("shape")} />
    </div>
  );
}
