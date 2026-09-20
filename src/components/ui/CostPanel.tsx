"use client";

import { useTrip } from "@/store/tripStore";
import { costTotals } from "@/lib/engine";
import { inr, cx, timeAgo } from "@/lib/format";
import { AnimatedNumber } from "./Primitives";
import { resolveSource } from "@/lib/research/sourceRegistry";

const STATUS_TONE: Record<string, string> = {
  confirmed: "text-good",
  estimated: "text-warn",
  optional: "text-terra",
  variable: "text-ink-faint",
};

export function CostPanel({ compact = false }: { compact?: boolean }) {
  const costs = useTrip((s) => s.blob.costs);
  const travelers = useTrip((s) => s.blob.travelers);
  const setTravelers = useTrip((s) => s.setTravelers);
  const { total, payableNow, duringTrip } = costTotals(costs);

  return (
    <div className={cx("card p-5", compact && "p-4")}>
      {/* receipt header */}
      <div className="flex items-baseline justify-between border-b border-dashed border-line-strong pb-3">
        <div className="label-eyebrow">Your trip · estimate</div>
        {travelers === 0 ? (
          <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
            0 travellers (unconfirmed)
          </span>
        ) : (
          <div className="text-xs text-ink-faint">
            {travelers} {travelers === 1 ? "traveller" : "travellers"}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <AnimatedNumber value={total} className="display text-4xl font-semibold text-ink" />
        {travelers > 0 ? (
          <span className="text-sm text-ink-faint">· {inr(Math.round(total / travelers))}/person</span>
        ) : (
          <span className="text-xs text-amber-500 font-medium">· Total estimate (select party size)</span>
        )}
      </div>

      {travelers === 0 && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
          <div className="font-semibold flex items-center justify-between">
            <span>⚠️ Party size not set</span>
            <div className="flex items-center gap-1.5 font-bold">
              <button
                onClick={() => setTravelers(1)}
                className="rounded-md bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-ink border border-line shadow-xs hover:border-brand"
              >
                1 Solo
              </button>
              <button
                onClick={() => setTravelers(2)}
                className="rounded-md bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-ink border border-line shadow-xs hover:border-brand"
              >
                2 Couple
              </button>
              <button
                onClick={() => setTravelers(4)}
                className="rounded-md bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-ink border border-line shadow-xs hover:border-brand"
              >
                4 Family
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-good/25 bg-good/[0.06] p-3">
          <div className="text-[11px] uppercase text-good">Pay now</div>
          <AnimatedNumber value={payableNow} className="display text-xl font-semibold text-ink" />
        </div>
        <div className="rounded-xl border border-warn/25 bg-warn/[0.06] p-3">
          <div className="text-[11px] uppercase text-warn">Pay on the trip</div>
          <AnimatedNumber value={duringTrip} className="display text-xl font-semibold text-ink" />
        </div>
      </div>

      {!compact && (
        <div className="mt-4 space-y-2 border-t border-dashed border-line-strong pt-4">
          {costs.map((c) => {
            const s = c.sourceId ? resolveSource(c.sourceId) : undefined;
            return (
              <div key={c.id} className="flex items-start justify-between gap-2 text-xs sm:text-sm">
                <div className="min-w-0 flex-1">
                  <div className="text-ink font-medium leading-snug break-words">{c.label}</div>
                  {s && <div className="text-[10px] text-ink-faint mt-0.5">{s.label} · {timeAgo(c.checkedAt)}</div>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap pt-0.5">
                  <span className={cx("text-[9px] sm:text-[10px] uppercase font-bold", STATUS_TONE[c.status])}>{c.status}</span>
                  <span className="font-semibold tabular-nums text-ink text-xs sm:text-sm">{inr(c.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11px] text-ink-faint">
        Estimates, not final prices. Flights, food and extras can shift a little.
      </p>
    </div>
  );
}
