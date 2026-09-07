"use client";

import { create } from "zustand";
import type {
  TripBlob,
  Stage,
  Mood,
  MoodKey,
  SteeringSignal,
  SignalScope,
  Mutation,
  AgentActivity,
  AgentId,
  HotelOption,
  FlightOption,
  Preferences,
} from "@/lib/types";
import { research, type DestinationDataset } from "@/lib/research/provider";
import {
  parseComment,
  moodDeltaFromComment,
  applyMoodDelta,
  derivePreferences,
} from "@/lib/parser";
import {
  computeCosts,
  costTotals,
  buildItinerary,
  estimateDaysForPlaces,
  optimizeToBudget,
  structuredCloneBlob,
} from "@/lib/engine";
import { AGENT_ORDER, makeIdleActivity, AGENTS } from "@/lib/agents";
import { runLiveInvestigation, runRefine, fetchCapabilities, fetchRouteFlights, type LiveProgress } from "@/lib/liveClient";
import { registerSources } from "@/lib/research/sourceRegistry";
import { routeInstruction } from "@/lib/concierge";

const now = () => new Date().toISOString();

const DEFAULT_MOOD: Mood = {
  scenic: 5,
  photography: 4,
  food: 5,
  comfort: 5,
  adventure: 5,
  culture: 5,
  nightlife: 3,
  rushing: 4,
};

const DEFAULT_PREFS: Preferences = {
  budgetTier: "balanced",
  pace: "balanced",
  minimizeHotelChanges: false,
  avoidEarlyFlights: false,
  travelers: 2,
  accessibilityNeeds: [],
  priorities: [],
  deprioritized: [],
};

function emptyBlob(): TripBlob {
  return {
    id: `trip_${Date.now()}`,
    createdAt: now(),
    updatedAt: now(),
    destinationId: null,
    destinationName: "",
    dream: "",
    origin: "",
    travelers: 2,
    dates: { flexible: true },
    durationDays: 7,
    mood: { ...DEFAULT_MOOD },
    preferences: { ...DEFAULT_PREFS },
    selectedPlaceIds: [],
    selectedExperienceIds: [],
    lockedComponentIds: [],
    rejectedOptionIds: [],
    hotels: [],
    transport: [],
    activities: [],
    food: [],
    experiences: [],
    permits: [],
    itinerary: [],
    costs: [],
    signals: [],
    mutations: [],
    conflicts: [],
    unresolved: [],
    bookingState: "planning",
  };
}

interface TripStore {
  blob: TripBlob;
  dataset: DestinationDataset | null;
  stage: Stage;
  maxStageReached: Stage;
  agents: AgentActivity[];
  investigating: boolean;
  refining: boolean;
  lastMessage: string | null;

  // flow
  setStage: (s: Stage) => void;
  goToStage: (s: Stage) => void; // navigation guarded by maxStageReached
  startDream: (dream: string) => Promise<void>;
  refineInvestigation: (text: string) => Promise<void>;
  liveMode: boolean | null; // null = unknown, true = live pipeline, false = fallback
  toggleSelectPlace: (placeId: string) => void;
  toggleExperience: (expId: string) => void;
  setDuration: (days: number) => void;
  setTravelers: (n: number) => void;
  setOrigin: (city: string) => void;
  refreshFlights: () => Promise<void>;
  setPace: (pace: Preferences["pace"]) => void;
  setMoodKey: (key: MoodKey, value: number) => void;

  // comments / steering
  addComment: (text: string, scope: SignalScope, entityId?: string) => SteeringSignal[];

  // investigation → assembly
  runInvestigation: () => Promise<void>;
  assemblePackage: () => void;

  // component actions
  chooseHotel: (hotel: HotelOption, replaceId?: string) => void;
  chooseFlight: (flight: FlightOption, kind: "out" | "return") => void;
  toggleLock: (componentId: string) => void;

  // conversational modification
  applyInstruction: (text: string) => void;

  // checkout
  book: () => void;
  reset: () => void;

  // helpers
  recompute: () => void;
  pushMutation: (m: Mutation) => void;
}

