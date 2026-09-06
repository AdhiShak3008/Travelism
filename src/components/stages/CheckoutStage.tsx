"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { costTotals } from "@/lib/engine";
import { inr } from "@/lib/format";
import { cx } from "@/lib/format";

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
        <div className="label-eyebrow mb-2">Your trip is ready</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-paper-50">{blob.destinationName}</h1>
        <p className="mt-1 text-paper-200/60">
          {blob.durationDays} days · {blob.travelers} traveller{blob.travelers > 1 ? "s" : ""}
        </p>
      </motion.div>

      <div className="card mt-6 p-6">
        <div className="flex items-baseline justify-between border-b border-white/[0.06] pb-4">
          <span className="text-paper-200/60">Total</span>
          <span className="font-display text-3xl font-semibold text-paper-50">{inr(total)}</span>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-signal-good">Payable now</span>
            <span className="font-display text-2xl font-semibold text-paper-50">{inr(payableNow)}</span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-signal-warn">Estimated during trip</span>
            <span className="font-semibold text-paper-200/80">{inr(duringTrip)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-1.5 rounded-xl border border-white/[0.06] bg-ink-850/50 p-4">
          {blob.costs.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-paper-200/70">{c.label}</span>
              <span className="tabular-nums text-paper-100">{inr(c.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment method */}
      <div className="mt-6">
        <div className="label-eyebrow mb-3">Payment method</div>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={cx(
                "rounded-xl border p-4 text-center transition",
                method === m.id ? "border-alpine-400/50 bg-alpine-500/[0.08]" : "border-white/[0.06] hover:bg-white/[0.03]"
              )}
            >
              <div className="text-2xl">{m.glyph}</div>
              <div className="mt-1 text-sm text-paper-100">{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-aurora-400/20 bg-aurora-500/[0.05] px-4 py-3 text-xs text-aurora-300">
        🔒 This is a simulated checkout. No real payment is processed.
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={() => setStage("package")} className="btn-ghost">← Back to trip</button>
        <button onClick={pay} disabled={processing} className="btn-primary flex-1 !py-3.5">
          {processing ? "Processing…" : `Pay ${inr(payableNow)}`}
        </button>
      </div>

      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mx-auto h-12 w-12 rounded-full border-2 border-white/10 border-t-alpine-400"
              />
              <p className="mt-4 text-paper-200/70">Securing your {blob.destinationName} trip…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
