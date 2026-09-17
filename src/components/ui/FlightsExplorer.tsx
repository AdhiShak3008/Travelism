"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FlightOption } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { inr, cx } from "@/lib/format";

// ============================================================================
// FlightsExplorer — a Google-Flights-style compact list of flight rows:
// airline, times, duration, stops, and fare on one line, expandable for
// details. Selecting adds the flight to the trip (in-app); "Book" hands off to
// Google Flights / the airline (the same handoff Google's metasearch uses).
// ============================================================================

function airlineGlyph(airline: string): string {
  const a = airline.toLowerCase();
  if (a.includes("indigo")) return "🟦";
  if (a.includes("air india") || a.includes("vistara")) return "🔴";
  if (a.includes("emirates")) return "🟥";
  if (a.includes("qatar")) return "🟣";
  if (a.includes("lufthansa")) return "🟡";
  if (a.includes("singapore")) return "🟨";
  return "✈️";
}

function FlightRow({ flight, kind }: { flight: FlightOption; kind: "out" | "return" }) {
  const chooseFlight = useTrip((s) => s.chooseFlight);
  const selectedId = useTrip((s) => (kind === "out" ? s.blob.flight?.id : s.blob.returnFlight?.id));
  const [open, setOpen] = useState(false);
  const isSelected = selectedId === flight.id;

  const stopsLabel =
    flight.stops === 0 || /nonstop|direct/i.test(flight.stopDetail || "")
      ? "Nonstop"
      : `${flight.stops ?? 1} stop${(flight.stops ?? 1) > 1 ? "s" : ""}`;
  const fareBand = flight.fareLow && flight.fareHigh ? `${inr(flight.fareLow)}–${inr(flight.fareHigh)}` : inr(flight.fare);
  const bookUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${flight.from} to ${flight.to}`)}`;

  return (
    <div
      className={cx(
        "rounded-2xl border transition-all",
        isSelected ? "border-emerald-500 bg-emerald-500/[0.04] ring-1 ring-emerald-500/30" : "border-line bg-card hover:border-brand/40"
      )}
    >
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3.5 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper-2 text-lg">
          {airlineGlyph(flight.airline)}
        </span>

        {/* Times + route */}
        <div className="min-w-0 flex-[1.4]">
          <div className="flex items-baseline gap-1.5 text-sm font-bold text-ink">
            <span>{flight.depart}</span>
            <span className="text-ink-faint">–</span>
            <span>{flight.arrive}</span>
          </div>
          <div className="truncate text-[11px] text-ink-soft">{flight.airline}</div>
        </div>

        {/* Duration */}
        <div className="hidden sm:block flex-1 text-center">
          <div className="text-xs font-semibold text-ink">{flight.duration || "—"}</div>
          <div className="text-[11px] text-ink-faint">{flight.from} → {flight.to}</div>
        </div>

        {/* Stops */}
        <div className="flex-1 text-center">
          <div className={cx("text-xs font-semibold", stopsLabel === "Nonstop" ? "text-emerald-600 dark:text-emerald-400" : "text-ink")}>
            {stopsLabel}
          </div>
          {flight.stopDetail && stopsLabel !== "Nonstop" && (
            <div className="truncate text-[11px] text-ink-faint">{flight.stopDetail}</div>
          )}
        </div>

        {/* Fare */}
        <div className="shrink-0 text-right">
          <div className="text-sm font-extrabold text-ink">{fareBand}</div>
          <div className="text-[10px] text-ink-faint">{flight.estimated ? "est." : "round trip"}</div>
        </div>

        <span className="ml-1 shrink-0 text-xs text-ink-faint">{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-line/70"
          >
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2 text-xs text-ink-soft sm:grid-cols-4">
                <div><span className="text-ink-faint">Flight</span><div className="font-semibold text-ink">{flight.flightNo}</div></div>
                <div><span className="text-ink-faint">Cabin</span><div className="font-semibold text-ink">{flight.cabin || "Economy"}</div></div>
                <div><span className="text-ink-faint">Baggage</span><div className="font-semibold text-ink">{flight.baggage}</div></div>
                <div>
                  <span className="text-ink-faint">Fare</span>
                  <div className={cx("font-semibold", flight.refundable ? "text-emerald-600 dark:text-emerald-400" : "text-ink")}>
                    {flight.refundable ? "Refundable" : "Non-refundable"}
                  </div>
                </div>
                {typeof flight.onTime === "number" && (
                  <div><span className="text-ink-faint">On-time</span><div className="font-semibold text-ink">{flight.onTime}%</div></div>
                )}
                {flight.aircraft && (
                  <div><span className="text-ink-faint">Aircraft</span><div className="font-semibold text-ink">{flight.aircraft}</div></div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
                {isSelected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white">
                    ✓ Selected {kind === "out" ? "outbound" : "return"}
                  </span>
                ) : (
                  <button
                    onClick={() => chooseFlight(flight, kind)}
                    className="btn-primary !py-1.5 !px-4 text-xs font-bold"
                  >
                    Select this flight
                  </button>
                )}
                <a
                  href={bookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-line bg-paper-2 px-4 py-1.5 text-xs font-bold text-ink hover:border-brand/50 hover:bg-brand/5 transition"
                  title="Check live fares & book on Google Flights"
                >
                  Book ↗
                </a>
                {flight.estimated && (
                  <span className="text-[11px] text-terra">Live estimate — confirm exact fare on the airline site.</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FlightsExplorer({
  outbound,
  returnFlights,
}: {
  outbound: FlightOption[];
  returnFlights: FlightOption[];
}) {
  return (
    <div className="space-y-6">
      {outbound.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-bold text-ink">Outbound</span>
            <span className="text-xs text-ink-faint">({outbound.length} options)</span>
          </div>
          <div className="space-y-2">
            {outbound.map((f) => (
              <FlightRow key={f.id} flight={f} kind="out" />
            ))}
          </div>
        </div>
      )}

      {returnFlights.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-bold text-ink">Return</span>
            <span className="text-xs text-ink-faint">({returnFlights.length} options)</span>
          </div>
          <div className="space-y-2">
            {returnFlights.map((f) => (
              <FlightRow key={f.id} flight={f} kind="return" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
