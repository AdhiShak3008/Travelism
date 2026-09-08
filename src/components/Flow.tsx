"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileFlow } from "@/components/mobile/MobileFlow";
import { StageProgress } from "@/components/ui/StageProgress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";
import { AuthPage } from "@/components/ui/AuthPage";
import { SavedTripsDrawer } from "@/components/ui/SavedTripsDrawer";
import { PreferencesPage } from "@/components/ui/PreferencesPage";
import { useAuth } from "@/store/authStore";
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
  const isMobile = useIsMobile(768);
  const stage = useTrip((s) => s.stage);
  const destinationName = useTrip((s) => s.blob.destinationName);
  const reset = useTrip((s) => s.reset);
  const openPreferences = useAuth((s) => s.openPreferences);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const hasCheckedInitialSession = useAuth((s) => s.hasCheckedInitialSession);
  const restoreSession = useAuth((s) => s.restoreSession);

  // Restore active 400-min session on initial mount
  useEffect(() => {
    if (!hasCheckedInitialSession) {
      restoreSession();
    }
  }, [hasCheckedInitialSession, restoreSession]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [stage]);

  // If not logged in, render the Login Page directly at root — zero redirects, zero flash!
  if (!isAuthenticated) {
    return <AuthPage standalone={true} isRootLanding={true} />;
  }

  if (isMobile) {
    return <MobileFlow />;
  }

  const showHeader = stage !== "dream" && stage !== "investigate";

  return (
    <LightboxProvider>
      <div className="min-h-screen w-full min-w-0 overflow-x-hidden">
        {/* Modals, Drawers & Fullscreen Overlays */}
        <AuthPage />
        <SavedTripsDrawer />
        <PreferencesPage />

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
                {/* Dedicated Travel DNA / Preferences button */}
                <button
                  onClick={openPreferences}
                  className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-xs font-bold text-brand shadow-xs hover:bg-brand/20 active:scale-95 transition"
                  title="Customize your personal Travel DNA, pace, budget & hotel tastes"
                >
                  <span>🧬</span>
                  <span>Travel DNA</span>
                </button>
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
