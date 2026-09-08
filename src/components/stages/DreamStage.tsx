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
  { label: "✨ Bucket List Wonders", query: "A slow trip to Ladakh & Nubra Valley with Pangong Tso lake, mountain passes, and stargazing" },
];

const SUGGESTIONS = [
  "Tawang for 7 days — clean mountain stays & lakes",
  "Kyoto & Tokyo, Japan in autumn",
  "Ladakh & Nubra Valley slow roadtrip",
  "Meghalaya waterfalls & living root bridges",
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
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
}

export function DreamStage() {
  const startDream = useTrip((s) => s.startDream);
  const openPreferences = useAuth((s) => s.openPreferences);
  const [text, setText] = useState("");
  const [coverIdx, setCoverIdx] = useState(0);

  useEffect(() => {
    setCoverIdx(Math.floor(Math.random() * COVERS.length));
  }, []);
  const cover = COVERS[coverIdx];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-terra/10 blur-[130px]" />

      {/* Modern Top Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-paper/80 px-6 py-4 backdrop-blur-xl sm:px-10">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-tr from-brand to-emerald-400 text-base font-extrabold text-white shadow-md shadow-brand/20">
            T
          </div>
          <div>
            <span className="display text-xl font-bold tracking-tight text-ink">Travelism</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openPreferences}
            className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-xs font-bold text-brand shadow-xs hover:bg-brand/20 active:scale-95 transition"
            title="Customize your personal Travel DNA, pace, budget & hotel tastes"
          >
            <span>🧬</span>
            <span>Travel DNA</span>
          </button>
          <UserMenu />
          <ThemeToggle />
        </div>
      </div>

      {/* Main Hero Container */}
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-8 py-10 lg:grid-cols-[1.1fr_0.9fr] w-full min-w-0 overflow-hidden">
        {/* Left Column — Hero Copy & Prompt Console */}
        <div className="flex flex-col justify-center min-w-0 w-full">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Live Intelligence Status Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-bold text-brand shadow-sm mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              <span>5 Autonomous Director Agents Online</span>
            </div>

            <h1 className="display text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-ink">
              Design Your Next{" "}
              <span className="bg-gradient-to-r from-brand via-emerald-500 to-terra bg-clip-text text-transparent">
                Unforgettable
              </span>{" "}
              Journey.
            </h1>

            <p className="mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-ink-soft">
              Tell our autonomous swarm where you want to go. Executive parent agents scout verified spots, live Google imagery, clean boutique stays, and real-world flight connections.
            </p>
          </motion.div>

          {/* Prompt Console Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-8 w-full min-w-0"
          >
            {/* Quick Inspiration Pills */}
            <div className="mb-3.5 flex flex-wrap gap-2 w-full">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setText(cat.query)}
                  className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-semibold text-ink-soft shadow-sm hover:border-brand/50 hover:bg-brand/5 hover:text-brand transition-all"
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Input Card */}
            <div className="card p-3.5 shadow-lift border-line-strong/60 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all w-full min-w-0">
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) startDream(text);
                }}
                rows={4}
                placeholder="I want to explore Kyoto & Tokyo for 7 days in autumn. I want clean boutique stays, authentic ramen spots, quiet zen temples, and bullet trains…"
                className="w-full resize-none rounded-2xl bg-transparent px-3.5 py-2.5 text-base sm:text-lg leading-relaxed text-ink outline-none placeholder:text-ink-faint/60"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 px-2 pb-1 pt-3">
                <span className="text-xs font-medium text-ink-faint">
                  Press <kbd className="rounded bg-paper-3 px-1.5 py-0.5 font-mono text-[11px] text-ink">Ctrl+Enter</kbd> to launch
                </span>

                <button
                  onClick={() => text.trim() && startDream(text)}
                  disabled={!text.trim()}
                  className="btn-primary !px-7 !py-3 text-sm font-extrabold shadow-lift"
                >
                  <span>Launch Swarm Investigation</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Popular Suggestions */}
            <div className="mt-4 flex flex-wrap items-center gap-2 w-full">
              <span className="text-xs font-bold text-ink-faint mr-1">Trending:</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setText(s)}
                  className="rounded-full border border-line bg-paper-2 px-3 py-1 text-xs font-medium text-ink-soft transition hover:border-brand/40 hover:bg-paper-3 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Platform Stats Row */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-line bg-card/60 p-4 shadow-sm backdrop-blur-md w-full">
              <div>
                <div className="display text-xl sm:text-2xl font-black text-ink">1,400+</div>
                <div className="text-[11px] font-semibold text-ink-soft">Verified Accommodations</div>
              </div>
              <div>
                <div className="display text-xl sm:text-2xl font-black text-brand">100%</div>
                <div className="text-[11px] font-semibold text-ink-soft">Real Google Data & Imagery</div>
              </div>
              <div>
                <div className="display text-xl sm:text-2xl font-black text-ink">5 Swarms</div>
                <div className="text-[11px] font-semibold text-ink-soft">Hierarchical Parent Agents</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column — Cinematic Showcase Card */}
        <div className="relative hidden items-center justify-center lg:flex">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative w-full max-w-md"
          >
            <div className="group relative overflow-hidden rounded-[32px] border border-line bg-card p-3 shadow-lift transition-all duration-500 hover:shadow-2xl">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[24px]">
                <Image
                  src={coverUrl(cover.id)}
                  alt={cover.title}
                  fill
                  priority
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                {/* Floating Top Tag */}
                <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/50 px-3.5 py-1 text-xs font-bold text-white backdrop-blur-md shadow-sm">
                  {cover.tag}
                </div>

                {/* Floating Live Verification Badge */}
                <div className="absolute right-4 top-4 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md shadow-sm flex items-center gap-1">
                  <span>✓</span> Real-Time Intel
                </div>

                {/* Bottom Caption Overlay */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/80 flex items-center gap-1">
                    <span>📍</span> {cover.location}
                  </div>
                  <h3 className="display text-2xl font-bold mt-1 leading-tight drop-shadow-md">
                    {cover.title}
                  </h3>
                  <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-2 text-[11px] text-white/75">
                    <span>Autonomous Itinerary Engine</span>
                    <span className="font-bold text-white">Travelism 2.0</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

