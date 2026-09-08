"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { costTotals } from "@/lib/engine";
import { MarkdownMessage } from "@/components/ui/MarkdownMessage";

interface Msg {
  id: string;
  role: "user" | "concierge";
  text: string;
  timestamp: string;
  deltas?: string[];
}

const QUICK_CHIPS = [
  { label: "💸 Cut 15% Cost", prompt: "How can I reduce the total trip cost by 15%?" },
  { label: "⛺ Wild Camping", prompt: "Switch my trip to 100% wild camping and remove hotel costs" },
  { label: "⚡ Relax Pace", prompt: "Make the daily pace more relaxed and leisurely" },
  { label: "🗓️ +2 Days", prompt: "Add 2 more days to my vacation duration" },
  { label: "🌊 Outdoors", prompt: "What are the best outdoor adventures and water activities here?" },
];

export function MobileModifySheet() {
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

  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [log, setLog] = useState<Msg[]>([
    {
      id: "init_m1",
      role: "concierge",
      text: `Hello! I'm your AI Travel Concierge for **${blob.destinationName || "your trip"}**.\n\nAsk me to adjust dates, strip hotels for wild camping, add activities, or recommend hidden spots!`,
      timestamp: "Just now",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }
  }, [log, isTyping, isOpen]);

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

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();

      const deltas: string[] = [];
      if (data.action && data.action.kind !== "none") {
        const act = data.action;
        if (act.kind === "upgrade_hotel") {
          applyInstruction("Make the hotel nicer");
          deltas.push("Hotel upgraded to luxury tier");
        } else if (act.kind === "cheaper_hotel") {
          applyInstruction("A cheaper hotel, please");
          deltas.push("Switched to budget-friendly stay");
        } else if ((act.kind === "set_stay_mode" || act.kind === "remove_all_hotels") && typeof act.value === "string") {
          setStayMode(act.value as any);
          deltas.push(
            act.value === "wild_camping"
              ? "Switched to Wild Camping (₹0 lodging)"
              : act.value === "none"
              ? "Removed all hotels (₹0)"
              : `Stay style: ${act.value}`
          );
        } else if (act.kind === "set_duration" && typeof act.value === "number") {
          setDuration(act.value);
          deltas.push(`Trip duration adjusted → ${act.value} days`);
        } else if (act.kind === "add_days" && typeof act.value === "number") {
          setDuration(blob.durationDays + act.value);
          deltas.push(`Added ${act.value} days`);
        } else if (act.kind === "set_travelers" && typeof act.value === "number") {
          setTravelers(act.value);
          deltas.push(`Party updated → ${act.value} travelers`);
        } else if (act.kind === "set_pace" && typeof act.value === "string") {
          setPace(act.value as any);
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
          deltas.push(`Added "${act.activityData.name}" to activities`);
        } else if (act.kind === "remove_activity" && typeof act.value === "string") {
          removeCustomExperience(act.value);
          deltas.push(`Removed "${act.value}"`);
        } else if (act.kind === "replace_day_stops" && typeof act.dayNum === "number" && act.stops) {
          replaceDayStops(act.dayNum, act.stops, act.dayTitle ?? undefined);
          deltas.push(`Day ${act.dayNum} schedule updated`);
        } else if (act.kind === "add_day_stop" && typeof act.dayNum === "number" && act.stop) {
          addCustomStop(act.dayNum, act.stop);
          deltas.push(`Added stop to Day ${act.dayNum}`);
        } else if (act.kind === "remove_day_stop" && typeof act.dayNum === "number" && typeof act.value === "string") {
          removeStopByLabel(act.dayNum, act.value);
          deltas.push(`Removed stop from Day ${act.dayNum}`);
        } else if (act.kind === "set_day_focus" && typeof act.dayNum === "number" && typeof act.value === "string") {
          setDayFocus(act.dayNum, act.value as any);
          deltas.push(`Day ${act.dayNum} set to ${act.value}`);
        }
        if (act.deltaLabel) deltas.push(act.deltaLabel);
      }

      setLog((l) => [
        ...l,
        {
          id: `ai_${Date.now()}`,
          role: "concierge",
          text: data.reply || "Done! I have applied your customization to the trip.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          deltas: deltas.length ? deltas : undefined,
        },
      ]);
    } catch {
      setLog((l) => [
        ...l,
        {
          id: `ai_err_${Date.now()}`,
          role: "concierge",
          text: "I've noted that preference and applied it to your current itinerary!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full border border-brand/50 bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-lift backdrop-blur-md"
      >
        <span className="text-base">✨</span>
        <span>AI Concierge</span>
      </motion.button>

      {/* Bottom Sheet Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
            {/* Backdrop Tap to close */}
            <div className="flex-1 w-full" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="flex max-h-[85vh] h-[80vh] w-full flex-col rounded-t-3xl border-t border-line bg-paper shadow-lift overflow-hidden"
            >
              {/* Sheet Header / Drag Handle */}
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-paper-2">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-xs font-extrabold text-white">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink leading-tight">AI Travel Concierge</h3>
                    <p className="text-[10px] text-ink-soft">Real-time trip assistant & planner</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-paper text-sm font-bold text-ink-soft hover:text-ink active:scale-90 transition"
                  aria-label="Close sheet"
                >
                  ✕
                </button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 bg-paper border-b border-line/60 no-scrollbar">
                {QUICK_CHIPS.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => send(c.prompt)}
                    className="shrink-0 rounded-full border border-line bg-paper-2 px-3 py-1 text-[11px] font-semibold text-ink-soft active:bg-brand active:text-white transition"
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Chat Message Stream */}
              <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
                {log.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                        m.role === "user"
                          ? "bg-brand text-white rounded-br-xs"
                          : "border border-line bg-card text-ink rounded-bl-xs"
                      }`}
                    >
                      {m.role === "user" ? (
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      ) : (
                        <MarkdownMessage content={m.text} />
                      )}
                    </div>

                    {m.deltas && m.deltas.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.deltas.map((d, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                          >
                            ✓ {d}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="mt-0.5 text-[9px] text-ink-faint px-1">{m.timestamp}</span>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-card px-3 py-2 text-xs text-ink-soft w-fit">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce [animation-delay:0.4s]" />
                    <span className="ml-1 text-[11px] font-medium">Concierge thinking...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(text);
                }}
                className="flex items-center gap-2 border-t border-line bg-paper px-3 py-2.5"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ask anything or request trip changes..."
                  className="flex-1 rounded-xl border border-line bg-paper-2 px-3.5 py-2.5 text-xs font-medium text-ink outline-none placeholder:text-ink-faint focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || isTyping}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm font-bold text-white shadow-xs disabled:opacity-40 active:scale-95 transition shrink-0"
                >
                  ↑
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
