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

export function HotelCard({ hotel, selected }: { hotel: HotelOption; selected: boolean }) {
  const dataset = useTrip((s) => s.dataset);
  const chooseHotel = useTrip((s) => s.chooseHotel);
  const toggleLock = useTrip((s) => s.toggleLock);
  const locked = useTrip((s) => s.blob.lockedComponentIds.includes(hotel.id));
  const [expanded, setExpanded] = useState(selected);
  const [showAlts, setShowAlts] = useState(false);

  const lightbox = useLightbox();
  const intel = dataset?.reviews[hotel.reviewIntelId];
  const videos = dataset?.videos.filter((v) => hotel.videoIds.includes(v.id)) ?? [];
  const alts = dataset?.hotels.filter((h) => h.id !== hotel.id) ?? [];
  const bathroomImg = hotel.images.find((im) => im.category === "bathroom");

  return (
    <motion.div layout className={cx("overflow-hidden rounded-2xl border bg-card", selected ? "border-brand shadow-lift ring-1 ring-brand/30" : "border-line shadow-card")}>
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        <button
          className="relative aspect-[4/3] bg-paper-2 md:aspect-auto"
          onClick={() => hotel.images[0]?.url && lightbox.open(hotel.images, 0, hotel.name)}
        >
          {hotel.images[0]?.url ? (
            <>
              <Image src={hotel.images[0].url} alt={hotel.name} fill sizes="280px" className="object-cover" unoptimized />
              {hotel.images.length > 1 && (
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
                  📷 {hotel.images.length}
                </span>
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center text-3xl">🏨</div>
          )}
          {locked && <span className="stamp absolute left-3 top-3 !border-terra/60 !text-terra !bg-white/85 backdrop-blur">Kept</span>}
        </button>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="display text-xl font-semibold text-ink">{hotel.name}</h3>
              <p className="text-sm text-ink-soft">{hotel.location}</p>
              <p className="mt-1 text-sm text-ink-faint">{hotel.room}</p>
            </div>
            <div className="text-right">
              <div className="display text-2xl font-semibold text-ink">{inr(hotel.pricePerNight)}</div>
              <div className="text-xs text-ink-faint">per night</div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <ScoreBar label="Cleanliness" value={hotel.cleanliness} />
            <ScoreBar label="Bathroom" value={hotel.bathroomScore} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hotel.amenities.slice(0, 4).map((a) => (
              <span key={a} className="chip !text-[11px]">{a}</span>
            ))}
            {hotel.hasElevator && <span className="chip !text-[11px]">🛗 Elevator</span>}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <WhyThis
                title="Why we chose this stay"
                reasons={hotel.whyReasons}
                basis={[`${intel?.count ?? 0} reviews`, `${hotel.images.length} photos`, `${hotel.sourceIds.length} sources`]}
                confidence={hotel.confidence}
              />
              <SourceChips sourceIds={hotel.sourceIds} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleLock(hotel.id)} className={cx("btn-ghost !py-2", locked && "!border-terra/50 !text-terra")}>
                {locked ? "🔒 Kept" : "Keep"}
              </button>
              {!selected && (
                <button onClick={() => chooseHotel(hotel)} className="btn-primary !py-2">Choose</button>
              )}
              <button onClick={() => setExpanded((e) => !e)} className="btn-ghost !py-2">
                {expanded ? "Less" : "Details"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-line">
            <div className="space-y-5 p-5">
              <div>
                <div className="mb-2 label-eyebrow">Photos {bathroomImg ? "(incl. bathroom)" : ""}</div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {hotel.images.map((im, idx) => (
                    <button
                      key={im.id}
                      onClick={() => lightbox.open(hotel.images, idx, hotel.name)}
                      className="relative h-28 w-40 shrink-0 overflow-hidden rounded-lg border border-line transition hover:opacity-90"
                    >
                      <Image src={im.url} alt={im.category} fill sizes="160px" className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
                {!bathroomImg && <p className="mt-2 text-xs text-warn">No reliable recent bathroom photos found.</p>}
              </div>

              {intel && <ReviewIntelCard intel={intel} />}
              {videos.length > 0 && <VideoRow videos={videos} title="Room tour & guest reviews" />}

              <div className="rounded-xl border border-line bg-paper-2 p-4">
                <div className="mb-2 label-eyebrow">Good to know</div>
                <ul className="space-y-1 text-sm text-ink">
                  {hotel.policies.map((p, i) => (
                    <li key={i}>· {p}</li>
                  ))}
                </ul>
              </div>

              <div>
                <button onClick={() => setShowAlts((s) => !s)} className="text-sm font-semibold text-brand hover:underline">
                  {showAlts ? "Hide other stays" : `See ${alts.length} other stays`}
                </button>
                <AnimatePresence>
                  {showAlts && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-2 overflow-hidden">
                      {alts.map((alt) => (
                        <div key={alt.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-2 p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-paper-3">
                              {alt.images[0]?.url && <Image src={alt.images[0].url} alt={alt.name} fill sizes="64px" className="object-cover" unoptimized />}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-ink">{alt.name}</div>
                              <div className="text-xs text-ink-faint">Clean {alt.cleanliness} · Bath {alt.bathroomScore} · {inr(alt.pricePerNight)}/night</div>
                            </div>
                          </div>
                          <button onClick={() => chooseHotel(alt, selected ? hotel.id : undefined)} className="btn-ghost !py-1.5 !text-xs">Switch</button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <SteeringBox scope="hotel" entityId={hotel.id} title="Tell us about this stay" compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
