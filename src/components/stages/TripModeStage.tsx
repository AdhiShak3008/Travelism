"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  { who: "Getting around", text: "Your driver is confirmed for the scheduled transit days." },
  { who: "Packing", text: "Suggested: comfortable walking shoes, sunscreen, a power bank, and local cash." },
];

export function TripModeStage() {
  const blob = useTrip((s) => s.blob);
  const reset = useTrip((s) => s.reset);
  const setStage = useTrip((s) => s.setStage);
  const { total, payableNow } = costTotals(blob.costs);
  const [celebrate, setCelebrate] = useState(true);
  const [visible, setVisible] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelledNotice, setCancelledNotice] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCelebrate(false), 2600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (visible >= LIVE_UPDATES.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 700);
    return () => clearTimeout(t);
  }, [visible]);

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    setCancelledNotice(true);
    setTimeout(() => {
      reset();
    }, 2800);
  };

  const daysToGo = 12;
  const hotelName = blob.hotels[0]?.name || "Primary Resort";
  const flightName = blob.flight?.airline || "Scheduled Flight";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 w-full min-w-0 overflow-x-hidden">
      {celebrate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-2xl border border-brand/30 bg-brand/[0.07] p-6 text-center shadow-card"
        >
          <div className="text-4xl">🎉</div>
          <h2 className="mt-2 display text-2xl font-semibold text-ink">{blob.destinationName} is booked!</h2>
          <p className="mt-1 text-sm text-ink-soft">Paid {inr(payableNow)} now · {inr(total)} total</p>
        </motion.div>
      )}

      {cancelledNotice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center shadow-card"
        >
          <div className="text-4xl">✓</div>
          <h2 className="mt-2 display text-2xl font-bold text-rose-700 dark:text-rose-300">
            Trip to {blob.destinationName} has been cancelled
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Full refund of <span className="font-bold text-ink">{inr(payableNow)}</span> initiated. Returning to home...
          </p>
        </motion.div>
      )}

      <div className="card overflow-hidden w-full min-w-0">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="stamp mb-2">Your trip · confirmed</div>
              <h1 className="display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
                {blob.destinationName}
              </h1>
              <p className="text-xs sm:text-sm text-ink-soft mt-1">
                {blob.durationDays} Days · {blob.travelers} Traveler{blob.travelers > 1 ? "s" : ""} · Ref: #{blob.id.slice(-6).toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <div className="display text-3xl sm:text-4xl font-semibold text-brand">{daysToGo}</div>
              <div className="text-xs sm:text-sm text-ink-faint">days to departure</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 w-full">
            {STATUS.map((s) => (
              <div
                key={s.label}
                className={cx(
                  "rounded-xl border p-3 text-center",
                  s.state === "done" ? "border-good/25 bg-good/[0.06]" : "border-warn/25 bg-warn/[0.06]"
                )}
              >
                <div className={cx("text-base sm:text-lg", s.state === "done" ? "text-good" : "text-warn")}>
                  {s.state === "done" ? "✓" : "◐"}
                </div>
                <div className="text-[11px] sm:text-xs text-ink-soft font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-dashed border-line-strong pt-4">
            <div className="label-eyebrow mb-2">The journey</div>
            <JourneyRibbon />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] w-full min-w-0">
        <div className="min-w-0 w-full overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="display text-xl font-semibold text-ink">Your day by day</h3>
            <span className="text-xs text-ink-faint">Interactive Map & Timelines</span>
          </div>
          <ItineraryView days={blob.itinerary} />
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start w-full min-w-0">
          <div className="card p-5 w-full">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              <span className="text-sm font-semibold text-ink">Live Trip Watcher</span>
            </div>
            <div className="space-y-2">
              {LIVE_UPDATES.slice(0, visible).map((u, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl border border-line bg-paper-2 p-3 text-xs"
                >
                  <div className="font-semibold text-brand">{u.who}</div>
                  <div className="mt-0.5 text-ink leading-snug">{u.text}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Management Actions */}
          <div className="card p-4 space-y-2.5 w-full">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-1">
              Trip Management
            </div>

            <button
              onClick={() => window.print()}
              className="btn-ghost !py-2.5 text-xs font-semibold w-full flex items-center justify-center gap-2 hover:bg-paper-2 transition"
            >
              <span>🖨️</span>
              <span>Print Itinerary / PDF</span>
            </button>

            <button
              onClick={() => setStage("package")}
              className="btn-ghost !py-2.5 text-xs font-semibold w-full flex items-center justify-center gap-2 hover:bg-paper-2 transition"
            >
              <span>✏️</span>
              <span>Modify Trip Package</span>
            </button>

            <button
              onClick={reset}
              className="btn-ghost !py-2.5 text-xs font-semibold w-full flex items-center justify-center gap-2 hover:bg-paper-2 transition"
            >
              <span>✨</span>
              <span>Plan Another Journey</span>
            </button>

            <button
              onClick={() => setShowCancelModal(true)}
              className="rounded-full border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition flex items-center justify-center gap-1.5 w-full active:scale-95"
            >
              <span>✕</span>
              <span>Cancel Trip & Booking</span>
            </button>
          </div>
        </div>
      </div>

      {/* CANCEL TRIP CONFIRMATION MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-card shadow-2xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-2xl text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  ⚠️
                </div>
                <div>
                  <h3 className="display text-xl font-bold text-ink">Cancel Trip to {blob.destinationName}?</h3>
                  <p className="text-xs text-ink-soft mt-0.5">Booking Reference #{blob.id.slice(-6).toUpperCase()}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-2xl border border-line bg-paper-2 p-4 text-xs sm:text-sm text-ink-soft">
                <div className="flex items-center justify-between font-semibold text-ink">
                  <span>Refund Amount:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{inr(payableNow)}</span>
                </div>
                <p className="text-xs leading-relaxed">
                  • 100% of your initial deposit ({inr(payableNow)}) will be refunded to your original payment method in 3–5 business days.
                </p>
                <p className="text-xs leading-relaxed">
                  • Your room hold at <strong className="text-ink">{hotelName}</strong> and flight bookings with <strong className="text-ink">{flightName}</strong> will be released.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-full border border-line bg-paper px-5 py-2.5 text-xs sm:text-sm font-semibold text-ink hover:bg-paper-2 transition"
                >
                  Keep My Trip
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="rounded-full bg-rose-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-rose-700 active:scale-95 transition"
                >
                  Yes, Cancel Booking & Refund
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
