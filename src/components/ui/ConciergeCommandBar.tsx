"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";

const SMART_PROMPT_CHIPS = [
  {
    icon: "📜",
    label: "Permits & Visas",
    prompt: "Are there any Inner Line Permits, visas, or special ecological passes required for this trip?",
    badge: "Essential",
    color: "from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
  },
  {
    icon: "🏡",
    label: "Find Cheaper Homestays",
    prompt: "Can you find authentic, cheaper local homestays or budget stays for this trip?",
    badge: "Save Money",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  },
  {
    icon: "🔍",
    label: "What Am I Missing?",
    prompt: "Audit my current itinerary, travel pace, and stays — what am I missing or what can be improved?",
    badge: "Smart Audit",
    color: "from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
  },
  {
    icon: "⚡",
    label: "Relax Day 2 Pace",
    prompt: "Make Day 2 a relaxed, slow-paced day with cafe visits and scenic viewpoints",
    badge: "Pacing",
    color: "from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300",
  },
  {
    icon: "📸",
    label: "Add Photo Tour",
    prompt: "Add a golden hour sunrise photography tour to our scheduled activities",
    badge: "Activity",
    color: "from-sky-500/10 to-cyan-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300",
  },
  {
    icon: "🍽️",
    label: "Top Local Dining",
    prompt: "Recommend the best authentic local restaurants, street food stalls, and evening dining spots",
    badge: "Culinary",
    color: "from-rose-500/10 to-red-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300",
  },
];

export function ConciergeCommandBar() {
  const [query, setQuery] = useState("");
  const openConcierge = useTrip((s) => s.openConcierge);
  const destinationName = useTrip((s) => s.blob.destinationName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    openConcierge(query.trim());
    setQuery("");
  };

  const handleChipClick = (prompt: string) => {
    openConcierge(prompt);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-brand/25 bg-gradient-to-br from-paper via-card to-paper-2 p-4 sm:p-6 shadow-lift"
    >
      {/* Subtle decorative glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Header row */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-emerald-600 text-paper text-base shadow-sm">
            🧭
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-ink">
                AI Travel Concierge & Real-Time Orchestrator
              </h3>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand border border-brand/25">
                Superpowers Active
              </span>
            </div>
            <p className="text-xs text-ink-soft">
              Simultaneously ask for insider intelligence (permits, dining, packing) and reshape your stays, activities, or timetable live.
            </p>
          </div>
        </div>

        <button
          onClick={() => openConcierge()}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand/10 hover:bg-brand/20 border border-brand/30 px-3 py-1 text-xs font-bold text-brand transition active:scale-95"
        >
          <span>Open Full Chat</span>
          <span>↗</span>
        </button>
      </div>

      {/* Interactive Command Input */}
      <form onSubmit={handleSubmit} className="relative mt-1 mb-3.5">
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-4 text-base text-ink-soft">
            ✨
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask anything about ${destinationName || "your trip"} or say "find cheaper homestays", "check permits", "swap stay"...`}
            className="w-full rounded-2xl border border-line bg-paper/90 pl-11 pr-28 py-3 text-xs sm:text-sm text-ink placeholder:text-ink-faint shadow-inner focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="absolute right-2 inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-paper shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <span>Ask AI</span>
            <span>↵</span>
          </button>
        </div>
      </form>

      {/* Smart Quick Chips */}
      <div className="relative">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Instant 1-Click Concierge Commands
          </span>
          <span className="text-[11px] text-ink-faint">Click to execute live</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SMART_PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip.prompt)}
              className={`group flex items-center gap-2 rounded-xl border bg-gradient-to-r px-3 py-1.5 text-xs font-semibold shadow-2xs hover:shadow-xs hover:scale-[1.02] active:scale-95 transition-all ${chip.color}`}
              title={chip.prompt}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
              <span className="rounded-full bg-black/5 dark:bg-white/10 px-1.5 py-0.2 text-[9px] font-bold opacity-80 group-hover:opacity-100">
                {chip.badge}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
