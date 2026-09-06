"use client";

import type { ReviewIntel } from "@/lib/types";
import { ScoreBar, Sparkle } from "./Primitives";

export function ReviewIntelCard({ intel }: { intel: ReviewIntel }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-850/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🕵️</span>
          <span className="text-sm font-semibold text-paper-50">Review Detective</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-paper-200/50">
          <span>
            <span className="text-ember-400">★</span> {intel.overall.toFixed(1)} · {intel.count} reviews
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
          <div className="mb-1 text-[11px] uppercase tracking-wide text-signal-good/80">Recurring positives</div>
          <ul className="space-y-1">
            {intel.positives.map((p, i) => (
              <li key={i} className="text-sm text-paper-100">+ {p}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-signal-bad/80">Recurring negatives</div>
          <ul className="space-y-1">
            {intel.negatives.map((n, i) => (
              <li key={i} className="text-sm text-paper-100">− {n}</li>
            ))}
          </ul>
        </div>
      </div>

      {intel.recentConcern && (
        <div className="mt-3 rounded-lg border border-signal-warn/20 bg-signal-warn/[0.06] px-3 py-2 text-xs text-signal-warn">
          ⚠ Recent concern: {intel.recentConcern}
        </div>
      )}
    </div>
  );
}
