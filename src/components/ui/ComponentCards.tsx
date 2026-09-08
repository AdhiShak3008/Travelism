"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { FlightOption, TransportOption, Permit, FoodPick, Conflict } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { inr, cx } from "@/lib/format";
import { SourceChips } from "./Provenance";
import { resolveSource } from "@/lib/research/sourceRegistry";
import { StarRating } from "./Primitives";

function FlightRoute({ flight }: { flight: FlightOption }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="text-center min-w-[60px]">
        <div className="display text-xl font-bold text-ink">{flight.depart}</div>
        <div className="text-[11px] font-medium text-ink-faint">{flight.from}</div>
      </div>
      <div className="flex-1 px-2">
        <div className="mb-1 text-center text-[11px] font-semibold text-ink-soft">
          {flight.duration ?? "Direct"}
        </div>
        <div className="relative h-0.5 bg-line-strong rounded-full">
          <span className="absolute -top-[3px] left-0 h-2 w-2 rounded-full bg-brand" />
          {flight.stops && flight.stops > 0 ? (
            <span className="absolute -top-[3px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-warn" />
          ) : null}
          <span className="absolute -top-[3px] right-0 h-2 w-2 rounded-full bg-brand" />
          <span className="absolute -top-3 right-1 text-xs text-brand">✈</span>
        </div>
        <div className="mt-1 text-center text-[11px] text-ink-faint">
          {flight.stops === 0 ? "Nonstop" : flight.stopDetail ?? flight.layover ?? `${flight.stops} stop`}
        </div>
      </div>
      <div className="text-center min-w-[60px]">
        <div className="display text-xl font-bold text-ink">{flight.arrive}</div>
        <div className="text-[11px] font-medium text-ink-faint">{flight.to}</div>
      </div>
    </div>
  );
}

