"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ItineraryDay, ItineraryStop } from "@/lib/types";
import { useTrip } from "@/store/tripStore";
import { cx, formatDayDate } from "@/lib/format";
import { InteractiveMapView } from "./InteractiveMapView";

const KIND_GLYPH: Record<ItineraryStop["kind"], string> = {
  travel: "🚙",
  visit: "📍",
  meal: "🍽️",
  rest: "☕",
  hotel: "🛏️",
};

const DAY_FOCUS_OPTIONS = [
  { id: "sightseeing", label: "🌟 Active Sights", icon: "📍" },
  { id: "staycation", label: "🏊‍♂️ Resort Staycation", icon: "🏨" },
  { id: "wellness", label: "🧘 Spa & Wellness", icon: "🧖‍♀️" },
  { id: "culinary", label: "🍜 Food & Cafes", icon: "🍽️" },
  { id: "beach", label: "🏖️ Leisure & Sunset", icon: "🌅" },
] as const;

export function ItineraryView({ days }: { days: ItineraryDay[] }) {
  const setDayFocus = useTrip((s) => s.setDayFocus);
  const addCustomStop = useTrip((s) => s.addCustomStop);
  const removeStopFromDay = useTrip((s) => s.removeStopFromDay);
  const destinationName = useTrip((s) => s.blob.destinationName) || "Destination";
  const blobDates = useTrip((s) => s.blob.dates);

  const [activeDayMap, setActiveDayMap] = useState<number | null>(null);
  const [addingStopDay, setAddingStopDay] = useState<number | null>(null);
  const [newStopLabel, setNewStopLabel] = useState("");
  const [newStopTime, setNewStopTime] = useState("15:00");
  const [newStopKind, setNewStopKind] = useState<ItineraryStop["kind"]>("visit");

  const handleAddStop = (dayNum: number) => {
    if (!newStopLabel.trim()) return;
    const startHour = parseInt(newStopTime.split(":")[0] || "15", 10);
    const endHour = Math.min(23, startHour + 2);
    const endFmt = `${String(endHour).padStart(2, "0")}:00`;

    addCustomStop(dayNum, {
      label: newStopLabel.trim(),
      start: newStopTime,
      end: endFmt,
      kind: newStopKind,
      note: "Custom planned activity",
    });

    setNewStopLabel("");
    setAddingStopDay(null);
  };

  return (
    <div className="space-y-6">
      {days.map((d, di) => {
        const isMapOpen = activeDayMap === d.day;
        const isAdding = addingStopDay === d.day;
        const formattedDayDate = formatDayDate(blobDates?.start, d.day);

        return (
          <motion.div
            layout
            key={d.day}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: di * 0.04 }}
            className={cx(
              "card overflow-hidden transition-all duration-300",
              d.isRestDay ? "border-amber-500/40 bg-gradient-to-b from-amber-500/[0.02] to-card" : "hover:shadow-lift"
            )}
          >
            {/* Day Header Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper-2/80 px-5 py-3.5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    "grid h-10 w-10 place-items-center rounded-2xl text-sm font-extrabold shadow-sm border",
                    d.isRestDay
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : "bg-brand text-paper border-brand"
                  )}
                >
                  D{d.day}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                      {formattedDayDate}
                    </span>
                    <span className="text-ink-faint text-xs">·</span>
                    <h3 className="display text-base sm:text-lg font-bold text-ink">{d.title}</h3>
                    {d.isRestDay && (
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        Staycation / Rest
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-soft flex items-center gap-1.5 mt-0.5">
                    <span>📍 Base:</span>
                    <span className="font-semibold text-ink">{d.baseLocation}</span>
                    <span className="text-ink-faint">· {d.stops.length} scheduled stops</span>
                  </div>
                </div>
              </div>

              {/* Day Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveDayMap(isMapOpen ? null : d.day)}
                  className={cx(
                    "chip !text-xs !py-1 !px-3 font-semibold transition-all",
                    isMapOpen ? "!bg-brand !text-paper" : "!bg-card hover:!bg-paper-3"
                  )}
                  title="Toggle Day Map and Route Overview"
                >
                  {isMapOpen ? "Hide Map ▲" : "🗺️ Day Map"}
                </button>

                <button
                  onClick={() => setAddingStopDay(isAdding ? null : d.day)}
                  className="chip !text-xs !py-1 !px-3 font-semibold !bg-card hover:!bg-paper-3 text-brand"
                  title="Add your own custom event or activity"
                >
                  ＋ Add Stop
                </button>
              </div>
            </div>

            {/* Day Focus Dictation Bar */}
            <div className="px-5 py-2.5 border-b border-line/60 bg-paper/50 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                Dictate Day Focus:
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {DAY_FOCUS_OPTIONS.map((f) => {
                  const isActive = (d.dayType || (d.isRestDay ? "staycation" : "sightseeing")) === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setDayFocus(d.day, f.id)}
                      className={cx(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all flex items-center gap-1",
                        isActive
                          ? "bg-brand text-paper shadow-sm ring-1 ring-brand/40"
                          : "bg-paper-2 border border-line/80 text-ink-soft hover:text-ink hover:bg-paper-3"
                      )}
                    >
                      <span>{f.icon}</span>
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Embedded Day Map Drawer */}
            <AnimatePresence>
              {isMapOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-line bg-paper-3"
                >
                  <div className="p-4">
                    <InteractiveMapView
                      destinationName={destinationName}
                      dayStops={d.stops}
                      activeDayNum={d.day}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Stop Inline Creator */}
            <AnimatePresence>
              {isAdding && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-line bg-brand/[0.03] p-4 sm:px-6"
                >
                  <div className="rounded-2xl border border-brand/30 bg-card p-4 shadow-sm">
                    <div className="text-xs font-bold text-ink mb-2">Add Custom Activity to Day {d.day}</div>
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr_120px_auto]">
                      <input
                        type="time"
                        value={newStopTime}
                        onChange={(e) => setNewStopTime(e.target.value)}
                        className="rounded-xl border border-line bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-brand"
                      />
                      <input
                        type="text"
                        placeholder="e.g. Sleep in & Room Service Breakfast / Sunset Cocktails"
                        value={newStopLabel}
                        onChange={(e) => setNewStopLabel(e.target.value)}
                        className="rounded-xl border border-line bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-brand"
                      />
                      <select
                        value={newStopKind}
                        onChange={(e) => setNewStopKind(e.target.value as ItineraryStop["kind"])}
                        className="rounded-xl border border-line bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-brand"
                      >
                        <option value="visit">📍 Visit / Sight</option>
                        <option value="meal">🍽️ Dining / Food</option>
                        <option value="rest">☕ Rest / Leisure</option>
                        <option value="hotel">🛏️ Stay / Pool</option>
                        <option value="travel">🚙 Travel</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddStop(d.day)}
                          disabled={!newStopLabel.trim()}
                          className="btn-primary !py-1.5 !px-4 text-xs font-bold disabled:opacity-50"
                        >
                          Save Stop
                        </button>
                        <button
                          onClick={() => setAddingStopDay(null)}
                          className="btn-ghost !py-1.5 !px-2.5 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timeline Stops list */}
            <div className="p-5 sm:p-6">
              <div className="relative space-y-4 pl-7">
                {/* Continuous vertical guideline */}
                <span className="absolute left-[13px] bottom-2 top-2 w-0.5 bg-line-strong/60 rounded-full" />

                {d.stops.map((s, i) => {
                  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.label} ${destinationName}`)}`;
                  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.label} ${destinationName}`)}`;
                  const isVisitOrMeal = s.kind === "visit" || s.kind === "meal";

                  return (
                    <div key={i} className="relative flex items-start gap-4 group">
                      <span
                        className={cx(
                          "absolute -left-7 top-0.5 grid h-7 w-7 place-items-center rounded-full text-xs shadow-sm border transition-transform group-hover:scale-110",
                          s.kind === "visit"
                            ? "bg-brand text-paper border-brand"
                            : s.kind === "meal"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : s.kind === "hotel"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-paper-2 text-ink-soft border-line"
                        )}
                      >
                        {KIND_GLYPH[s.kind]}
                      </span>

                      <div className="w-24 shrink-0 text-xs font-semibold tabular-nums text-ink-soft pt-1">
                        {s.start}–{s.end}
                      </div>

                      <div className="min-w-0 flex-1 rounded-2xl bg-paper-2/50 p-3.5 border border-line/60 transition-colors group-hover:bg-paper-2 group-hover:border-line">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-bold text-sm text-ink truncate">{s.label}</span>
                            {s.travelTime && (
                              <span className="chip !text-[10px] !py-0 !px-1.5 font-medium !bg-paper-3 text-ink-faint shrink-0">
                                🚗 {s.travelTime}
                              </span>
                            )}
                          </div>

                          {/* Stop Action Links & Delete */}
                          <div className="flex items-center gap-2">
                            {isVisitOrMeal && (
                              <>
                                <a
                                  href={mapSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="external-link !text-[11px]"
                                  title="Open in Google Maps"
                                >
                                  Maps ↗
                                </a>
                                <a
                                  href={youtubeSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="external-link !text-[11px] !text-rose-600 dark:!text-rose-400 font-semibold"
                                  title="Watch video on YouTube"
                                >
                                  ▶ Video ↗
                                </a>
                              </>
                            )}
                            <button
                              onClick={() => removeStopFromDay(d.day, i)}
                              className="opacity-0 group-hover:opacity-100 transition text-ink-faint hover:text-rose-500 text-xs px-1.5 py-0.5 rounded hover:bg-rose-500/10"
                              title="Remove this stop from the day"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {s.note && (
                          <p className="text-xs text-ink-soft mt-1 leading-relaxed">{s.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
