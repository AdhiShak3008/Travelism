import type {
  TripBlob,
  CostLine,
  ItineraryDay,
  ItineraryStop,
  Place,
  HotelOption,
  Mutation,
} from "./types";
import type { DestinationDataset } from "./research/provider";

const now = () => new Date().toISOString();

// ============================================================================
// COST MODEL — deterministic. Every line has a status + source + timestamp.
// Computes realistic market rates across duration and travelers.
// ============================================================================
export function computeCosts(blob: TripBlob): CostLine[] {
  const lines: CostLine[] = [];
  const nights = Math.max(1, blob.durationDays - 1);
  const travelers = Math.max(1, blob.travelers || 1);

  if (blob.flight) {
    const amt = blob.flight.fare * travelers;
    lines.push({
      id: "cost_flight_out",
      label: `Flights out (${travelers}x) · ${blob.flight.airline}`,
      amount: amt,
      currency: "INR",
      status: "confirmed",
      sourceId: blob.flight.sourceId,
      checkedAt: now(),
      perPerson: false,
    });
  }
  if (blob.returnFlight) {
    const amt = blob.returnFlight.fare * travelers;
    lines.push({
      id: "cost_flight_ret",
      label: `Flights return (${travelers}x) · ${blob.returnFlight.airline}`,
      amount: amt,
      currency: "INR",
      status: "confirmed",
      sourceId: blob.returnFlight.sourceId,
      checkedAt: now(),
      perPerson: false,
    });
  }

  const isOutdoor = blob.preferences.stayMode === "wild_camping" || blob.preferences.isSelfSupported;
  const isNoHotel = blob.preferences.stayMode === "none";

  if (isNoHotel) {
    lines.push({
      id: "cost_hotel_none",
      label: "No commercial accommodation required (Self-supported)",
      amount: 0,
      currency: "INR",
      status: "confirmed",
      checkedAt: now(),
    });
  } else if (isOutdoor && blob.hotels.length === 0) {
    lines.push({
      id: "cost_hotel_wild_camp",
      label: `Wild Camping & Riverside Bivvies · ${nights} nights (Self-supported)`,
      amount: 0,
      currency: "INR",
      status: "confirmed",
      checkedAt: now(),
    });
  } else {
    blob.hotels.forEach((h, i) => {
      const perHotelNights = Math.max(1, Math.round(nights / blob.hotels.length));
      // Hotel rooms needed: 1 room per 2 travelers
      const roomsNeeded = Math.ceil(travelers / 2);
      const roomLabel = roomsNeeded > 1 ? ` (${roomsNeeded} rooms)` : "";
      const isFreeOutdoor = h.category === "wild_camping" || h.pricePerNight === 0;
      lines.push({
        id: `cost_hotel_${h.id}`,
        label: isFreeOutdoor
          ? `${h.name} · ${perHotelNights} night${perHotelNights > 1 ? "s" : ""} (₹0 / Self-Supported)`
          : `${h.name} · ${perHotelNights} night${perHotelNights > 1 ? "s" : ""}${roomLabel}`,
        amount: isFreeOutdoor ? 0 : h.pricePerNight * perHotelNights * roomsNeeded,
        currency: "INR",
        status: "confirmed",
        sourceId: h.sourceIds[0],
        checkedAt: now(),
      });
    });
  }

  blob.transport.forEach((t) => {
    lines.push({
      id: `cost_transport_${t.id}`,
      label: `${t.vehicle} · ${t.fromPlace} → ${t.toPlace}`,
      amount: t.price,
      currency: "INR",
      status: "confirmed",
      sourceId: t.sourceIds[0],
      checkedAt: now(),
    });
  });

  blob.permits.forEach((p) => {
    if (p.status === "not_required") return;
    lines.push({
      id: `cost_permit_${p.id}`,
      label: p.name,
      amount: p.estimatedCost * (p.name.includes("ILP") || p.name.includes("Visa") ? travelers : 1),
      currency: "INR",
      status: "estimated",
      sourceId: p.sourceIds[0],
      checkedAt: now(),
    });
  });

  // Selected Place Activities
  const actTotal = blob.activities.reduce((s, a) => s + a.cost, 0);
  if (actTotal > 0) {
    lines.push({
      id: "cost_activities",
      label: "Sightseeing & entry tickets",
      amount: actTotal * travelers,
      currency: "INR",
      status: "estimated",
      checkedAt: now(),
    });
  }

  // Selected Bookable Experiences (jet ski, boat tour, snorkeling, etc.)
  const expTotal = (blob.experiences ?? []).reduce(
    (s, e) => s + (e.perPerson ? e.price * travelers : e.price),
    0
  );
  if (expTotal > 0) {
    lines.push({
      id: "cost_experiences",
      label: `Bookable activities (${blob.experiences.length} selected)`,
      amount: expTotal,
      currency: "INR",
      status: "confirmed",
      checkedAt: now(),
    });
  }

  // Food estimate — scaled with duration, travelers, and destination cost tier
  const isHighCost = isHighCostDestination(blob.destinationName);
  let perDayPerPerson = 900;
  if (isOutdoor) {
    perDayPerPerson = 450; // Camp rations, stove groceries, trail energy bars
  } else if (isHighCost) {
    perDayPerPerson = blob.preferences.budgetTier === "premium" ? 6500 : blob.preferences.budgetTier === "balanced" ? 4200 : 2500;
  } else {
    perDayPerPerson = blob.preferences.budgetTier === "premium" ? 1800 : blob.preferences.budgetTier === "balanced" ? 1100 : 750;
  }

  lines.push({
    id: "cost_food",
    label: isOutdoor
      ? `Trail rations & camp provisions (${blob.durationDays} days · ${travelers} pax)`
      : `Dining & cuisine (${blob.durationDays} days · ${travelers} pax)`,
    amount: perDayPerPerson * blob.durationDays * travelers,
    currency: "INR",
    status: "estimated",
    checkedAt: now(),
  });

  // Local Ground Transport & Transfers
  if (!isOutdoor) {
    const dailyLocalTransport = isHighCost ? 2500 : 800;
    lines.push({
      id: "cost_local_transport",
      label: "Local cabs & daily transit",
      amount: dailyLocalTransport * blob.durationDays,
      currency: "INR",
      status: "estimated",
      checkedAt: now(),
    });
  }

  return lines;
}

