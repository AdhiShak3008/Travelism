"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTrip } from "@/store/tripStore";
import { ThemeToggle } from "@/components/ThemeToggle";

const SUGGESTIONS = [
  "Tawang for a week — clean stays, big mountain scenery",
  "A slow trip to Ladakh with my parents",
  "Meghalaya waterfalls and living root bridges",
  "Coorg coffee country, quiet and easy",
];

const HERO =
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1600&q=75";

export function DreamStage() {
  const startDream = useTrip((s) => s.startDream);
  const [text, setText] = useState("");

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
                <Image src={HERO} alt="A mountain valley" fill priority className="object-cover" unoptimized />
                <div className="absolute left-3 top-3 stamp !bg-paper/85 backdrop-blur">Himalaya · Field notes</div>
              </div>
              <div className="flex items-center justify-between px-1 pb-1 pt-3">
                <div className="display text-lg text-ink">Somewhere worth the trip</div>
                <div className="text-xs text-ink-faint">est. 2026</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
