"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTrip } from "@/store/tripStore";

const SUGGESTIONS = [
  "Tawang for a week — cheap flights, clean hotels, big scenery",
  "A slow trip to Ladakh with my parents",
  "Meghalaya waterfalls and living root bridges",
  "Coorg coffee country, quiet and easy",
];

const HERO =
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=2000&q=75";

export function DreamStage() {
  const startDream = useTrip((s) => s.startDream);
  const [text, setText] = useState("");

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Cinematic hero */}
      <div className="absolute inset-0">
        <Image src={HERO} alt="" fill priority className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-ink-950/55" />
        <div className="absolute inset-0 bg-hero-fade" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-paper-200/80 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-alpine-400" />
            17 specialist agents · live web intelligence · evidence-backed
          </div>

          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-paper-50 sm:text-6xl md:text-7xl">
            Where do you want
            <br />
            to <span className="text-alpine-300">disappear</span> to?
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper-200/80">
            Tell us the destination and the kind of trip you&rsquo;re dreaming about.
            We&rsquo;ll investigate the rest.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-9"
        >
          <div className="glass rounded-3xl p-3 shadow-lift">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) startDream(text);
              }}
              rows={4}
              placeholder="I want to explore Tawang for a week. Cheap flights are fine, but I want a clean comfortable hotel, beautiful scenery, good food and no crazy rushed itinerary…"
              className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-lg leading-relaxed text-paper-50 outline-none placeholder:text-paper-200/35"
            />
            <div className="flex items-center justify-between px-2 pb-1 pt-1">
              <div className="flex items-center gap-3 text-xs text-paper-200/40">
                <span className={wordCount > 0 ? "text-alpine-300/80" : ""}>
                  {wordCount > 0 ? `${wordCount} words — the agents are listening` : "Speak naturally"}
                </span>
              </div>
              <button
                onClick={() => text.trim() && startDream(text)}
                disabled={!text.trim()}
                className="btn-primary"
              >
                Begin Investigation →
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setText(s)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm text-paper-200/80 transition hover:border-alpine-400/30 hover:bg-alpine-500/[0.06] hover:text-paper-50"
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 grid gap-4 sm:grid-cols-3"
        >
          {[
            { t: "Investigate, don't guess", d: "Agents crawl primary sources and gather evidence — not just snippets." },
            { t: "You steer, they adapt", d: "Every comment reshapes what the agents prioritize next." },
            { t: "A living Trip Blob", d: "Your trip evolves from a vague dream into a costed, bookable package." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-white/[0.06] bg-ink-900/40 p-4 backdrop-blur">
              <div className="font-display text-base font-semibold text-paper-50">{f.t}</div>
              <p className="mt-1 text-sm text-paper-200/60">{f.d}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
