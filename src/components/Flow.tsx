"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { StageProgress } from "@/components/ui/StageProgress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";
import { AuthModal } from "@/components/ui/AuthModal";
import { SavedTripsDrawer } from "@/components/ui/SavedTripsDrawer";
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
      <div className="min-h-screen w-full min-w-0 overflow-x-hidden">
        {/* Modals & Drawers */}
        <AuthModal />
        <SavedTripsDrawer />

        {showHeader && (
          <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-xl transition-colors">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <button
                onClick={reset}
                className="flex items-center gap-2.5 group transition"
                title="Start a new trip discovery"
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-sm font-extrabold text-paper shadow-sm group-hover:scale-105 transition">
                  T
                </span>
                <span className="display text-lg font-bold tracking-tight text-ink">Travelism</span>
                {destinationName && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-semibold text-ink-soft border border-line">
                    <span>📍</span> {destinationName}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="hidden md:block">
                  <StageProgress stage={stage} />
                </div>
                <UserMenu />
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
          className="w-full min-w-0 overflow-x-hidden"
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
