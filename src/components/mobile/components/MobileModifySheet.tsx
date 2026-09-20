"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { costTotals } from "@/lib/engine";
import { MarkdownMessage } from "@/components/ui/MarkdownMessage";
import { MemoryBadge } from "@/components/ui/MemoryBadge";

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
  const log = useTrip((s) => s.chatLog);
  const travelerMemory = useTrip((s) => s.travelerMemory);
  const addChatMessage = useTrip((s) => s.addChatMessage);
  const updateTravelerMemory = useTrip((s) => s.updateTravelerMemory);

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
  const scroller = useRef<HTMLDivElement>(null);
  const bottomAnchor = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const handleScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceToBottom <= 70;
    setIsAtBottom(atBottom);
    setShowScrollBottomBtn(!atBottom);
    if (atBottom) setHasUnread(false);
  };

  const scrollToBottom = (smooth = true) => {
    const behavior: ScrollBehavior = smooth ? "smooth" : "instant";
    if (bottomAnchor.current) {
      bottomAnchor.current.scrollIntoView({ behavior, block: "end" });
    } else if (scroller.current) {
      scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior });
    }
    setHasUnread(false);
    setShowScrollBottomBtn(false);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom(false);
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (isAtBottom) {
        scrollToBottom(true);
      } else {
        setHasUnread(true);
      }
    }
  }, [log.length, isTyping, isOpen]);

  async function send(instruction: string) {
    if (!instruction.trim() || isTyping) return;
    const userPrompt = instruction.trim();
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `usr_${Date.now()}`;
    addChatMessage({ id: userMsgId, role: "user", text: userPrompt, timestamp: nowTime });

    setTimeout(() => {
      scrollToBottom(true);
    }, 20);

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

      const historyPayload = log.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userPrompt,
          history: historyPayload,
          travelerMemory,
          tripContext,
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();

      if (data.memoryDelta) {
        updateTravelerMemory(data.memoryDelta);
      }

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
          deltas.push(`Removed "${act.value}"`);
        } else if (act.kind === "set_day_focus" && typeof act.dayNum === "number" && typeof act.value === "string") {
          setDayFocus(act.dayNum, act.value as any);
          deltas.push(`Day ${act.dayNum} focus: ${act.value}`);
        }
        if (act.deltaLabel) deltas.push(act.deltaLabel);
      } else {
        applyInstruction(userPrompt);
      }

      const latestMutation = useTrip.getState().blob.mutations[0];
      const allDeltas = Array.from(new Set([...deltas, ...(latestMutation?.deltas ?? [])])).slice(0, 3);
      const learnedFacts = data.memoryDelta?.learnedFacts || [];

      addChatMessage({
        id: `bot_${Date.now()}`,
        role: "concierge",
        text: data.reply || "Done! I've updated your trip plan.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        deltas: allDeltas.length > 0 ? allDeltas : undefined,
        memoryUpdates: learnedFacts.length > 0 ? learnedFacts : undefined,
      });
    } catch {
      applyInstruction(userPrompt);
      const latest = useTrip.getState().blob.mutations[0];
      const msg = useTrip.getState().lastMessage;
      addChatMessage({
        id: `bot_${Date.now()}`,
        role: "concierge",
        text: msg ?? latest?.summary ?? "I've noted that instruction and adjusted your itinerary.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        deltas: latest?.deltas,
      });
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <>
      {/* Floating Concierge Pill Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl active:scale-95 transition-transform"
        aria-label="Open AI Concierge"
      >
        <span className="text-sm">🧭</span>
        <span>Concierge</span>
      </button>

      {/* Slide-over Bottom Sheet */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="flex max-h-[85vh] h-[80vh] w-full flex-col rounded-t-3xl border-t border-line bg-paper shadow-lift overflow-hidden z-10"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-paper-2">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-xs font-extrabold text-white">
                    🧭
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink leading-tight">AI Travel Concierge</h3>
                    <p className="text-[10px] text-ink-soft">Real-time trip assistant & planner</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MemoryBadge compact />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-paper text-sm font-bold text-ink-soft hover:text-ink active:scale-90 transition"
                    aria-label="Close sheet"
                  >
                    ✕
                  </button>
                </div>
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
              <div
                ref={scroller}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 scroll-smooth relative"
              >
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

                    {m.memoryUpdates && m.memoryUpdates.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.memoryUpdates.map((mem, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-300"
                          >
                            🧠 Remembered: {mem}
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
                    <span className="ml-1 text-[11px] font-medium">Recalling memory & thinking...</span>
                  </div>
                )}

                {/* Bottom anchor for smooth scroll */}
                <div ref={bottomAnchor} className="h-2 shrink-0" />
              </div>

              {/* Floating "Scroll to Bottom" button */}
              <AnimatePresence>
                {showScrollBottomBtn && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 8 }}
                    onClick={() => scrollToBottom(true)}
                    className="absolute bottom-20 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper-2 text-ink shadow-lg backdrop-blur-md active:scale-90 transition"
                    title="Scroll to bottom"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Chat Input Bar */}
              <div className="flex items-end gap-2 border-t border-line bg-paper px-3 py-2.5 shrink-0">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(text);
                    }
                  }}
                  rows={1}
                  placeholder="Ask anything or request trip changes..."
                  className="flex-1 resize-none max-h-24 min-h-[38px] rounded-xl border border-line bg-paper-2 px-3.5 py-2 text-xs font-medium text-ink outline-none placeholder:text-ink-faint focus:border-brand leading-relaxed scrollbar-none"
                />
                <button
                  onClick={() => send(text)}
                  disabled={!text.trim() || isTyping}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm font-bold text-white shadow-xs disabled:opacity-40 active:scale-95 transition shrink-0 mb-0.5"
                  title="Send message"
                >
                  ↑
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
