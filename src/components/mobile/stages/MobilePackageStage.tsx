"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { inr, cx } from "@/lib/format";
import { costTotals } from "@/lib/engine";
import { HotelCard } from "@/components/ui/HotelCard";
import { FlightCard, TransportCard, PermitCard, FoodCard, ConflictBanner } from "@/components/ui/ComponentCards";
import { ExperienceCard } from "@/components/ui/ExperienceCard";
import { CostPanel } from "@/components/ui/CostPanel";
import { JourneyRibbon } from "@/components/ui/JourneyRibbon";
import { ItineraryView } from "@/components/ui/ItineraryView";
import { InteractiveMapView } from "@/components/ui/InteractiveMapView";

type MobileTab = "overview" | "itinerary" | "map" | "stays" | "flights" | "todo" | "food" | "transport" | "permits";

const TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "itinerary", label: "Schedule", icon: "🗓️" },
  { id: "map", label: "Map", icon: "🗺️" },
  { id: "stays", label: "Stays", icon: "🏨" },
  { id: "flights", label: "Flights", icon: "✈️" },
  { id: "todo", label: "Activities", icon: "🎟️" },
  { id: "food", label: "Dining", icon: "🍽️" },
  { id: "transport", label: "Transfers", icon: "🚗" },
  { id: "permits", label: "Permits", icon: "📄" },
];

