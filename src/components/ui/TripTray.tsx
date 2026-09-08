"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { estimateDaysForPlaces } from "@/lib/engine";

export function TripTray({ onContinue }: { onContinue: () => void }) {
  const dataset = useTrip((s) => s.dataset);
  const selectedIds = useTrip((s) => s.blob.selectedPlaceIds);
  const selectedExpIds = useTrip((s) => s.blob.selectedExperienceIds);
  const toggle = useTrip((s) => s.toggleSelectPlace);
  const toggleExp = useTrip((s) => s.toggleExperience);
  const pace = useTrip((s) => s.blob.preferences.pace);

  const places = dataset?.places.filter((p) => selectedIds.includes(p.id)) ?? [];
  const exps = dataset?.experiences.filter((e) => selectedExpIds.includes(e.id)) ?? [];
  const estimatedDays = estimateDaysForPlaces(places, pace);
  const hasAny = places.length > 0 || exps.length > 0;

  return (
    <AnimatePresence>
      {hasAny && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-6 pointer-events-none"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl border border-brand/40 bg-card/95 backdrop-blur-xl p-3.5 shadow-lift sm:flex-row sm:items-center sm:gap-4 sm:p-4 pointer-events-auto">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="label-eyebrow">Your Trip Picks</span>
                <span className="text-[11px] text-ink-faint">
                  ({places.length} spot{places.length !== 1 ? "s" : ""}{exps.length > 0 ? `, ${exps.length} activity` : ""})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {places.map((p) => (
                    <motion.button
                      layout
                      key={p.id}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      onClick={() => toggle(p.id)}
                      className="group flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 py-1 pl-3 pr-2 text-xs font-medium text-ink transition hover:bg-brand/20"
                    >
                      <span>📍 {p.canonicalName}</span>
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-line-strong text-[10px] group-hover:bg-bad/50 group-hover:text-white transition">
                        ×
                      </span>
                    </motion.button>
                  ))}
                  {exps.map((e) => (
                    <motion.button
                      layout
                      key={e.id}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      onClick={() => toggleExp(e.id)}
                      className="group flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 py-1 pl-3 pr-2 text-xs font-medium text-ink transition hover:bg-gold/25"
                    >
                      <span>🎟️ {e.name}</span>
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-line-strong text-[10px] group-hover:bg-bad/50 group-hover:text-white transition">
                        ×
                      </span>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-ink-soft font-medium">
                  {places.length} spot{places.length !== 1 ? "s" : ""} selected
                </div>
                <div className="text-[11px] text-brand">
                  Suggested pace: ~{estimatedDays} days
                </div>
              </div>
              <button
                onClick={onContinue}
                className="btn-primary whitespace-nowrap !py-2.5 !px-5 text-sm shadow-md"
              >
                Set Dates & Duration →
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
