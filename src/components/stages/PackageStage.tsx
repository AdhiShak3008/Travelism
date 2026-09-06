"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { inr } from "@/lib/format";
import { costTotals } from "@/lib/engine";
import { HotelCard } from "@/components/ui/HotelCard";
import { FlightCard, TransportCard, PermitCard, FoodCard, ConflictBanner } from "@/components/ui/ComponentCards";
import { CostPanel } from "@/components/ui/CostPanel";
import { JourneyRibbon } from "@/components/ui/JourneyRibbon";
import { ItineraryView } from "@/components/ui/ItineraryView";
import { ModifyChat } from "@/components/ui/ModifyChat";
import { SectionTitle } from "@/components/ui/Primitives";

type Tab = "overview" | "flights" | "stays" | "transport" | "itinerary" | "food" | "permits";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "itinerary", label: "Itinerary" },
  { id: "stays", label: "Stays" },
  { id: "flights", label: "Flights" },
  { id: "transport", label: "Transport" },
  { id: "food", label: "Food" },
  { id: "permits", label: "Permits" },
];

export function PackageStage() {
  const blob = useTrip((s) => s.blob);
  const dataset = useTrip((s) => s.dataset);
  const setStage = useTrip((s) => s.setStage);
  const [tab, setTab] = useState<Tab>("overview");

  if (!dataset) return null;
  const { total } = costTotals(blob.costs);
  const moodTags = Object.entries(blob.mood)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Blob header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-1 flex flex-wrap gap-1.5">
                <span className="chip !border-alpine-400/30 !text-alpine-200">Best value</span>
                {moodTags.map((m) => (
                  <span key={m} className="chip capitalize">{m}</span>
                ))}
              </div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-paper-50 sm:text-5xl">
                {blob.destinationName}
              </h1>
              <p className="mt-1 text-paper-200/60">
                {blob.durationDays} days · {blob.travelers} traveller{blob.travelers > 1 ? "s" : ""} · pace {blob.preferences.pace}
              </p>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-semibold text-paper-50">{inr(total)}</div>
              <div className="text-sm text-paper-200/50">{inr(total / blob.travelers)} / person</div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <div className="label-eyebrow mb-2">Journey</div>
            <JourneyRibbon />
          </div>
        </div>
      </motion.div>

      {/* Conflicts surfaced up top */}
      {blob.conflicts.length > 0 && (
        <div className="mt-4 space-y-3">
          {blob.conflicts.map((c) => (
            <ConflictBanner key={c.id} conflict={c} />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div>
          {/* Tabs */}
          <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  tab === t.id
                    ? "shrink-0 rounded-full bg-alpine-500 px-4 py-2 text-sm font-semibold text-ink-950"
                    : "shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-paper-200/80 hover:bg-white/[0.06]"
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="space-y-6">
              <div>
                <SectionTitle eyebrow="Stay" title="Your accommodation" />
                {blob.hotels.map((h) => (
                  <HotelCard key={h.id} hotel={h} selected />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {blob.flight && <FlightCard flight={blob.flight} kind="out" />}
                {blob.returnFlight && <FlightCard flight={blob.returnFlight} kind="return" />}
              </div>
            </div>
          )}

          {tab === "itinerary" && (
            <div>
              <SectionTitle eyebrow="Day by day" title="Your itinerary" hint="Built from real route order, travel time and your pace — no teleporting between sights." />
              <ItineraryView days={blob.itinerary} />
            </div>
          )}

          {tab === "stays" && (
            <div className="space-y-5">
              <SectionTitle eyebrow="Pillow · Toilet Inspector" title="Stays & evidence" />
              {dataset.hotels.map((h) => (
                <HotelCard key={h.id} hotel={h} selected={blob.hotels.some((x) => x.id === h.id)} />
              ))}
            </div>
          )}

          {tab === "flights" && (
            <div className="space-y-4">
              <SectionTitle eyebrow="Wingman" title="Flights" />
              {blob.flight && <FlightCard flight={blob.flight} kind="out" />}
              {blob.returnFlight && <FlightCard flight={blob.returnFlight} kind="return" />}
            </div>
          )}

          {tab === "transport" && (
            <div className="space-y-4">
              <SectionTitle eyebrow="Roadrunner" title="Ground transport" />
              {blob.transport.map((t) => (
                <TransportCard key={t.id} t={t} />
              ))}
            </div>
          )}

          {tab === "food" && (
            <div>
              <SectionTitle eyebrow="Foodie" title="Where to eat" />
              <div className="grid gap-4 sm:grid-cols-2">
                {blob.food.map((f) => (
                  <FoodCard key={f.id} food={f} />
                ))}
              </div>
            </div>
          )}

          {tab === "permits" && (
            <div className="space-y-4">
              <SectionTitle eyebrow="Gatekeeper" title="Permits & documents" />
              {blob.permits.map((p) => (
                <PermitCard key={p.id} permit={p} />
              ))}
            </div>
          )}
        </div>

        {/* Sticky sidebar: cost + chat */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <CostPanel />
          <div className="h-[460px]">
            <ModifyChat />
          </div>
          <button onClick={() => setStage("checkout")} className="btn-primary w-full !py-3.5">
            Review & book →
          </button>
        </div>
      </div>
    </div>
  );
}
