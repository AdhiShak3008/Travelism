"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { inr, cx, formatDateRange } from "@/lib/format";
import { costTotals } from "@/lib/engine";
import { HotelCard } from "@/components/ui/HotelCard";
import { FlightCard, TransportCard, PermitCard, FoodCard, ConflictBanner } from "@/components/ui/ComponentCards";
import { ExperienceCard } from "@/components/ui/ExperienceCard";
import { CostPanel } from "@/components/ui/CostPanel";
import { JourneyRibbon } from "@/components/ui/JourneyRibbon";
import { ItineraryView } from "@/components/ui/ItineraryView";
import { InteractiveMapView } from "@/components/ui/InteractiveMapView";
import { ModifyChat } from "@/components/ui/ModifyChat";
import { SectionTitle } from "@/components/ui/Primitives";
import { LangGraphTelemetry } from "@/components/ui/LangGraphTelemetry";

type Tab = "overview" | "itinerary" | "map" | "stays" | "flights" | "todo" | "transport" | "food" | "permits";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "At a Glance", icon: "📋" },
  { id: "itinerary", label: "Day by Day", icon: "🗓️" },
  { id: "map", label: "Map & Routes", icon: "🗺️" },
  { id: "stays", label: "Stays & Resorts", icon: "🏨" },
  { id: "flights", label: "Flights", icon: "✈️" },
  { id: "todo", label: "Activities", icon: "🎟️" },
  { id: "food", label: "Dining", icon: "🍽️" },
  { id: "transport", label: "Transfers", icon: "🚗" },
  { id: "permits", label: "Visas & Permits", icon: "📄" },
];

