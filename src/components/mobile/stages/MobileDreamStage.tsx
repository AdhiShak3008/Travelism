"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTrip } from "@/store/tripStore";
import { useAuth } from "@/store/authStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";

const CATEGORIES = [
  { label: "🏝️ Tropical Islands", query: "Bali and Gili Islands for a relaxing 8 days with beachfront villas, surfing, and sunset dining" },
  { label: "🏔️ Alpine Summits", query: "Tawang for 7 days — clean stays, monastery views, alpine lakes, and big mountain scenery" },
  { label: "🏯 Cultural Capitals", query: "Kyoto & Tokyo, Japan in autumn with authentic culinary walks, quiet temples, and bullet trains" },
  { label: "🍷 Wine & Gastronomy", query: "Tuscany & Florence for a slow 10 days with countryside vineyard stays and olive groves" },
  { label: "✨ Bucket List", query: "A slow trip to Ladakh & Nubra Valley with Pangong Tso lake, mountain passes, and stargazing" },
];

const SUGGESTIONS = [
  "Tawang for 7 days — clean mountain stays & lakes",
  "Kyoto & Tokyo, Japan in autumn",
  "Ladakh & Nubra Valley slow roadtrip",
  "Meghalaya waterfalls & living root bridges",
  "7-day self-supported bikepacking loop in Spiti with wild camping",
  "Coorg coffee estates & serene homestays",
];

const COVERS = [
  { id: "photo-1544735716-392fe2489ffa", tag: "Himalayas · High Altitude", title: "Where the peaks touch the sky", location: "Tawang & Arunachal" },
  { id: "photo-1506905925346-21bda4d32df4", tag: "Alps · High Country", title: "Winding roads & crisp mountain air", location: "Swiss Alps" },
  { id: "photo-1469854523086-cc02fe5d8800", tag: "Coastline · Ocean Escapes", title: "Endless azure water & salt breeze", location: "Amalfi Coast" },
  { id: "photo-1502602898657-3e91760cbb34", tag: "Metropolis · Historic Streets", title: "Streets steeped in timeless stories", location: "Paris, France" },
  { id: "photo-1526772662000-3f88f10405ff", tag: "Heritage · Ancient Temples", title: "Serene morning rituals and bamboo groves", location: "Kyoto, Japan" },
  { id: "photo-1439066615861-d1af74d74000", tag: "Alpine Lakes · Pure Waters", title: "Reflections on crystal-clear shores", location: "Lake Como" },
  { id: "photo-1470770841072-f978cf4d019e", tag: "Wilderness · Untouched Nature", title: "Far off the standard tourist trail", location: "New Zealand" },
];

function coverUrl(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
}

export function MobileDreamStage() {
  const startDream = useTrip((s) => s.startDream);
  const openPreferences = useAuth((s) => s.openPreferences);
  const [text, setText] = useState("");
  const [coverIdx, setCoverIdx] = useState(0);

  useEffect(() => {
    setCoverIdx(Math.floor(Math.random() * COVERS.length));
  }, []);

  const cover = COVERS[coverIdx];

  return (
    <div className="min-h-screen bg-paper px-4 py-4 pb-24 overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed -top-20 -left-20 h-64 w-64 rounded-full bg-brand/15 blur-[90px]" />
      <div className="pointer-events-none fixed top-1/2 -right-20 h-64 w-64 rounded-full bg-terra/10 blur-[90px]" />

      {/* Top App Bar */}
      <div className="flex items-center justify-between mb-4 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-brand to-emerald-400 text-sm font-extrabold text-white shadow-sm">
            T
          </div>
          <span className="display text-lg font-bold text-ink tracking-tight">Travelism</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openPreferences}
            className="flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand shadow-2xs active:scale-95 transition"
            title="Travel DNA & Preferences"
          >
            <span>🧬</span>
            <span>DNA</span>
          </button>
          <UserMenu />
          <ThemeToggle />
        </div>
      </div>

      {/* Live Intelligence Status Badge */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-bold text-brand shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          <span>17 Autonomous Swarm Agents Online</span>
        </div>
      </motion.div>

      {/* Hero Title */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="display text-3xl font-extrabold leading-tight tracking-tight text-ink">
          Design Your Next{" "}
          <span className="bg-gradient-to-r from-brand via-emerald-500 to-terra bg-clip-text text-transparent">
            Unforgettable
          </span>{" "}
          Journey.
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Brief our autonomous agent swarm. We scout verified spots, live imagery, clean boutique stays, and real flight connections.
        </p>
      </motion.div>

      {/* Quick Category Inspiration Pills */}
      <div className="mt-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-2">
          Popular Inspirations
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setText(cat.query)}
              className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft active:bg-brand/10 active:text-brand transition-all shadow-xs"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Console Box */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-4"
      >
        <div className="card p-3 shadow-lift border-line-strong/70 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="e.g. 7-day loop in Spiti with wild camping by rivers, or a relaxed week in Miami with beachside boutique hotels…"
            className="w-full resize-none rounded-xl bg-transparent p-1.5 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint/60"
          />

          <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2.5">
            <span className="text-[11px] font-medium text-ink-faint">
              {text.length > 0 ? `${text.length} chars` : "Type any destination"}
            </span>

            <button
              onClick={() => text.trim() && startDream(text)}
              disabled={!text.trim()}
              className="btn-primary !px-5 !py-2 text-xs font-extrabold shadow-md disabled:opacity-40"
            >
              <span>Launch Swarm</span>
              <span className="ml-1">→</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Visual Cover Lookbook Card (Matching PC Experience) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="mt-6"
      >
        <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-line shadow-card">
          <Image
            src={coverUrl(cover.id)}
            alt={cover.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          {/* Badge & Title */}
          <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="rounded-full border border-white/30 bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                📍 {cover.location}
              </span>
              <span className="text-[10px] font-semibold text-white/80">
                {cover.tag}
              </span>
            </div>
            <h3 className="display text-sm font-bold text-white leading-snug drop-shadow-sm">
              &ldquo;{cover.title}&rdquo;
            </h3>
            <button
              onClick={() => setText(`${cover.location} for a scenic vacation with clean boutique stays, good food, and relaxed sightseeing.`)}
              className="mt-2 text-[11px] font-bold text-emerald-300 underline underline-offset-2 hover:text-white"
            >
              + Use this destination
            </button>
          </div>
        </div>
      </motion.div>

      {/* Suggested Inspiration Chips */}
      <div className="mt-5 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
          Quick Prompts
        </div>
        <div className="flex flex-col gap-1.5">
          {SUGGESTIONS.map((sug) => (
            <button
              key={sug}
              onClick={() => setText(sug)}
              className="flex items-center justify-between rounded-xl border border-line/70 bg-card/80 p-2.5 text-left text-xs font-medium text-ink hover:border-brand/50 hover:bg-brand/5 active:scale-[0.99] transition shadow-2xs"
            >
              <span className="line-clamp-1">{sug}</span>
              <span className="text-xs text-brand font-bold shrink-0 ml-2">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
