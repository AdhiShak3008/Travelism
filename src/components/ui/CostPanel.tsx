"use client";

import { useTrip } from "@/store/tripStore";
import { costTotals } from "@/lib/engine";
import { inr, cx, timeAgo } from "@/lib/format";
import { AnimatedNumber } from "./Primitives";
import { research } from "@/lib/research/provider";

const STATUS_TONE: Record<string, string> = {
  confirmed: "text-signal-good",
  estimated: "text-signal-warn",
  optional: "text-aurora-300",
  variable: "text-paper-200/50",
};

export function CostPanel({ compact = false }: { compact?: boolean }) {
  const costs = useTrip((s) => s.blob.costs);
  const travelers = useTrip((s) => s.blob.travelers);
  const { total, payableNow, duringTrip } = costTotals(costs);

  return (
    <div className={cx("card p-5", compact && "p-4")}>
      <div className="flex items-baseline justify-between">
        <div className="label-eyebrow">Total trip cost</div>
        <div className="text-xs text-paper-200/40">{travelers} travellers</div>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <AnimatedNumber value={total} className="font-display text-4xl font-semibold text-paper-50" />
        <span className="text-sm text-paper-200/50">· {inr(total / travelers)}/person</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-signal-good/20 bg-signal-good/[0.05] p-3">
          <div className="text-[11px] uppercase text-signal-good/80">Payable now</div>
          <AnimatedNumber value={payableNow} className="font-display text-xl font-semibold text-paper-50" />
        </div>
        <div className="rounded-xl border border-signal-warn/20 bg-signal-warn/[0.05] p-3">
          <div className="text-[11px] uppercase text-signal-warn/80">Est. during trip</div>
          <AnimatedNumber value={duringTrip} className="font-display text-xl font-semibold text-paper-50" />
        </div>
      </div>

      {!compact && (
        <div className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-4">
          {costs.map((c) => {
            const s = c.sourceId ? research.getSource(c.sourceId) : undefined;
            return (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <span className="text-paper-100">{c.label}</span>
                  {s && <span className="ml-2 text-[11px] text-paper-200/35">{s.label} · {timeAgo(c.checkedAt)}</span>}
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className={cx("text-[10px] uppercase", STATUS_TONE[c.status])}>{c.status}</span>
                  <span className="font-semibold tabular-nums text-paper-50">{inr(c.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11px] text-paper-200/40">
        Estimates are not exact. Prices may change; food and misc. are modeled from your pace and party size.
      </p>
    </div>
  );
}