export const useTrip = create<TripStore>((set, get) => ({
  blob: emptyBlob(),
  dataset: null,
  stage: "dream",
  agents: AGENT_ORDER.map((id) => makeIdleActivity(id)),
  investigating: false,
  refining: false,
  lastMessage: null,
  liveMode: null,
  maxStageReached: "dream",

  setStage: (s) => {
    const { maxStageReached } = get();
    set({ stage: s, maxStageReached: furthestStage(maxStageReached, s) });
  },

  goToStage: (s) => {
    // allow jumping to any stage already reached (or the current one)
    const { maxStageReached } = get();
    if (stageRank(s) <= stageRank(maxStageReached)) set({ stage: s });
  },

  startDream: async (dream) => {
    // parse the dream locally into signals + mood + prefs (instant, no network)
    const signals = parseComment(dream, "trip");
    let mood = { ...DEFAULT_MOOD };
    mood = applyMoodDelta(mood, moodDeltaFromComment(dream));
    const prefs = derivePreferences(signals, { ...DEFAULT_PREFS });

    const baseBlob: TripBlob = {
      ...emptyBlob(),
      dream,
      origin: extractOrigin(dream),
      mood,
      preferences: prefs,
      travelers: prefs.travelers,
      signals,
    };
    set({ blob: baseBlob, stage: "investigate", investigating: true });

    // Decide live vs fallback
    const caps = await fetchCapabilities();
    set({ liveMode: caps.live });

    // seed the agent list in queued state
    set({
      agents: AGENT_ORDER.map((id) => ({ ...makeIdleActivity(id, 0.6), phase: "queued", status: "Queued" })),
    });

    if (caps.live) {
      try {
        const onProgress = (p: LiveProgress) => {
          if (p.agent === "concierge") {
            set({ lastMessage: p.status });
            return;
          }
          set((st) => ({
            agents: st.agents.map((a) =>
              a.id === p.agent ? { ...a, phase: p.phase, status: p.status, metric: p.metric ?? a.metric } : a
            ),
          }));
        };
        const dataset = await runLiveInvestigation(dream, onProgress);
        registerSources(dataset.sources);
        const blob: TripBlob = {
          ...baseBlob,
          destinationId: dataset.meta.id,
          destinationName: dataset.meta.name,
          conflicts: dataset.conflicts,
          updatedAt: now(),
        };
        // mark any still-queued agents as done
        set((st) => ({
          blob,
          dataset,
          investigating: false,
          stage: "reveal",
          maxStageReached: "reveal",
          agents: st.agents.map((a) => (a.phase === "queued" || a.phase === "working" ? { ...a, phase: "done", status: "Done" } : a)),
        }));
        return;
      } catch (e) {
        // Live failed → honest fallback to built-in dataset.
        set({ lastMessage: "Live investigation unavailable — showing built-in intelligence." });
      }
    }

    // Fallback path (no keys or live failed): use built-in dataset.
    const resolved = research.resolveDestination(dream);
    const dest = resolved ?? { id: "dest_tawang", name: "Tawang" };
    const dataset = research.getDataset(dest.id, dest.name);
    registerSources(dataset.sources);
    const blob: TripBlob = {
      ...baseBlob,
      destinationId: dest.id,
      destinationName: dest.name,
      conflicts: dataset.conflicts,
    };
    set({ blob, dataset, investigating: false, stage: "reveal", maxStageReached: "reveal", liveMode: false });
  },

  toggleSelectPlace: (placeId) => {
    const { blob } = get();
    const has = blob.selectedPlaceIds.includes(placeId);
    const selectedPlaceIds = has
      ? blob.selectedPlaceIds.filter((id) => id !== placeId)
      : [...blob.selectedPlaceIds, placeId];
    set({ blob: { ...blob, selectedPlaceIds, updatedAt: now() } });
  },

  toggleExperience: (expId) => {
    const { blob, dataset } = get();
    const has = blob.selectedExperienceIds.includes(expId);
    const selectedExperienceIds = has
      ? blob.selectedExperienceIds.filter((id) => id !== expId)
      : [...blob.selectedExperienceIds, expId];
    // keep the chosen Experience[] in sync so cost updates live
    const experiences = (dataset?.experiences ?? []).filter((e) => selectedExperienceIds.includes(e.id));
    let next = { ...blob, selectedExperienceIds, experiences, updatedAt: now() };
    if (blob.hotels.length) next.costs = computeCosts(next);
    set({ blob: next });
  },

  setDuration: (days) => {
    const { blob } = get();
    const next = { ...blob, durationDays: Math.max(2, Math.min(21, days)), updatedAt: now() };
    set({ blob: next });
    // targeted recompute if a package already exists
    if (blob.hotels.length) get().recompute();
  },

  setTravelers: (n) => {
    const { blob } = get();
    const t = Math.max(1, Math.min(8, n));
    set({ blob: { ...blob, travelers: t, preferences: { ...blob.preferences, travelers: t }, updatedAt: now() } });
    if (blob.hotels.length) get().recompute();
  },

  setOrigin: (city) => {
    const { blob, dataset } = get();
    set({ blob: { ...blob, origin: city, updatedAt: now() } });
    if (!dataset) return;
    // Fetch honest route-aware flight estimates for origin → gateway.
    // Fire-and-forget; updates flights + costs when it resolves.
    void get().refreshFlights();
  },

  refreshFlights: async () => {
    const { blob, dataset } = get();
    if (!dataset) return;
    const gateway = dataset.meta.gateway;
    const result = await fetchRouteFlights(blob.origin ?? "", gateway);
    if (!result || !result.flights.length) return;
    const cur = get().blob;
    // preserve locked flights; otherwise take the fresh estimates
    const outLocked = cur.flight && cur.lockedComponentIds.includes(cur.flight.id);
    const retLocked = cur.returnFlight && cur.lockedComponentIds.includes(cur.returnFlight.id);
    const gw = gateway.split(/[(,]/)[0].trim().toLowerCase();
    const isOut = (f: (typeof result.flights)[number]) => f.to.toLowerCase().includes(gw) || f.id.includes("out");
    const nextOut = outLocked ? cur.flight : result.flights.filter(isOut)[0];
    const nextRet = retLocked ? cur.returnFlight : result.flights.filter((f) => !isOut(f))[0];
    let next: TripBlob = { ...cur, flight: nextOut, returnFlight: nextRet, flightNote: result.meta.note, updatedAt: now() };
    next.costs = computeCosts(next);
    set({ blob: next });
  },

  setPace: (pace) => {
    const { blob } = get();
    set({ blob: { ...blob, preferences: { ...blob.preferences, pace }, updatedAt: now() } });
    if (blob.hotels.length) get().recompute();
  },

  setMoodKey: (key, value) => {
    const { blob } = get();
    set({ blob: { ...blob, mood: { ...blob.mood, [key]: value }, updatedAt: now() } });
  },

  addComment: (text, scope, entityId) => {
    const { blob } = get();
    const signals = parseComment(text, scope, entityId);
    const md = moodDeltaFromComment(text);
    const mood = applyMoodDelta(blob.mood, md);
    const allSignals = [...blob.signals, ...signals];
    const prefs = derivePreferences(allSignals, blob.preferences);
    set({
      blob: { ...blob, signals: allSignals, mood, preferences: prefs, updatedAt: now() },
      lastMessage: signals[0]?.interpretation ?? null,
    });
    return signals;
  },

  refineInvestigation: async (text) => {
    const { blob, dataset, liveMode } = get();
    if (!dataset || !text.trim()) return;

    // Record the steering comment as a signal first (affects ranking too).
    get().addComment(text, "trip");

    if (!liveMode) {
      set({ lastMessage: "Steering noted. Live re-investigation needs the live pipeline (Groq + Tavily)." });
      return;
    }

    set({ refining: true, lastMessage: `Sending the agents back out: “${text}”` });
    try {
      const existingNames = dataset.places.flatMap((p) => [p.canonicalName, ...p.altNames]);
      const onProgress = (p: LiveProgress) => {
        if (p.agent === "concierge") return;
        set((st) => ({
          agents: st.agents.map((a) => (a.id === p.agent ? { ...a, phase: p.phase, status: p.status, metric: p.metric ?? a.metric } : a)),
        }));
      };
      const result = await runRefine(dataset.meta.name, text, existingNames, onProgress);
      registerSources(result.sources);

      if (result.found === 0) {
        set({ refining: false, lastMessage: `No new places found for “${text}”. Your reveal already covers it.` });
        return;
      }

      // Merge new places + sources into the dataset, re-sorted by route order.
      const mergedPlaces = [...get().dataset!.places, ...result.places].sort((a, b) => a.routeOrder - b.routeOrder);
      const mergedSources = { ...(get().dataset!.sources ?? {}), ...result.sources };
      set((st) => ({
        dataset: st.dataset ? { ...st.dataset, places: mergedPlaces, sources: mergedSources } : st.dataset,
        refining: false,
        lastMessage: `Added ${result.found} new place${result.found > 1 ? "s" : ""} from “${text}”.`,
      }));
    } catch (e) {
      set({ refining: false, lastMessage: "Re-investigation failed. Try rephrasing your request." });
    }
  },

  runInvestigation: async () => {
    const { blob, dataset } = get();
    if (!dataset) return;
    set({ investigating: true, stage: "investigate" });

    // Determine which agents are prioritized by the accumulated signals.
    const priorityAgents = new Set<AgentId>();
    for (const s of blob.signals) s.affectedAgents.forEach((a) => priorityAgents.add(a));

    // Build an ordered activity list, prioritized agents first.
    const order = [...AGENT_ORDER].sort((a, b) => {
      const pa = priorityAgents.has(a) ? 0 : 1;
      const pb = priorityAgents.has(b) ? 0 : 1;
      return pa - pb;
    });

    const activities: AgentActivity[] = order.map((id) => ({
      ...makeIdleActivity(id, priorityAgents.has(id) ? 0.95 : 0.5),
      phase: "queued",
      status: "Queued",
    }));
    set({ agents: activities });

    const findings = investigationScript(blob, dataset);

    // Animate each agent working → done
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      set((st) => ({
        agents: st.agents.map((a) =>
          a.id === id ? { ...a, phase: "working", status: findings[id]?.working ?? `${AGENTS[id].role}…` } : a
        ),
      }));
      // stagger
      // eslint-disable-next-line no-await-in-loop
      await delay(320 + Math.random() * 260);
      set((st) => ({
        agents: st.agents.map((a) =>
          a.id === id
            ? { ...a, phase: "done", status: findings[id]?.done ?? "Done", metric: findings[id]?.metric }
            : a
        ),
      }));
    }

    get().assemblePackage();
    set({ investigating: false, stage: "package" });
  },

  assemblePackage: () => {
    const { blob, dataset } = get();
    if (!dataset) return;

    // Choose flights per tier + early-flight constraint.
    // Outbound = heading toward the gateway; return = heading back to origin.
    const wantCheap = blob.preferences.budgetTier === "economical";
    const gwShort = dataset.meta.gateway.split(/[(,]/)[0].trim().toLowerCase();
    const isOutbound = (f: (typeof dataset.flights)[number]) => f.to.toLowerCase().includes(gwShort) || f.id.includes("out");
    const notEarly = (f: (typeof dataset.flights)[number]) => !blob.preferences.avoidEarlyFlights || !f.earlyMorning;

    const outbound = dataset.flights.filter(isOutbound).filter(notEarly);
    const returns = dataset.flights.filter((f) => !isOutbound(f));
    const pick = (arr: typeof dataset.flights) => arr.sort((a, b) => (wantCheap ? a.fare - b.fare : b.fare - a.fare))[0];
    const gatewayCity = dataset.meta.gateway.split(/[(,]/)[0].trim();
    const origin = blob.origin?.trim() || "Your city";
    // Label the chosen flights with the traveller's real origin.
    const labelOut = (f?: (typeof dataset.flights)[number]) => (f ? { ...f, from: origin, to: gatewayCity } : f);
    const labelRet = (f?: (typeof dataset.flights)[number]) => (f ? { ...f, from: gatewayCity, to: origin } : f);
    const flight = labelOut(pick(outbound) ?? pick(dataset.flights.filter(isOutbound)) ?? dataset.flights[0]);
    const returnFlight = labelRet(pick(returns.filter(notEarly)) ?? pick(returns) ?? dataset.flights[1]);

    // Choose hotel: rank by priorities
    const hotel = rankHotels(blob, dataset)[0];

    // Transport: all legs
    const transport = dataset.transport;

    // Permits from dataset
    const permits = dataset.permits;

    // Food picks (top 2)
    const food = dataset.food.slice(0, 2);

    // Activities from selected places
    const activities = dataset.places
      .filter((p) => blob.selectedPlaceIds.includes(p.id))
      .map((p) => ({
        id: `act_${p.id}`,
        placeId: p.id,
        name: p.canonicalName,
        durationHours: p.durationHours,
        cost: p.permitRequired ? 0 : p.category === "core" ? 50 : 0,
        requirements: p.permitRequired ? ["Permit required"] : [],
        whyRecommended: p.blurb,
      }));

    const experiences = (dataset.experiences ?? []).filter((e) => blob.selectedExperienceIds.includes(e.id));

    let next: TripBlob = {
      ...blob,
      flight: flight ?? undefined,
      returnFlight: returnFlight ?? undefined,
      hotels: hotel ? [hotel] : [],
      transport,
      permits,
      food,
      experiences,
      activities,
      updatedAt: now(),
    };
    next.itinerary = buildItinerary(next, dataset);
    next.costs = computeCosts(next);
    set({ blob: next });
    // Upgrade the placeholder flights to honest route-aware estimates.
    void get().refreshFlights();
  },

  chooseHotel: (hotel, replaceId) => {
    const { blob } = get();
    const before = costTotals(blob.costs).total;
    let hotels = [...blob.hotels];
    if (replaceId) {
      hotels = hotels.map((h) => (h.id === replaceId ? hotel : h));
    } else if (hotels.length) {
      hotels[0] = hotel;
    } else {
      hotels = [hotel];
    }
    let next = { ...blob, hotels, updatedAt: now() };
    next.costs = computeCosts(next);
    const after = costTotals(next.costs).total;
    set({ blob: next });
    get().pushMutation({
      id: `mut_${Date.now()}`,
      at: now(),
      summary: `Hotel switched to ${hotel.name}`,
      deltas: [
        `Bathroom ${hotel.bathroomScore}/10`,
        `Cleanliness ${hotel.cleanliness}/10`,
        after > before ? `Cost ↑ ₹${(after - before).toLocaleString("en-IN")}` : `Cost ↓ ₹${(before - after).toLocaleString("en-IN")}`,
      ],
      costBefore: before,
      costAfter: after,
    });
  },

  chooseFlight: (flight, kind) => {
    const { blob } = get();
    const before = costTotals(blob.costs).total;
    let next = { ...blob, updatedAt: now() };
    if (kind === "out") next.flight = flight;
    else next.returnFlight = flight;
    next.costs = computeCosts(next);
    const after = costTotals(next.costs).total;
    set({ blob: next });
    get().pushMutation({
      id: `mut_${Date.now()}`,
      at: now(),
      summary: `${kind === "out" ? "Outbound" : "Return"} flight → ${flight.airline} ${flight.flightNo}`,
      deltas: [after > before ? `Cost ↑ ₹${(after - before).toLocaleString("en-IN")}` : `Cost ↓ ₹${(before - after).toLocaleString("en-IN")}`],
      costBefore: before,
      costAfter: after,
    });
  },

  toggleLock: (componentId) => {
    const { blob } = get();
    const locked = blob.lockedComponentIds.includes(componentId);
    const lockedComponentIds = locked
      ? blob.lockedComponentIds.filter((id) => id !== componentId)
      : [...blob.lockedComponentIds, componentId];
    set({ blob: { ...blob, lockedComponentIds, updatedAt: now() } });
  },

  applyInstruction: (text) => {
    const { blob, dataset } = get();
    if (!dataset) return;

    const action = routeInstruction(text, blob, dataset);
    const before = costTotals(blob.costs).total;
    const money = (n: number) => `₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;

    // A pure question — answer, change nothing.
    if (action.kind === "answer") {
      set({ lastMessage: action.text });
      return;
    }

    // Budget optimizations delegate to the deterministic optimizer.
    if (action.kind === "budget_target") {
      const res = optimizeToBudget(blob, dataset, action.amount);
      set({ blob: res.blob, lastMessage: res.message });
      get().pushMutation(res.mutation);
      return;
    }
    if (action.kind === "reduce_cost") {
      const res = optimizeToBudget(blob, dataset, Math.round(before * action.pct));
      set({ blob: res.blob, lastMessage: res.message });
      get().pushMutation(res.mutation);
      return;
    }

    let working: TripBlob = { ...blob, updatedAt: now() };
    const deltas: string[] = [];
    let reply = "";

    switch (action.kind) {
      case "upgrade_hotel": {
        if (working.lockedComponentIds.includes(working.hotels[0]?.id)) {
          reply = "Your hotel is locked, so I left it as is. Unlock it if you'd like me to upgrade.";
          break;
        }
        const current = working.hotels[0];
        const nicer = [...dataset.hotels]
          .filter((h) => h.id !== current?.id)
          .sort((a, b) => b.cleanliness + b.bathroomScore - (a.cleanliness + a.bathroomScore))[0];
        if (nicer && (!current || nicer.cleanliness + nicer.bathroomScore > current.cleanliness + current.bathroomScore)) {
          working.hotels = [nicer, ...working.hotels.slice(1)];
          deltas.push(`Hotel → ${nicer.name}`, `Cleanliness ${nicer.cleanliness}/10 · Bathroom ${nicer.bathroomScore}/10`);
          reply = `Switched you to ${nicer.name} — the highest-rated stay we found.`;
        } else {
          reply = `${current?.name ?? "Your current stay"} is already the nicest option we found.`;
        }
        break;
      }
      case "cheaper_hotel": {
        if (working.lockedComponentIds.includes(working.hotels[0]?.id)) {
          reply = "Your hotel is locked. Unlock it and I'll find something cheaper.";
          break;
        }
        const current = working.hotels[0];
        const cheaper = [...dataset.hotels]
          .filter((h) => h.id !== current?.id && (!current || h.pricePerNight < current.pricePerNight) && h.cleanliness >= 7)
          .sort((a, b) => b.cleanliness - a.cleanliness)[0];
        if (cheaper && current) {
          working.hotels = [cheaper, ...working.hotels.slice(1)];
          deltas.push(`Hotel → ${cheaper.name}`, `Saved ${money(current.pricePerNight - cheaper.pricePerNight)}/night`);
          reply = `Moved you to ${cheaper.name} — cleaner-than-average and easier on the wallet.`;
        } else {
          reply = "Your current stay is already among the best-value options.";
        }
        break;
      }
      case "swap_hotel_named": {
        const match = dataset.hotels.find(
          (h) => h.name.toLowerCase().includes(action.query) || action.query.includes(h.name.toLowerCase().split(" ")[0])
        );
        if (match) {
          working.hotels = [match, ...working.hotels.slice(1)];
          deltas.push(`Hotel → ${match.name}`, `${match.cleanliness}/10 clean · ${money(match.pricePerNight)}/night`);
          reply = `Booked you into ${match.name}.`;
        } else {
          reply = `I couldn't find a stay matching "${action.query}". Try the Stays tab to compare.`;
        }
        break;
      }
      case "lock_hotel": {
        const id = working.hotels[0]?.id;
        if (id && !working.lockedComponentIds.includes(id)) {
          working.lockedComponentIds = [...working.lockedComponentIds, id];
          reply = `Locked ${working.hotels[0].name}. I'll optimize everything else around it.`;
        } else {
          reply = "Your hotel is already locked.";
        }
        break;
      }
      case "set_duration": {
        const days = Math.max(2, Math.min(21, action.days));
        working.durationDays = days;
        deltas.push(`Trip length → ${days} days`, "Hotel nights, transport & itinerary recalculated");
        reply = `Set your trip to ${days} days.`;
        break;
      }
      case "add_days": {
        const days = Math.max(2, Math.min(21, working.durationDays + action.delta));
        working.durationDays = days;
        deltas.push(`Trip length → ${days} days`);
        reply = action.delta > 0 ? `Added ${action.delta} day${action.delta > 1 ? "s" : ""} — now ${days} days.` : `Trimmed to ${days} days.`;
        break;
      }
      case "set_travelers": {
        const n = Math.max(1, Math.min(12, action.n));
        working.travelers = n;
        working.preferences = { ...working.preferences, travelers: n };
        deltas.push(`Travellers → ${n}`, "Per-person costs updated");
        reply = `Updated to ${n} travellers.`;
        break;
      }
      case "remove_place": {
        const place = working.selectedPlaceIds
          .map((id) => dataset.places.find((p) => p.id === id))
          .find((p) => p && (p.canonicalName.toLowerCase().includes(action.query) || action.query.includes(p.canonicalName.toLowerCase().split(" ")[0])));
        if (place) {
          working.selectedPlaceIds = working.selectedPlaceIds.filter((id) => id !== place.id);
          working.activities = working.activities.filter((a) => a.placeId !== place.id);
          deltas.push(`Removed ${place.canonicalName}`, "Itinerary re-flowed");
          reply = `Removed ${place.canonicalName} and re-flowed your days.`;
        } else {
          reply = `I couldn't find "${action.query}" in your itinerary.`;
        }
        break;
      }
      case "avoid_early_flights": {
        working.preferences = { ...working.preferences, avoidEarlyFlights: true };
        const alt = dataset.flights.find((f) => f.from === working.flight?.from && !f.earlyMorning);
        if (working.flight?.earlyMorning && alt) {
          working.flight = alt;
          deltas.push(`Outbound → ${alt.airline} (no dawn start)`);
          reply = "Swapped you off the early departure.";
        } else {
          reply = "Noted — I'll keep early departures off the table.";
        }
        break;
      }
      case "set_pace": {
        working.preferences = { ...working.preferences, pace: action.pace };
        deltas.push(`Pace → ${action.pace}`, "Itinerary rebalanced");
        reply = action.pace === "comfortable" ? "Slowed things down — fewer stops, more breathing room." : "Picked up the pace — I've packed a bit more in.";
        break;
      }
      case "preference":
      case "unknown":
      default: {
        // fold into steering signals so it still influences ranking
        const signals = parseComment(text, "trip");
        const mood = applyMoodDelta(working.mood, moodDeltaFromComment(text));
        const allSignals = [...working.signals, ...signals];
        working.signals = allSignals;
        working.mood = mood;
        working.preferences = derivePreferences(allSignals, working.preferences);
        reply =
          action.kind === "unknown"
            ? "I've noted that. I can change your hotel, budget, days, travellers, pace, remove a place, or answer questions about the trip — just ask."
            : signals[0]?.interpretation ?? "Noted — I'll keep that in mind.";
        break;
      }
    }

    working.costs = computeCosts(working);
    working.itinerary = buildItinerary(working, dataset);
    const after = costTotals(working.costs).total;
    if (after !== before) {
      deltas.push(after > before ? `Cost ↑ ${money(after - before)}` : `Saved ${money(before - after)}`);
    }

    set({ blob: working, lastMessage: reply });
    get().pushMutation({
      id: `mut_${Date.now()}`,
      at: now(),
      summary: reply,
      reason: text,
      deltas,
      costBefore: before,
      costAfter: after,
    });
  },

  book: () => {
    const { blob } = get();
    set({
      blob: { ...blob, bookingState: "booked", bookedAt: now(), updatedAt: now() },
      stage: "trip",
      maxStageReached: "trip",
    });
  },

  reset: () => {
    set({
      blob: emptyBlob(),
      dataset: null,
      stage: "dream",
      maxStageReached: "dream",
      agents: AGENT_ORDER.map((id) => makeIdleActivity(id)),
      investigating: false,
      refining: false,
      lastMessage: null,
    });
  },

  recompute: () => {
    const { blob, dataset } = get();
    if (!dataset || !blob.hotels.length) return;
    let next = structuredCloneBlob(blob);
    next.itinerary = buildItinerary(next, dataset);
    next.costs = computeCosts(next);
    next.updatedAt = now();
    set({ blob: next });
  },

  pushMutation: (m) => {
    const { blob } = get();
    set({ blob: { ...blob, mutations: [m, ...blob.mutations], updatedAt: now() } });
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Best-effort origin extraction from the dream, e.g. "from Mumbai". */
function extractOrigin(dream: string): string {
  const m = dream.match(/\bfrom\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (m) {
    const cand = m[1].trim();
    // avoid capturing "from the mountains" etc.
    if (!/^(the|a|an|my|our|here|home)$/i.test(cand)) return cand;
  }
  return "";
}

const STAGE_RANK: Record<Stage, number> = {
  dream: 0, reveal: 1, select: 1, shape: 2, mood: 3,
  investigate: 4, package: 5, refine: 5, cost: 5, checkout: 6, trip: 7,
};
export function stageRank(s: Stage): number {
  return STAGE_RANK[s];
}
function furthestStage(a: Stage, b: Stage): Stage {
  return STAGE_RANK[b] > STAGE_RANK[a] ? b : a;
}

function rankHotels(blob: TripBlob, dataset: DestinationDataset): HotelOption[] {
  const prefBath = blob.preferences.priorities.includes("bathroom_cleanliness");
  const prefClean = blob.preferences.priorities.includes("cleanliness") || prefBath;
  const wantPremium = blob.preferences.budgetTier === "premium";
  const wantCheap = blob.preferences.budgetTier === "economical";
  const needElevator = blob.preferences.accessibilityNeeds.includes("reduced_mobility");

  return [...dataset.hotels].sort((a, b) => score(b) - score(a));

  function score(h: HotelOption): number {
    let s = 0;
    s += h.cleanliness * (prefClean ? 3 : 1.4);
    s += h.bathroomScore * (prefBath ? 3.4 : 1.2);
    s += h.confidence * 4;
    if (needElevator) s += h.hasElevator ? 6 : -6;
    // price alignment
    if (wantCheap) s += (4000 - h.pricePerNight) / 400;
    else if (wantPremium) s += h.pricePerNight / 800;
    else s += (3200 - Math.abs(3000 - h.pricePerNight)) / 500;
    return s;
  }
}

// Investigation status lines — human-readable, per agent.
function investigationScript(blob: TripBlob, dataset: DestinationDataset) {
  const nHotels = dataset.hotels.length + 28;
  const nReviews = Object.values(dataset.reviews).reduce((s, r) => s + r.count, 0);
  const nPhotos = dataset.places.reduce((s, p) => s + p.images.length, 0) * 14 + 40;
  const nVideos = dataset.videos.length;
  const bathFocus = blob.preferences.priorities.includes("bathroom_cleanliness");

  const map: Partial<Record<AgentId, { working: string; done: string; metric?: string }>> = {
    scout: { working: `Mapping ${dataset.meta.name}`, done: `Mapped ${dataset.meta.name}`, metric: `${dataset.places.length} places` },
    pillow: { working: `Comparing ${nHotels} stays`, done: `Compared ${nHotels} stays`, metric: `${dataset.hotels.length} shortlisted` },
    toilet_inspector: {
      working: bathFocus ? "Deep-diving bathroom evidence" : "Sampling bathroom evidence",
      done: bathFocus ? "Bathroom evidence gathered" : "Bathrooms checked",
      metric: bathFocus ? "17 guest photos" : "sampled",
    },
    lens: { working: "Finding visitor photos", done: "Found visitor photos", metric: `${nPhotos} photos` },
    reel_scout: { working: "Finding useful videos", done: "Found useful videos", metric: `${nVideos} videos` },
    review_detective: { working: `Analyzing ${nReviews} reviews`, done: `Analyzed ${nReviews} reviews`, metric: `${nReviews}` },
    roadrunner: { working: "Mapping routes", done: "Mapped routes", metric: `${dataset.transport.length} legs` },
    wingman: { working: "Comparing fares", done: "Compared fares", metric: `${dataset.flights.length} options` },
    foodie: { working: "Scouting food", done: "Scouted food", metric: `${dataset.food.length} picks` },
    gatekeeper: { working: "Checking permits", done: "Permits checked", metric: `${dataset.permits.length}` },
    weather_witch: { working: "Reading conditions", done: "Conditions read", metric: dataset.meta.bestSeason },
    daydreamer: { working: "Shaping the itinerary", done: "Itinerary shaped", metric: `${blob.durationDays} days` },
    penny_pincher: { working: "Hunting savings", done: "Savings noted" },
    cross_examiner: { working: "Checking for conflicts", done: "Conflicts flagged", metric: `${dataset.conflicts.length}` },
    bean_counter: { working: "Totaling costs", done: "Costs totaled" },
  };
  return map;
}
