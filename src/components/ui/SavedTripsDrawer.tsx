"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, type SavedTripSummary } from "@/store/authStore";
import { useTrip } from "@/store/tripStore";
import { inr } from "@/lib/format";

export function SavedTripsDrawer() {
  const { isSavedTripsOpen, closeSavedTrips, user, removeSavedTrip } = useAuth();
  const startDream = useTrip((s) => s.startDream);

  if (!isSavedTripsOpen || !user) return null;

  const handleLoadTrip = (trip: SavedTripSummary) => {
    closeSavedTrips();
    startDream(trip.destinationName);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSavedTrips}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Slide-over panel */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="w-screen max-w-md border-l border-line bg-card p-6 shadow-lift flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h3 className="display text-xl font-bold text-ink">My Saved Itineraries</h3>
                  <p className="text-xs text-ink-soft">
                    {user.savedTrips.length} custom trip plan{user.savedTrips.length !== 1 ? "s" : ""} saved in your vault.
                  </p>
                </div>
                <button
                  onClick={closeSavedTrips}
                  className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper text-ink-soft hover:bg-paper-2 hover:text-ink transition"
                >
                  ✕
                </button>
              </div>

              {/* List of saved trips */}
              <div className="mt-5 space-y-3.5 overflow-y-auto max-h-[70vh] pr-1">
                {user.savedTrips.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-paper-2 p-8 text-center text-ink-soft text-sm">
                    <span className="text-3xl block mb-2">🌴</span>
                    No saved trips yet. When you explore a destination, save it to access it anytime here!
                  </div>
                ) : (
                  user.savedTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="group overflow-hidden rounded-2xl border border-line bg-paper-2 hover:border-brand/50 transition-all shadow-sm flex flex-col justify-between"
                    >
                      <div className="p-4">
                        {trip.destinationHero && (
                          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-paper-3 mb-3">
                            <Image
                              src={trip.destinationHero}
                              alt={trip.destinationName}
                              fill
                              sizes="340px"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                              {trip.durationDays} Days · {trip.travelers} Travelers
                            </span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-base text-ink">{trip.destinationName}</h4>
                            {trip.hotelName && (
                              <p className="text-xs text-ink-soft mt-0.5 truncate">🏨 {trip.hotelName}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="display text-base font-bold text-ink">{inr(trip.totalCost)}</div>
                            <div className="text-[10px] text-ink-faint">total package</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-ink-faint border-t border-line/60 pt-2.5">
                          <span>{trip.sightsCount} sights verified</span>
                          <span>Saved {trip.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-paper-3/40 border-t border-line/60">
                        <button
                          onClick={() => handleLoadTrip(trip)}
                          className="btn-primary !py-1.5 flex-1 !text-xs font-bold"
                        >
                          Open & Modify Itinerary →
                        </button>
                        <button
                          onClick={() => removeSavedTrip(trip.id)}
                          className="btn-ghost !py-1.5 !px-3 !text-xs !text-bad hover:!bg-bad/10"
                          title="Remove saved trip"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-line pt-4">
              <button
                onClick={closeSavedTrips}
                className="btn-ghost w-full !py-2.5 text-xs font-bold"
              >
                Close Vault
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
