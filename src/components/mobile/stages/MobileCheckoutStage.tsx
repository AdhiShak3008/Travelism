"use client";

import { useState } from "react";
import { useTrip } from "@/store/tripStore";
import { inr } from "@/lib/format";
import { costTotals } from "@/lib/engine";

export function MobileCheckoutStage() {
  const blob = useTrip((s) => s.blob);
  const book = useTrip((s) => s.book);
  const setStage = useTrip((s) => s.setStage);
  const [method, setMethod] = useState<"card" | "upi">("upi");
  const [processing, setProcessing] = useState(false);

  const { total, payableNow, duringTrip } = costTotals(blob.costs);

  const handleBook = () => {
    setProcessing(true);
    setTimeout(() => {
      book();
      setProcessing(false);
    }, 900);
  };

  return (
    <div className="pb-32 bg-paper px-4 py-4 space-y-5 min-h-screen">
      <div>
        <span className="label-eyebrow">Final Step</span>
        <h1 className="display text-2xl font-bold text-ink">Confirm & Reserve Trip</h1>
        <p className="text-xs text-ink-soft mt-1">
          {blob.durationDays} Days · {blob.travelers} Traveler{blob.travelers > 1 ? "s" : ""} · {blob.destinationName}
        </p>
      </div>

      {/* Summary Card */}
      <div className="card p-4 shadow-card space-y-3 text-xs">
        <div className="font-bold text-ink border-b border-line pb-2">Trip Summary</div>
        <div className="flex justify-between">
          <span className="text-ink-soft">Destination:</span>
          <span className="font-semibold text-ink">{blob.destinationName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-soft">Accommodation:</span>
          <span className="font-semibold text-ink truncate max-w-[60%]">
            {blob.hotels[0]?.name || "Self-Supported / Wild Camping"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-soft">Flights:</span>
          <span className="font-semibold text-ink">{blob.flight?.airline || "Self-Arranged"}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-line text-sm font-bold">
          <span className="text-ink">Total Estimate:</span>
          <span className="text-brand">{inr(total)}</span>
        </div>
      </div>

      {/* Payment Schedule Card */}
      <div className="card p-4 shadow-card space-y-2.5 text-xs">
        <div className="font-bold text-ink border-b border-line pb-2">Payment Breakdown</div>
        <div className="flex justify-between items-center">
          <div>
            <div className="font-semibold text-ink">Pay Now to Secure Lock</div>
            <div className="text-[10px] text-ink-faint">Immediate confirmation with airline & stays</div>
          </div>
          <span className="font-bold text-sm text-ink">{inr(payableNow)}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-line/60">
          <div>
            <div className="font-semibold text-ink">Pay On The Trip</div>
            <div className="text-[10px] text-ink-faint">Permits, food, and daily provisions</div>
          </div>
          <span className="font-bold text-sm text-ink">{inr(duringTrip)}</span>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="card p-4 shadow-card">
        <div className="font-bold text-xs text-ink mb-3">Choose Payment Method</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMethod("upi")}
            className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
              method === "upi" ? "border-brand bg-brand/10 text-brand" : "border-line bg-paper-2 text-ink-soft"
            }`}
          >
            <span>📱</span> UPI / GPay / PhonePe
          </button>
          <button
            onClick={() => setMethod("card")}
            className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
              method === "card" ? "border-brand bg-brand/10 text-brand" : "border-line bg-paper-2 text-ink-soft"
            }`}
          >
            <span>💳</span> Credit / Debit Card
          </button>
        </div>
      </div>

      {/* Sticky Bottom Confirmation Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3.5 backdrop-blur-xl shadow-lift flex items-center justify-between gap-3">
        <button onClick={() => setStage("package")} className="btn-ghost !text-xs !py-2">
          ← Back
        </button>
        <button
          onClick={handleBook}
          disabled={processing}
          className="flex-1 rounded-xl bg-brand py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition text-center flex items-center justify-center gap-1.5"
        >
          {processing ? "Confirming..." : `Pay ${inr(payableNow)} & Lock Trip →`}
        </button>
      </div>
    </div>
  );
}
