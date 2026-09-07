"use client";

import type { ReviewIntel } from "@/lib/types";
import { ScoreBar, Sparkle } from "./Primitives";

export function ReviewIntelCard({ intel }: { intel: ReviewIntel }) {
  return (
    <div className="rounded-xl border border-line bg-paper-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>💬</span>
          <span className="text-sm font-semibold text-ink">What travellers say</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-faint">
          <span>
            <span className="text-gold">★</span> {intel.overall.toFixed(1)} · {intel.count} reviews
          </span>
          <Sparkle trend={intel.trend} />
        </div>
      </div>

      <div className="space-y-2">
        {intel.aspects.map((a) => (
          <ScoreBar key={a.aspect} label={a.aspect} value={a.score} />
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-good">They loved</div>
          <ul className="space-y-1">
            {intel.positives.map((p, i) => (
              <li key={i} className="text-sm text-ink">+ {p}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-bad">Worth knowing</div>
          <ul className="space-y-1">
            {intel.negatives.map((n, i) => (
              <li key={i} className="text-sm text-ink">− {n}</li>
            ))}
          </ul>
        </div>
      </div>

      {intel.recentConcern && (
        <div className="mt-3 rounded-lg border border-warn/30 bg-warn/[0.08] px-3 py-2 text-xs text-warn">
          ⚠ Heads up: {intel.recentConcern}
        </div>
      )}
    </div>
  );
}