export function PackageStage() {
  const blob = useTrip((s) => s.blob);
  const dataset = useTrip((s) => s.dataset);
  const setStage = useTrip((s) => s.setStage);
  const chooseFlight = useTrip((s) => s.chooseFlight);
  const chooseHotel = useTrip((s) => s.chooseHotel);
  const setStayMode = useTrip((s) => s.setStayMode);
  const [tab, setTab] = useState<Tab>("overview");
  const [hotelTierFilter, setHotelTierFilter] = useState<string>("all");
  const [hotelSearch, setHotelSearch] = useState<string>("");
  const [flightFilter, setFlightFilter] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  if (!dataset) return null;
  const { total } = costTotals(blob.costs);
  const moodTags = Object.entries(blob.mood).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

  const gw = dataset.meta.gateway.split(/[(,]/)[0].trim().toLowerCase();
  const isOutbound = (f: (typeof dataset.flights)[number]) => f.to.toLowerCase().includes(gw) || f.id.includes("out");
  const rawOutbound = dataset.flights.filter(isOutbound);
  const rawReturn = dataset.flights.filter((f) => !isOutbound(f));

  const parseHour = (timeStr: string) => {
    const m = timeStr.match(/^(\d{1,2}):/);
    return m ? parseInt(m[1], 10) : 12;
  };

  const filterFlightList = (list: typeof dataset.flights) => {
    return list.filter((f) => {
      if (flightFilter === "nonstop") return f.stops === 0;
      const h = parseHour(f.depart);
      if (flightFilter === "morning") return h >= 5 && h < 12;
      if (flightFilter === "midday") return h >= 12 && h < 18;
      if (flightFilter === "evening") return h >= 18 || h < 5;
      return true;
    });
  };

  const allOutbound = filterFlightList(rawOutbound);
  const allReturn = filterFlightList(rawReturn);

  const isNoHotel = blob.preferences.stayMode === "none" && blob.hotels.length === 0;
  const primaryHotel = blob.hotels[0] || (isNoHotel ? null : dataset.hotels[0]);
  const alternativeHotels = dataset.hotels.filter((h) => h.id !== primaryHotel?.id);

  // Filtered hotels for stays tab
  const filteredHotels = dataset.hotels.filter((h) => {
    if (hotelSearch.trim()) {
      const q = hotelSearch.toLowerCase().trim();
      const matchName = h.name.toLowerCase().includes(q);
      const matchLoc = (h.location || "").toLowerCase().includes(q);
      const matchAmenity = h.amenities.some((a) => a.toLowerCase().includes(q));
      if (!matchName && !matchLoc && !matchAmenity) return false;
    }
    if (hotelTierFilter === "wild_camping") return h.category === "wild_camping" || h.pricePerNight === 0;
    if (hotelTierFilter === "luxury") return h.pricePerNight >= 18000;
    if (hotelTierFilter === "mid") return h.pricePerNight >= 8000 && h.pricePerNight < 18000;
    if (hotelTierFilter === "boutique") return h.pricePerNight >= 3000 && h.pricePerNight < 8000;
    if (hotelTierFilter === "budget") return h.pricePerNight > 0 && h.pricePerNight < 3000;
    return true;
  });

  const handleCopySummary = () => {
    const summary = `🌴 TRAVELISM CUSTOM ITINERARY: ${blob.destinationName.toUpperCase()}
Calendar Dates: ${formatDateRange(blob.dates?.start, blob.durationDays)} (${blob.durationDays} Days / ${Math.max(1, blob.durationDays - 1)} Nights)
Party: ${blob.travelers} Traveler${blob.travelers > 1 ? "s" : ""} · Origin: ${blob.origin || "Origin City"} · ${blob.preferences.pace} Pace
Primary Stay: ${primaryHotel?.name || "Selected Resort"} (${inr(primaryHotel?.pricePerNight || 0)}/night)
Flight: ${blob.flight ? `${blob.flight.airline} (${blob.flight.depart} - ${blob.flight.arrive})` : "Direct route"}
Booked Experiences: ${blob.experiences.map((e) => e.name).join(", ") || "None"}
Estimated Total Package: ${inr(total)} (${inr(Math.round(total / (blob.travelers || 1)))}/person)

Generated with Travelism 2.0`;
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 w-full min-w-0 overflow-x-hidden">
      {/* Booklet cover banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden shadow-lift border-brand/30">
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-paper via-card to-brand/[0.06]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="stamp !bg-brand/10 !text-brand !border-brand/40 font-bold">
                  Verified Trip Package
                </span>
                {moodTags.map((m) => (
                  <span key={m} className="chip capitalize !text-xs font-semibold !bg-paper-2">
                    {m}
                  </span>
                ))}
              </div>
              <h1 className="display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                {blob.destinationName}
              </h1>
              <div className="mt-2 text-ink-soft text-base font-medium flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="font-bold text-ink">🗓️ {formatDateRange(blob.dates?.start, blob.durationDays)}</span>
                <span className="text-ink-faint">·</span>
                <span>{blob.durationDays} Days ({Math.max(1, blob.durationDays - 1)} Nights)</span>
                <span className="text-ink-faint">·</span>
                <span>{blob.travelers} Traveler{blob.travelers > 1 ? "s" : ""}</span>
                <span className="text-ink-faint">·</span>
                <span>From {blob.origin || "Your City"}</span>
                <span className="text-ink-faint">·</span>
                <span className="capitalize">{blob.preferences.pace} Pace</span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-3">
              <div className="sm:text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-0.5">
                  Complete Package Total
                </div>
                <div className="display text-3xl sm:text-4xl font-extrabold text-ink">{inr(total)}</div>
                <div className="text-sm font-semibold text-brand mt-0.5">
                  {inr(Math.round(total / (blob.travelers || 1)))} / person all-inclusive
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySummary}
                  className="chip !py-1.5 !px-3 font-semibold hover:!bg-paper-3 transition"
                  title="Copy formatted trip summary to clipboard"
                >
                  {copied ? "✓ Copied Summary!" : "📋 Copy Summary"}
                </button>
                <button
                  onClick={() => window.print()}
                  className="chip !py-1.5 !px-3 font-semibold hover:!bg-paper-3 transition"
                  title="Print or Save PDF of this itinerary"
                >
                  🖨️ Print / PDF
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-dashed border-line-strong pt-5">
            <div className="label-eyebrow mb-2">The Journey Flow</div>
            <JourneyRibbon />
          </div>
        </div>
      </motion.div>

      {blob.conflicts.length > 0 && (
        <div className="mt-5 space-y-3">
          {blob.conflicts.map((c) => (
            <ConflictBanner key={c.id} conflict={c} />
          ))}
        </div>
      )}

      {/* LangGraph Stateful Multi-Agent Telemetry & Orchestrator */}
      <div className="mt-6">
        <LangGraphTelemetry />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] w-full min-w-0">
        <div className="min-w-0 w-full overflow-hidden">
          {/* Navigation Tabs */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  tab === t.id
                    ? "rounded-full bg-brand px-4 py-2 text-xs sm:text-sm font-bold text-paper shadow-md transition-all"
                    : "rounded-full border border-line bg-card px-3.5 py-2 text-xs sm:text-sm font-medium text-ink-soft hover:text-ink hover:bg-paper-2 transition-all shadow-2xs"
                }
              >
                <span>{t.icon}</span> <span className="ml-1">{t.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-8">
              {/* PRIMARY STAY SECTION */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="label-eyebrow">Your Accommodation</span>
                    <h2 className="display text-2xl font-bold text-ink">
                      {isNoHotel
                        ? "No Hotel Required"
                        : primaryHotel?.category === "wild_camping"
                        ? "Wild Camping & Bivvies"
                        : "Selected Primary Stay"}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Stay Mode Switchers */}
                    {!isNoHotel && (
                      <button
                        onClick={() => setStayMode("none")}
                        className="rounded-full border border-line bg-paper-2 px-3 py-1 text-xs font-semibold text-ink-soft hover:text-ink hover:border-brand/40 transition shadow-2xs"
                        title="Remove commercial hotel accommodation (₹0)"
                      >
                        🚫 Remove Hotel (₹0)
                      </button>
                    )}
                    {primaryHotel?.category !== "wild_camping" && (
                      <button
                        onClick={() => setStayMode("wild_camping")}
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition shadow-2xs"
                        title="Switch to self-supported wild camping (₹0)"
                      >
                        ⛺ Switch to Wild Camping (₹0)
                      </button>
                    )}
                    {isNoHotel && (
                      <button
                        onClick={() => setStayMode("hotels")}
                        className="rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1 text-xs font-bold text-brand hover:bg-brand hover:text-paper transition shadow-2xs"
                      >
                        🏨 Add Hotel
                      </button>
                    )}
                    <button
                      onClick={() => setTab("stays")}
                      className="text-xs font-bold text-brand hover:underline flex items-center gap-1 ml-1"
                    >
                      <span>Browse All Stays →</span>
                    </button>
                  </div>
                </div>

                {isNoHotel ? (
                  <div className="rounded-2xl border border-line bg-card p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-paper-2 text-2xl">
                        🚫
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-ink">No Commercial Lodging Added</h4>
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            ₹0 Cost
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft mt-1">
                          You are traveling self-supported, staying with friends/family, or making personal stay arrangements.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setStayMode("wild_camping")}
                        className="btn-ghost !text-xs !py-2 font-bold"
                      >
                        ⛺ Wild Camping (₹0)
                      </button>
                      <button
                        onClick={() => setStayMode("hotels")}
                        className="btn-primary !text-xs !py-2 font-bold shadow-sm"
                      >
                        🏨 Select a Hotel
                      </button>
                    </div>
                  </div>
                ) : blob.hotels.length > 1 ? (
                  <div className="space-y-4">
                    {blob.hotels.map((h, hIndex) => (
                      <div key={h.id} className="relative">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="rounded-full bg-brand/10 border border-brand/30 px-3 py-0.5 text-xs font-bold text-brand flex items-center gap-1.5">
                            <span>🏨</span>
                            <span>Leg {hIndex + 1} Stay: {h.location}</span>
                          </span>
                        </div>
                        <HotelCard hotel={h} selected={true} />
                      </div>
                    ))}
                  </div>
                ) : primaryHotel ? (
                  <HotelCard hotel={primaryHotel} selected={true} />
                ) : null}

                {/* Quick Alternative Switcher */}
                {!isNoHotel && alternativeHotels.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-line bg-paper-2/60 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>Instant Alternative Stays (1-Click Switch)</span>
                      </div>
                      <span className="text-[11px] text-ink-faint">
                        {alternativeHotels.length} other options available
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {alternativeHotels.slice(0, 4).map((alt) => {
                        const priceDiff = alt.pricePerNight - (primaryHotel?.pricePerNight || 0);
                        const diffText =
                          priceDiff === 0
                            ? "Same price"
                            : priceDiff > 0
                            ? `+${inr(priceDiff)}/night`
                            : `-${inr(Math.abs(priceDiff))}/night`;

                        return (
                          <div
                            key={alt.id}
                            className="flex flex-col justify-between rounded-xl border border-line bg-card p-3.5 shadow-sm hover:border-brand/50 transition-all"
                          >
                            <div>
                              <div className="flex items-start gap-3">
                                <div className="relative h-14 w-18 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                                  {alt.images[0]?.url ? (
                                    <Image
                                      src={alt.images[0].url}
                                      alt={alt.name}
                                      fill
                                      sizes="72px"
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="grid h-full place-items-center text-sm">🏨</div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-sm text-ink truncate">{alt.name}</h4>
                                  <p className="text-[11px] text-ink-soft truncate">{alt.location}</p>
                                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                                    <span className="font-bold text-ink">{inr(alt.pricePerNight)}</span>
                                    <span
                                      className={`font-semibold ${
                                        priceDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                                      }`}
                                    >
                                      ({diffText})
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 text-[11px] text-ink-faint flex items-center gap-2">
                                <span>🧼 Clean {alt.cleanliness}/10</span>
                                <span>🚿 Bath {alt.bathroomScore}/10</span>
                              </div>
                            </div>

                            <button
                              onClick={() => chooseHotel(alt)}
                              className="mt-3 w-full rounded-lg border border-brand/40 bg-brand/5 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-paper transition"
                            >
                              Switch to this Stay →
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SELECTED FLIGHTS */}
              <div>
                <SectionTitle eyebrow="Selected Flights" title="Outbound & Return Flights" hint="Includes standard baggage and route transfers." />
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  {blob.flight && <FlightCard flight={blob.flight} kind="out" />}
                  {blob.returnFlight && <FlightCard flight={blob.returnFlight} kind="return" />}
                </div>
              </div>

              {/* EXPERIENCES */}
              {blob.experiences.length > 0 && (
                <div>
                  <SectionTitle eyebrow="Included Activities" title="Your Booked Experiences" />
                  <div className="grid gap-4 sm:grid-cols-2 mt-4">
                    {blob.experiences.map((e) => (
                      <ExperienceCard key={e.id} exp={e} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ITINERARY */}
          {tab === "itinerary" && (
            <div>
              <SectionTitle
                eyebrow="Complete Schedule"
                title={`${blob.durationDays}-Day Harmonious Itinerary`}
                hint="Tailored to your vacation length with balanced sightseeing, experiences, meals, and leisure. Click any day's focus pills to dictate your pace or add custom activities."
              />
              <div className="mt-5">
                <ItineraryView days={blob.itinerary} />
              </div>
            </div>
          )}

          {/* TAB: MAP & SPATIAL ROUTES */}
          {tab === "map" && (
            <div className="space-y-6">
              <SectionTitle
                eyebrow="Cartographer Agent Intelligence"
                title={`${blob.destinationName} Spatial Overview & Pins`}
                hint="Explore top sights, stays, and day routes rendered directly on Google Maps. Click any spot to focus its coordinates or open directions in Google Maps."
              />
              <InteractiveMapView
                destinationName={blob.destinationName}
                places={dataset.places}
                hotels={dataset.hotels}
              />
            </div>
          )}

          {/* TAB 3: STAYS & RESORTS */}
          {tab === "stays" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SectionTitle
                  eyebrow="Shortlisted Accommodations"
                  title={`Choose Your Preferred Stay (${dataset.hotels.length} Options)`}
                  hint="All stays include verified cleanliness scores, bathroom checks, and authentic amenities. Tap 'Choose This Stay' to update your package in real-time."
                />
              </div>

              {/* Search and Tier Filters */}
              <div className="space-y-3 border-b border-line pb-4">
                <div className="relative max-w-md">
                  <input
                    type="text"
                    value={hotelSearch}
                    onChange={(e) => setHotelSearch(e.target.value)}
                    placeholder="Search by hotel name, neighborhood, or amenities (e.g. pool, onsen, view)..."
                    className="w-full rounded-full border border-line bg-paper-2 pl-9 pr-4 py-2 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                  />
                  <span className="absolute left-3 top-2.5 text-ink-faint text-xs">🔍</span>
                  {hotelSearch && (
                    <button
                      onClick={() => setHotelSearch("")}
                      className="absolute right-3 top-2 text-ink-faint hover:text-ink text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-ink-soft mr-1">Filter Tier:</span>
                  {[
                    { id: "all", label: `All Stays (${dataset.hotels.length})` },
                    { id: "wild_camping", label: "⛺ Wild Camping & Bivvies (₹0)" },
                    { id: "budget", label: "🏡 Budget (< ₹3k)" },
                    { id: "boutique", label: "🏔️ Boutique (₹3k - ₹8k)" },
                    { id: "mid", label: "✨ Mid-Range (₹8k - ₹18k)" },
                    { id: "luxury", label: "⭐️ Luxury (₹18k+)" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setHotelTierFilter(f.id)}
                      className={
                        hotelTierFilter === f.id
                          ? "rounded-full bg-brand px-3.5 py-1 text-xs font-bold text-paper shadow-sm"
                          : "rounded-full border border-line bg-paper-2 px-3.5 py-1 text-xs font-medium text-ink-soft hover:text-ink hover:border-brand/40 transition"
                      }
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zero-Hotel Option Banner */}
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚫</span>
                  <div>
                    <h4 className="text-sm font-bold text-ink">Don&apos;t need a commercial hotel?</h4>
                    <p className="text-xs text-ink-soft">
                      Remove hotel charges completely if you are wild camping, staying with hosts, or traveling self-supported.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStayMode("none")}
                  className={cx(
                    "shrink-0 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition shadow-xs",
                    isNoHotel
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-line bg-paper-2 text-ink hover:border-brand hover:bg-brand/10"
                  )}
                >
                  {isNoHotel ? "✓ Zero Hotels Active (₹0)" : "Select 0 Hotels (₹0)"}
                </button>
              </div>

              {/* List of Hotels */}
              <div className="space-y-5">
                {filteredHotels.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-card p-8 text-center text-ink-soft">
                    <p className="text-sm font-medium">No stays match your current filter.</p>
                    <button
                      onClick={() => {
                        setHotelTierFilter("all");
                        setHotelSearch("");
                      }}
                      className="mt-2 text-xs font-bold text-brand hover:underline"
                    >
                      Reset filters →
                    </button>
                  </div>
                ) : (
                  filteredHotels.map((h) => {
                    const isSelected = blob.hotels.some((x) => x.id === h.id);
                    return (
                      <HotelCard
                        key={h.id}
                        hotel={h}
                        selected={isSelected}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FLIGHTS */}
          {tab === "flights" && (
            <div className="space-y-8">
              <SectionTitle
                eyebrow="Airlines & Flight Options"
                title={`Flights between ${blob.origin || "Origin"} and ${dataset.meta.gateway} (${rawOutbound.length} Outbound / ${rawReturn.length} Return Options)`}
                hint="Real flight schedules across 24-hour departure bands, airlines, cabin classes, baggage allowances, and live airfares."
              />

              {/* Departure Time Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
                <span className="text-xs font-semibold text-ink-soft mr-1">Time of Day:</span>
                {[
                  { id: "all", label: `All Flights (${rawOutbound.length})` },
                  { id: "morning", label: "🌅 Morning (05:00 - 12:00)" },
                  { id: "midday", label: "☀️ Midday (12:00 - 18:00)" },
                  { id: "evening", label: "🌙 Evening & Red-eye (18:00 - 05:00)" },
                  { id: "nonstop", label: "⚡ Nonstop Only" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFlightFilter(f.id)}
                    className={
                      flightFilter === f.id
                        ? "rounded-full bg-brand px-3.5 py-1 text-xs font-bold text-paper shadow-sm"
                        : "rounded-full border border-line bg-paper-2 px-3.5 py-1 text-xs font-medium text-ink-soft hover:text-ink hover:border-brand/40 transition"
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Current Selected */}
              <div className="grid gap-4 sm:grid-cols-2">
                {blob.flight && <FlightCard flight={blob.flight} kind="out" />}
                {blob.returnFlight && <FlightCard flight={blob.returnFlight} kind="return" />}
              </div>

              {/* All Alternative Outbound Flights */}
              <div className="border-t border-line pt-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="display text-xl font-semibold text-ink">Outbound Flights ({allOutbound.length})</h3>
                  <span className="text-xs text-ink-faint">1-Click to select</span>
                </div>
                <div className="space-y-3">
                  {allOutbound.map((f) => {
                    const isSelected = blob.flight?.id === f.id;
                    return (
                      <div key={f.id} className={cx("card p-4 flex flex-wrap items-center justify-between gap-4 transition-all", isSelected && "border-brand ring-2 ring-brand/20 bg-brand/[0.02]")}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink text-base">✈️ {f.airline}</span>
                            <span className="chip !text-[11px] !py-0.5">{f.cabin ?? "Economy"}</span>
                            <span className="text-xs text-ink-faint">Flight {f.flightNo}</span>
                            {f.earlyMorning && (
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                🌅 Early Flight
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-ink-soft mt-1">
                            <strong>{f.depart}</strong> → <strong>{f.arrive}</strong> · <span>{f.duration}</span> · {f.stops === 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Nonstop</span> : f.stopDetail ?? f.layover}
                          </div>
                          <div className="text-xs text-ink-faint mt-1">🧳 {f.baggage} · {f.refundable ? "Refundable" : "Standard Policy"}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="display text-lg font-bold text-ink">{inr(f.fare)}</div>
                            <div className="text-[10px] text-ink-faint">per person</div>
                          </div>
                          <button
                            onClick={() => chooseFlight(f, "out")}
                            className={isSelected ? "btn-ghost !py-1.5 !px-4 !text-xs !border-brand !text-brand font-semibold" : "btn-primary !py-1.5 !px-4 !text-xs font-semibold"}
                          >
                            {isSelected ? "Selected ✓" : "Pick Flight"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* All Alternative Return Flights */}
              <div className="border-t border-line pt-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="display text-xl font-semibold text-ink">Return Flights ({allReturn.length})</h3>
                  <span className="text-xs text-ink-faint">1-Click to select</span>
                </div>
                <div className="space-y-3">
                  {allReturn.map((f) => {
                    const isSelected = blob.returnFlight?.id === f.id;
                    return (
                      <div key={f.id} className={cx("card p-4 flex flex-wrap items-center justify-between gap-4 transition-all", isSelected && "border-brand ring-2 ring-brand/20 bg-brand/[0.02]")}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink text-base">✈️ {f.airline}</span>
                            <span className="chip !text-[11px] !py-0.5">{f.cabin ?? "Economy"}</span>
                            <span className="text-xs text-ink-faint">Flight {f.flightNo}</span>
                            {f.earlyMorning && (
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                🌅 Early Flight
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-ink-soft mt-1">
                            <strong>{f.depart}</strong> → <strong>{f.arrive}</strong> · <span>{f.duration}</span> · {f.stops === 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Nonstop</span> : f.stopDetail ?? f.layover}
                          </div>
                          <div className="text-xs text-ink-faint mt-1">🧳 {f.baggage} · {f.refundable ? "Refundable" : "Standard Policy"}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="display text-lg font-bold text-ink">{inr(f.fare)}</div>
                            <div className="text-[10px] text-ink-faint">per person</div>
                          </div>
                          <button
                            onClick={() => chooseFlight(f, "return")}
                            className={isSelected ? "btn-ghost !py-1.5 !px-4 !text-xs !border-brand !text-brand font-semibold" : "btn-primary !py-1.5 !px-4 !text-xs font-semibold"}
                          >
                            {isSelected ? "Selected ✓" : "Pick Flight"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: THINGS TO DO */}
          {tab === "todo" && (
            <div className="space-y-6">
              <SectionTitle
                eyebrow="Adventures & Passes"
                title="Bookable Activities in the Destination"
                hint="Add or remove experiences to customize your trip excitement."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {dataset.experiences.map((e) => (
                  <ExperienceCard key={e.id} exp={e} />
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: TRANSPORT */}
          {tab === "transport" && (
            <div className="space-y-4">
              <SectionTitle eyebrow="Ground Logistics" title="Airport Transfers & Local Vehicles" />
              {blob.transport.map((t) => (
                <TransportCard key={t.id} t={t} />
              ))}
            </div>
          )}

          {/* TAB 7: FOOD */}
          {tab === "food" && (
            <div>
              <SectionTitle eyebrow="Dining Recommendations" title="Culinary Highlights & Eateries" />
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                {blob.food.map((f) => (
                  <FoodCard key={f.id} food={f} />
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: PERMITS */}
          {tab === "permits" && (
            <div className="space-y-4">
              <SectionTitle eyebrow="Entry & Documents" title="Visas, Permits & Entry Formalities" />
              {blob.permits.map((p) => (
                <PermitCard key={p.id} permit={p} />
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR: Cost Panel + AI Concierge */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start w-full min-w-0 max-w-full">
          <CostPanel />
          <div className="h-[560px] w-full min-w-0">
            <ModifyChat />
          </div>
          <button
            onClick={() => setStage("checkout")}
            className="btn-primary w-full !py-4 text-base shadow-lift font-bold hover:brightness-110"
          >
            Review & Finalize Booking →
          </button>
        </div>
      </div>
    </div>
  );
}
