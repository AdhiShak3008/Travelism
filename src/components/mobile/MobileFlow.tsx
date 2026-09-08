"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { LightboxProvider } from "@/components/ui/Lightbox";
import { AuthPage } from "@/components/ui/AuthPage";
import { SavedTripsDrawer } from "@/components/ui/SavedTripsDrawer";
import { PreferencesPage } from "@/components/ui/PreferencesPage";
import { MobileHeader } from "./components/MobileHeader";
import { MobileModifySheet } from "./components/MobileModifySheet";

import { MobileDreamStage } from "./stages/MobileDreamStage";
import { MobileRevealStage } from "./stages/MobileRevealStage";
import { MobileShapeStage } from "./stages/MobileShapeStage";
import { MobileMoodStage } from "./stages/MobileMoodStage";
import { MobileInvestigateStage } from "./stages/MobileInvestigateStage";
import { MobilePackageStage } from "./stages/MobilePackageStage";
import { MobileCheckoutStage } from "./stages/MobileCheckoutStage";
import { MobileTripModeStage } from "./stages/MobileTripModeStage";

export function MobileFlow() {
  const stage = useTrip((s) => s.stage);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [stage]);

  const showHeader = stage !== "dream" && stage !== "investigate";
  const showChatSheet = stage !== "dream" && stage !== "investigate";

  return (
    <LightboxProvider>
      <div className="min-h-screen w-full min-w-0 bg-paper overflow-x-hidden">
        {/* Modals & Fullscreen Overlays */}
        <AuthPage />
        <SavedTripsDrawer />
        <PreferencesPage />

        {/* Mobile Top App Bar */}
        {showHeader && <MobileHeader />}

        {/* Floating AI Concierge Drawer */}
        {showChatSheet && <MobileModifySheet />}

        {/* Main Stage Content */}
        <motion.main
          key={`mobile_${stage}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full min-w-0"
        >
          {stage === "dream" && <MobileDreamStage />}
          {stage === "reveal" && <MobileRevealStage />}
          {stage === "select" && <MobileRevealStage />}
          {stage === "shape" && <MobileShapeStage />}
          {stage === "mood" && <MobileMoodStage />}
          {stage === "investigate" && <MobileInvestigateStage />}
          {(stage === "package" || stage === "refine" || stage === "cost") && <MobilePackageStage />}
          {stage === "checkout" && <MobileCheckoutStage />}
          {stage === "trip" && <MobileTripModeStage />}
        </motion.main>
      </div>
    </LightboxProvider>
  );
}
