"use client";

import { useTrip } from "@/store/tripStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";
import type { Stage } from "@/lib/types";

const STAGE_NAMES: Record<Stage, string> = {
  dream: "Dream",
  reveal: "Places",
  select: "Places",
  shape: "Dates & Style",
  mood: "Vibe",
  investigate: "Agents",
  package: "Package",
  refine: "Refine",
  cost: "Breakdown",
  checkout: "Confirm",
  trip: "Active Trip",
};

const STAGE_ORDER: Stage[] = ["dream", "reveal", "shape", "mood", "investigate", "package", "checkout", "trip"];

export function MobileHeader() {
  const stage = useTrip((s) => s.stage);
  const destinationName = useTrip((s) => s.blob.destinationName);
  const reset = useTrip((s) => s.reset);
  const setStage = useTrip((s) => s.setStage);

  const idx = STAGE_ORDER.indexOf(stage);
  const prevStage = idx > 0 ? STAGE_ORDER[idx - 1] : null;

  const handleBack = () => {
    if (stage === "reveal") {
      reset();
    } else if (stage === "shape") {
      setStage("reveal");
    } else if (stage === "mood") {
      setStage("shape");
    } else if (stage === "package") {
      setStage("reveal");
    } else if (stage === "checkout") {
      setStage("package");
    } else if (prevStage) {
      setStage(prevStage);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur-xl transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        {prevStage && stage !== "trip" ? (
          <button
            onClick={handleBack}
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper-2 text-ink active:scale-95 transition"
            aria-label="Go back"
          >
            ←
          </button>
        ) : (
          <button
            onClick={reset}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-brand to-emerald-400 text-sm font-extrabold text-white shadow-sm"
          >
            T
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="display text-base font-bold text-ink truncate">
              {destinationName || "Travelism"}
            </span>
          </div>
          <div className="text-[10px] font-semibold text-brand flex items-center gap-1">
            <span>Step {Math.max(1, idx + 1)}: {STAGE_NAMES[stage] || stage}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <UserMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}
