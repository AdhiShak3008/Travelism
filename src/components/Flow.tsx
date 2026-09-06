"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { StageProgress } from "@/components/ui/StageProgress";
import { DreamStage } from "@/components/stages/DreamStage";
import { RevealStage } from "@/components/stages/RevealStage";
import { ShapeStage } from "@/components/stages/ShapeStage";
import { MoodStage } from "@/components/stages/MoodStage";
import { InvestigateStage } from "@/components/stages/InvestigateStage";
import { PackageStage } from "@/components/stages/PackageStage";
import { CheckoutStage } from "@/components/stages/CheckoutStage";
import { TripModeStage } from "@/components/stages/TripModeStage";

export function Flow() {
  const stage = useTrip((s) => s.stage);
  const destinationName = useTrip((s) => s.blob.destinationName);
  const reset = useTrip((s) => s.reset);

  const showHeader = stage !== "dream" && stage !== "investigate";

  return (
    <div className="min-h-screen">
      {showHeader && (
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <button onClick={reset} className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-alpine-500 text-sm font-bold text-ink-950">T</span>
              <span className="font-display text-lg font-semibold tracking-tight text-paper-50">Travelism</span>
              {destinationName && <span className="hidden text-sm text-paper-200/40 sm:inline">· {destinationName}</span>}
            </button>
            <div className="hidden md:block">
              <StageProgress stage={stage} />
            </div>
          </div>
        </header>
      )}

      <motion.main
        key={stage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {stage === "dream" && <DreamStage />}
        {stage === "reveal" && <RevealStage />}
        {stage === "select" && <RevealStage />}
        {stage === "shape" && <ShapeStage />}
        {stage === "mood" && <MoodStage />}
        {stage === "investigate" && <InvestigateStage />}
        {(stage === "package" || stage === "refine" || stage === "cost") && <PackageStage />}
        {stage === "checkout" && <CheckoutStage />}
        {stage === "trip" && <TripModeStage />}
      </motion.main>
    </div>
  );
}
