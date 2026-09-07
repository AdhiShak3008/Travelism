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
    <div className="mt-3 flex items-center gap-3">
      <div className="text-center">
        <div className="display text-xl font-semibold text-ink">{flight.depart}</div>
        <div className="text-[11px] text-ink-faint">{flight.from}</div>
      </div>
      <div className="flex-1">
        <div className="mb-1 text-center text-[11px] text-ink-faint">{flight.duration ?? ""}</div>
        <div className="relative h-px bg-line-strong">
          <span className="absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full bg-brand" />
          {flight.stops && flight.stops > 0 && (
            <span className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-warn" />
          )}
          <span className="absolute -top-[3px] right-0 h-1.5 w-1.5 rounded-full bg-brand" />
          <span className="absolute -top-2 right-0 text-xs text-ink-faint">✈</span>
        </div>
        <div className="mt-1 text-center text-[11px] text-ink-faint">
          {flight.stops === 0 ? "Nonstop" : flight.stopDetail ?? flight.layover ?? `${flight.stops} stop`}
        </div>
      </div>
      <div className="text-center">
        <div className="display text-xl font-semibold text-ink">{flight.arrive}</div>
        <div className="text-[11px] text-ink-faint">{flight.to}</div>
      </div>
    </div>
  );
}

export function FlightCard({ flight, kind }: { flight: FlightOption; kind: "out" | "return" }) {
  const dataset = useTrip((s) => s.dataset);
  const chooseFlight = useTrip((s) => s.chooseFlight);
  const toggleLock = useTrip((s) => s.toggleLock);
  const locked = useTrip((s) => s.blob.lockedComponentIds.includes(flight.id));
  const [alts, setAlts] = useState(false);
  // options going the same direction
  const gw = dataset?.meta.gateway.split(/[(,]/)[0].trim().toLowerCase() ?? "";
  const sameDir = (f: FlightOption) => (kind === "out" ? f.to.toLowerCase().includes(gw) || f.id.includes("out") : !(f.to.toLowerCase().includes(gw) || f.id.includes("out")));
  const options = dataset?.flights.filter((f) => f.id !== flight.id && sameDir(f)) ?? [];

  const fareBand = flight.fareLow && flight.fareHigh ? `${inr(flight.fareLow)}–${inr(flight.fareHigh)}` : inr(flight.fare);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg">✈️</span>
            <span className="font-semibold text-ink">{flight.airline}</span>
            <span className="chip !text-[10px] !py-0.5">{kind === "out" ? "Outbound" : "Return"}</span>
            {flight.cabin && <span className="text-xs text-ink-faint">{flight.cabin}</span>}
            {flight.estimated && <span className="stamp">Estimated</span>}
            {flight.earlyMorning && <span className="stamp !border-warn/60 !text-warn">Early start</span>}
          </div>

          <FlightRoute flight={flight} />

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
            <span>🧳 {flight.baggage}</span>
            {typeof flight.onTime === "number" && <span>⏱ {flight.onTime}% on-time</span>}
            <span>{flight.refundable ? "↩ Refundable" : "Non-refundable"}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="display text-lg font-semibold text-ink">{fareBand}</div>
          <div className="text-[11px] text-ink-faint">est. per person</div>
        </div>
      </div>

      {flight.estimated && (
        <div className="mt-3 rounded-lg border border-terra/25 bg-terra/[0.06] px-3 py-1.5 text-[11px] text-terra">
          Fare band estimated for this sector. Connect a live flights source for exact schedules and prices.
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <SourceChips sourceIds={[flight.sourceId]} />
        <div className="flex items-center gap-2">
          <button onClick={() => toggleLock(flight.id)} className={cx("btn-ghost !py-1.5 !text-xs", locked && "!border-terra/50 !text-terra")}>
            {locked ? "🔒 Kept" : "Keep"}
          </button>
          {options.length > 0 && (
            <button onClick={() => setAlts((a) => !a)} className="btn-ghost !py-1.5 !text-xs">
              {alts ? "Hide" : `${options.length} other times`}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {alts && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-2 overflow-hidden">
            {options.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-line bg-paper-2 p-3 text-sm">
                <div>
                  <span className="font-medium text-ink">{f.airline}</span>
                  <span className="ml-2 text-xs text-ink-faint">{f.depart}→{f.arrive} · {f.duration} · {inr(f.fare)}</span>
                </div>
                <button onClick={() => chooseFlight(f, kind)} className="btn-ghost !py-1 !text-xs">Pick</button>
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
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[120px_1fr]">
        <div className="relative bg-paper-2">
          {t.images[0]?.url ? (
            <Image src={t.images[0].url} alt={t.vehicle} fill sizes="120px" className="object-cover" unoptimized />
          ) : (
            <div className="grid h-full place-items-center text-2xl">🚙</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-ink">{t.vehicle}</div>
              <div className="text-xs text-ink-faint">{t.operator}</div>
              <div className="mt-1 text-sm text-ink-soft">{t.fromPlace} → {t.toPlace}</div>
            </div>
            <div className="text-right">
              <div className="display text-lg font-semibold text-ink">{inr(t.price)}</div>
              <StarRating value={t.rating} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
            <span>🕒 {t.travelTime}</span>
            {t.scenic && <span className="stamp !border-brand/40 !text-brand !bg-brand/10">Scenic</span>}
          </div>
          <div className="mt-2"><SourceChips sourceIds={t.sourceIds} /></div>
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
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-ink">🪪 {permit.name}</div>
          <div className="mt-1 text-sm text-ink-soft">{permit.requirement}</div>
        </div>
        <span className={cx("chip !text-[11px] uppercase", tone[permit.status])}>{permit.status.replace("_", " ")}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm text-ink-soft">
        <div>How: {permit.process}</div>
        <div>Handled by: {permit.responsible}</div>
        <div>Est. cost: {permit.estimatedCost > 0 ? inr(permit.estimatedCost) : "Free"}</div>
      </div>
      <div className="mt-3"><SourceChips sourceIds={permit.sourceIds} /></div>
    </div>
  );
}

export function FoodCard({ food }: { food: FoodPick }) {
  const dataset = useTrip((s) => s.dataset);
  const intel = food.reviewIntelId ? dataset?.reviews[food.reviewIntelId] : undefined;
  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[16/9] bg-paper-2">
        {food.images[0]?.url ? (
          <Image src={food.images[0].url} alt={food.name} fill sizes="360px" className="object-cover" unoptimized />
        ) : (
          <div className="grid h-full place-items-center text-3xl">🍽️</div>
        )}
        <span className="stamp absolute bottom-2 left-2 !bg-white/85 backdrop-blur">{food.priceRange}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-ink">{food.name}</div>
          {intel && <StarRating value={intel.overall} />}
        </div>
        <div className="text-xs text-ink-faint">{food.cuisine} · {food.location}</div>
        <p className="mt-2 text-sm text-ink-soft">{food.whyRecommended}</p>
      </div>
    </div>
  );
}

export function ConflictBanner({ conflict }: { conflict: Conflict }) {
  const a = resolveSource(conflict.claimA.sourceId);
  const b = resolveSource(conflict.claimB.sourceId);
  return (
    <div className="rounded-2xl border border-warn/30 bg-warn/[0.07] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warn">
        ⚠️ Worth double-checking — {conflict.attribute.replace(/_/g, " ")}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-paper-2 p-3">
          <div className="text-[11px] uppercase text-ink-faint">{a?.label}</div>
          <div className="text-sm text-ink">“{conflict.claimA.text}”</div>
        </div>
        <div className="rounded-lg bg-paper-2 p-3">
          <div className="text-[11px] uppercase text-ink-faint">{b?.label}</div>
          <div className="text-sm text-ink">“{conflict.claimB.text}”</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-ink-soft">Our take: {conflict.recommendation}</div>
    </div>
  );
}
