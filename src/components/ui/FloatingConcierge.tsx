"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { ModifyChat } from "./ModifyChat";

// ============================================================================
// FloatingConcierge — an always-visible desktop launcher + slide-up panel that
// hosts the AI Concierge chat. Fixed to the bottom-right so the user can reach
// it instantly from anywhere on the page without scrolling to a sidebar.
// ============================================================================

export function FloatingConcierge() {
  const open = useTrip((s) => s.conciergeOpen);
  const openConcierge = useTrip((s) => s.openConcierge);
  const closeConcierge = useTrip((s) => s.closeConcierge);
  const destinationName = useTrip((s) => s.blob.destinationName);
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <>
      {/* Launcher button (hidden while the panel is open) */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            onClick={() => openConcierge()}
            className="fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-full bg-gradient-to-r from-brand via-emerald-600 to-teal-600 pl-3.5 pr-4 py-3 text-white shadow-2xl hover:shadow-brand/30 hover:brightness-110 active:scale-95 transition-all border border-white/20"
            title="Ask the AI Concierge to change anything in your trip"
          >
            <span className="relative flex h-6 w-6 items-center justify-center text-lg">
              🧭
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-200" />
              </span>
            </span>
            <span className="text-sm font-bold tracking-tight">AI Concierge</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-up panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Click-away backdrop (subtle; keeps the page visible behind) */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeConcierge()}
              className="fixed inset-0 z-[59] bg-black/30 backdrop-blur-[2px]"
            />
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className={`fixed bottom-5 right-5 z-[60] flex flex-col overflow-hidden rounded-3xl border border-brand/30 bg-card shadow-2xl transition-all duration-300 ${
                isMaximized
                  ? "h-[min(820px,calc(100vh-2.5rem))] w-[min(680px,calc(100vw-2.5rem))]"
                  : "h-[min(640px,calc(100vh-2.5rem))] w-[min(440px,calc(100vw-2.5rem))]"
              }`}
            >
              {/* Header bar */}
              <div className="flex items-center justify-between border-b border-line bg-paper-2/90 px-3.5 py-2.5 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="text-base">🧭</span>
                  <span className="text-xs font-bold text-ink">
                    {destinationName ? `AI Concierge · ${destinationName}` : "AI Concierge"}
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-500/30">
                    Live Superpowers
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMaximized((prev) => !prev)}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-paper text-ink-soft hover:text-ink hover:border-brand/40 transition text-xs"
                    aria-label={isMaximized ? "Restore size" : "Maximize concierge"}
                    title={isMaximized ? "Compact View" : "Expand View"}
                  >
                    {isMaximized ? "🗗" : "⛶"}
                  </button>
                  <button
                    onClick={() => closeConcierge()}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-paper text-ink-soft hover:text-ink hover:border-brand/40 transition text-xs"
                    aria-label="Minimize concierge"
                    title="Minimize"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {/* The chat itself fills the remaining height */}
              <div className="min-h-0 flex-1">
                <ModifyChat />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
