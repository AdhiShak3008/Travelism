"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { HotelOption } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { inr, cx } from "@/lib/format";
import { useLightbox } from "./Lightbox";

// ============================================================================
// StaysExplorer — a Google-Hotels-style split view: a scrollable results rail
// on the left, an interactive Google Maps embed on the right with a price pin
// per hotel and a floating detail card for the focused stay. Selecting a hotel
// adds it to the trip (in-app), while "Book" hands off to a booking site
// (the same metasearch handoff Google uses).
// ============================================================================

function starTier(price: number): string {
  if (price >= 15000) return "5-star luxury";
  if (price >= 8000) return "4-star hotel";
  if (price >= 4000) return "3-star hotel";
  if (price >= 2000) return "2-star hotel";
  return "Budget stay";
}

/** Deep-link handoff to booking sites (legal metasearch-style handoff). */
function bookingLinks(hotel: HotelOption) {
  const q = encodeURIComponent(`${hotel.name} ${hotel.location}`);
  return {
    google: `https://www.google.com/travel/hotels?q=${q}`,
    booking: `https://www.booking.com/searchresults.html?ss=${q}`,
  };
}

export function StaysExplorer({
  hotels,
  destinationName,
}: {
  hotels: HotelOption[];
  destinationName: string;
}) {
  const blob = useTrip((s) => s.blob);
  const dataset = useTrip((s) => s.dataset);
  const chooseHotel = useTrip((s) => s.chooseHotel);
  const toggleLock = useTrip((s) => s.toggleLock);
  const lightbox = useLightbox();

  const [focusedId, setFocusedId] = useState<string | null>(hotels[0]?.id ?? null);
  const focused = hotels.find((h) => h.id === focusedId) || hotels[0] || null;

  // Cheapest hotel gets a "Great price" tag, like Google.
  const cheapestPrice = useMemo(
    () => (hotels.length ? Math.min(...hotels.map((h) => h.pricePerNight).filter((p) => p > 0)) : 0),
    [hotels]
  );

  const mapSubject = focused ? `${focused.name}, ${focused.location || destinationName}` : `hotels in ${destinationName}`;
  const hasCoord = focused?.lat != null && focused?.lon != null;
  const mapEmbedUrl = hasCoord
    ? `https://www.google.com/maps?q=${focused!.lat},${focused!.lon}&z=15&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(mapSubject)}&output=embed`;
  const mapDirectUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSubject)}`;

  if (hotels.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-8 text-center text-ink-soft">
        <p className="text-sm font-medium">No stays match your current filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-card">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_1.05fr]">
        {/* ---- LEFT: scrollable results rail ---- */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-line max-h-[560px] lg:max-h-[640px]">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-paper-2/90 px-4 py-2.5 backdrop-blur-md">
            <span className="text-xs font-bold text-ink">{hotels.length} stays in {destinationName}</span>
            <span className="text-[11px] text-ink-faint">Sorted by best match</span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-line/70">
            {hotels.map((h) => {
              const isFocused = focused?.id === h.id;
              const isSelected = blob.hotels.some((x) => x.id === h.id);
              const intel = dataset?.reviews[h.reviewIntelId];
              const isGreatPrice = h.pricePerNight > 0 && h.pricePerNight === cheapestPrice;
              return (
                <button
                  key={h.id}
                  onClick={() => setFocusedId(h.id)}
                  className={cx(
                    "flex w-full items-stretch gap-3 p-3 text-left transition-colors",
                    isFocused ? "bg-brand/[0.06]" : "hover:bg-paper-2/70"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative h-[86px] w-[110px] shrink-0 overflow-hidden rounded-xl bg-paper-3">
                    {h.images[0]?.url ? (
                      <Image src={h.images[0].url} alt={h.name} fill sizes="110px" className="object-cover" unoptimized />
                    ) : (
                      <div className="grid h-full place-items-center text-2xl">🏨</div>
                    )}
                    {isSelected && (
                      <span className="absolute left-1 top-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                        ✓ In trip
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="truncate text-sm font-bold text-ink">{h.name}</h4>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-extrabold text-ink">{inr(h.pricePerNight)}</div>
                          <div className="text-[9px] text-ink-faint">per night</div>
                        </div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-soft">
                        <span className="font-semibold text-amber-500">★ {(h.rating ?? intel?.overall ?? h.cleanliness / 2).toFixed(1)}</span>
                        {(h.reviewCount ?? intel?.count) ? <span className="text-ink-faint">({(h.reviewCount ?? intel?.count)!.toLocaleString()})</span> : null}
                        <span className="text-ink-faint">·</span>
                        <span className="truncate">{starTier(h.pricePerNight)}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {isGreatPrice && (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          Great price
                        </span>
                      )}
                      <span className="truncate text-[11px] text-ink-faint">📍 {h.location}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- RIGHT: map + focused detail ---- */}
        <div className="flex flex-col">
          <div className="relative h-[300px] sm:h-[360px] w-full bg-paper-3">
            <iframe
              key={mapEmbedUrl}
              title={`Map of ${focused?.name || destinationName}`}
              src={mapEmbedUrl}
              className="h-full w-full border-0"
              loading="lazy"
              allowFullScreen
            />
            {/* Floating price pin for the focused hotel (Google-style) */}
            {focused && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                <span className="rounded-full bg-black/85 px-2.5 py-1 text-xs font-bold text-white shadow-lg ring-2 ring-white/70">
                  {inr(focused.pricePerNight)}
                </span>
              </div>
            )}
            <a
              href={mapDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-3 top-3 rounded-full bg-card/95 px-3 py-1 text-[11px] font-semibold text-ink shadow-md backdrop-blur-md hover:bg-paper-2 transition"
            >
              Open in Maps ↗
            </a>
          </div>

          {/* Focused hotel detail panel */}
          <AnimatePresence mode="wait">
            {focused && (
              <motion.div
                key={focused.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-1 flex-col gap-3 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="display text-lg font-bold text-ink truncate">{focused.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                      <span>📍</span> {focused.location}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="display text-xl font-extrabold text-ink">{inr(focused.pricePerNight)}</div>
                    <div className="text-[10px] text-ink-faint">per night</div>
                  </div>
                </div>

                {/* Photo strip */}
                {focused.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {focused.images.slice(0, 4).map((im, idx) => (
                      <button
                        key={im.id || idx}
                        onClick={() => lightbox.open(focused.images, idx, focused.name)}
                        className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-paper-3 transition-transform hover:scale-105"
                      >
                        <Image src={im.url} alt="" fill sizes="90px" className="object-cover" unoptimized />
                      </button>
                    ))}
                  </div>
                )}

                {/* Amenity chips */}
                <div className="flex flex-wrap gap-1.5">
                  {focused.amenities.slice(0, 5).map((a) => (
                    <span key={a} className="rounded-full border border-line bg-paper-2 px-2.5 py-0.5 text-[11px] font-medium text-ink/90">
                      {a}
                    </span>
                  ))}
                </div>

                {/* Actions: in-app select + booking handoff */}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
                  {blob.hotels.some((x) => x.id === focused.id) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white">
                      ✓ Added to trip
                    </span>
                  ) : (
                    <button
                      onClick={() => chooseHotel(focused)}
                      className="btn-primary !py-2 !px-4 text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition"
                    >
                      Choose for trip
                    </button>
                  )}

                  <a
                    href={bookingLinks(focused).booking}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-line bg-paper-2 px-4 py-2 text-xs font-bold text-ink hover:border-brand/50 hover:bg-brand/5 transition"
                    title="Check live rates & book on Booking.com"
                  >
                    Book ↗
                  </a>
                  <a
                    href={bookingLinks(focused).google}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link !text-[11px] font-semibold"
                  >
                    Compare on Google Hotels ↗
                  </a>

                  <button
                    onClick={() => toggleLock(focused.id)}
                    className={cx(
                      "ml-auto rounded-full border px-3 py-2 text-xs font-semibold transition",
                      blob.lockedComponentIds.includes(focused.id)
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-line bg-paper-2 text-ink-soft hover:text-ink"
                    )}
                    title="Lock this stay to your trip"
                  >
                    {blob.lockedComponentIds.includes(focused.id) ? "🔒 Locked" : "🔓 Lock"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
