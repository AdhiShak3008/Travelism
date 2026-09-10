"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { costTotals } from "@/lib/engine";
import { MarkdownMessage } from "./MarkdownMessage";

interface Msg {
  id: string;
  role: "user" | "concierge";
  text: string;
  deltas?: string[];
  timestamp?: string;
}

const QUICK_QUESTIONS = [
  { label: "🎒 Packing", prompt: "What should I pack for this trip?" },
  { label: "🏨 Nicer Stay", prompt: "Upgrade my hotel to a luxury or high-end option" },
  { label: "💸 Save 15%", prompt: "How can I reduce the total trip cost by 15% without ruining the experience?" },
  { label: "🗓️ +2 Days", prompt: "Add 2 more days to my vacation duration" },
  { label: "⚡ Relax Pace", prompt: "Make the daily travel pace more relaxed and comfortable" },
  { label: "🍽️ Dining", prompt: "Recommend the best local dishes, top restaurants, and evening spots" },
  { label: "🌊 Outdoors", prompt: "What are the best outdoor adventures and water activities here?" },
];

export function ModifyChat() {
  const blob = useTrip((s) => s.blob);
  const dataset = useTrip((s) => s.dataset);
  const applyInstruction = useTrip((s) => s.applyInstruction);
  const setDuration = useTrip((s) => s.setDuration);
  const setTravelers = useTrip((s) => s.setTravelers);
  const setPace = useTrip((s) => s.setPace);
  const setStayMode = useTrip((s) => s.setStayMode);
  const addCustomExperience = useTrip((s) => s.addCustomExperience);
  const removeCustomExperience = useTrip((s) => s.removeCustomExperience);
  const replaceDayStops = useTrip((s) => s.replaceDayStops);
  const addCustomStop = useTrip((s) => s.addCustomStop);
  const removeStopByLabel = useTrip((s) => s.removeStopByLabel);
  const setDayFocus = useTrip((s) => s.setDayFocus);
  const refineHotels = useTrip((s) => s.refineHotels);
  const refineInvestigation = useTrip((s) => s.refineInvestigation);

  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [log, setLog] = useState<Msg[]>([
    {
      id: "init_1",
      role: "concierge",
      text: `Hello! I am your AI Travel Concierge for **${blob.destinationName || "your trip"}**.\n\nAsk me anything about weather, culture, packing essentials, or ask me to adjust your duration, flights, hotel tiers, activities, or daily schedule in real time!`,
      timestamp: "Just now",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  async function send(instruction: string) {
    if (!instruction.trim() || isTyping) return;
    const userPrompt = instruction.trim();
    setText("");

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `usr_${Date.now()}`;
    setLog((l) => [...l, { id: userMsgId, role: "user", text: userPrompt, timestamp: nowTime }]);
    setIsTyping(true);

    try {
      const { total } = costTotals(blob.costs);
      const tripContext = {
        destinationName: blob.destinationName,
        durationDays: blob.durationDays,
        travelers: blob.travelers,
        origin: blob.origin || "Hyderabad",
        hotelName: blob.hotels[0]?.name,
        hotelPrice: blob.hotels[0]?.pricePerNight,
        flightAirline: blob.flight?.airline,
        flightDuration: blob.flight?.duration,
        experiences: blob.experiences.map((e) => e.name),
        places: dataset?.places.filter((p) => blob.selectedPlaceIds.includes(p.id)).map((p) => p.canonicalName) ?? [],
        itinerary: blob.itinerary.map((d) => ({
          day: d.day,
          title: d.title,
          isRestDay: d.isRestDay,
          stops: d.stops.map((s) => `${s.start}-${s.end}: ${s.label}`),
        })),
        totalCost: total,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userPrompt, tripContext }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          reply: string;
          action?: {
            kind: string;
            value?: number | string;
            dayNum?: number;
            dayTitle?: string;
            stops?: { kind: "visit" | "meal" | "travel" | "rest" | "hotel"; label: string; start: string; end: string; note?: string }[];
            stop?: { kind: "visit" | "meal" | "travel" | "rest" | "hotel"; label: string; start: string; end: string; note?: string };
            activityData?: {
              name: string;
              category?: string;
              price?: number;
              blurb?: string;
              durationHours?: number;
            };
            deltaLabel?: string;
          };
        };

        const deltas: string[] = [];
        if (data.action && data.action.kind !== "none") {
          const act = data.action;
          if (act.kind === "search_new_hotels") {
            const query = typeof act.value === "string" ? act.value : userPrompt;
            void refineHotels(query);
            deltas.push(`Live search & crawl: Stays matching “${query}”`);
          } else if (act.kind === "search_new_places") {
            const query = typeof act.value === "string" ? act.value : userPrompt;
            void refineInvestigation(query);
            deltas.push(`Live search & crawl: Places matching “${query}”`);
          } else if (act.kind === "upgrade_hotel") {
            // Also trigger a live search if the user wants specific nice styles
            if (/ryokan|onsen|villa|glamp|boutique|resort|5\s*star|luxury/i.test(userPrompt)) {
              void refineHotels(userPrompt);
              deltas.push(`Scouted luxury stays for “${userPrompt}”`);
            } else {
              applyInstruction("Make the hotel nicer");
              deltas.push("Hotel upgraded to luxury tier");
            }
          } else if (act.kind === "cheaper_hotel") {
            if (/hostel|homestay|under|budget|guesthouse|cheap/i.test(userPrompt)) {
              void refineHotels(userPrompt);
              deltas.push(`Scouted budget stays for “${userPrompt}”`);
            } else {
              applyInstruction("A cheaper hotel, please");
              deltas.push("Switched to budget-friendly stay");
            }
          } else if ((act.kind === "set_stay_mode" || act.kind === "remove_all_hotels") && typeof act.value === "string") {
            setStayMode(act.value as any);
            deltas.push(
              act.value === "wild_camping"
                ? "Switched to Wild Camping & Bivvies (₹0 lodging)"
                : act.value === "none"
                ? "Removed all hotel accommodation (₹0)"
                : `Stay style switched to ${act.value}`
            );
          } else if (act.kind === "set_duration" && typeof act.value === "number") {
            setDuration(act.value);
            deltas.push(`Trip duration adjusted → ${act.value} days`);
          } else if (act.kind === "add_days" && typeof act.value === "number") {
            setDuration(blob.durationDays + act.value);
            deltas.push(`Added ${act.value} days (Total: ${blob.durationDays + act.value} days)`);
          } else if (act.kind === "set_travelers" && typeof act.value === "number") {
            setTravelers(act.value);
            deltas.push(`Group size updated → ${act.value} travelers`);
          } else if (act.kind === "set_pace" && typeof act.value === "string") {
            setPace(act.value as "comfortable" | "balanced" | "fast");
            deltas.push(`Pace set to ${act.value}`);
          } else if (act.kind === "budget_target" && typeof act.value === "number") {
            applyInstruction(`Budget target ${act.value}`);
            deltas.push(`Budget target updated: ₹${act.value.toLocaleString("en-IN")}`);
          } else if (act.kind === "add_activity" && act.activityData) {
            addCustomExperience({
              name: act.activityData.name,
              category: (act.activityData.category as any) || "adventure",
              price: act.activityData.price ?? 2000,
              blurb: act.activityData.blurb,
              durationHours: act.activityData.durationHours,
            });
            deltas.push(`Added "${act.activityData.name}" to activities & schedule`);
          } else if (act.kind === "remove_activity" && typeof act.value === "string") {
            removeCustomExperience(act.value);
            deltas.push(`Removed "${act.value}" from activities`);
          } else if (act.kind === "replace_day_stops" && typeof act.dayNum === "number" && act.stops) {
            replaceDayStops(act.dayNum, act.stops, act.dayTitle ?? undefined);
            deltas.push(`Day ${act.dayNum} schedule customized`);
          } else if (act.kind === "add_day_stop" && typeof act.dayNum === "number" && act.stop) {
            addCustomStop(act.dayNum, act.stop);
            deltas.push(`Added to Day ${act.dayNum}: ${act.stop.label}`);
          } else if (act.kind === "remove_day_stop" && typeof act.dayNum === "number" && typeof act.value === "string") {
            removeStopByLabel(act.dayNum, act.value);
            deltas.push(`Removed "${act.value}" from Day ${act.dayNum}`);
          } else if (act.kind === "set_day_focus" && typeof act.dayNum === "number" && typeof act.value === "string") {
            setDayFocus(act.dayNum, act.value as any);
            deltas.push(`Day ${act.dayNum} focus set to ${act.value}`);
          }
          if (act.deltaLabel) deltas.push(act.deltaLabel);
        } else {
          // Fallback parsing if message asks to add something to activities
          const addMatch = userPrompt.match(/(?:add|include|put)\s+(?:this\s+to\s+activities\s+|to\s+activities\s+|)(.+)/i);
          if (addMatch && /(?:activity|activities|party|tour|cruise|experience|visit)/i.test(userPrompt)) {
            const cleanName = addMatch[1].replace(/^(?:this|to activities|activity)\s+/i, "").trim();
            if (cleanName.length > 2) {
              addCustomExperience({ name: cleanName });
              deltas.push(`Added "${cleanName}" to activities`);
            }
          }
          applyInstruction(userPrompt);
        }

        const latestMutation = useTrip.getState().blob.mutations[0];
        const allDeltas = Array.from(new Set([...deltas, ...(latestMutation?.deltas ?? [])])).slice(0, 3);

        setLog((l) => [
          ...l,
          {
            id: `bot_${Date.now()}`,
            role: "concierge",
            text: data.reply || "Done! I've updated your trip plan.",
            deltas: allDeltas.length > 0 ? allDeltas : undefined,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        applyInstruction(userPrompt);
        const latest = useTrip.getState().blob.mutations[0];
        const msg = useTrip.getState().lastMessage;
        setLog((l) => [
          ...l,
          {
            id: `bot_${Date.now()}`,
            role: "concierge",
            text: msg ?? latest?.summary ?? "I've processed that request and updated your trip settings.",
            deltas: latest?.deltas,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch {
      applyInstruction(userPrompt);
      const latest = useTrip.getState().blob.mutations[0];
      const msg = useTrip.getState().lastMessage;
      setLog((l) => [
        ...l,
        {
          id: `bot_${Date.now()}`,
          role: "concierge",
          text: msg ?? latest?.summary ?? "I've noted that instruction and adjusted your itinerary.",
          deltas: latest?.deltas,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [log, isTyping]);

  return (
    <>
      <div className="card flex h-full flex-col overflow-hidden border border-brand/20 bg-card shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-paper-2 via-paper-2 to-brand/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand text-base shadow-sm">
              <span>🧭</span>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-ink">AI Concierge</h3>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-ink-soft">
                {blob.destinationName ? `Synced with ${blob.destinationName} (${blob.durationDays}d)` : "Real-time Trip Advisor"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(true)}
              title="Expand Chat"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong/60 bg-paper-2 text-ink-soft hover:text-ink hover:border-brand/40 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Message Log */}
        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4 scroll-smooth">
          {log.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[88%] rounded-2xl rounded-br-sm bg-gradient-to-r from-brand to-emerald-600 px-4 py-2.5 text-sm text-paper shadow-md"
                    : "max-w-[92%] rounded-2xl rounded-tl-sm border border-line/90 bg-paper-2/95 px-4 py-3.5 shadow-sm"
                }
              >
                {m.role === "concierge" ? (
                  <>
                    <MarkdownMessage content={m.text} />
                    {m.deltas && m.deltas.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line-strong/30 pt-2.5">
                        {m.deltas.map((d, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                          >
                            <span>✓</span> {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                )}
                {m.timestamp && (
                  <div
                    className={`mt-1 text-[10px] ${
                      m.role === "user" ? "text-paper/75 text-right" : "text-ink-faint text-left"
                    }`}
                  >
                    {m.timestamp}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-line bg-paper-2 px-4 py-3 text-xs text-ink-soft shadow-sm">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-brand"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </span>
                <span>Concierge is typing…</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Quick prompt suggestions & input */}
        <div className="border-t border-line bg-paper px-3 pt-2.5 pb-1.5 w-full overflow-hidden">
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto w-full">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => send(q.prompt)}
                disabled={isTyping}
                className="rounded-full border border-line bg-paper-2 px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:text-ink hover:border-brand/50 hover:bg-brand/5 transition disabled:opacity-40 shadow-2xs leading-tight"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="mt-2 flex items-center gap-2 pb-2">
            <div className="relative flex-1">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(text);
                  }
                }}
                disabled={isTyping}
                placeholder="Ask advice or request trip changes..."
                className="w-full rounded-full border border-line bg-paper-2 pl-4 pr-10 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 transition disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => send(text)}
              disabled={!text.trim() || isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-paper shadow-sm hover:brightness-110 active:scale-95 transition disabled:opacity-30"
              title="Send message"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* EXPANDED FULL CONCIERGE MODAL */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-line bg-paper-2 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand text-lg">
                    🧭
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">AI Travel Concierge</h3>
                    <p className="text-xs text-ink-soft">
                      {blob.destinationName} • {blob.durationDays} Days • {blob.travelers} Travelers
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="rounded-xl border border-line bg-paper p-2 text-ink-soft hover:text-ink hover:border-brand/40 transition"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {log.map((m) => (
                  <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[75%] rounded-2xl rounded-br-sm bg-gradient-to-r from-brand to-emerald-600 px-5 py-3 text-sm text-paper shadow-md"
                          : "max-w-[85%] rounded-2xl rounded-tl-sm border border-line bg-paper-2 px-5 py-4 shadow-sm"
                      }
                    >
                      {m.role === "concierge" ? (
                        <>
                          <MarkdownMessage content={m.text} />
                          {m.deltas && m.deltas.length > 0 && (
                            <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line-strong/30 pt-3">
                              {m.deltas.map((d, j) => (
                                <span
                                  key={j}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                >
                                  <span>✓</span> {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      )}
                      {m.timestamp && (
                        <div
                          className={`mt-1.5 text-[10px] ${
                            m.role === "user" ? "text-paper/75 text-right" : "text-ink-faint text-left"
                          }`}
                        >
                          {m.timestamp}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-paper-2 px-5 py-3 text-xs text-ink-soft">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-2 w-2 rounded-full bg-brand"
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </span>
                      <span>Concierge is analyzing your request…</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Input */}
              <div className="border-t border-line bg-paper p-4">
                <div className="mb-3 flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {QUICK_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => send(q.prompt)}
                      disabled={isTyping}
                      className="rounded-full border border-line-strong bg-paper-2 px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink hover:border-brand/50 transition disabled:opacity-40"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(text);
                      }
                    }}
                    disabled={isTyping}
                    placeholder="Ask any question or tell me what changes to make to your trip..."
                    className="flex-1 rounded-full border border-line bg-paper-2 px-5 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 transition disabled:opacity-50"
                  />
                  <button
                    onClick={() => send(text)}
                    disabled={!text.trim() || isTyping}
                    className="flex h-11 px-6 items-center justify-center gap-2 rounded-full bg-brand text-paper font-semibold shadow-sm hover:brightness-110 active:scale-95 transition disabled:opacity-30"
                  >
                    <span>Send</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