export function MobilePackageStage() {
  const blob = useTrip((s) => s.blob);
  const dataset = useTrip((s) => s.dataset);
  const setStage = useTrip((s) => s.setStage);
  const setStayMode = useTrip((s) => s.setStayMode);
  const chooseFlight = useTrip((s) => s.chooseFlight);
  const toggleExperience = useTrip((s) => s.toggleExperience);

  const [tab, setTab] = useState<MobileTab>("overview");
  const [hotelTierFilter, setHotelTierFilter] = useState<string>("all");
  const [showCostSheet, setShowCostSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!dataset) return null;
  const { total, payableNow, duringTrip } = costTotals(blob.costs);
  const moodTags = Object.entries(blob.mood).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

  const gw = dataset.meta.gateway.split(/[(,]/)[0].trim().toLowerCase();
  const isOutbound = (f: (typeof dataset.flights)[number]) => f.to.toLowerCase().includes(gw) || f.id.includes("out");
  const allOutbound = dataset.flights.filter(isOutbound);
  const allReturn = dataset.flights.filter((f) => !isOutbound(f));

  const isNoHotel = blob.preferences.stayMode === "none" || (blob.hotels.length === 0 && blob.preferences.stayMode !== "wild_camping");
  const primaryHotel = blob.hotels[0] || (isNoHotel ? null : dataset.hotels[0]);

  // Filtered hotels for stays tab
  const filteredHotels = dataset.hotels.filter((h) => {
    if (hotelTierFilter === "wild_camping") return h.category === "wild_camping" || h.pricePerNight === 0;
    if (hotelTierFilter === "luxury") return h.pricePerNight >= 6000 || h.cleanliness >= 9.2;
    if (hotelTierFilter === "boutique")
      return (
        (h.pricePerNight >= 2500 && h.pricePerNight < 6000) ||
        h.amenities.some((a) => a.toLowerCase().includes("view") || a.toLowerCase().includes("heating"))
      );
    if (hotelTierFilter === "budget") return h.pricePerNight < 2500;
    return true;
  });

  const handleCopySummary = () => {
    const summary = `🌴 TRAVELISM CUSTOM ITINERARY: ${blob.destinationName.toUpperCase()}
Duration: ${blob.durationDays} Days (${Math.max(1, blob.durationDays - 1)} Nights) · ${blob.travelers} Travelers
From: ${blob.origin || "Origin City"}
Primary Stay: ${primaryHotel?.name || "Self-Supported / Wild Camping"} (${inr(primaryHotel?.pricePerNight || 0)}/night)
Flight: ${blob.flight ? `${blob.flight.airline} (${blob.flight.depart} - ${blob.flight.arrive})` : "Direct route"}
Booked Experiences: ${blob.experiences.map((e) => e.name).join(", ") || "None"}
Estimated Total Package: ${inr(total)} (${inr(Math.round(total / (blob.travelers || 1)))}/person)

Generated with Travelism 2.0`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pb-36 bg-paper min-h-screen">
      {/* Mobile Destination Top Banner */}
      <div className="border-b border-line bg-card px-4 py-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="stamp !text-[9px] !bg-brand/10 !text-brand !border-brand/40 font-bold">
                Verified Package
              </span>
              {moodTags.map((m) => (
                <span key={m} className="chip capitalize !text-[10px] !px-2 !py-0.5 !bg-paper-2 font-semibold">
                  {m}
                </span>
              ))}
            </div>
            <h1 className="display text-2xl font-bold text-ink">{blob.destinationName}</h1>
            <p className="text-xs text-ink-soft mt-0.5">
              {blob.durationDays} Days · {blob.travelers} Traveler{blob.travelers > 1 ? "s" : ""} · {blob.origin || "Origin"} · {blob.preferences.pace} Pace
            </p>
          </div>

          <div className="text-right">
            <div className="display text-2xl font-extrabold text-ink">{inr(total)}</div>
            <div className="text-[11px] font-semibold text-brand">
              {inr(Math.round(total / (blob.travelers || 1)))} / person
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-line/60">
          <button
            onClick={handleCopySummary}
            className="flex-1 rounded-xl border border-line bg-paper-2 py-1.5 text-xs font-semibold text-ink-soft active:bg-paper-3 transition"
          >
            {copied ? "✓ Copied!" : "📋 Copy Summary"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-line bg-paper-2 px-3.5 py-1.5 text-xs font-semibold text-ink-soft active:bg-paper-3 transition"
          >
            🖨️ Print / PDF
          </button>
          <button
            onClick={() => setShowCostSheet(true)}
            className="rounded-xl border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand active:scale-95 transition"
          >
            💳 Itemized Cost
          </button>
        </div>
      </div>

      {/* Conflict Banners */}
      {blob.conflicts.length > 0 && (
        <div className="px-4 pt-3 space-y-2">
          {blob.conflicts.map((c) => (
            <ConflictBanner key={c.id} conflict={c} />
          ))}
        </div>
      )}

      {/* Segmented Navigation Tabs (All 9 Tabs from PC) */}
      <div className="sticky top-[49px] z-30 border-b border-line bg-paper/95 px-3 py-2 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-xs",
                tab === t.id
                  ? "bg-brand text-white"
                  : "border border-line bg-card text-ink-soft hover:text-ink"
              )}
            >
              <span>{t.icon}</span> <span className="ml-1">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT CONTAINER */}
      <div className="px-4 py-4 space-y-5">
        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-5">
            {/* The Journey Flow Ribbon (Matches PC) */}
            <div className="card p-3.5 shadow-xs border-line">
              <div className="label-eyebrow text-[10px] mb-2">The Journey Flow</div>
              <JourneyRibbon />
            </div>

            {/* Primary Stay Card */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ink">Selected Lodging</span>
                <div className="flex items-center gap-1.5">
                  {!isNoHotel && (
                    <button
                      onClick={() => setStayMode("none")}
                      className="rounded-full border border-line bg-paper-2 px-2.5 py-0.5 text-[10px] font-semibold text-ink-soft"
                    >
                      🚫 0 Hotels
                    </button>
                  )}
                  {primaryHotel?.category !== "wild_camping" && (
                    <button
                      onClick={() => setStayMode("wild_camping")}
                      className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      ⛺ Wild Camping (₹0)
                    </button>
                  )}
                </div>
              </div>

              {isNoHotel ? (
                <div className="rounded-2xl border border-line bg-card p-4 shadow-sm flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                      <span>🚫</span> <span>Zero Commercial Hotels Added</span>
                    </div>
                    <p className="text-[11px] text-ink-soft mt-0.5">Lodging costs reduced to ₹0.</p>
                  </div>
                  <button
                    onClick={() => setStayMode("hotels")}
                    className="rounded-xl bg-brand/10 border border-brand/30 px-3 py-1 text-xs font-bold text-brand"
                  >
                    + Add Hotel
                  </button>
                </div>
              ) : primaryHotel ? (
                <HotelCard hotel={primaryHotel} selected />
              ) : null}
            </div>

            {/* Flight Card */}
            {blob.flight && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink">Recommended Flight Connection</span>
                  <button onClick={() => setTab("flights")} className="text-[11px] font-bold text-brand">
                    Change →
                  </button>
                </div>
                <div className="space-y-3">
                  <FlightCard flight={blob.flight} kind="out" />
                  {blob.returnFlight && <FlightCard flight={blob.returnFlight} kind="return" />}
                </div>
              </div>
            )}

            {/* Booked Experiences */}
            {blob.experiences.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink">Booked Activities ({blob.experiences.length})</span>
                  <button onClick={() => setTab("todo")} className="text-[11px] font-bold text-brand">
                    Browse all →
                  </button>
                </div>
                <div className="grid gap-2.5">
                  {blob.experiences.map((exp) => (
                    <ExperienceCard key={exp.id} exp={exp} />
                  ))}
                </div>
              </div>
            )}

            {/* Transfers preview */}
            {dataset.transport.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink">Ground Logistics & Transfers</span>
                  <button onClick={() => setTab("transport")} className="text-[11px] font-bold text-brand">
                    View all →
                  </button>
                </div>
                <div className="grid gap-2.5">
                  {dataset.transport.slice(0, 2).map((tr) => (
                    <TransportCard key={tr.id} t={tr} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ITINERARY */}
        {tab === "itinerary" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="display text-base font-bold text-ink">Day-by-Day Schedule</h3>
                <p className="text-[11px] text-ink-soft">Calculated with travel times and optimal pacing.</p>
              </div>
            </div>
            <ItineraryView days={blob.itinerary} />
          </div>
        )}

        {/* TAB 3: MAP */}
        {tab === "map" && (
          <div className="space-y-3">
            <div>
              <h3 className="display text-base font-bold text-ink">Interactive Route Map</h3>
              <p className="text-[11px] text-ink-soft">Pins for all verified sights, stops, and accommodations.</p>
            </div>
            <div className="rounded-2xl overflow-hidden border border-line shadow-card">
              <InteractiveMapView
                destinationName={blob.destinationName}
                places={dataset.places}
                hotels={dataset.hotels}
              />
            </div>
          </div>
        )}

        {/* TAB 4: STAYS & RESORTS */}
        {tab === "stays" && (
          <div className="space-y-4">
            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: "all", label: "All Stays" },
                { id: "wild_camping", label: "⛺ Wild Camping (₹0)" },
                { id: "luxury", label: "👑 Luxury & Taj" },
                { id: "boutique", label: "✨ Boutique" },
                { id: "budget", label: "🏷️ Budget" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setHotelTierFilter(filter.id)}
                  className={cx(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition shadow-xs",
                    hotelTierFilter === filter.id
                      ? "bg-brand text-white"
                      : "border border-line bg-paper-2 text-ink-soft"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3.5">
              {filteredHotels.map((h) => (
                <HotelCard
                  key={h.id}
                  hotel={h}
                  selected={blob.hotels.some((bh) => bh.id === h.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FLIGHTS */}
        {tab === "flights" && (
          <div className="space-y-5">
            <div>
              <h3 className="display text-base font-bold text-ink">Outbound Flights</h3>
              <p className="text-[11px] text-ink-soft">From {blob.origin || "Origin"} to {dataset.meta.gateway}</p>
              <div className="grid gap-3 mt-2.5">
                {blob.flight ? (
                  <FlightCard flight={blob.flight} kind="out" />
                ) : (
                  <div className="rounded-2xl border border-line bg-card p-4 text-xs text-ink-soft">
                    No outbound flight selected.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="display text-base font-bold text-ink">Return Flights</h3>
              <p className="text-[11px] text-ink-soft">From {dataset.meta.gateway} back to {blob.origin || "Origin"}</p>
              <div className="grid gap-3 mt-2.5">
                {blob.returnFlight ? (
                  <FlightCard flight={blob.returnFlight} kind="return" />
                ) : (
                  <div className="rounded-2xl border border-line bg-card p-4 text-xs text-ink-soft">
                    Direct ground transit or open-jaw connection.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ACTIVITIES & EXPERIENCES */}
        {tab === "todo" && (
          <div className="space-y-4">
            <div>
              <h3 className="display text-base font-bold text-ink">Bookable Experiences & Day Tours</h3>
              <p className="text-[11px] text-ink-soft">Tap to add guided hikes, cultural walks, or wildlife excursions.</p>
            </div>
            <div className="grid gap-3">
              {dataset.experiences.map((exp) => (
                <ExperienceCard key={exp.id} exp={exp} />
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: DINING & LOCAL FOOD */}
        {tab === "food" && (
          <div className="space-y-4">
            <div>
              <h3 className="display text-base font-bold text-ink">Local Cuisine & Foodie Hotspots</h3>
              <p className="text-[11px] text-ink-soft">Vetted by our Foodie and Review Detective agents.</p>
            </div>
            <div className="grid gap-3">
              {dataset.food.map((f) => (
                <FoodCard key={f.id} food={f} />
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: TRANSFERS & GROUND LOGISTICS */}
        {tab === "transport" && (
          <div className="space-y-4">
            <div>
              <h3 className="display text-base font-bold text-ink">Ground Logistics & Vehicle Transfers</h3>
              <p className="text-[11px] text-ink-soft">Mountain taxis, private SUVs, and trail logistics.</p>
            </div>
            <div className="grid gap-3">
              {dataset.transport.map((tr) => (
                <TransportCard key={tr.id} t={tr} />
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: PERMITS & DOCUMENTS */}
        {tab === "permits" && (
          <div className="space-y-4">
            <div>
              <h3 className="display text-base font-bold text-ink">Entry Permits & Documentation</h3>
              <p className="text-[11px] text-ink-soft">Auto-included in checkout package.</p>
            </div>
            <div className="grid gap-3">
              {dataset.permits.map((p) => (
                <PermitCard key={p.id} permit={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Itemized Cost Breakdown Bottom Sheet (Matches PC CostPanel) */}
      <AnimatePresence>
        {showCostSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCostSheet(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-line bg-paper p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="display text-lg font-bold text-ink">Itemized Cost Breakdown</h3>
                  <p className="text-xs text-ink-soft">Live calculation with taxes and fee schedule.</p>
                </div>
                <button
                  onClick={() => setShowCostSheet(false)}
                  className="rounded-full bg-paper-2 p-1.5 text-xs text-ink font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Full Desktop CostPanel Component */}
              <CostPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Booking Dock (Mobile Native) */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-paper/95 p-3.5 backdrop-blur-xl shadow-lift">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <div className="display text-lg font-bold text-ink leading-tight">{inr(total)}</div>
            <div className="text-[10px] text-ink-soft">
              {payableNow > 0 ? (
                <span>Payable now: <span className="font-bold text-brand">{inr(payableNow)}</span></span>
              ) : (
                <span>Deposit required: <span className="font-bold text-brand">{inr(Math.round(total * 0.25))}</span></span>
              )}
            </div>
          </div>

          <button
            onClick={() => setStage("checkout")}
            className="btn-primary !px-6 !py-2.5 text-xs font-extrabold shadow-md"
          >
            <span>Proceed to Checkout</span>
            <span className="ml-1">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
