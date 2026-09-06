"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { TripTray } from "@/components/ui/TripTray";
import { SteeringBox } from "@/components/ui/SteeringBox";
import { VideoRow } from "@/components/ui/VideoRow";
import { SectionTitle } from "@/components/ui/Primitives";
import type { PlaceCategory } from "@/lib/types";

const GROUPS: { key: PlaceCategory; label: string; hint: string }[] = [
  { key: "core", label: "Core", hint: "The essential sights" },
  { key: "adventure", label: "Mountain / Adventure", hint: "Higher, wilder, permit-gated" },
  { key: "enroute", label: "En-route", hint: "Worth stopping for on the drive" },
];

export function RevealStage() {
  const dataset = useTrip((s) => s.dataset);
  const setStage = useTrip((s) => s.setStage);
  const [tab, setTab] = useState<PlaceCategory>("core");

  if (!dataset) return null;
  const { meta, places, videos } = dataset;
  const destVideos = videos.filter((v) => v.relatesTo.startsWith("dest_"));

  return (
    <div className="pb-40">
      {/* Cinematic destination hero */}
      <div className="relative h-[52vh] min-h-[380px] w-full overflow-hidden">
        <Image src={meta.hero} alt={meta.name} fill priority className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-6 pb-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="label-eyebrow mb-2">{meta.region}</div>
            <h1 className="font-display text-5xl font-semibold tracking-tight text-paper-50 sm:text-6xl">{meta.name}</h1>
            <p className="mt-3 max-w-2xl text-lg text-paper-200/85">{meta.tagline}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip !border-white/15 !bg-black/30 backdrop-blur">🛬 Gateway · {meta.gateway}</span>
              <span className="chip !border-white/15 !bg-black/30 backdrop-blur">🗓 Best · {meta.bestSeason}</span>
              {meta.facts.slice(0, 2).map((f) => (
                <span key={f} className="chip !border-white/15 !bg-black/30 backdrop-blur">{f}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        {/* See it yourself */}
        {destVideos.length > 0 && (
          <div className="mt-8">
            <VideoRow videos={destVideos} title="See it yourself" />
          </div>
        )}

        {/* Category tabs */}
        <div className="mt-10">
          <SectionTitle
            eyebrow="Destination intelligence"
            title={`What ${meta.name} has to offer`}
            hint="Browse the places, expand any card for evidence, photos and video, then add the experiences you actually want."
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
                      ? "rounded-full bg-alpine-500 px-4 py-2 text-sm font-semibold text-ink-950"
                      : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-paper-200/80 hover:bg-white/[0.06]"
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

        {/* Trip-wide steering */}
        <div className="mt-10">
          <SteeringBox scope="trip" title="Shape the investigation" />
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={() => setStage("dream")} className="btn-ghost">
            ← Change dream
          </button>
        </div>
      </div>

      <TripTray onContinue={() => setStage("shape")} />
    </div>
  );
}
