"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { inr, cx } from "@/lib/format";
import { costTotals } from "@/lib/engine";
import { JourneyRibbon } from "@/components/ui/JourneyRibbon";
import { ItineraryView } from "@/components/ui/ItineraryView";

const STATUS = [
  { label: "Flights", state: "done" },
  { label: "Hotels", state: "done" },
  { label: "Transport", state: "done" },
  { label: "Itinerary", state: "done" },
  { label: "Permits", state: "partial" },
  { label: "Packing", state: "partial" },
] as const;

const LIVE_UPDATES = [
  { who: "Weather", text: "Clear skies expected for most of your trip — pack a light layer for evenings." },
  { who: "Paperwork", text: "Your permit application is in. We'll nudge you if anything needs a signature." },
  { who: "Getting around", text: "Your driver is confirmed for the mountain day." },
  { who: "Packing", text: "Suggested: warm layers, sunscreen, a power bank, and some cash." },
];

export function TripModeStage() {
  const blob = useTrip((s) => s.blob);
  const reset = useTrip((s) => s.reset);
  const { total, payableNow } = costTotals(blob.costs);
  const [celebrate, setCelebrate] = useState(true);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setCelebrate(false), 2600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (visible >= LIVE_UPDATES.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 700);
    return () => clearTimeout(t);
  }, [visible]);

  const daysToGo = 12;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {celebrate && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 rounded-2xl border border-brand/30 bg-brand/[0.07] p-6 text-center shadow-card">
          <div className="text-4xl">🎉</div>
          <h2 className="mt-2 display text-2xl font-semibold text-ink">{blob.destinationName} is booked!</h2>
          <p className="mt-1 text-sm text-ink-soft">Paid {inr(payableNow)} now · {inr(total)} total</p>
        </motion.div>
      )}

      <div className="card overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="stamp mb-2">Your trip · confirmed</div>
              <h1 className="display text-4xl font-semibold tracking-tight text-ink">{blob.destinationName}</h1>
            </div>
            <div className="text-right">
              <div className="display text-3xl font-semibold text-brand">{daysToGo}</div>
              <div className="text-sm text-ink-faint">days to go</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STATUS.map((s) => (
              <div key={s.label} className={cx("rounded-xl border p-3 text-center", s.state === "done" ? "border-good/25 bg-good/[0.06]" : "border-warn/25 bg-warn/[0.06]")}>
                <div className={cx("text-lg", s.state === "done" ? "text-good" : "text-warn")}>{s.state === "done" ? "✓" : "◐"}</div>
                <div className="text-xs text-ink-soft">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-dashed border-line-strong pt-4">
            <div className="label-eyebrow mb-2">The journey</div>
            <JourneyRibbon />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <h3 className="mb-3 display text-xl font-semibold text-ink">Your day by day</h3>
          <ItineraryView days={blob.itinerary} />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-brand" />
              <span className="text-sm font-semibold text-ink">We'll keep watching</span>
            </div>
            <div className="space-y-2">
              {LIVE_UPDATES.slice(0, visible).map((u, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-line bg-paper-2 p-3">
                  <div className="text-xs font-medium text-brand">{u.who}</div>
                  <div className="mt-0.5 text-sm text-ink">{u.text}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <button onClick={reset} className="btn-ghost mt-4 w-full">Plan another trip</button>
        </div>
      </div>
    </div>
  );
}
