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
  const days = estimateDaysForPlaces(places, pace);
  const hasAny = places.length > 0 || exps.length > 0;

  return (
    <AnimatePresence>
      {hasAny && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-6"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl border border-line bg-card p-3 shadow-lift sm:flex-row sm:items-center sm:gap-4 sm:p-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 label-eyebrow">Your itinerary so far</div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                <AnimatePresence mode="popLayout">
                  {places.map((p) => (
                    <motion.button
                      layout
                      key={p.id}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      onClick={() => toggle(p.id)}
                      className="group flex shrink-0 items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 py-1 pl-3 pr-2 text-sm text-ink"
                    >
                      {p.canonicalName}
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-line-strong text-[10px] group-hover:bg-bad/40">×</span>
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
                      className="group flex shrink-0 items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 py-1 pl-3 pr-2 text-sm text-ink"
                    >
                      🎟️ {e.name}
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-line-strong text-[10px] group-hover:bg-bad/40">×</span>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <div className="text-right">
                <div className="text-sm font-semibold text-ink">
                  {places.length} place{places.length !== 1 ? "s" : ""}
                  {exps.length > 0 && ` · ${exps.length} to do`}
                </div>
                <div className="text-xs text-ink-faint">≈ {days} days incl. travel</div>
              </div>
              <button onClick={onContinue} className="btn-primary whitespace-nowrap">
                Continue →
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