export function costTotals(lines: CostLine[]) {
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const payableNow = lines.filter((l) => l.status === "confirmed").reduce((s, l) => s + l.amount, 0);
  const duringTrip = total - payableNow;
  return { total, payableNow, duringTrip };
}

// ============================================================================
// PLACE TIME ESTIMATOR (Non-intrusive advisory badge)
// ============================================================================
export function estimateDaysForPlaces(places: Place[], pace: "comfortable" | "balanced" | "fast"): number {
  if (places.length === 0) return 0;
  let hours = 0;
  for (const p of places) {
    hours += p.durationHours;
    hours += Math.min(2, (p.distanceKm ?? 0) / 30);
  }
  const usableHoursPerDay = pace === "fast" ? 8 : pace === "balanced" ? 6 : 4.5;
  return Math.max(1, Math.round(hours / usableHoursPerDay));
}

// ============================================================================
// STAY COUNT & STRATEGY RECOMMENDER
// ============================================================================
export interface StayRecommendation {
  strategy: "single_basecamp" | "multi_stop" | "self_supported" | "none";
  recommendedHotelCount: number;
  reason: string;
  badge: string;
}

export function recommendStayStrategy(
  places: Place[],
  durationDays: number,
  stayMode?: "hotels" | "wild_camping" | "campsites_refugios" | "homestays" | "none",
  isSelfSupported?: boolean
): StayRecommendation {
  if (stayMode === "none") {
    return {
      strategy: "none",
      recommendedHotelCount: 0,
      reason: "No commercial accommodation required for this itinerary (day-trip or self-arranged).",
      badge: "🚫 0 Hotels Needed",
    };
  }

  if (stayMode === "wild_camping" || isSelfSupported) {
    return {
      strategy: "self_supported",
      recommendedHotelCount: 0,
      reason: "Self-supported expedition — camp by riverbeds and trails each evening with ₹0 hotel charges.",
      badge: "⛺ Self-Supported Trail Camps (0 Hotels)",
    };
  }

  if (places.length <= 3 || durationDays <= 3) {
    return {
      strategy: "single_basecamp",
      recommendedHotelCount: 1,
      reason: "All your chosen sights are easily accessible from 1 central basecamp hotel, avoiding repetitive packing & check-outs.",
      badge: "🏨 1 Central Basecamp Stay",
    };
  }

  if (places.length > 5 || durationDays >= 7) {
    const count = Math.min(3, Math.max(2, Math.floor(durationDays / 3)));
    return {
      strategy: "multi_stop",
      recommendedHotelCount: count,
      reason: `With ${places.length} spread-out destinations across ${durationDays} days, ${count} strategic stays along the route eliminate long backtrack drives.`,
      badge: `🧳 Multi-Stop Journey (${count} Stays Recommended)`,
    };
  }

  return {
    strategy: "single_basecamp",
    recommendedHotelCount: 1,
    reason: "1 well-located stay is optimal for your selected pace and highlights.",
    badge: "🏨 1 Primary Basecamp Stay",
  };
}

