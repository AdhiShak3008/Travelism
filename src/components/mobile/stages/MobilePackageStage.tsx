"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { inr, cx } from "@/lib/format";
import { costTotals } from "@/lib/engine";
import { HotelCard } from "@/components/ui/HotelCard";
import { FlightCard, PermitCard, FoodCard } from "@/components/ui/ComponentCards";
import { ItineraryView } from "@/components/ui/ItineraryView";
import { InteractiveMapView } from "@/components/ui/InteractiveMapView";
import { ExperienceCard } from "@/components/ui/ExperienceCard";

type MobileTab = "overview" | "itinerary" | "map" | "stays" | "flights" | "permits";

const TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "itinerary", label: "Schedule", icon: "🗓️" },
  { id: "map", label: "Map", icon: "🗺️" },
  { id: "stays", label: "Stays", icon: "🏨" },
  { id: "flights", label: "Flights", icon: "✈️" },
  { id: "permits", label: "Permits", icon: "📄" },
];

export function MobilePackageStage() {
  const blob = useTrip((s) => s.blob);
  const dataset = useTrip((s) => s.dataset);
  const setStage = useTrip((s) => s.setStage);
  const setStayMode = useTrip((s) => s.setStayMode);
  const [tab, setTab] = useState<MobileTab>("overview");
  const [copied, setCopied] = useState(false);

  if (!dataset) return null;
  const { total, payableNow, duringTrip } = costTotals(blob.costs);

  const isNoHotel = blob.preferences.stayMode === "none" || (blob.hotels.length === 0 && blob.preferences.stayMode !== "wild_camping");
  const primaryHotel = blob.hotels[0] || (isNoHotel ? null : dataset.hotels[0]);

  const handleCopySummary = () => {
    const summary = `🌴 TRAVELISM CUSTOM ITINERARY: ${blob.destinationName.toUpperCase()}
Duration: ${blob.durationDays} Days (${Math.max(1, blob.durationDays - 1)} Nights) · ${blob.travelers} Travelers
Primary Stay: ${primaryHotel?.name || "Self-Supported / Wild Camping"}
Estimated Total: ${inr(total)} (${inr(Math.round(total / (blob.travelers || 1)))}/person)`;

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
            <div className="label-eyebrow mb-0.5">Custom Package</div>
            <h1 className="display text-2xl font-bold text-ink">{blob.destinationName}</h1>
            <p className="text-xs text-ink-soft mt-0.5">
              {blob.durationDays} Days · {blob.travelers} Traveler{blob.travelers > 1 ? "s" : ""} · {blob.origin || "Origin"}
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
            {copied ? "✓ Copied!" : "📋 Share Summary"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-line bg-paper-2 px-3 py-1.5 text-xs font-semibold text-ink-soft active:bg-paper-3 transition"
          >
            🖨️ PDF
          </button>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
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

      {/* TAB CONTENT */}
      <div className="px-4 py-4 space-y-5">
        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-5">
            {/* Primary Stay Card */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ink">Accommodation</span>
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
                      <span>🚫 No Commercial Lodging (₹0)</span>
                    </div>
                    <p className="text-[11px] text-ink-soft mt-0.5">Self-arranged or day trip</p>
                  </div>
                  <button
                    onClick={() => setStayMode("hotels")}
                    className="btn-primary !text-xs !py-1.5 !px-3 font-bold"
                  >
                    + Add Hotel
                  </button>
                </div>
              ) : primaryHotel ? (
                <HotelCard hotel={primaryHotel} selected={true} />
              ) : null}
            </div>

            {/* Flights Summary */}
            {blob.flight && (
              <div>
                <span className="text-xs font-bold text-ink mb-2 block">Flights</span>
                <div className="grid gap-3">
                  <FlightCard flight={blob.flight} kind="out" />
                  {blob.returnFlight && <FlightCard flight={blob.returnFlight} kind="return" />}
                </div>
              </div>
            )}

            {/* Cost Breakdown Summary Card */}
            <div className="card p-4 shadow-card">
              <div className="text-xs font-bold text-ink mb-3 pb-2 border-b border-line">
                Estimate Breakdown
              </div>
              <div className="space-y-2 text-xs">
                {blob.costs.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-ink-soft truncate max-w-[70%]">{c.label}</span>
                    <span className="font-bold text-ink shrink-0">{inr(c.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-line space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Pay Online Now:</span>
                  <span className="font-bold text-ink">{inr(payableNow)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Pay On Trip:</span>
                  <span className="font-bold text-ink">{inr(duringTrip)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-line font-bold text-sm">
                  <span className="text-ink">Total:</span>
                  <span className="text-brand">{inr(total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ITINERARY */}
        {tab === "itinerary" && (
          <div>
            <h3 className="display text-lg font-bold text-ink mb-1">
              {blob.durationDays}-Day Harmonious Schedule
            </h3>
            <p className="text-xs text-ink-soft mb-4">Click any day to expand or customize pacing</p>
            <ItineraryView days={blob.itinerary} />
          </div>
        )}

        {/* TAB 3: MAP */}
        {tab === "map" && (
          <div className="space-y-3">
            <h3 className="display text-lg font-bold text-ink">Spatial Map Overview</h3>
            <InteractiveMapView
              destinationName={blob.destinationName}
              places={dataset.places}
              hotels={dataset.hotels}
            />
          </div>
        )}

        {/* TAB 4: STAYS */}
        {tab === "stays" && (
          <div className="space-y-4">
            <h3 className="display text-lg font-bold text-ink">All Shortlisted Stays</h3>
            <div className="grid gap-3">
              {dataset.hotels.map((h) => {
                const isSelected = blob.hotels.some((x) => x.id === h.id);
                return <HotelCard key={h.id} hotel={h} selected={isSelected} />;
              })}
            </div>
          </div>
        )}

        {/* TAB 5: FLIGHTS */}
        {tab === "flights" && (
          <div className="space-y-3">
            <h3 className="display text-lg font-bold text-ink">Available Flights</h3>
            {dataset.flights.map((f) => (
              <FlightCard key={f.id} flight={f} kind={f.id.includes("out") ? "out" : "return"} />
            ))}
          </div>
        )}

        {/* TAB 6: PERMITS */}
        {tab === "permits" && (
          <div className="space-y-3">
            <h3 className="display text-lg font-bold text-ink">Visas & Wilderness Permits</h3>
            {dataset.permits.map((p) => (
              <PermitCard key={p.id} permit={p} />
            ))}
          </div>
        )}
      </div>

      {/* Sticky Bottom Booking Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3.5 backdrop-blur-xl shadow-lift flex items-center justify-between gap-3">
        <div>
          <div className="display text-lg font-extrabold text-ink">{inr(total)}</div>
          <div className="text-[10px] text-brand font-semibold">
            {inr(Math.round(total / (blob.travelers || 1)))}/pax all-inclusive
          </div>
        </div>

        <button
          onClick={() => setStage("checkout")}
          className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition"
        >
          Book This Trip →
        </button>
      </div>
    </div>
  );
}