export function FlightCard({ flight, kind }: { flight: FlightOption; kind: "out" | "return" }) {
  const dataset = useTrip((s) => s.dataset);
  const chooseFlight = useTrip((s) => s.chooseFlight);
  const toggleLock = useTrip((s) => s.toggleLock);
  const flightNote = useTrip((s) => s.blob.flightNote);
  const locked = useTrip((s) => s.blob.lockedComponentIds.includes(flight.id));
  const [alts, setAlts] = useState(false);

  const gw = dataset?.meta.gateway.split(/[(,]/)[0].trim().toLowerCase() ?? "";
  const sameDir = (f: FlightOption) =>
    kind === "out"
      ? f.to.toLowerCase().includes(gw) || f.id.includes("out")
      : !(f.to.toLowerCase().includes(gw) || f.id.includes("out"));
  const options = dataset?.flights.filter((f) => f.id !== flight.id && sameDir(f)) ?? [];

  const fareBand = flight.fareLow && flight.fareHigh ? `${inr(flight.fareLow)}–${inr(flight.fareHigh)}` : inr(flight.fare);
  const flightSearchUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${flight.from} to ${flight.to}`)}`;

  return (
    <div className="card p-5 transition-all duration-300 hover:shadow-lift">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl">✈️</span>
            <a
              href={flightSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink hover:text-brand hover:underline inline-flex items-center gap-1"
              title="Search flight on Google Flights (Right click for new tab)"
            >
              <span>{flight.airline}</span>
              <span className="text-[10px] text-brand/70 font-normal">↗</span>
            </a>
            <span className="chip !text-[10px] !py-0.5 !px-2 font-semibold !bg-brand/10 !text-brand border-brand/20">
              {kind === "out" ? "Outbound Flight" : "Return Flight"}
            </span>
            {flight.cabin && <span className="text-xs text-ink-faint font-medium">({flight.cabin})</span>}
            {flight.estimated && <span className="stamp">Live Estimate</span>}
            {flight.earlyMorning && <span className="stamp !border-warn/60 !text-warn">Early start</span>}
          </div>

          <FlightRoute flight={flight} />

          <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
            <span>🧳 {flight.baggage}</span>
            {typeof flight.onTime === "number" && <span>⏱ {flight.onTime}% on-time</span>}
            <span className={flight.refundable ? "text-good font-medium" : "text-ink-faint"}>
              {flight.refundable ? "↩ Refundable fare" : "Non-refundable"}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="display text-2xl font-bold text-ink">{fareBand}</div>
          <div className="text-[11px] text-ink-faint">est. per traveler</div>
        </div>
      </div>

      {flight.estimated && (
        <div className="mt-3 rounded-xl border border-terra/20 bg-terra/[0.05] p-2.5 text-xs text-terra">
          {flightNote ?? "Real-time airline routes analyzed for your selected dates & airport."}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
        <div className="flex items-center gap-2">
          <SourceChips sourceIds={[flight.sourceId]} />
          <a
            href={flightSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link !text-xs font-semibold"
          >
            Check Live Google Flights ↗
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleLock(flight.id)}
            className={cx(
              "btn-ghost !py-1.5 !px-3 !text-xs font-semibold",
              locked && "!border-amber-500/50 !text-amber-600 dark:!text-amber-400 !bg-amber-500/10"
            )}
            title={locked ? "Flight route is locked" : "Lock this flight route"}
          >
            {locked ? "🔒 Locked" : "🔓 Lock"}
          </button>
          {options.length > 0 && (
            <button
              onClick={() => setAlts((a) => !a)}
              className="btn-ghost !py-1.5 !px-3 !text-xs font-medium"
            >
              {alts ? "Hide Alternatives" : `${options.length} other times`}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {alts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            {options.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-line bg-paper-2 p-3 text-sm"
              >
                <div>
                  <span className="font-semibold text-ink">{f.airline}</span>
                  <span className="ml-2 text-xs text-ink-soft">
                    {f.depart} → {f.arrive} · {f.duration} · {inr(f.fare)}
                  </span>
                </div>
                <button
                  onClick={() => chooseFlight(f, kind)}
                  className="btn-primary !py-1 !px-3 !text-xs font-semibold"
                >
                  Select This Flight
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TransportCard({ t }: { t: TransportOption }) {
  return (
    <div className="card overflow-hidden transition-all duration-300 hover:shadow-lift">
      <div className="grid grid-cols-[140px_1fr]">
        <div className="relative bg-paper-2">
          {t.images[0]?.url ? (
            <Image src={t.images[0].url} alt={t.vehicle} fill sizes="140px" className="object-cover" unoptimized />
          ) : (
            <div className="grid h-full place-items-center text-3xl">🚙</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-ink">{t.vehicle}</div>
              <div className="text-xs text-ink-faint">{t.operator}</div>
              <div className="mt-1 text-sm text-ink-soft">
                {t.fromPlace} → {t.toPlace}
              </div>
            </div>
            <div className="text-right">
              <div className="display text-lg font-bold text-ink">{inr(t.price)}</div>
              <StarRating value={t.rating} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
            <span>🕒 {t.travelTime}</span>
            {t.scenic && <span className="stamp !border-brand/40 !text-brand !bg-brand/10">Scenic Route</span>}
          </div>
          <div className="mt-3">
            <SourceChips sourceIds={t.sourceIds} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PermitCard({ permit }: { permit: Permit }) {
  const tone: Record<Permit["status"], string> = {
    required: "text-warn",
    arranged: "text-good",
    pending: "text-warn",
    not_required: "text-ink-faint",
  };

  const portalSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${permit.name} official government entry portal`)}`;

  return (
    <div className="card p-5 transition-all duration-300 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🪪</span>
            <a
              href={portalSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink hover:text-brand hover:underline inline-flex items-center gap-1"
              title="Search official permit guidelines (Right click for new tab)"
            >
              <span>{permit.name}</span>
              <span className="text-[10px] text-brand/70 font-normal">↗</span>
            </a>
          </div>
          <div className="mt-1.5 text-sm text-ink-soft leading-relaxed">{permit.requirement}</div>
        </div>
        <span className={cx("chip !text-[11px] font-bold uppercase", tone[permit.status])}>
          {permit.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-4 space-y-1.5 rounded-xl border border-line bg-paper-2 p-3 text-xs text-ink-soft">
        <div><strong>Process:</strong> {permit.process}</div>
        <div><strong>Responsible:</strong> {permit.responsible}</div>
        <div><strong>Cost:</strong> {permit.estimatedCost > 0 ? inr(permit.estimatedCost) : "Free / Included"}</div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <SourceChips sourceIds={permit.sourceIds} />
        <a
          href={portalSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="external-link !text-xs font-semibold"
        >
          Official Visa Portal ↗
        </a>
      </div>
    </div>
  );
}

export function FoodCard({ food }: { food: FoodPick }) {
  const dataset = useTrip((s) => s.dataset);
  const intel = food.reviewIntelId ? dataset?.reviews[food.reviewIntelId] : undefined;
  const destinationName = dataset?.meta.name || "";
  const foodSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${food.name} restaurant ${food.location} ${destinationName}`)}`;

  return (
    <div className="card overflow-hidden transition-all duration-300 hover:shadow-lift flex flex-col justify-between">
      <div>
        <div className="relative aspect-[16/9] bg-paper-2 overflow-hidden">
          {food.images[0]?.url ? (
            <Image
              src={food.images[0].url}
              alt={food.name}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className="object-cover transition-transform duration-500 hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="grid h-full place-items-center text-3xl">🍽️</div>
          )}
          <span className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-black/65 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md absolute bottom-2 left-2 shadow-sm">
            {food.priceRange}
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <a
              href={foodSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink hover:text-brand hover:underline inline-flex items-center gap-1"
              title="Search restaurant on Google Maps (Right click for new tab)"
            >
              <span>{food.name}</span>
              <span className="text-[10px] text-brand/70 font-normal">↗</span>
            </a>
            {intel && <StarRating value={intel.overall} />}
          </div>
          <div className="text-xs text-ink-faint mt-0.5">
            {food.cuisine} · {food.location}
          </div>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed line-clamp-3">
            {food.whyRecommended}
          </p>
        </div>
      </div>

      <div className="p-4 pt-0 border-t border-line/50 mt-2">
        <div className="mt-3 flex items-center justify-between">
          <span className="chip !text-[11px] !py-0.5">Local Favorite</span>
          <a
            href={foodSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link !text-xs font-semibold"
          >
            Google Maps ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export function ConflictBanner({ conflict }: { conflict: Conflict }) {
  const a = resolveSource(conflict.claimA.sourceId);
  const b = resolveSource(conflict.claimB.sourceId);
  return (
    <div className="rounded-2xl border border-warn/30 bg-warn/[0.07] p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warn">
        <span>⚠️</span> Worth double-checking — {conflict.attribute.replace(/_/g, " ")}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-line/60 bg-paper-2 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{a?.label}</div>
          <div className="text-sm text-ink mt-0.5">“{conflict.claimA.text}”</div>
        </div>
        <div className="rounded-xl border border-line/60 bg-paper-2 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{b?.label}</div>
          <div className="text-sm text-ink mt-0.5">“{conflict.claimB.text}”</div>
        </div>
      </div>
      <div className="mt-2.5 text-xs font-medium text-ink-soft">
        <strong>Our take:</strong> {conflict.recommendation}
      </div>
    </div>
  );
}
