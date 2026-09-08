"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { costTotals } from "@/lib/engine";
import { inr, cx, formatDateRange } from "@/lib/format";

const METHODS = [
  { id: "upi", label: "UPI", glyph: "📱" },
  { id: "card", label: "Card", glyph: "💳" },
  { id: "netbanking", label: "Net Banking", glyph: "🏦" },
];

export function CheckoutStage() {
  const blob = useTrip((s) => s.blob);
  const setStage = useTrip((s) => s.setStage);
  const book = useTrip((s) => s.book);
  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);

  const { total, payableNow, duringTrip } = costTotals(blob.costs);

  function pay() {
    setProcessing(true);
    setTimeout(() => book(), 1900);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="stamp mb-3">Ready when you are</div>
        <h1 className="display text-4xl font-semibold tracking-tight text-ink">{blob.destinationName}</h1>
        <p className="mt-1 text-ink-soft flex items-center gap-2">
          <span className="font-semibold text-brand">🗓️ {formatDateRange(blob.dates?.start, blob.durationDays)}</span>
          <span className="text-ink-faint">·</span>
          <span>{blob.durationDays} days</span>
          <span className="text-ink-faint">·</span>
          <span>{blob.travelers} traveler{blob.travelers > 1 ? "s" : ""}</span>
        </p>
      </motion.div>

      {/* Receipt */}
      <div className="card mt-6 p-6">
        <div className="flex items-baseline justify-between border-b border-dashed border-line-strong pb-4">
          <span className="text-ink-soft">Total</span>
          <span className="display text-3xl font-semibold text-ink">{inr(total)}</span>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-good">Pay now</span>
            <span className="display text-2xl font-semibold text-ink">{inr(payableNow)}</span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-warn">Pay during the trip</span>
            <span className="font-semibold text-ink-soft">{inr(duringTrip)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-1.5 rounded-xl border border-dashed border-line-strong bg-paper-2 p-4">
          {blob.costs.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">{c.label}</span>
              <span className="tabular-nums text-ink">{inr(c.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="label-eyebrow mb-3">How you'd like to pay</div>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={cx("rounded-2xl border p-4 text-center transition", method === m.id ? "border-brand bg-brand/[0.06]" : "border-line hover:bg-paper-2")}
            >
              <div className="text-2xl">{m.glyph}</div>
              <div className="mt-1 text-sm text-ink">{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-terra/25 bg-terra/[0.06] px-4 py-3 text-xs text-terra">
        This is a demo checkout — no real payment is taken.
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={() => setStage("package")} className="btn-ghost">← Back to trip</button>
        <button onClick={pay} disabled={processing} className="btn-primary flex-1 !py-3.5">
          {processing ? "Confirming…" : `Confirm & pay ${inr(payableNow)}`}
        </button>
      </div>

      <AnimatePresence>
        {processing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 grid place-items-center bg-paper/85 backdrop-blur">
            <div className="text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="mx-auto h-12 w-12 rounded-full border-2 border-line border-t-brand" />
              <p className="mt-4 text-ink-soft">Locking in your {blob.destinationName} trip…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
