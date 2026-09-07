"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { VideoAsset } from "@/lib/types";

const KIND_LABEL: Record<VideoAsset["kind"], string> = {
  road: "The drive",
  walk: "Walking tour",
  attraction: "The visit",
  room_tour: "Room tour",
  review: "Guest review",
  food: "Local food",
  vlog: "Travel diary",
  seasonal: "Seasonal look",
};

export function VideoRow({ videos, title = "See it for yourself" }: { videos: VideoAsset[]; title?: string }) {
  if (!videos.length) return null;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span>📺</span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-xs text-ink-faint">· {videos.length} clips</span>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {videos.map((v) => (
          <motion.a
            key={v.id}
            href={v.searchUrl}
            target="_blank"
            rel="noreferrer"
            title="Opens on YouTube"
            whileHover={{ y: -3 }}
            className="group w-64 shrink-0 overflow-hidden rounded-xl border border-line bg-card"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {v.duration && (
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {v.duration}
                </span>
              )}
              <span className="stamp absolute left-2 top-2 !bg-white/85 backdrop-blur">{KIND_LABEL[v.kind]}</span>
              <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink">▶</span>
              </span>
            </div>
            <div className="p-3">
              <div className="line-clamp-1 text-sm font-semibold text-ink">{v.title}</div>
              <div className="text-xs text-ink-faint">{v.creator}</div>
              <div className="mt-1.5 text-[11px] leading-snug text-ink-soft">{v.why}</div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
