"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Place, HotelOption, ItineraryStop } from "@/lib/types";
import { cx } from "@/lib/format";

interface MapPinItem {
  id: string;
  name: string;
  category: "attraction" | "hotel" | "food" | "stop";
  location: string;
  blurb?: string;
  imageUrl?: string;
  duration?: string;
}

export function InteractiveMapView({
  destinationName,
  places = [],
  hotels = [],
  dayStops = [],
  activeDayNum,
}: {
  destinationName: string;
  places?: Place[];
  hotels?: HotelOption[];
  dayStops?: ItineraryStop[];
  activeDayNum?: number;
}) {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "places" | "hotels" | "stops">("all");

  // Build unified pin items
  const pins: MapPinItem[] = [];

  if (dayStops.length > 0) {
    dayStops.forEach((s, idx) => {
      pins.push({
        id: `stop_${idx}`,
        name: `${idx + 1}. ${s.label}`,
        category: "stop",
        location: destinationName,
        blurb: s.note || `${s.start} - ${s.end}`,
        duration: `${s.start} - ${s.end}`,
      });
    });
  } else {
    places.forEach((p) => {
      pins.push({
        id: p.id,
        name: p.canonicalName,
        category: "attraction",
        location: `${p.canonicalName}, ${destinationName}`,
        blurb: p.blurb,
        imageUrl: p.images[0]?.url,
        duration: `${p.durationHours}h visit`,
      });
    });

    hotels.forEach((h) => {
      pins.push({
        id: h.id,
        name: h.name,
        category: "hotel",
        location: `${h.name}, ${h.location}`,
        blurb: h.room,
        imageUrl: h.images[0]?.url,
        duration: "Hotel / Stay",
      });
    });
  }

  const activePin = pins.find((p) => p.id === selectedPinId) || pins[0];
  const querySubject = activePin ? activePin.location : `${destinationName} top attractions and hotels`;
  const googleMapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(querySubject)}&output=embed`;
  const googleMapsDirectUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(querySubject)}`;

  const filteredPins = pins.filter((p) => {
    if (activeTab === "places") return p.category === "attraction";
    if (activeTab === "hotels") return p.category === "hotel";
    if (activeTab === "stops") return p.category === "stop";
    return true;
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-card w-full min-w-0">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper-2/80 px-4 sm:px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-lg font-bold text-brand border border-brand/30">
            🧭
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Cartographer Agent</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Live Google Maps
              </span>
            </div>
            <h3 className="display text-sm sm:text-base md:text-lg font-bold text-ink truncate">
              {activeDayNum ? `Day ${activeDayNum} Route Timeline & Spatial Map` : `${destinationName} Geographic Intelligence Map`}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={googleMapsDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link !text-xs font-semibold"
            title="Open in full Google Maps app"
          >
            Open in Google Maps ↗
          </a>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Pin List */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] w-full min-w-0">
        {/* Map Frame Container */}
        <div className="relative h-[320px] sm:h-[400px] lg:h-[480px] w-full min-w-0 bg-paper-3 overflow-hidden">
          <iframe
            title={`Interactive Map of ${destinationName}`}
            src={googleMapsEmbedUrl}
            className="h-full w-full border-0 grayscale-[0.15] contrast-[1.05]"
            loading="lazy"
            allowFullScreen
          />

          {/* Floating Selected Spot Badge */}
          {activePin && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={activePin.id}
              className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm rounded-2xl border border-line bg-card/95 p-3 shadow-lift backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                {activePin.imageUrl ? (
                  <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-xl bg-paper-3">
                    <Image
                      src={activePin.imageUrl}
                      alt={activePin.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-xl text-brand">
                    {activePin.category === "hotel" ? "🏨" : activePin.category === "stop" ? "🚙" : "📍"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                      {activePin.category}
                    </span>
                    {activePin.duration && (
                      <span className="text-[10px] text-ink-faint">· {activePin.duration}</span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-ink truncate">{activePin.name}</h4>
                  {activePin.blurb && (
                    <p className="text-xs text-ink-soft line-clamp-1 mt-0.5">{activePin.blurb}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Pin Drawer Sidebar */}
        <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-line bg-paper max-h-[340px] sm:max-h-[400px] lg:max-h-[480px] w-full min-w-0 overflow-hidden">
          {/* Category Filter Pills */}
          <div className="p-3 border-b border-line bg-paper-2/60 flex flex-wrap items-center gap-1.5 w-full">
            {[
              { id: "all", label: `All Pins (${pins.length})` },
              { id: "places", label: `Sights (${places.length})` },
              { id: "hotels", label: `Stays (${hotels.length})` },
              ...(dayStops.length > 0 ? [{ id: "stops", label: `Timeline Stops (${dayStops.length})` }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-semibold transition-all shrink-0",
                  activeTab === tab.id
                    ? "bg-brand text-paper shadow-sm"
                    : "bg-paper border border-line text-ink-soft hover:text-ink"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable Pins List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {filteredPins.map((pin) => {
              const isSelected = activePin?.id === pin.id;
              return (
                <div
                  key={pin.id}
                  onClick={() => setSelectedPinId(pin.id)}
                  className={cx(
                    "cursor-pointer rounded-2xl border p-2.5 sm:p-3 transition-all flex items-center justify-between gap-2.5",
                    isSelected
                      ? "border-brand bg-brand/[0.06] shadow-sm ring-1 ring-brand/30"
                      : "border-line/70 bg-card hover:border-brand/40 hover:bg-paper-2"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">
                      {pin.category === "hotel" ? "🏨" : pin.category === "stop" ? "🚙" : "📍"}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-ink truncate">{pin.name}</div>
                      <div className="text-[11px] text-ink-soft truncate">{pin.duration || pin.location}</div>
                    </div>
                  </div>

                  <span className={cx("text-xs font-bold shrink-0", isSelected ? "text-brand" : "text-ink-faint")}>
                    {isSelected ? "Focused ●" : "View →"}
                  </span>
                </div>
              );
            })}

            {filteredPins.length === 0 && (
              <div className="p-8 text-center text-xs text-ink-faint">
                No pins match this filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
