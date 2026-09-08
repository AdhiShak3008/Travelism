"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";

const INSPIRATIONS = [
  {
    title: "Bikepacking & Camping",
    desc: "7-day self-supported bikepacking loop through Spiti Valley with wild camping by rivers.",
    icon: "🚴",
  },
  {
    title: "Alpine Trekking",
    desc: "10-day hut-to-hut trek across the Dolomites Alta Via 1 staying in mountain refugios.",
    icon: "🧗",
  },
  {
    title: "Himalayan Roadtrip",
    desc: "7-day scenic roadtrip to Tawang with mountain passes, monasteries, and homestays.",
    icon: "🏔️",
  },
  {
    title: "Tropical Downtime",
    desc: "5 days of relaxed beach downtime in South Goa with seafood shacks and sunsets.",
    icon: "🌴",
  },
];

export function MobileDreamStage() {
  const startDream = useTrip((s) => s.startDream);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (dreamText: string) => {
    if (!dreamText.trim() || submitting) return;
    setSubmitting(true);
    await startDream(dreamText.trim());
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-paper px-4 py-4 overflow-x-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-brand to-emerald-400 text-sm font-extrabold text-white shadow-sm">
            T
          </div>
          <span className="display text-lg font-bold text-ink tracking-tight">Travelism</span>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <ThemeToggle />
        </div>
      </div>

      {/* Center Hero Card */}
      <div className="my-auto py-6">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-bold text-brand">
          <span>✨ Autonomous Travel Swarm</span>
        </div>

        <h1 className="display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Where do you dream of going?
        </h1>
        <p className="mt-2 text-xs text-ink-soft leading-relaxed">
          From wild camping bikepacking loops to luxury coastal retreats, our 5 AI agents scout real permits, trails, stays, and live flights in seconds.
        </p>

        {/* Text Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
          }}
          className="mt-5 rounded-2xl border border-line bg-card p-3 shadow-lift"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="e.g. 7-day bikepacking loop through Spiti Valley with wild camping by rivers..."
            className="w-full resize-none bg-transparent text-sm font-medium text-ink placeholder:text-ink-faint outline-none"
          />
          <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2.5">
            <span className="text-[10px] text-ink-faint">Touch-ready natural prompt</span>
            <button
              type="submit"
              disabled={!input.trim() || submitting}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-40 active:scale-95 transition"
            >
              {submitting ? "Scouting..." : "Explore →"}
            </button>
          </div>
        </form>

        {/* Quick Inspiration Chips */}
        <div className="mt-6">
          <div className="label-eyebrow mb-2.5 text-[10px]">Tap an inspiration prompt</div>
          <div className="grid gap-2">
            {INSPIRATIONS.map((item) => (
              <motion.button
                key={item.title}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setInput(item.desc);
                  handleSubmit(item.desc);
                }}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper-2/60 p-3 text-left transition hover:border-brand/40 active:bg-paper-3"
              >
                <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-ink">{item.title}</div>
                  <p className="text-[11px] text-ink-soft line-clamp-2 mt-0.5">{item.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Trust */}
      <div className="py-2 text-center text-[10px] text-ink-faint">
        Powered by Live Google Intelligence · Zero Fake Data · Physical Brochure Design
      </div>
    </div>
  );
}
