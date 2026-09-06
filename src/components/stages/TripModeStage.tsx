"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { inr } from "@/lib/format";
import { costTotals } from "@/lib/engine";
import { JourneyRibbon } from "@/components/ui/JourneyRibbon";
import { ItineraryView } from "@/components/ui/ItineraryView";
import { cx } from "@/lib/format";

const STATUS = [
  { label: "Flights", state: "done" },
  { label: "Hotels", state: "done" },
  { label: "Transport", state: "done" },
  { label: "Itinerary", state: "done" },
  { label: "Permits", state: "partial" },
  { label: "Packing", state: "partial" },
] as const;

// Mocked live monitoring updates from the agents.
const LIVE_UPDATES = [
  { agent: "🌦️ Weather Witch", text: "Sela Pass forecast: light snow midweek — roads expected open." },
  { agent: "🪪 Gatekeeper", text: "ILP application accepted. Border-zone permit to be arranged on arrival." },
  { agent: "🚙 Roadrunner", text: "Operator confirmed your vehicle and driver for the Bum La day." },
  { agent: "🎒 Packrat", text: "Added: down layers, sunscreen, motion-sickness tablets, cash (limited ATMs)." },
];

export function TripModeStage() {
  const blob = useTrip((s) => s.blob);
  const reset = useTrip((s) => s.reset);
  const { total, payableNow } = costTotals(blob.costs);
  const [celebrate, setCelebrate] = useState(true);
  const [visibleUpdates, setVisibleUpdates] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setCelebrate(false), 2600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (visibleUpdates >= LIVE_UPDATES.length) return;
    const t = setTimeout(() => setVisibleUpdates((v) => v + 1), 700);
    return () => clearTimeout(t);
  }, [visibleUpdates]);

  const daysToGo = 12;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {celebrate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-2xl border border-alpine-400/30 bg-alpine-500/[0.08] p-6 text-center shadow-glow"
        >
          <div className="text-4xl">🎉</div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-paper-50">
            {blob.destinationName.toUpperCase()} IS BOOKED
          </h2>
          <p className="mt-1 text-sm text-paper-200/60">Paid {inr(payableNow)} now · {inr(total)} total</p>
        </motion.div>
      )}

      <div className="card overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="label-eyebrow mb-1">Trip mode · active</div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-paper-50">{blob.destinationName}</h1>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-semibold text-alpine-300">{daysToGo}</div>
              <div className="text-sm text-paper-200/50">days to go</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STATUS.map((s) => (
              <div
                key={s.label}
                className={cx(
                  "rounded-xl border p-3 text-center",
                  s.state === "done" ? "border-signal-good/25 bg-signal-good/[0.05]" : "border-signal-warn/25 bg-signal-warn/[0.05]"
                )}
              >
                <div className={cx("text-lg", s.state === "done" ? "text-signal-good" : "text-signal-warn")}>
                  {s.state === "done" ? "✓" : "◐"}
                </div>
                <div className="text-xs text-paper-200/70">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <div className="label-eyebrow mb-2">Journey</div>
            <JourneyRibbon />
          </div>
        </div>
      </div>

      {/* Live monitoring */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <h3 className="mb-3 font-display text-xl font-semibold text-paper-50">Your itinerary</h3>
          <ItineraryView days={blob.itinerary} />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-alpine-400" />
              <span className="text-sm font-semibold text-paper-50">Agents still watching</span>
            </div>
            <div className="space-y-2">
              {LIVE_UPDATES.slice(0, visibleUpdates).map((u, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl border border-white/[0.06] bg-ink-850/60 p-3"
                >
                  <div className="text-xs font-medium text-alpine-300">{u.agent}</div>
                  <div className="mt-0.5 text-sm text-paper-100">{u.text}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <button onClick={reset} className="btn-ghost mt-4 w-full">
            Plan another trip
          </button>
        </div>
      </div>
    </div>
  );
}