export function isHighAltitudeMountain(name: string): boolean {
  return /tawang|leh|ladakh|himalaya|manali|spiti|shimla|gulmarg|kashmir|sikkim|gangtok|alps|switzerland|aspen/i.test(
    name
  );
}

// ============================================================================
// ITINERARY ENGINE — Harmonious, destination-aware scheduling that respects
// the user's exact vacation duration.
// ============================================================================
export function buildItinerary(
  blob: TripBlob,
  dataset: DestinationDataset
): ItineraryDay[] {
  const selectedPlaces = dataset.places
    .filter((p) => blob.selectedPlaceIds.includes(p.id))
    .sort((a, b) => a.routeOrder - b.routeOrder);

  const selectedExps = (dataset.experiences ?? []).filter((e) =>
    blob.selectedExperienceIds.includes(e.id)
  );

  const days: ItineraryDay[] = [];
  const destName = dataset.meta.name;
  const gateway = dataset.meta.gateway.split(/[(,]/)[0].trim();
  const isMountainRoadTrip = /tawang|ladakh|spiti|leh/i.test(destName);
  const totalDays = Math.max(1, blob.durationDays);

  if (totalDays === 1) {
    days.push({
      day: 1,
      title: `Day Trip · ${destName}`,
      baseLocation: destName,
      stops: [
        { label: `Arrive at ${destName}`, start: "09:00", end: "10:00", kind: "travel" },
        ...selectedPlaces.slice(0, 3).map((p) => ({
          placeId: p.id,
          label: p.canonicalName,
          start: "10:30",
          end: "13:30",
          kind: "visit" as const,
        })),
        { label: "Depart for home", start: "18:00", end: "19:30", kind: "travel" },
      ],
    });
    return days;
  }

  // ---- DAY 1: Arrival & Check-in ----
  if (isMountainRoadTrip) {
    days.push({
      day: 1,
      title: `Arrive ${gateway} → Begin scenic drive`,
      baseLocation: enrouteBase(selectedPlaces, 0) ?? destName,
      stops: [
        { label: `Land at ${gateway} Airport`, start: "11:30", end: "12:30", kind: "travel" },
        {
          label: `Scenic mountain drive toward ${destName}`,
          start: "12:30",
          end: "19:00",
          kind: "travel",
          travelTime: "~6 hrs",
          note: "Overnight halt en route to acclimatize.",
        },
        { label: "Check in to stay & dinner", start: "19:30", end: "21:00", kind: "hotel" },
      ],
    });
  } else {
    // Direct city / coastal / resort destination (e.g. Miami, Paris, Tokyo, Goa)
    days.push({
      day: 1,
      title: `Arrive in ${destName} · Welcome & Settle In`,
      baseLocation: destName,
      stops: [
        { label: `Land at ${gateway} · Baggage & Arrival`, start: "13:00", end: "14:15", kind: "travel" },
        { label: `Private transfer to your hotel`, start: "14:15", end: "15:00", kind: "travel" },
        { label: "Check in · Unpack & refresh", start: "15:00", end: "16:30", kind: "hotel" },
        {
          label: `Evening stroll & welcome dinner in ${destName}`,
          start: "17:30",
          end: "21:00",
          kind: "visit",
          note: "Relax after travel and soak in the vibrant atmosphere.",
        },
      ],
    });
  }

  // ---- MIDDLE DAYS: Spread places, experiences, and leisure days ----
  const availableMiddleDays = Math.max(1, totalDays - 2);
  let placeIndex = 0;
  let expIndex = 0;

  for (let dayNum = 2; dayNum < totalDays; dayNum++) {
    const stops: ItineraryStop[] = [];
    stops.push({ label: "Breakfast & Morning Coffee", start: "08:30", end: "09:30", kind: "meal" });

    // Decide day focus: Place Sightseeing vs Bookable Experience vs Leisure
    const dayPlaces = selectedPlaces.slice(placeIndex, placeIndex + 2);
    const dayExp = selectedExps[expIndex];

    if (dayPlaces.length > 0) {
      placeIndex += dayPlaces.length;
      let clock = 10 * 60; // 10:00 AM

      for (const p of dayPlaces) {
        stops.push({
          placeId: p.id,
          label: `Explore ${p.canonicalName}`,
          start: fmt(clock),
          end: fmt(clock + Math.round(p.durationHours * 60)),
          kind: "visit",
          note: p.blurb,
        });
        clock += Math.round(p.durationHours * 60);

        if (clock <= 14 * 60 && !stops.some((s) => s.label === "Lunch")) {
          stops.push({ label: "Lunch at a local bistro", start: fmt(clock), end: fmt(clock + 60), kind: "meal" });
          clock += 60;
        }
      }

      if (dayExp && clock < 17 * 60) {
        expIndex++;
        stops.push({
          label: `Activity: ${dayExp.name}`,
          start: fmt(clock),
          end: fmt(clock + Math.round((dayExp.durationHours ?? 2) * 60)),
          kind: "visit",
          note: dayExp.blurb,
        });
        clock += Math.round((dayExp.durationHours ?? 2) * 60);
      }

      stops.push({ label: "Evening dinner & relaxed night out", start: "19:30", end: "22:00", kind: "rest" });

      days.push({
        day: dayNum,
        title: dayPlaces.map((p) => p.canonicalName).join(" & "),
        baseLocation: destName,
        stops,
      });
    } else if (dayExp) {
      expIndex++;
      stops.push({
        label: `Booked Experience: ${dayExp.name}`,
        start: "10:30",
        end: fmt(10 * 60 + 30 + Math.round((dayExp.durationHours ?? 3) * 60)),
        kind: "visit",
        note: dayExp.blurb,
      });
      stops.push({ label: "Lunch & Seaside Lounge", start: "14:00", end: "15:30", kind: "meal" });
      stops.push({ label: `Afternoon leisure & shopping in ${destName}`, start: "16:00", end: "19:00", kind: "rest" });
      stops.push({ label: "Dinner at recommended local hotspot", start: "20:00", end: "22:30", kind: "meal" });

      days.push({
        day: dayNum,
        title: dayExp.name,
        baseLocation: destName,
        stops,
      });
    } else {
      // Leisure / staycation / wellness day (ideal for longer trips like 7-14 days)
      const isMountain = isHighAltitudeMountain(destName);
      const isCoastal = /beach|coast|island|sea|ocean|miami|bali|goa|phuket/i.test(destName);

      const mountainThemes = [
        { title: "Resort Staycation & Heated Pool Relaxation", type: "staycation" as const, note: "Sleep in, enjoy in-room breakfast, heated pool, and mountain terrace views." },
        { title: "Spa, Herbal Wellness & Hot Spring Soak", type: "wellness" as const, note: "Restorative herbal massage, hot bath soak, and organic mountain teas." },
        { title: "Old Town Cafe Hopping & Artisan Craft Trail", type: "culinary" as const, note: "Discover cozy backstreet cafes, taste authentic local bread, and visit artisan weaving spots." },
        { title: "Panoramic Viewpoint Sunset & Reading Day", type: "staycation" as const, note: "Spend a slow afternoon reading on your balcony, followed by a golden-hour ridge viewpoint." },
      ];

      const coastalThemes = [
        { title: "Beachfront Resort & Poolside Cabana Day", type: "beach" as const, note: "Relax under palm cabanas, take slow dips in the pool, and soak in the ocean breeze." },
        { title: "Seaside Spa & Sunset Cocktails", type: "wellness" as const, note: "Rejuvenating seaside massage followed by sunset cocktails by the water." },
        { title: "Local Market & Fresh Seafood Trail", type: "culinary" as const, note: "Explore authentic local markets, fruit stands, and seaside culinary specialties." },
        { title: "Spontaneous Free Day for Slow Living", type: "staycation" as const, note: "Unscheduled day to explore hidden coves or simply unwind." },
      ];

      const generalThemes = [
        { title: "Boutique Hotel Staycation & Poolside Lounge", type: "staycation" as const, note: "Enjoy hotel amenities, room service, reading, and unhurried relaxation." },
        { title: "Spa, Wellness & Slow Afternoon", type: "wellness" as const, note: "Full wellness treatment, sauna, and restorative quiet time." },
        { title: "Artisan Cafes, Bakeries & Culinary Crawl", type: "culinary" as const, note: "Taste specialty coffees, local pastries, and hidden neighborhood dining gems." },
        { title: "Spontaneous Exploration & Sunset Drinks", type: "staycation" as const, note: "Leisurely wandering and sunset drinks at a scenic terrace." },
      ];

      const themeList = isMountain ? mountainThemes : isCoastal ? coastalThemes : generalThemes;
      const chosen = themeList[(dayNum - 2) % themeList.length];

      stops.push({ label: "Slow morning & breakfast in bed", start: "09:00", end: "10:30", kind: "meal" });
      stops.push({ label: `${chosen.title}`, start: "11:00", end: "16:30", kind: "rest", note: chosen.note });
      stops.push({ label: "Sunset lounge & relaxed evening dining", start: "18:00", end: "21:30", kind: "meal" });

      days.push({
        day: dayNum,
        title: chosen.title,
        baseLocation: destName,
        dayType: chosen.type,
        isRestDay: true,
        stops,
      });
    }
  }

  // ---- FINAL DAY: Departure ----
  if (isMountainRoadTrip) {
    days.push({
      day: totalDays,
      title: `Scenic return drive → Fly home from ${gateway}`,
      baseLocation: gateway,
      stops: [
        { label: `Depart ${destName}`, start: "07:00", end: "07:30", kind: "travel" },
        { label: `Drive to ${gateway} Airport`, start: "07:30", end: "13:30", kind: "travel", travelTime: "~6 hrs" },
        { label: "Airport check-in & flight home", start: "15:00", end: "19:30", kind: "travel" },
      ],
    });
  } else {
    days.push({
      day: totalDays,
      title: `Farewell ${destName} · Checkout & Flight Home`,
      baseLocation: destName,
      stops: [
        { label: "Final breakfast & souvenir shopping", start: "09:00", end: "10:45", kind: "meal" },
        { label: "Hotel check-out & baggage assistance", start: "11:00", end: "11:45", kind: "hotel" },
        { label: `Private transfer to ${gateway} Airport`, start: "12:00", end: "13:00", kind: "travel" },
        { label: "Check-in, security & boarding flight home", start: "13:30", end: "18:00", kind: "travel" },
      ],
    });
  }

  return days.sort((a, b) => a.day - b.day);
}

function isHighCostDestination(dest: string): boolean {
  return /miami|florida|usa|united states|america|new york|nyc|los angeles|california|san francisco|chicago|vegas|las vegas|hawaii|london|paris|rome|switzerland|zurich|geneva|france|italy|spain|germany|japan|tokyo|australia|sydney|dubai|uae/i.test(
    dest
  );
}

function enrouteBase(places: Place[], idx: number): string | null {
  const enroute = places.filter((p) => p.category === "enroute");
  return enroute[idx]?.canonicalName ?? null;
}

function fmt(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ============================================================================
// PACKAGE OPTIMIZER
// ============================================================================
export interface OptimizeResult {
  blob: TripBlob;
  mutation: Mutation;
  ok: boolean;
  message: string;
}

export function optimizeToBudget(
  blob: TripBlob,
  dataset: DestinationDataset,
  target: number
): OptimizeResult {
  const before = costTotals(blob.costs).total;
  const deltas: string[] = [];
  let next = structuredCloneBlob(blob);

  // Strategy 1: swap to cheaper flight if not locked
  if (before > target && next.flight && !next.lockedComponentIds.includes(next.flight.id)) {
    const cheaper = dataset.flights
      .filter((f) => f.from === next.flight!.from && f.fare < next.flight!.fare)
      .filter((f) => !next.preferences.avoidEarlyFlights || !f.earlyMorning)
      .sort((a, b) => a.fare - b.fare)[0];
    if (cheaper) {
      deltas.push(`Flight → ${cheaper.airline} (−₹${((next.flight.fare - cheaper.fare) * next.travelers).toLocaleString("en-IN")})`);
      next.flight = cheaper;
    }
  }

  // Strategy 2: swap to cheaper hotel if not locked
  if (next.hotels.length && !next.lockedComponentIds.includes(next.hotels[0].id)) {
    const curHotel = next.hotels[0];
    const cheaper = dataset.hotels
      .filter((h) => h.id !== curHotel.id && h.pricePerNight < curHotel.pricePerNight)
      .sort((a, b) => a.pricePerNight - b.pricePerNight)[0];
    if (cheaper) {
      const saved = (curHotel.pricePerNight - cheaper.pricePerNight) * Math.max(1, next.durationDays - 1);
      deltas.push(`Hotel → ${cheaper.name} (−₹${saved.toLocaleString("en-IN")})`);
      next.hotels = [cheaper, ...next.hotels.slice(1)];
    }
  }

  next.costs = computeCosts(next);
  const after = costTotals(next.costs).total;

  const mut: Mutation = {
    id: `mut_${Date.now()}`,
    at: now(),
    summary: `Budget optimized to target ₹${target.toLocaleString("en-IN")}`,
    deltas: deltas.length ? deltas : ["No further changes possible without altering locked components."],
    costBefore: before,
    costAfter: after,
  };

  return {
    blob: next,
    mutation: mut,
    ok: after <= target,
    message: deltas.length
      ? `Adjusted components to bring total from ₹${Math.round(before).toLocaleString("en-IN")} to ₹${Math.round(after).toLocaleString("en-IN")}.`
      : "Couldn't reduce further without modifying locked items.",
  };
}

export function structuredCloneBlob<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Helper to generate customized day stops when user switches day focus */
export function generateDayStopsForType(
  destName: string,
  type: "sightseeing" | "staycation" | "wellness" | "culinary" | "beach"
): { title: string; stops: ItineraryStop[] } {
  if (type === "staycation") {
    return {
      title: "Resort Staycation & Heated Pool Day",
      stops: [
        { label: "Slow morning & breakfast in bed", start: "09:00", end: "10:30", kind: "meal" },
        { label: "Poolside relaxation, reading & private cabana", start: "11:00", end: "14:00", kind: "rest", note: "Enjoy hotel amenities, swimming, and lounging with mountain/ocean views." },
        { label: "Room service lunch & afternoon nap", start: "14:00", end: "16:00", kind: "meal" },
        { label: "Sunset cocktails on the terrace & dinner", start: "18:00", end: "21:30", kind: "meal" },
      ],
    };
  }

  if (type === "wellness") {
    return {
      title: "Spa, Wellness Sanctuary & Hot Bath Soak",
      stops: [
        { label: "Morning herbal tea & wholesome breakfast", start: "08:30", end: "10:00", kind: "meal" },
        { label: "Full body restorative spa & aroma massage", start: "10:30", end: "13:00", kind: "rest", note: "Deep tissue massage, steam bath, and relaxation therapy." },
        { label: "Healthy organic lunch & green smoothie", start: "13:30", end: "15:00", kind: "meal" },
        { label: "Quiet hot spring or heated bath soak", start: "15:30", end: "17:30", kind: "rest" },
        { label: "Candlelight dinner at calm garden bistro", start: "19:30", end: "22:00", kind: "meal" },
      ],
    };
  }

  if (type === "culinary") {
    return {
      title: "Artisan Cafe Hopping & Local Food Crawl",
      stops: [
        { label: "Artisan coffee & local bakery tasting", start: "09:00", end: "10:30", kind: "meal" },
        { label: `Local food market & spice trail in ${destName}`, start: "11:00", end: "13:30", kind: "visit", note: "Explore regional produce, authentic street specialties, and tea stands." },
        { label: "Traditional thali / signature local feast", start: "14:00", end: "15:30", kind: "meal" },
        { label: "Afternoon dessert cafe & boutique shopping", start: "16:30", end: "18:30", kind: "rest" },
        { label: "Chef-recommended specialty dinner", start: "20:00", end: "22:30", kind: "meal" },
      ],
    };
  }

  if (type === "beach") {
    return {
      title: "Beachfront Villa & Golden Hour Sunset",
      stops: [
        { label: "Breakfast overlooking the water", start: "08:30", end: "10:00", kind: "meal" },
        { label: "Beach lounging, swimming & coastal breeze", start: "10:30", end: "14:00", kind: "rest", note: "Unwind on the sand with sunbed service and ocean views." },
        { label: "Seafood lunch at seaside shack", start: "14:00", end: "15:30", kind: "meal" },
        { label: "Sunset boat cruise or beach club lounge", start: "17:00", end: "19:30", kind: "visit" },
        { label: "Seaside dinner under the stars", start: "20:00", end: "22:30", kind: "meal" },
      ],
    };
  }

  // Active Sightseeing default
  return {
    title: `Explore Highlights of ${destName}`,
    stops: [
      { label: "Breakfast & Morning Coffee", start: "08:30", end: "09:30", kind: "meal" },
      { label: `Sightseeing and landmark discovery`, start: "10:00", end: "13:30", kind: "visit", note: "Visit top-rated viewpoints and cultural attractions." },
      { label: "Lunch at a scenic local spot", start: "13:30", end: "14:45", kind: "meal" },
      { label: "Afternoon exploration & photo walk", start: "15:15", end: "18:00", kind: "visit" },
      { label: "Dinner at recommended restaurant", start: "19:30", end: "22:00", kind: "meal" },
    ],
  };
}

