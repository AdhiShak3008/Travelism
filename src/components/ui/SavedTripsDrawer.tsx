"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, type SavedTripSummary } from "@/store/authStore";
import { useTrip } from "@/store/tripStore";
import { inr } from "@/lib/format";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80";

export function SavedTripsDrawer() {
  const { isSavedTripsOpen, closeSavedTrips, user, removeSavedTrip } = useAuth();
  const startDream = useTrip((s) => s.startDream);
  const restoreSavedTrip = useTrip((s) => s.restoreSavedTrip);
  const setStage = useTrip((s) => s.setStage);
  const [searchQuery, setSearchQuery] = useState("");

  const savedTrips = useMemo(() => {
    return user?.savedTrips || [];
  }, [user?.savedTrips]);

  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return savedTrips;
    const q = searchQuery.toLowerCase().trim();
    return savedTrips.filter(
      (t) =>
        t.destinationName.toLowerCase().includes(q) ||
        (t.hotelName && t.hotelName.toLowerCase().includes(q))
    );
  }, [savedTrips, searchQuery]);

  if (!isSavedTripsOpen || !user) return null;

  const handleOpenItinerary = (trip: SavedTripSummary) => {
    closeSavedTrips();
    if (trip.blobSnapshot && trip.datasetSnapshot) {
      restoreSavedTrip(trip.blobSnapshot, trip.datasetSnapshot);
      return;
    }

    // Check if the current in-memory trip matches this destination
    const { blob, dataset } = useTrip.getState();
    if (
      dataset &&
      blob.destinationName?.toLowerCase().trim() === trip.destinationName.toLowerCase().trim()
    ) {
      setStage("package");
      return;
    }

    // If legacy save without snapshot, prompt user whether to trigger swarms
    const shouldRunSwarms = window.confirm(
      `This saved itinerary was stored in an earlier session without an offline snapshot.\n\nTrigger the AI Swarms to re-scout and generate the full day-by-day itinerary for ${trip.destinationName}?`
    );
    if (shouldRunSwarms) {
      startDream(trip.destinationName, {
        durationDays: trip.durationDays,
        travelers: trip.travelers,
      });
    }
  };

  const handleTriggerSwarms = (trip: SavedTripSummary) => {
    closeSavedTrips();
    startDream(trip.destinationName, {
      durationDays: trip.durationDays,
      travelers: trip.travelers,
    });
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
            className="w-screen max-w-lg border-l border-line bg-card p-6 shadow-lift flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💼</span>
                    <h3 className="display text-xl font-bold text-ink">My Saved Itineraries</h3>
                  </div>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {savedTrips.length} custom trip plan{savedTrips.length !== 1 ? "s" : ""} saved in your vault.
                  </p>
                </div>
                <button
                  onClick={closeSavedTrips}
                  className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper text-ink-soft hover:bg-paper-2 hover:text-ink transition"
                >
                  ✕
                </button>
              </div>

              {/* Search Bar (when there are multiple trips) */}
              {savedTrips.length > 2 && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search saved destinations or stays..."
                    className="w-full rounded-xl border border-line bg-paper-2 px-3.5 py-2 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-1 focus:ring-brand/20 transition"
                  />
                </div>
              )}

              {/* List of saved trips */}
              <div className="mt-4 space-y-3.5 overflow-y-auto max-h-[66vh] pr-1">
                {filteredTrips.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-paper-2 p-8 text-center text-ink-soft text-sm">
                    <span className="text-3xl block mb-2">🌴</span>
                    {searchQuery ? "No saved trips matched your search query." : "No saved trips yet. When you explore a destination, save it to access it anytime here!"}
                  </div>
                ) : (
                  filteredTrips.map((trip) => (
                    <SavedTripCard
                      key={trip.id}
                      trip={trip}
                      onOpenItinerary={() => handleOpenItinerary(trip)}
                      onTriggerSwarms={() => handleTriggerSwarms(trip)}
                      onDelete={() => removeSavedTrip(trip.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-line pt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-ink-faint">
                {savedTrips.length} itinerary snapshot{savedTrips.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={closeSavedTrips}
                className="btn-ghost !py-2 !px-5 text-xs font-bold"
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

function SavedTripCard({
  trip,
  onOpenItinerary,
  onTriggerSwarms,
  onDelete,
}: {
  trip: SavedTripSummary;
  onOpenItinerary: () => void;
  onTriggerSwarms: () => void;
  onDelete: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(trip.destinationHero || FALLBACK_HERO);

  return (
    <div className="group overflow-hidden rounded-2xl border border-line bg-paper-2 hover:border-brand/50 transition-all shadow-sm flex flex-col justify-between">
      <div className="p-4">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-paper-3 mb-3">
          <Image
            src={imgSrc}
            alt={trip.destinationName}
            fill
            sizes="360px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgSrc(FALLBACK_HERO)}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {trip.durationDays} Days · {trip.travelers} Traveler{trip.travelers > 1 ? "s" : ""}
          </span>
          <span className="absolute top-2 right-2 rounded-md bg-brand/90 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm shadow-xs">
            Saved Plan
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-bold text-base text-ink truncate">{trip.destinationName}</h4>
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

      <div className="flex flex-col gap-2 p-3 bg-paper-3/40 border-t border-line/60">
        <button
          onClick={onOpenItinerary}
          className="btn-primary !py-2 w-full !text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
          title="Open day-by-day itinerary directly with AI Concierge ready (No swarm re-investigation)"
        >
          <span>Open Itinerary (AI Concierge)</span>
          <span>→</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerSwarms}
            className="rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-brand hover:border-brand/40 transition flex-1 flex items-center justify-center gap-1"
            title="Re-run the AI web crawling swarm agents for fresh intelligence"
          >
            <span>⚡ Re-run Swarms</span>
          </button>
          <button
            onClick={onDelete}
            className="btn-ghost !py-1.5 !px-3 !text-xs !text-bad hover:!bg-bad/10"
            title="Remove saved trip"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
