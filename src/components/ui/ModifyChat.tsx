"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrip } from "@/store/tripStore";
import { costTotals } from "@/lib/engine";
import { routeInstruction } from "@/lib/concierge";
import { MarkdownMessage } from "./MarkdownMessage";
import { MemoryBadge } from "./MemoryBadge";
import { useAuth } from "@/store/authStore";
import { getActiveCurrency, formatPrice } from "@/lib/format";

const QUICK_QUESTIONS = [
  { label: "📜 Check Permits", prompt: "Are there any permits, visas, or special documents required for this trip?" },
  { label: "🔍 What am I missing?", prompt: "Audit my current itinerary, travel pace, and stays — what am I missing or what could be improved?" },
  { label: "🏡 Cheaper Homestays", prompt: "Can you find authentic, cheaper local homestays for this trip?" },
  { label: "📸 Add Photo Tour", prompt: "Add a golden hour sunrise photography walk to our activities" },
  { label: "⚡ Relax Day 2", prompt: "Make Day 2 a relaxed, slow-paced day with cafe visits and scenic viewpoints" },
  { label: "🍽️ Top Dining", prompt: "Recommend the best authentic local restaurants, street food stalls, and evening dining spots" },
  { label: "🎒 Packing Essentials", prompt: "What are the essential clothes, gear, and supplies to pack for this destination and weather?" },
];

