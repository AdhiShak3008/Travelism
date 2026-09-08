"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { inr, formatDateRange, formatDayDate } from "@/lib/format";
import { costTotals } from "@/lib/engine";

export function MobileTripModeStage() {
  const blob = useTrip((s) => s.blob);
  const reset = useTrip((s) => s.reset);
  const [activeDay, setActiveDay] = useState(1);
  const [offlineSaved, setOfflineSaved] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { payableNow } = costTotals(blob.costs);
  const refundAmount = Math.round(payableNow * 0.85);

  const currentDay = blob.itinerary.find((d) => d.day === activeDay) || blob.itinerary[0];

  return (
    <div className="pb-32 bg-paper px-4 py-4 space-y-5 min-h-screen">
      {/* Live Badge & Trip Title */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Trip Mode
          </span>
          <h1 className="display text-2xl font-bold text-ink mt-1">{blob.destinationName}</h1>
          <div className="text-xs text-ink-soft mt-0.5 flex flex-wrap items-center gap-1.5 font-medium">
            <span className="font-bold text-brand">🗓️ {formatDateRange(blob.dates?.start, blob.durationDays)}</span>
            <span className="text-ink-faint">·</span>
            <span>Ref: #{blob.id.slice(-6).toUpperCase()}</span>
          </div>
        </div>

        <button
          onClick={() => setOfflineSaved((s) => !s)}
          className="rounded-xl border border-line bg-paper-2 p-2 text-xs font-semibold text-ink active:scale-95 transition flex items-center gap-1"
        >
          <span>{offlineSaved ? "🟢" : "⚪"}</span>
          <span>{offlineSaved ? "Offline Ready" : "Save Offline"}</span>
        </button>
      </div>

      {/* Emergency & Cancellation Quick Strip */}
      <div className="flex items-center gap-2">
        <a
          href="tel:112"
          className="flex-1 rounded-xl bg-red-500/10 border border-red-500/30 py-2 px-3 text-center text-xs font-bold text-red-600 dark:text-red-400 active:bg-red-500/20"
        >
          🚨 Local SOS (112)
        </a>
        <button
          onClick={() => setShowCancelModal(true)}
          className="rounded-xl border border-line bg-paper-2 py-2 px-3 text-xs font-semibold text-ink-soft active:bg-paper-3"
        >
          Cancel Trip
        </button>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {blob.itinerary.map((d) => {
          const dayDate = formatDayDate(blob.dates?.start, d.day);
          return (
            <button
              key={d.day}
              onClick={() => setActiveDay(d.day)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs flex flex-col items-center ${
                activeDay === d.day
                  ? "bg-brand text-white"
                  : "border border-line bg-card text-ink-soft hover:text-ink"
              }`}
            >
              <span>Day {d.day}</span>
              <span className="text-[9px] font-normal opacity-85">{dayDate}</span>
            </button>
          );
        })}
      </div>

      {/* Active Day Timeline Card */}
      {currentDay && (
        <div className="card p-4 shadow-card">
          <div className="flex items-center justify-between border-b border-line pb-2.5 mb-3">
            <div>
              <div className="label-eyebrow mb-0.5">Day {currentDay.day} Itinerary</div>
              <h3 className="font-bold text-sm text-ink">{currentDay.title}</h3>
            </div>
            {currentDay.baseLocation && (
              <span className="rounded-full bg-paper-2 border border-line px-2.5 py-0.5 text-[10px] font-semibold text-ink-soft">
                📍 {currentDay.baseLocation}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {currentDay.stops.map((stop, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs">
                <div className="w-12 shrink-0 font-bold text-brand text-[11px] pt-0.5">
                  {stop.start}
                </div>
                <div className="flex-1 rounded-xl bg-paper-2 p-2.5 border border-line/60">
                  <div className="font-semibold text-ink">{stop.label}</div>
                  {stop.note && <p className="text-[10px] text-ink-soft mt-0.5">{stop.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Trip Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-lift space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-ink">Cancel Trip & Deposit Refund</h3>
                <button onClick={() => setShowCancelModal(false)} className="text-xs text-ink-soft font-bold">
                  ✕
                </button>
              </div>

              <div className="rounded-xl bg-paper-2 p-3 text-xs space-y-2 border border-line">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Paid Online:</span>
                  <span className="font-bold text-ink">{inr(payableNow)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Eligible Refund (85%):</span>
                  <span>{inr(refundAmount)}</span>
                </div>
              </div>

              <p className="text-xs text-ink-soft">
                Are you sure you want to cancel? Refund will be credited within 24 hours to your original payment method.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 rounded-xl border border-line py-2 text-xs font-semibold text-ink"
                >
                  Keep My Trip
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    reset();
                  }}
                  className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-bold text-white shadow-sm"
                >
                  Confirm Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
