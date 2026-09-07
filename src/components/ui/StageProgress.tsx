"use client";

import type { Stage } from "@/lib/types";
import { cx } from "@/lib/format";
import { useTrip, stageRank } from "@/store/tripStore";

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
  const maxReached = useTrip((s) => s.maxStageReached);
  const goToStage = useTrip((s) => s.goToStage);
  const investigating = useTrip((s) => s.investigating);
  const maxRank = stageRank(maxReached);

  return (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
      {STEPS.map((s, i) => {
        const done = i < active;
        const now = i === active;
        // a step is reachable if it's at or before the furthest stage reached
        const reachable = !investigating && stageRank(s.id) <= maxRank;
        const Tag = reachable ? "button" : "div";
        return (
          <div key={s.id} className="flex items-center gap-1">
            <Tag
              onClick={reachable ? () => goToStage(s.id) : undefined}
              className={cx(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                now && "bg-brand/12 text-brand",
                done && "text-ink-soft",
                !now && !done && "text-ink-faint/50",
                reachable && !now && "hover:bg-paper-2 hover:text-ink cursor-pointer"
              )}
            >
              <span
                className={cx(
                  "grid h-4 w-4 place-items-center rounded-full text-[9px]",
                  now && "bg-brand text-paper",
                  done && "bg-line-strong text-ink",
                  !now && !done && "border border-line-strong"
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="whitespace-nowrap">{s.label}</span>
            </Tag>
            {i < STEPS.length - 1 && <span className="text-ink-faint/30">·</span>}
          </div>
        );
      })}
    </div>
  );
}
