"use client";

import type { Stage } from "@/lib/types";
import { cx } from "@/lib/format";

const STEPS: { id: Stage; label: string }[] = [
  { id: "dream", label: "Dream" },
  { id: "reveal", label: "Discover" },
  { id: "select", label: "Select" },
  { id: "shape", label: "Shape" },
  { id: "mood", label: "Mood" },
  { id: "investigate", label: "Investigate" },
  { id: "package", label: "Package" },
  { id: "checkout", label: "Book" },
  { id: "trip", label: "Trip" },
];

function idx(stage: Stage): number {
  const map: Record<Stage, number> = {
    dream: 0, reveal: 1, select: 2, shape: 3, mood: 4,
    investigate: 5, package: 6, refine: 6, cost: 6, checkout: 7, trip: 8,
  };
  return map[stage];
}

export function StageProgress({ stage }: { stage: Stage }) {
  const active = idx(stage);
  return (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
      {STEPS.map((s, i) => {
        const done = i < active;
        const now = i === active;
        return (
          <div key={s.id} className="flex items-center gap-1">
            <div
              className={cx(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                now && "bg-alpine-500/15 text-alpine-200",
                done && "text-paper-200/50",
                !now && !done && "text-paper-200/25"
              )}
            >
              <span
                className={cx(
                  "grid h-4 w-4 place-items-center rounded-full text-[9px]",
                  now && "bg-alpine-500 text-ink-950",
                  done && "bg-white/15 text-paper-100",
                  !now && !done && "border border-white/10"
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="whitespace-nowrap">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="text-paper-200/20">·</span>}
          </div>
        );
      })}
    </div>
  );
}
