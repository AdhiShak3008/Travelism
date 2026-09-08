"use client";

import type { Stage } from "@/lib/types";
import { cx } from "@/lib/format";
import { useTrip, stageRank } from "@/store/tripStore";

const STEPS: { id: Stage; label: string }[] = [
  { id: "dream", label: "Dream" },
  { id: "reveal", label: "Discover" },
  { id: "shape", label: "Schedule" },
  { id: "mood", label: "Vibe" },
  { id: "investigate", label: "Swarm AI" },
  { id: "package", label: "Package" },
  { id: "checkout", label: "Book" },
  { id: "trip", label: "Live Trip" },
];

function idx(stage: Stage): number {
  const map: Record<Stage, number> = {
    dream: 0, reveal: 1, select: 1, shape: 2, mood: 3,
    investigate: 4, package: 5, refine: 5, cost: 5, checkout: 6, trip: 7,
  };
  return map[stage] ?? 0;
}

export function StageProgress({ stage }: { stage: Stage }) {
  const active = idx(stage);
  const maxReached = useTrip((s) => s.maxStageReached);
  const goToStage = useTrip((s) => s.goToStage);
  const investigating = useTrip((s) => s.investigating);
  const maxRank = stageRank(maxReached);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl sm:rounded-full border border-line bg-card/70 p-1 backdrop-blur-md">
      {STEPS.map((s, i) => {
        const done = i < active;
        const now = i === active;
        const reachable = !investigating && stageRank(s.id) <= maxRank;
        const Tag = reachable ? "button" : "div";
        return (
          <Tag
            key={s.id}
            onClick={reachable ? () => goToStage(s.id) : undefined}
            className={cx(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all",
              now
                ? "bg-brand text-white shadow-sm shadow-brand/30"
                : done
                ? "text-ink-soft hover:text-ink hover:bg-paper-2"
                : "text-ink-faint/50",
              reachable && !now && "cursor-pointer hover:bg-paper-2"
            )}
          >
            <span
              className={cx(
                "grid h-4 w-4 place-items-center rounded-full text-[9px] font-extrabold",
                now
                  ? "bg-white/25 text-white"
                  : done
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-paper-3 text-ink-faint"
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className="whitespace-nowrap">{s.label}</span>
          </Tag>
        );
      })}
    </div>
  );
}

