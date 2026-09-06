"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { VideoAsset } from "@/lib/types";

const KIND_LABEL: Record<VideoAsset["kind"], string> = {
  road: "Road journey",
  walk: "Walking tour",
  attraction: "Attraction visit",
  room_tour: "Room tour",
  review: "Guest review",
  food: "Local food",
  vlog: "Destination vlog",
  seasonal: "Seasonal conditions",
};

export function VideoRow({ videos, title = "See it through someone else's eyes" }: { videos: VideoAsset[]; title?: string }) {
  if (!videos.length) return null;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span>📺</span>
        <h3 className="text-sm font-semibold text-paper-50">{title}</h3>
        <span className="text-xs text-paper-200/40">· {videos.length} useful videos</span>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {videos.map((v) => (
          <motion.a
            key={v.id}
            href={v.searchUrl}
            target="_blank"
            rel="noreferrer"
            title="Opens a YouTube search"
            whileHover={{ y: -3 }}
            className="group w-64 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-ink-800/60"
          >
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={v.thumbnail}
                alt={v.title}
                fill
                sizes="256px"
                className="object-cover transition duration-500 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {v.duration}
              </span>
              <span className="absolute left-2 top-2 rounded-full bg-alpine-500/90 px-2 py-0.5 text-[10px] font-semibold text-ink-950">
                {KIND_LABEL[v.kind]}
              </span>
              <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink-950">▶</span>
              </span>
            </div>
            <div className="p-3">
              <div className="line-clamp-1 text-sm font-semibold text-paper-50">{v.title}</div>
              <div className="text-xs text-paper-200/50">{v.creator}</div>
              <div className="mt-1.5 text-[11px] leading-snug text-paper-200/70">{v.why}</div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
