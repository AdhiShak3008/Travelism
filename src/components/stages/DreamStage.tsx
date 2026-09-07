"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTrip } from "@/store/tripStore";
import { ThemeToggle } from "@/components/ThemeToggle";

const SUGGESTIONS = [
  "Tawang for a week — clean stays, big mountain scenery",
  "A slow trip to Ladakh",
  "Meghalaya waterfalls and living root bridges",
  "Coorg coffee country, quiet and easy",
];

// A rotating set of real travel photos for the cover — one is picked at random
// each time the landing mounts, so the "brochure cover" feels fresh.
const COVERS = [
  { id: "photo-1544735716-392fe2489ffa", stamp: "Himalaya · Field notes", caption: "Somewhere worth the trip" },
  { id: "photo-1506905925346-21bda4d32df4", stamp: "Mountains · Field notes", caption: "Where the road climbs" },
  { id: "photo-1469854523086-cc02fe5d8800", stamp: "Coastline · Field notes", caption: "Salt air and slow days" },
  { id: "photo-1502602898657-3e91760cbb34", stamp: "Cities · Field notes", caption: "Streets worth getting lost in" },
  { id: "photo-1526772662000-3f88f10405ff", stamp: "Temples · Field notes", caption: "Quiet, ancient corners" },
  { id: "photo-1439066615861-d1af74d74000", stamp: "Lakes · Field notes", caption: "Still water, big sky" },
  { id: "photo-1470770841072-f978cf4d019e", stamp: "Wild · Field notes", caption: "Off the beaten path" },
  { id: "photo-1476514525535-07fb3b4ae5f1", stamp: "Forests · Field notes", caption: "Green, cool and unhurried" },
  { id: "photo-1512100356356-de1b84283e18", stamp: "Deserts · Field notes", caption: "Endless horizons" },
  { id: "photo-1454496522488-7a8e488e8606", stamp: "Peaks · Field notes", caption: "Above the clouds" },
];

function coverUrl(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=75`;
}

export function DreamStage() {
  const startDream = useTrip((s) => s.startDream);
  const [text, setText] = useState("");
  // start deterministic (no hydration mismatch), then pick a fresh cover on mount
  const [coverIdx, setCoverIdx] = useState(0);
  useEffect(() => {
    setCoverIdx(Math.floor(Math.random() * COVERS.length));
  }, []);
  const cover = COVERS[coverIdx];

  return (
    <div className="relative min-h-screen">
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-paper">T</span>
          <span className="display text-lg font-semibold tracking-tight text-ink">Travelism</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Brochure cover: two-panel spread */}
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-stretch gap-0 lg:grid-cols-2">
        {/* Left — the cover copy */}
        <div className="flex flex-col justify-center px-6 py-24 sm:px-10 lg:pr-12">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="stamp mb-6">Your personal travel studio</div>
            <h1 className="display text-5xl font-semibold leading-[1.04] tracking-tight text-ink sm:text-6xl">
              Where do you want
              <br />
              to <span className="text-terra italic">wander</span>?
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              Tell us the place and the kind of trip you&rsquo;re dreaming about. We&rsquo;ll quietly look into
              everything and hand you a beautiful, ready-to-go plan.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-9"
          >
            <div className="card p-3">
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) startDream(text);
                }}
                rows={4}
                placeholder="I'd love to explore Tawang for about a week. Cheap flights are fine, but I want a clean, comfortable hotel, beautiful scenery, good food — and no rushing…"
                className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-lg leading-relaxed text-ink outline-none placeholder:text-ink-faint/70"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs text-ink-faint">Write it like you&rsquo;d tell a friend</span>
                <button onClick={() => text.trim() && startDream(text)} disabled={!text.trim()} className="btn-primary">
                  Plan my trip →
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setText(s)}
                  className="rounded-full border border-line-strong bg-paper-2 px-3.5 py-1.5 text-sm text-ink-soft transition hover:border-brand/40 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right — a framed brochure photo, like a postcard tucked into the page */}
        <div className="relative hidden items-center justify-center p-10 lg:flex">
          <motion.div
            initial={{ opacity: 0, rotate: 2, y: 20 }}
            animate={{ opacity: 1, rotate: 1.5, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative w-full max-w-md"
          >
            <div className="rounded-[20px] border border-line bg-card p-3 shadow-lift">
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                <Image src={coverUrl(cover.id)} alt={cover.caption} fill priority className="object-cover" unoptimized />
                <div className="absolute left-3 top-3 stamp !bg-paper/85 backdrop-blur">{cover.stamp}</div>
              </div>
              <div className="flex items-center justify-between px-1 pb-1 pt-3">
                <div className="display text-lg text-ink">{cover.caption}</div>
                <div className="text-xs text-ink-faint">est. 2026</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
