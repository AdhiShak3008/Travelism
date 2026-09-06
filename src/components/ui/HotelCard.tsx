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

export function HotelCard({ hotel, selected }: { hotel: HotelOption; selected: boolean }) {
  const dataset = useTrip((s) => s.dataset);
  const chooseHotel = useTrip((s) => s.chooseHotel);
  const toggleLock = useTrip((s) => s.toggleLock);
  const locked = useTrip((s) => s.blob.lockedComponentIds.includes(hotel.id));
  const [expanded, setExpanded] = useState(selected);
  const [showAlts, setShowAlts] = useState(false);

  const intel = dataset?.reviews[hotel.reviewIntelId];
  const videos = dataset?.videos.filter((v) => hotel.videoIds.includes(v.id)) ?? [];
  const alts = dataset?.hotels.filter((h) => h.id !== hotel.id) ?? [];
  const bathroomImg = hotel.images.find((im) => im.category === "bathroom");

  return (
    <motion.div
      layout
      className={cx(
        "overflow-hidden rounded-2xl border bg-ink-800/60",
        selected ? "border-alpine-400/40 shadow-glow" : "border-white/[0.06]"
      )}
    >
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        {/* Media */}
        <div className="relative aspect-[4/3] md:aspect-auto">
          <Image src={hotel.images[0]?.url} alt={hotel.name} fill sizes="280px" className="object-cover" unoptimized />
          {locked && (
            <span className="absolute left-3 top-3 chip !border-aurora-400/40 !bg-black/50 !text-aurora-300 backdrop-blur">🔒 Locked</span>
          )}
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold text-paper-50">{hotel.name}</h3>
              <p className="text-sm text-paper-200/60">{hotel.location}</p>
              <p className="mt-1 text-sm text-paper-200/50">{hotel.room}</p>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-semibold text-paper-50">{inr(hotel.pricePerNight)}</div>
              <div className="text-xs text-paper-200/50">per night</div>
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
                title="Why we picked this hotel"
                reasons={hotel.whyReasons}
                basis={[`${intel?.count ?? 0} reviews`, `${hotel.images.length} photos`, `${hotel.sourceIds.length} sources`]}
                confidence={hotel.confidence}
              />
              <SourceChips sourceIds={hotel.sourceIds} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleLock(hotel.id)}
                className={cx("btn-ghost !py-2", locked && "!border-aurora-400/40 !text-aurora-300")}
              >
                {locked ? "🔒 Locked" : "Lock"}
              </button>
              {!selected && (
                <button onClick={() => chooseHotel(hotel)} className="btn-primary !py-2">
                  Select
                </button>
              )}
              <button onClick={() => setExpanded((e) => !e)} className="btn-ghost !py-2">
                {expanded ? "Less" : "Evidence"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="space-y-5 p-5">
              {/* Photo evidence incl. bathroom */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-200/50">
                  Photo evidence {bathroomImg ? "(incl. bathroom)" : ""}
                </div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {hotel.images.map((im) => (
                    <div key={im.id} className="relative h-28 w-40 shrink-0 overflow-hidden rounded-lg">
                      <Image src={im.url} alt={im.category} fill sizes="160px" className="object-cover" unoptimized />
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] uppercase text-white/80">
                        {im.category} · {im.provenance}
                      </span>
                    </div>
                  ))}
                </div>
                {!bathroomImg && (
                  <p className="mt-2 text-xs text-signal-warn">No reliable recent bathroom photos found.</p>
                )}
              </div>

              {intel && <ReviewIntelCard intel={intel} />}

              {videos.length > 0 && <VideoRow videos={videos} title="Room tour & guest reviews" />}

              <div className="rounded-xl border border-white/[0.06] bg-ink-850/60 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-200/50">Policies</div>
                <ul className="space-y-1 text-sm text-paper-100">
                  {hotel.policies.map((p, i) => (
                    <li key={i}>· {p}</li>
                  ))}
                </ul>
              </div>

              {/* Alternatives */}
              <div>
                <button onClick={() => setShowAlts((s) => !s)} className="text-sm font-semibold text-alpine-300">
                  {showAlts ? "Hide alternatives" : `Compare ${alts.length} alternatives`}
                </button>
                <AnimatePresence>
                  {showAlts && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      {alts.map((alt) => (
                        <div key={alt.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-ink-850/60 p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-16 overflow-hidden rounded-lg">
                              <Image src={alt.images[0]?.url} alt={alt.name} fill sizes="64px" className="object-cover" unoptimized />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-paper-50">{alt.name}</div>
                              <div className="text-xs text-paper-200/50">
                                Clean {alt.cleanliness} · Bath {alt.bathroomScore} · {inr(alt.pricePerNight)}/night
                              </div>
                            </div>
                          </div>
                          <button onClick={() => chooseHotel(alt, selected ? hotel.id : undefined)} className="btn-ghost !py-1.5 !text-xs">
                            Switch
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <SteeringBox scope="hotel" entityId={hotel.id} title="Comment on this hotel" compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
