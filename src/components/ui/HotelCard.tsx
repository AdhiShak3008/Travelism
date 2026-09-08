"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { HotelOption } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { inr, cx } from "@/lib/format";
import { WhyThis } from "./WhyThis";
import { ScoreBar } from "./Primitives";
import { SourceChips } from "./Provenance";
import { ReviewIntelCard } from "./ReviewIntelCard";
import { VideoRow } from "./VideoRow";
import { SteeringBox } from "./SteeringBox";
import { useLightbox } from "./Lightbox";

export function HotelCard({
  hotel,
  selected,
  onChoose,
}: {
  hotel: HotelOption;
  selected: boolean;
  onChoose?: () => void;
}) {
  const dataset = useTrip((s) => s.dataset);
  const chooseHotel = useTrip((s) => s.chooseHotel);
  const toggleLock = useTrip((s) => s.toggleLock);
  const locked = useTrip((s) => s.blob.lockedComponentIds.includes(hotel.id));
  const [expanded, setExpanded] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  const lightbox = useLightbox();
  const intel = dataset?.reviews[hotel.reviewIntelId];
  const videos = dataset?.videos.filter((v) => hotel.videoIds?.includes(v.id)) ?? [];
  const bathroomImg = hotel.images.find((im) => im.category === "bathroom");

  const hotelSearchUrl = `https://www.google.com/travel/hotels?q=${encodeURIComponent(`${hotel.name} ${hotel.location}`)}`;

  const handleSelect = () => {
    chooseHotel(hotel);
    onChoose?.();
  };

  const getAmenityIcon = (name: string) => {
    const l = name.toLowerCase();
    if (l.includes("wifi") || l.includes("wi-fi") || l.includes("internet")) return "📶";
    if (l.includes("pool")) return "🏊‍♂️";
    if (l.includes("heat") || l.includes("warm")) return "🔥";
    if (l.includes("water") || l.includes("geyser") || l.includes("bath")) return "🚿";
    if (l.includes("air") || l.includes("ac")) return "❄️";
    if (l.includes("break") || l.includes("dine") || l.includes("food") || l.includes("tea")) return "🍳";
    if (l.includes("park")) return "🅿️";
    if (l.includes("view") || l.includes("ocean") || l.includes("mountain")) return "🏔️";
    if (l.includes("spa") || l.includes("massage")) return "🧖‍♀️";
    if (l.includes("gym") || l.includes("fitness")) return "💪";
    return "✦";
  };

  const currentImg = hotel.images[activeImgIdx] || hotel.images[0];
  const youtubeVideoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${hotel.name} room tour review ${hotel.location}`)}`;

  return (
    <motion.div
      layout
      className={cx(
        "overflow-hidden rounded-2xl border transition-all duration-300",
        selected
          ? "border-emerald-500 bg-gradient-to-b from-emerald-500/[0.04] to-card shadow-lift ring-2 ring-emerald-500/25"
          : "border-line bg-card shadow-card hover:border-brand/50 hover:shadow-lift"
      )}
    >
      <div className="grid gap-0 md:grid-cols-[320px_1fr]">
        {/* Photo preview container */}
        <div className="relative flex flex-col bg-paper-2 border-b md:border-b-0 md:border-r border-line">
          <button
            className="relative aspect-[4/3] w-full overflow-hidden bg-paper-3 md:aspect-auto md:h-56 cursor-zoom-in"
            onClick={() => currentImg?.url && lightbox.open(hotel.images, activeImgIdx, hotel.name)}
            title="Click to view full screen photos"
          >
            {currentImg?.url ? (
              <>
                <Image
                  src={currentImg.url}
                  alt={hotel.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  unoptimized
                />
                <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
                  📷 {activeImgIdx + 1}/{hotel.images.length || 1}
                </span>
              </>
            ) : (
              <div className="grid h-full place-items-center text-3xl">🏨</div>
            )}

            {selected && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
                <span>✓</span> Active Selection
              </span>
            )}
            {locked && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md shadow-md">
                <span>🔒</span> Locked
              </span>
            )}
          </button>

          {/* Mini thumbnails strip */}
          {hotel.images.length > 1 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-paper-2/95 border-t border-line/70">
              {hotel.images.slice(0, 5).map((im, idx) => (
                <button
                  key={im.id || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIdx(idx);
                  }}
                  className={cx(
                    "relative h-10 w-14 overflow-hidden rounded-lg border transition-all",
                    activeImgIdx === idx ? "border-brand ring-2 ring-brand/40 scale-105" : "border-line opacity-75 hover:opacity-100"
                  )}
                >
                  <Image src={im.url} alt="" fill sizes="56px" className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <a
                    href={hotelSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="display text-xl font-bold text-ink hover:text-brand hover:underline transition inline-flex items-center gap-1.5"
                    title="Open hotel on Google Travel / Hotels (Right click for new tab)"
                  >
                    <span>{hotel.name}</span>
                    <span className="text-xs text-brand/70 font-normal">↗</span>
                  </a>
                  {selected && (
                    <span className="hidden sm:inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      Primary Stay
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                  <p className="flex items-center gap-1">
                    <span>📍</span> {hotel.location}
                  </p>
                  <a
                    href={youtubeVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link !text-[11px] !text-rose-600 dark:!text-rose-400 font-semibold"
                    title="Watch hotel room tour & video reviews on YouTube"
                  >
                    ▶ Room Tour Video ↗
                  </a>
                </div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-paper-2 px-3 py-1 text-xs font-medium text-ink-soft border border-line">
                  <span>🛏️</span>
                  <span>{hotel.room || "Deluxe Guest Room"}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="display text-2xl font-bold text-ink">{inr(hotel.pricePerNight)}</div>
                <div className="text-xs text-ink-faint">per room / night</div>
              </div>
            </div>

            {/* Ratings & quality metrics */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ScoreBar label="Cleanliness Rating" value={hotel.cleanliness} />
              <ScoreBar label="Bathroom Quality" value={hotel.bathroomScore} />
            </div>

            {/* Verified amenities chips */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              {hotel.amenities.map((a) => (
                <span
                  key={a}
                  className="chip !text-[11px] !py-0.5 !px-2.5 !bg-paper-2 font-medium border border-line flex items-center gap-1 text-ink/90"
                >
                  <span>{getAmenityIcon(a)}</span> {a}
                </span>
              ))}
              {hotel.hasElevator && (
                <span className="chip !text-[11px] !py-0.5 !px-2.5 !bg-paper-2 font-medium border border-line flex items-center gap-1 text-ink/90">
                  <span>🛗</span> Elevator
                </span>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <WhyThis
                title="Why this stay is recommended"
                reasons={hotel.whyReasons}
                basis={[`${intel?.count ?? 120} verified reviews`, `${hotel.images.length} photos`, `${hotel.sourceIds.length} sources`]}
                confidence={hotel.confidence}
              />
              <SourceChips sourceIds={hotel.sourceIds} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleLock(hotel.id)}
                className={cx(
                  "btn-ghost !py-2 !px-3 text-xs font-semibold",
                  locked && "!border-amber-500/50 !text-amber-600 dark:!text-amber-400 !bg-amber-500/10"
                )}
                title={locked ? "Stay is locked to this choice" : "Lock this stay to your trip"}
              >
                {locked ? "🔒 Locked" : "🔓 Lock"}
              </button>

              {selected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm">
                  <span>✓</span> Selected for Trip
                </span>
              ) : (
                <button
                  onClick={handleSelect}
                  className="btn-primary !py-2 !px-4 text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition"
                >
                  Choose This Stay →
                </button>
              )}

              <button
                onClick={() => setExpanded((e) => !e)}
                className="btn-ghost !py-2 !px-3 text-xs font-medium"
              >
                {expanded ? "Hide Details ▲" : "Intel & Reviews ▼"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded reviews, photos & policies */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-line bg-paper-2/40"
          >
            <div className="space-y-6 p-5 sm:p-6">
              {/* Photo gallery */}
              <div>
                <div className="mb-2 label-eyebrow">
                  Verified Photos {bathroomImg ? "(incl. guest bathroom)" : ""}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {hotel.images.map((im, idx) => (
                    <button
                      key={im.id || idx}
                      onClick={() => lightbox.open(hotel.images, idx, hotel.name)}
                      className="relative aspect-video w-full overflow-hidden rounded-xl border border-line transition-transform hover:scale-105 shadow-sm"
                    >
                      <Image src={im.url} alt={im.category} fill sizes="192px" className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              </div>

              {intel && <ReviewIntelCard intel={intel} />}
              {videos.length > 0 && <VideoRow videos={videos} title="Room tour & guest reviews" />}

              {/* Policies & Amenities list */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-paper-2 p-4">
                  <div className="mb-2 label-eyebrow">Policies & Check-in</div>
                  <ul className="space-y-1.5 text-xs text-ink-soft">
                    {hotel.policies.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-brand">·</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-line bg-paper-2 p-4">
                  <div className="mb-2 label-eyebrow">Room Highlights</div>
                  <div className="space-y-1.5 text-xs text-ink-soft">
                    <div>🛏️ <strong>Room Type:</strong> {hotel.room}</div>
                    <div>💰 <strong>Estimated Cost:</strong> {inr(hotel.pricePerNight)}/night</div>
                    <div>📍 <strong>Location:</strong> {hotel.location}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={hotelSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link !text-xs font-semibold"
                >
                  View live rates on Google Hotels ↗
                </a>
              </div>

              <SteeringBox scope="hotel" entityId={hotel.id} title="Customize this stay" compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
