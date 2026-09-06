"use client";

import { motion } from "framer-motion";
import type { ItineraryDay, ItineraryStop } from "@/lib/types";
import { cx } from "@/lib/format";

const KIND_GLYPH: Record<ItineraryStop["kind"], string> = {
  travel: "🚙",
  visit: "📍",
  meal: "🍽️",
  rest: "☕",
  hotel: "🛏️",
};

export function ItineraryView({ days }: { days: ItineraryDay[] }) {
  return (
    <div className="space-y-4">
      {days.map((d, di) => (
        <motion.div
          layout
          key={d.day}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: di * 0.05 }}
          className="card overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-alpine-500 text-sm font-bold text-ink-950">
              {d.day}
            </span>
            <div>
              <div className="font-semibold text-paper-50">{d.title}</div>
              <div className="text-xs text-paper-200/50">Base · {d.baseLocation}</div>
            </div>
          </div>
          <div className="p-4">
            <div className="relative space-y-3 pl-6">
              <span className="absolute left-[9px] top-1 bottom-1 w-px bg-white/[0.08]" />
              {d.stops.map((s, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <span className={cx(
                    "absolute -left-6 top-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px]",
                    s.kind === "visit" ? "bg-alpine-500/20 text-alpine-200" : "bg-ink-700 text-paper-200/60"
                  )}>
                    {KIND_GLYPH[s.kind]}
                  </span>
                  <div className="w-24 shrink-0 text-xs tabular-nums text-paper-200/50">
                    {s.start}–{s.end}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cx("text-sm", s.kind === "visit" ? "font-semibold text-paper-50" : "text-paper-100")}>
                      {s.label}
                      {s.travelTime && <span className="ml-2 text-xs text-paper-200/40">({s.travelTime})</span>}
                    </div>
                    {s.note && <div className="text-xs text-paper-200/50">{s.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
