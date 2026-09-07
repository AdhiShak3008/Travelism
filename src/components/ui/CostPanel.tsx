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
  const { total, payableNow, duringTrip } = costTotals(costs);

  return (
    <div className={cx("card p-5", compact && "p-4")}>
      {/* receipt header */}
      <div className="flex items-baseline justify-between border-b border-dashed border-line-strong pb-3">
        <div className="label-eyebrow">Your trip · estimate</div>
        <div className="text-xs text-ink-faint">{travelers} travellers</div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <AnimatedNumber value={total} className="display text-4xl font-semibold text-ink" />
        <span className="text-sm text-ink-faint">· {inr(total / travelers)}/person</span>
      </div>

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
        <div className="mt-4 space-y-1.5 border-t border-dashed border-line-strong pt-4">
          {costs.map((c) => {
            const s = c.sourceId ? resolveSource(c.sourceId) : undefined;
            return (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <span className="text-ink">{c.label}</span>
                  {s && <span className="ml-2 text-[11px] text-ink-faint">{s.label} · {timeAgo(c.checkedAt)}</span>}
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className={cx("text-[10px] uppercase", STATUS_TONE[c.status])}>{c.status}</span>
                  <span className="font-semibold tabular-nums text-ink">{inr(c.amount)}</span>
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
