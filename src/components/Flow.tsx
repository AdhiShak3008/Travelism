"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { StageProgress } from "@/components/ui/StageProgress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LightboxProvider } from "@/components/ui/Lightbox";
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
    <LightboxProvider>
    <div className="min-h-screen">
      {showHeader && (
        <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <button onClick={reset} className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-paper">T</span>
              <span className="display text-lg font-semibold tracking-tight text-ink">Travelism</span>
              {destinationName && <span className="hidden text-sm text-ink-faint sm:inline">· {destinationName}</span>}
            </button>
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <StageProgress stage={stage} />
              </div>
              <ThemeToggle />
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
    </LightboxProvider>
  );
}