export function ModifyChat({ initialPrompt }: { initialPrompt?: string }) {
  const blob = useTrip((s) => s.blob);
  const dataset = useTrip((s) => s.dataset);
  const log = useTrip((s) => s.chatLog);
  const travelerMemory = useTrip((s) => s.travelerMemory);
  const addChatMessage = useTrip((s) => s.addChatMessage);
  const updateTravelerMemory = useTrip((s) => s.updateTravelerMemory);
  const storeInitialPrompt = useTrip((s) => s.conciergeInitialPrompt);
  const clearConciergeInitialPrompt = useTrip((s) => s.clearConciergeInitialPrompt);

  const applyInstruction = useTrip((s) => s.applyInstruction);
  const chooseHotel = useTrip((s) => s.chooseHotel);
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

  const [text, setText] = useState(initialPrompt || "");
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Natural ChatGPT-style scroll tracking
  const scroller = useRef<HTMLDivElement>(null);
  const modalScroller = useRef<HTMLDivElement>(null);
  const bottomAnchor = useRef<HTMLDivElement>(null);
  const modalBottomAnchor = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const [modalIsAtBottom, setModalIsAtBottom] = useState(true);
  const [modalShowScrollBtn, setModalShowScrollBtn] = useState(false);
  const [modalHasUnread, setModalHasUnread] = useState(false);

  const handleScroll = (el: HTMLDivElement | null, isModal = false) => {
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceToBottom <= 80;
    if (isModal) {
      setModalIsAtBottom(atBottom);
      setModalShowScrollBtn(!atBottom);
      if (atBottom) setModalHasUnread(false);
    } else {
      setIsAtBottom(atBottom);
      setShowScrollBottomBtn(!atBottom);
      if (atBottom) setHasUnread(false);
    }
  };

  const scrollToBottom = (smooth = true, isModal = false) => {
    const behavior: ScrollBehavior = smooth ? "smooth" : "instant";
    if (isModal) {
      if (modalBottomAnchor.current) {
        modalBottomAnchor.current.scrollIntoView({ behavior, block: "end" });
      } else if (modalScroller.current) {
        modalScroller.current.scrollTo({ top: modalScroller.current.scrollHeight, behavior });
      }
      setModalHasUnread(false);
      setModalShowScrollBtn(false);
    } else {
      if (bottomAnchor.current) {
        bottomAnchor.current.scrollIntoView({ behavior, block: "end" });
      } else if (scroller.current) {
        scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior });
      }
      setHasUnread(false);
      setShowScrollBottomBtn(false);
    }
  };

  // Instant scroll on initial load
  useEffect(() => {
    scrollToBottom(false, false);
  }, []);

  // Smart auto-scroll when messages or typing state updates
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(true, false);
    } else {
      setHasUnread(true);
    }
  }, [log.length, isTyping]);

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        scrollToBottom(false, true);
      }, 50);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (modalIsAtBottom) {
      scrollToBottom(true, true);
    } else {
      setModalHasUnread(true);
    }
  }, [log.length, isTyping, isExpanded]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      void send(initialPrompt.trim());
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (storeInitialPrompt && storeInitialPrompt.trim()) {
      const p = storeInitialPrompt.trim();
      clearConciergeInitialPrompt();
      void send(p);
    }
  }, [storeInitialPrompt, clearConciergeInitialPrompt]);

  async function send(instruction: string) {
    if (!instruction.trim() || isTyping) return;
    const userPrompt = instruction.trim();
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (modalTextareaRef.current) modalTextareaRef.current.style.height = "auto";

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `usr_${Date.now()}`;
    addChatMessage({ id: userMsgId, role: "user", text: userPrompt, timestamp: nowTime });

    // Smooth scroll down immediately when user sends a prompt
    setTimeout(() => {
      scrollToBottom(true, false);
      if (isExpanded) scrollToBottom(true, true);
    }, 20);

    setIsTyping(true);

    try {
      const { total } = costTotals(blob.costs);
      const activeCurrency = getActiveCurrency();
      const hotelPriceFormatted = blob.hotels[0]?.pricePerNight
        ? formatPrice(blob.hotels[0].pricePerNight, activeCurrency)
        : undefined;
      const totalFormatted = formatPrice(total, activeCurrency);

      // 360° Comprehensive Situational Trip Context
      const tripContext = {
        destinationName: blob.destinationName,
        durationDays: blob.durationDays,
        travelers: blob.travelers,
        origin: blob.origin || "Origin City",
        hotelName: blob.hotels[0]?.name,
        hotelPriceFormatted,
        hotelPrice: blob.hotels[0]?.pricePerNight,
        stayMode: blob.preferences.stayMode || (blob.preferences.isSelfSupported ? "wild_camping" : "hotels"),
        budgetTier: blob.preferences.budgetTier,
        travelPace: blob.preferences.pace,
        currency: activeCurrency,
        flightAirline: blob.flight?.airline,
        flightDuration: blob.flight?.duration,
        experiences: blob.experiences.map((e) => e.name),
        places: dataset?.places.filter((p) => blob.selectedPlaceIds.includes(p.id)).map((p) => p.canonicalName) ?? [],
        candidateHotels: (dataset?.hotels ?? []).map((h) => ({
          id: h.id,
          name: h.name,
          priceFormatted: formatPrice(h.pricePerNight, activeCurrency),
          pricePerNight: h.pricePerNight,
          category: h.category,
          cleanliness: h.cleanliness,
          location: h.location,
        })),
        candidatePlaces: (dataset?.places ?? []).map((p) => p.canonicalName),
        permits: (dataset?.permits ?? []).map((p) => ({
          name: p.name,
          requirement: p.requirement,
          status: p.status,
          estimatedCostFormatted: formatPrice(p.estimatedCost, activeCurrency),
          estimatedCost: p.estimatedCost,
          process: p.process,
          responsible: p.responsible,
        })),
        conflicts: (dataset?.conflicts ?? []).map((c) => ({
          attribute: c.attribute,
          claimA: c.claimA?.text,
          claimB: c.claimB?.text,
          recommendation: c.recommendation,
        })),
        itinerary: blob.itinerary.map((d) => ({
          day: d.day,
          title: d.title,
          isRestDay: d.isRestDay,
          stops: d.stops.map((s) => `${s.start}-${s.end}: ${s.label}`),
        })),
        recentMutations: blob.mutations.slice(0, 8).map((m) => `${m.summary}${m.deltas?.length ? " (" + m.deltas.join(", ") + ")" : ""}`),
        totalCost: total,
        totalCostFormatted: totalFormatted,
        dietary: travelerMemory.dietaryRequirements,
      };

      // Prepare conversation history (excluding initial greeting to save prompt space)
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

      if (res.ok) {
        const data = (await res.json()) as {
          reply: string;
          action?: {
            kind: string;
            value?: number | string;
            targetHotelId?: string;
            targetHotelName?: string;
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
          actions?: Array<{
            kind: string;
            value?: number | string;
            targetHotelId?: string;
            targetHotelName?: string;
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
          }>;
          memoryDelta?: {
            learnedFacts?: string[];
            dietary?: string[];
            vibes?: string[];
            interests?: string[];
            style?: string[];
            pacing?: string[];
            budget?: string[];
            companionship?: string[];
            pastDecisions?: string[];
            keyNotes?: string[];
          };
        };

        // Absorb newly learned traveler memories
        if (data.memoryDelta) {
          updateTravelerMemory({
            ...data.memoryDelta,
            vibes: [...(data.memoryDelta.vibes || []), ...(data.memoryDelta.interests || [])],
          });
        }

        const deltas: string[] = [];
        const actionsToExecute = (data.actions && data.actions.length > 0)
          ? data.actions
          : data.action && data.action.kind !== "none"
          ? [data.action]
          : [];

        for (const act of actionsToExecute) {
          if (!act || act.kind === "none") continue;

          // 1. Direct Stay Swapping
          if (act.kind === "swap_hotel") {
            const targetId = act.targetHotelId;
            const targetName = (act.targetHotelName || (typeof act.value === "string" ? act.value : "")).toLowerCase();
            const hit = (dataset?.hotels ?? []).find(
              (h) => (targetId && h.id === targetId) || (targetName && h.name.toLowerCase().includes(targetName)) || (targetName && targetName.includes(h.name.toLowerCase()))
            );
            if (hit) {
              chooseHotel(hit);
              deltas.push(`Swapped stay → ${hit.name} (${hit.category || "homestay"})`);
            } else if (targetName) {
              void refineHotels(targetName);
              deltas.push(`Scouted stays for “${targetName}”`);
            }
          } else if (act.kind === "search_new_hotels") {
            const query = typeof act.value === "string" ? act.value : userPrompt;
            void refineHotels(query);
            deltas.push(`Live search & crawl: Stays matching “${query}”`);
          } else if (act.kind === "search_new_places") {
            const query = typeof act.value === "string" ? act.value : userPrompt;
            void refineInvestigation(query);
            deltas.push(`Live search & crawl: Places matching “${query}”`);
          } else if (act.kind === "upgrade_hotel") {
            if (/ryokan|onsen|villa|glamp|boutique|resort|5\s*star|luxury/i.test(userPrompt)) {
              void refineHotels(userPrompt);
              deltas.push(`Scouted luxury stays for “${userPrompt}”`);
            } else {
              applyInstruction("Make the hotel nicer");
              deltas.push("Hotel upgraded to higher comfort tier");
            }
          } else if (act.kind === "cheaper_hotel") {
            // Find cheaper homestay / budget hotel in candidates
            const currentPrice = blob.hotels[0]?.pricePerNight || 999999;
            const cheaper = (dataset?.hotels ?? [])
              .filter((h) => h.id !== blob.hotels[0]?.id && (h.pricePerNight || 0) < currentPrice)
              .sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0))[0];

            if (cheaper) {
              chooseHotel(cheaper);
              deltas.push(`Switched to affordable stay → ${cheaper.name}`);
            } else {
              void refineHotels(userPrompt);
              deltas.push(`Scouted budget homestays for “${userPrompt}”`);
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
          } else if (act.kind === "set_travelers" && (typeof act.value === "number" || typeof act.value === "string")) {
            const num = typeof act.value === "number" ? act.value : parseInt(act.value, 10);
            if (!isNaN(num)) {
              setTravelers(num);
              deltas.push(`Group size updated → ${num} travelers`);
            }
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
          } else if (act.kind === "audit_trip_gaps") {
            deltas.push("Audited permits, pace & trip gaps");
          }

          if (act.deltaLabel && !deltas.includes(act.deltaLabel)) {
            deltas.unshift(act.deltaLabel);
          }
        }

        if (actionsToExecute.length === 0) {
          // Fallback keyword parsing for adding activities
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

        if (data.memoryDelta) {
          updateTravelerMemory(data.memoryDelta);

          // Permanently sync newly discovered dietary and vibe preferences to Travel DNA
          const authUser = useAuth.getState().user;
          if (authUser) {
            const currentPrefs = authUser.preferences || {
              currency: "EUR",
              budgetTier: "balanced",
              pace: "balanced",
              stayPreference: "boutique",
              dietary: [],
              vibePriorities: [],
              flightPreferences: [],
            };
            let changed = false;
            const nextDietary = [...(currentPrefs.dietary || [])];
            for (const d of data.memoryDelta.dietary || []) {
              if (!nextDietary.map((x) => x.toLowerCase()).includes(d.toLowerCase())) {
                nextDietary.push(d);
                changed = true;
              }
            }
            const nextVibes = [...(currentPrefs.vibePriorities || [])];
            for (const v of data.memoryDelta.vibes || []) {
              if (!nextVibes.map((x) => x.toLowerCase()).includes(v.toLowerCase())) {
                nextVibes.push(v);
                changed = true;
              }
            }
            if (changed) {
              useAuth.getState().updatePreferences({
                dietary: nextDietary,
                vibePriorities: nextVibes,
              });
            }
          }
        }

        const latestMutation = useTrip.getState().blob.mutations[0];
        const allDeltas = Array.from(new Set([...deltas, ...(latestMutation?.deltas ?? [])])).slice(0, 3);
        const learnedUpdates = [
          ...(data.memoryDelta?.learnedFacts || []),
          ...(data.memoryDelta?.keyNotes || []),
          ...(data.memoryDelta?.dietary ? data.memoryDelta.dietary.map((d) => `Diet: ${d}`) : []),
          ...(data.memoryDelta?.vibes ? data.memoryDelta.vibes.map((v) => `Vibe: ${v}`) : []),
          ...(data.memoryDelta?.pacing ? data.memoryDelta.pacing.map((p) => `Pace: ${p}`) : []),
        ];

        addChatMessage({
          id: `bot_${Date.now()}`,
          role: "concierge",
          text: data.reply || "Done! I've updated your trip plan.",
          deltas: allDeltas.length > 0 ? allDeltas : undefined,
          memoryUpdates: learnedUpdates.length > 0 ? learnedUpdates : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      } else {
        applyInstruction(userPrompt);
        const latest = useTrip.getState().blob.mutations[0];
        const msg = useTrip.getState().lastMessage;
        addChatMessage({
          id: `bot_${Date.now()}`,
          role: "concierge",
          text: msg ?? latest?.summary ?? "I've processed that request and updated your trip settings.",
          deltas: latest?.deltas,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }
    } catch {
      applyInstruction(userPrompt);
      const latest = useTrip.getState().blob.mutations[0];
      const msg = useTrip.getState().lastMessage;
      addChatMessage({
        id: `bot_${Date.now()}`,
        role: "concierge",
        text: msg ?? latest?.summary ?? "I've noted that instruction and adjusted your itinerary.",
        deltas: latest?.deltas,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } finally {
      setIsTyping(false);
    }
  }

  const activeQuickQuestions = [
    ...(blob.travelers === 0
      ? [
          { label: "👤 Set 1 Solo", prompt: "Set our party size to 1 solo traveler" },
          { label: "👥 Set 2 Travelers", prompt: "Set our party size to 2 travelers" },
          { label: "👨‍👩‍👧 Set 4 Family", prompt: "Set our party size to 4 travelers" },
        ]
      : []),
    ...QUICK_QUESTIONS,
  ];

  return (
    <>
      <div className="card relative flex h-full flex-col overflow-hidden border border-brand/20 bg-card shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-paper-2 via-paper-2 to-brand/5 px-4 py-3 shrink-0">
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
                {blob.destinationName
                  ? `Synced with ${blob.destinationName} (${blob.durationDays}d${blob.travelers > 0 ? ` · ${blob.travelers}p` : " · 0 travellers ⚠️"})`
                  : "Real-time Trip Advisor"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MemoryBadge compact />
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

        {/* Message Log with Natural ChatGPT-style Smooth Scroll */}
        <div
          ref={scroller}
          onScroll={() => handleScroll(scroller.current, false)}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scroll-smooth scrollbar-thin"
        >
          {log.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
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
                    
                    {/* Action execution deltas */}
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

                    {/* Learned memory tags */}
                    {m.memoryUpdates && m.memoryUpdates.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.memoryUpdates.map((mem, mi) => (
                          <span
                            key={mi}
                            className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-300 border border-purple-500/20"
                          >
                            <span>🧠 Remembered:</span> {mem}
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
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
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
                <span>Concierge is recalling preferences & tailoring plan…</span>
              </div>
            </motion.div>
          )}

          {/* Invisible bottom anchor for reliable smooth scroll */}
          <div ref={bottomAnchor} className="h-2 shrink-0" />
        </div>

        {/* Floating "Scroll to Bottom" button when user is scrolled up */}
        <AnimatePresence>
          {showScrollBottomBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              onClick={() => scrollToBottom(true, false)}
              className="absolute bottom-28 right-5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper-2/95 text-ink shadow-lg backdrop-blur-md hover:bg-paper-3 hover:scale-105 active:scale-95 transition-all"
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

        {/* Quick prompt suggestions carousel & auto-resizing input */}
        <div className="border-t border-line bg-paper/95 px-3 pt-2 pb-2.5 w-full shrink-0 backdrop-blur-sm">
          {/* 1-Line horizontal prompt ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
            {activeQuickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => send(q.prompt)}
                disabled={isTyping}
                className="shrink-0 rounded-full border border-line bg-paper-2 px-3 py-1 text-[11px] font-medium text-ink-soft hover:text-ink hover:border-brand/50 hover:bg-brand/5 transition disabled:opacity-40 shadow-2xs leading-tight whitespace-nowrap"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* ChatGPT-style multi-line expanding input */}
          <div className="relative mt-1 flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(text);
                  }
                }}
                disabled={isTyping}
                rows={1}
                placeholder="Ask advice or request trip changes (Enter to send)..."
                className="w-full resize-none max-h-28 min-h-[40px] rounded-2xl border border-line bg-paper-2 pl-3.5 pr-10 py-2 text-xs md:text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 transition disabled:opacity-50 leading-relaxed scrollbar-none"
              />
            </div>
            <button
              onClick={() => send(text)}
              disabled={!text.trim() || isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-paper shadow-sm hover:brightness-110 active:scale-95 transition disabled:opacity-30 mb-0.5"
              title="Send message (Enter)"
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
              className="relative flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-line bg-paper-2 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand text-lg">
                    🧭
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">AI Travel Concierge</h3>
                    <p className="text-xs text-ink-soft">
                      {blob.destinationName} • {blob.durationDays} Days • {blob.travelers === 0 ? "0 Travelers (Party unconfirmed)" : `${blob.travelers} Travelers`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MemoryBadge />
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="rounded-xl border border-line bg-paper p-2 text-ink-soft hover:text-ink hover:border-brand/40 transition"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Messages with Natural ChatGPT-style Smooth Scroll */}
              <div
                ref={modalScroller}
                onScroll={() => handleScroll(modalScroller.current, true)}
                className="flex-1 space-y-4 overflow-y-auto px-6 py-6 scroll-smooth scrollbar-thin"
              >
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

                          {m.memoryUpdates && m.memoryUpdates.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {m.memoryUpdates.map((mem, mi) => (
                                <span
                                  key={mi}
                                  className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-500/20"
                                >
                                  <span>🧠 Remembered:</span> {mem}
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
                      <span>Concierge is recalling memory & analyzing your request…</span>
                    </div>
                  </div>
                )}

                {/* Bottom anchor */}
                <div ref={modalBottomAnchor} className="h-2 shrink-0" />
              </div>

              {/* Floating "Scroll to bottom" in expanded modal */}
              <AnimatePresence>
                {modalShowScrollBtn && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    onClick={() => scrollToBottom(true, true)}
                    className="absolute bottom-32 right-8 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-2/95 text-ink shadow-xl backdrop-blur-md hover:bg-paper-3 hover:scale-105 active:scale-95 transition-all"
                    title="Scroll to bottom"
                  >
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {modalHasUnread && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Modal Input */}
              <div className="border-t border-line bg-paper p-4 shrink-0">
                <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                  {activeQuickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => send(q.prompt)}
                      disabled={isTyping}
                      className="shrink-0 rounded-full border border-line-strong bg-paper-2 px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink hover:border-brand/50 transition disabled:opacity-40 whitespace-nowrap"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-3">
                  <textarea
                    ref={modalTextareaRef}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(text);
                      }
                    }}
                    disabled={isTyping}
                    rows={1}
                    placeholder="Ask advice or request itinerary changes (Enter to send, Shift+Enter for newline)..."
                    className="flex-1 resize-none max-h-36 min-h-[46px] rounded-2xl border border-line bg-paper-2 px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 transition disabled:opacity-50 leading-relaxed scrollbar-none"
                  />
                  <button
                    onClick={() => send(text)}
                    disabled={!text.trim() || isTyping}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-paper shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-30 mb-0.5"
                    title="Send message"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
