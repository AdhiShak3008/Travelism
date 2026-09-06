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
import { SteeringBox } from "./SteeringBox";

// ---------------------------------------------------------------------------
export function FlightCard({ flight, kind }: { flight: FlightOption; kind: "out" | "return" }) {
  const dataset = useTrip((s) => s.dataset);
  const chooseFlight = useTrip((s) => s.chooseFlight);
  const toggleLock = useTrip((s) => s.toggleLock);
  const locked = useTrip((s) => s.blob.lockedComponentIds.includes(flight.id));
  const [alts, setAlts] = useState(false);
  const options = dataset?.flights.filter((f) => f.from === flight.from && f.id !== flight.id) ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✈️</span>
            <span className="font-semibold text-paper-50">{flight.airline}</span>
            <span className="text-xs text-paper-200/50">{flight.flightNo}</span>
            {flight.earlyMorning && <span className="chip !border-signal-warn/25 !text-signal-warn !text-[10px]">early</span>}
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <div className="text-center">
              <div className="font-display text-lg font-semibold text-paper-50">{flight.depart}</div>
              <div className="text-xs text-paper-200/50">{flight.from}</div>
            </div>
            <div className="flex-1 text-center text-xs text-paper-200/40">
              ─── {flight.layover} ───
            </div>
            <div className="text-center">
              <div className="font-display text-lg font-semibold text-paper-50">{flight.arrive}</div>
              <div className="text-xs text-paper-200/50">{flight.to}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-paper-200/50">🧳 {flight.baggage}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-semibold text-paper-50">{inr(flight.fare)}</div>
          <div className="text-xs text-paper-200/50">per person</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <SourceChips sourceIds={[flight.sourceId]} />
        <div className="flex items-center gap-2">
          <button onClick={() => toggleLock(flight.id)} className={cx("btn-ghost !py-1.5 !text-xs", locked && "!border-aurora-400/40 !text-aurora-300")}>
            {locked ? "🔒" : "Lock"}
          </button>
          <button onClick={() => setAlts((a) => !a)} className="btn-ghost !py-1.5 !text-xs">
            {alts ? "Hide" : `${options.length} alternatives`}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {alts && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-2 overflow-hidden">
            {options.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-ink-850/60 p-3 text-sm">
                <div>
                  <span className="font-medium text-paper-50">{f.airline} {f.flightNo}</span>
                  <span className="ml-2 text-xs text-paper-200/50">{f.depart}→{f.arrive} · {inr(f.fare)}</span>
                </div>
                <button onClick={() => chooseFlight(f, kind)} className="btn-ghost !py-1 !text-xs">Switch</button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function TransportCard({ t }: { t: TransportOption }) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[120px_1fr]">
        <div className="relative">
          <Image src={t.images[0]?.url} alt={t.vehicle} fill sizes="120px" className="object-cover" unoptimized />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-paper-50">🚙 {t.vehicle}</div>
              <div className="text-xs text-paper-200/50">{t.operator}</div>
              <div className="mt-1 text-sm text-paper-200/70">{t.fromPlace} → {t.toPlace}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-semibold text-paper-50">{inr(t.price)}</div>
              <StarRating value={t.rating} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-paper-200/50">
            <span>🕒 {t.travelTime}</span>
            {t.scenic && <span className="chip !text-[11px] !text-alpine-300 !border-alpine-400/25">Scenic</span>}
          </div>
          <div className="mt-2"><SourceChips sourceIds={t.sourceIds} /></div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function PermitCard({ permit }: { permit: Permit }) {
  const tone: Record<Permit["status"], string> = {
    required: "text-signal-warn",
    arranged: "text-signal-good",
    pending: "text-signal-warn",
    not_required: "text-paper-200/50",
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-paper-50">🪪 {permit.name}</div>
          <div className="mt-1 text-sm text-paper-200/60">{permit.requirement}</div>
        </div>
        <span className={cx("chip !text-[11px] uppercase", tone[permit.status])}>{permit.status.replace("_", " ")}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm text-paper-200/70">
        <div>Process: {permit.process}</div>
        <div>Handled by: {permit.responsible}</div>
        <div>Est. cost: {permit.estimatedCost > 0 ? inr(permit.estimatedCost) : "Free"}</div>
      </div>
      <div className="mt-3"><SourceChips sourceIds={permit.sourceIds} /></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function FoodCard({ food }: { food: FoodPick }) {
  const dataset = useTrip((s) => s.dataset);
  const intel = food.reviewIntelId ? dataset?.reviews[food.reviewIntelId] : undefined;
  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[16/9]">
        <Image src={food.images[0]?.url} alt={food.name} fill sizes="360px" className="object-cover" unoptimized />
        <span className="absolute bottom-2 left-2 chip !border-white/15 !bg-black/50 backdrop-blur">{food.priceRange}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-paper-50">🍜 {food.name}</div>
          {intel && <StarRating value={intel.overall} />}
        </div>
        <div className="text-xs text-paper-200/50">{food.cuisine} · {food.location}</div>
        <p className="mt-2 text-sm text-paper-200/70">{food.whyRecommended}</p>
        {intel && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {intel.positives.slice(0, 2).map((p) => (
              <span key={p} className="chip !text-[11px] !text-signal-good !border-signal-good/25">+ {p}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function ConflictBanner({ conflict }: { conflict: Conflict }) {
  const a = resolveSource(conflict.claimA.sourceId);
  const b = resolveSource(conflict.claimB.sourceId);
  return (
    <div className="rounded-2xl border border-signal-warn/25 bg-signal-warn/[0.05] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-signal-warn">
        ⚠️ Conflicting information — {conflict.attribute.replace(/_/g, " ")}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-ink-900/40 p-3">
          <div className="text-[11px] uppercase text-paper-200/40">{a?.label}</div>
          <div className="text-sm text-paper-100">“{conflict.claimA.text}”</div>
        </div>
        <div className="rounded-lg bg-ink-900/40 p-3">
          <div className="text-[11px] uppercase text-paper-200/40">{b?.label}</div>
          <div className="text-sm text-paper-100">“{conflict.claimB.text}”</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-paper-200/70">
        ⚖️ Cross Examiner recommends: {conflict.recommendation}
      </div>
    </div>
  );
}
