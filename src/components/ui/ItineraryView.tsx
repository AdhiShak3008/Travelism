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
          <div className="flex items-center gap-3 border-b border-dashed border-line-strong bg-paper-2 px-5 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-paper">{d.day}</span>
            <div>
              <div className="display font-semibold text-ink">{d.title}</div>
              <div className="text-xs text-ink-faint">Based in {d.baseLocation}</div>
            </div>
          </div>
          <div className="p-4">
            <div className="relative space-y-3 pl-6">
              <span className="absolute left-[9px] bottom-1 top-1 w-px bg-line-strong" />
              {d.stops.map((s, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <span
                    className={cx(
                      "absolute -left-6 top-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px]",
                      s.kind === "visit" ? "bg-brand/15 text-brand" : "bg-paper-3 text-ink-soft"
                    )}
                  >
                    {KIND_GLYPH[s.kind]}
                  </span>
                  <div className="w-24 shrink-0 text-xs tabular-nums text-ink-faint">{s.start}–{s.end}</div>
                  <div className="min-w-0 flex-1">
                    <div className={cx("text-sm", s.kind === "visit" ? "font-semibold text-ink" : "text-ink")}>
                      {s.label}
                      {s.travelTime && <span className="ml-2 text-xs text-ink-faint">({s.travelTime})</span>}
                    </div>
                    {s.note && <div className="text-xs text-ink-faint">{s.note}</div>}
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
