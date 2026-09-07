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
// ============================================================================
export function computeCosts(blob: TripBlob): CostLine[] {
  const lines: CostLine[] = [];
  const nights = Math.max(1, blob.durationDays - 1);

  if (blob.flight) {
    const amt = blob.flight.fare * blob.travelers;
    lines.push({
      id: "cost_flight_out",
      label: `Flights out · ${blob.flight.airline}`,
      amount: amt,
      currency: "INR",
      status: "confirmed",
      sourceId: blob.flight.sourceId,
      checkedAt: now(),
    });
  }
  if (blob.returnFlight) {
    const amt = blob.returnFlight.fare * blob.travelers;
    lines.push({
      id: "cost_flight_ret",
      label: `Flights return · ${blob.returnFlight.airline}`,
      amount: amt,
      currency: "INR",
      status: "confirmed",
      sourceId: blob.returnFlight.sourceId,
      checkedAt: now(),
    });
  }

  blob.hotels.forEach((h, i) => {
    // distribute nights across hotels (simple even split, min 1 each)
    const perHotelNights = Math.max(1, Math.round(nights / blob.hotels.length));
    lines.push({
      id: `cost_hotel_${h.id}`,
      label: `${h.name} · ${perHotelNights} night${perHotelNights > 1 ? "s" : ""}`,
      amount: h.pricePerNight * perHotelNights,
      currency: "INR",
      status: "confirmed",
      sourceId: h.sourceIds[0],
      checkedAt: now(),
    });
  });

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
      amount: p.estimatedCost * (p.name.includes("ILP") ? blob.travelers : 1),
      currency: "INR",
      status: "estimated",
      sourceId: p.sourceIds[0],
      checkedAt: now(),
    });
  });

  // Activities
  const actTotal = blob.activities.reduce((s, a) => s + a.cost, 0);
  if (actTotal > 0) {
    lines.push({
      id: "cost_activities",
      label: "Activities & entries",
      amount: actTotal * blob.travelers,
      currency: "INR",
      status: "estimated",
      checkedAt: now(),
    });
  }

  // Experiences (bookable things to do) — per-person or per-group
  const expTotal = (blob.experiences ?? []).reduce(
    (s, e) => s + (e.perPerson ? e.price * blob.travelers : e.price),
    0
  );
  if (expTotal > 0) {
    lines.push({
      id: "cost_experiences",
      label: "Things to do",
      amount: expTotal,
      currency: "INR",
      status: "estimated",
      checkedAt: now(),
    });
  }

  // Food estimate — scales with duration, travelers, and tier
  const perDayPerPerson =
    blob.preferences.budgetTier === "premium" ? 1400 : blob.preferences.budgetTier === "balanced" ? 900 : 650;
  lines.push({
    id: "cost_food",
    label: "Food (estimated)",
    amount: perDayPerPerson * blob.durationDays * blob.travelers,
    currency: "INR",
    status: "estimated",
    checkedAt: now(),
  });

  // Misc
  lines.push({
    id: "cost_misc",
    label: "Miscellaneous (estimated)",
    amount: 1000 * blob.travelers,
    currency: "INR",
    status: "estimated",
    checkedAt: now(),
  });

  return lines;
}

export function costTotals(lines: CostLine[]) {
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const payableNow = lines.filter((l) => l.status === "confirmed").reduce((s, l) => s + l.amount, 0);
  const duringTrip = total - payableNow;
  return { total, payableNow, duringTrip };
}

// ============================================================================
// PLACE TIME MODEL — how many days do selected places realistically need?
// ============================================================================
export function estimateDaysForPlaces(places: Place[], pace: "comfortable" | "balanced" | "fast"): number {
  if (places.length === 0) return 0;
  // sum visit hours + travel overhead; permit places need a dedicated slot
  let hours = 0;
  for (const p of places) {
    hours += p.durationHours;
    hours += (p.distanceKm ?? 0) / 25; // rough travel hours at hill speeds
    if (p.permitRequired) hours += 1;
  }
  const usableHoursPerDay = pace === "fast" ? 9 : pace === "balanced" ? 7 : 5.5;
  // Tawang always needs 2 driving days each way baseline if any enroute/adventure
  const drivingBuffer = places.some((p) => p.category !== "core") ? 2.5 : 0.5;
  return Math.max(1, Math.round((hours / usableHoursPerDay + drivingBuffer) * 2) / 2);
}

// ============================================================================
// ITINERARY ENGINE — orders selected places by routeOrder, groups by day,
// respects pace, permits, and realistic travel time. No teleporting.
// ============================================================================
export function buildItinerary(
  blob: TripBlob,
  dataset: DestinationDataset
): ItineraryDay[] {
  const selected = dataset.places
    .filter((p) => blob.selectedPlaceIds.includes(p.id))
    .sort((a, b) => a.routeOrder - b.routeOrder);

  const days: ItineraryDay[] = [];
  const gateway = dataset.meta.gateway.split(" ")[0];
  const destName = dataset.meta.name;

  // Day 1: arrive + drive toward destination
  days.push({
    day: 1,
    title: `Arrive ${gateway} → begin the drive`,
    baseLocation: enrouteBase(selected, 0) ?? destName,
    stops: [
      { label: `Land at ${gateway}`, start: "13:25", end: "14:00", kind: "travel" },
      {
        label: `Scenic drive toward ${destName}`,
        start: "14:00",
        end: "20:30",
        kind: "travel",
        travelTime: "~6 hrs",
        note: "Overnight halt en route to acclimatize.",
      },
      { label: "Check in · rest", start: "20:30", end: "21:30", kind: "hotel" },
    ],
  });

  // Middle days: distribute selected non-arrival places
  const perDay = blob.preferences.pace === "fast" ? 3 : blob.preferences.pace === "balanced" ? 2 : 1.5;
  const visitPlaces = selected;
  let cursor = 0;
  let dayNum = 2;
  const lastDay = blob.durationDays;

  while (cursor < visitPlaces.length && dayNum < lastDay) {
    const chunk = visitPlaces.slice(cursor, cursor + Math.ceil(perDay));
    cursor += chunk.length;
    const stops: ItineraryStop[] = [];
    let clock = 9 * 60; // 09:00 in minutes
    stops.push({ label: "Breakfast", start: "08:00", end: "09:00", kind: "meal" });
    for (const p of chunk) {
      const travel = Math.round(((p.distanceKm ?? 5) / 25) * 60);
      if (travel > 15) {
        stops.push({
          label: `Drive to ${p.canonicalName}`,
          start: fmt(clock),
          end: fmt(clock + travel),
          kind: "travel",
          travelTime: p.travelTime,
        });
        clock += travel;
      }
      const visit = Math.round(p.durationHours * 60);
      stops.push({
        placeId: p.id,
        label: p.canonicalName,
        start: fmt(clock),
        end: fmt(clock + visit),
        kind: "visit",
        note: p.permitRequired ? "Permit required — arranged in advance." : undefined,
      });
      clock += visit;
      if (clock > 13 * 60 && !stops.some((s) => s.kind === "meal" && s.start > "12:00")) {
        stops.push({ label: "Lunch", start: fmt(clock), end: fmt(clock + 45), kind: "meal" });
        clock += 45;
      }
    }
    stops.push({ label: "Return · evening at leisure", start: fmt(Math.min(clock, 19 * 60)), end: "20:30", kind: "rest" });
    days.push({
      day: dayNum,
      title: chunk.map((c) => c.canonicalName).join(" · ") || `Explore ${destName}`,
      baseLocation: destName,
      stops,
    });
    dayNum++;
  }

  // Fill any remaining middle days with leisure/buffer
  while (dayNum < lastDay) {
    days.push({
      day: dayNum,
      title: `${destName} at your own pace`,
      baseLocation: destName,
      stops: [
        { label: "Slow morning", start: "08:30", end: "10:30", kind: "rest" },
        { label: "Optional local walk / cafe", start: "10:30", end: "13:00", kind: "visit" },
        { label: "Free afternoon", start: "13:00", end: "20:00", kind: "rest", note: "Buffer for weather or rest." },
      ],
    });
    dayNum++;
  }

  // Last day: return
  days.push({
    day: lastDay,
    title: `Drive back → fly from ${gateway}`,
    baseLocation: gateway,
    stops: [
      { label: `Depart ${destName}`, start: "06:00", end: "06:30", kind: "travel" },
      { label: `Drive to ${gateway}`, start: "06:30", end: "12:30", kind: "travel", travelTime: "~6 hrs" },
      { label: `Fly ${gateway} → home`, start: "14:10", end: "18:55", kind: "travel" },
    ],
  });

  return days.sort((a, b) => a.day - b.day);
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
// PACKAGE OPTIMIZER — deterministic. Respects locks, targets a budget, never
// silently violates a locked component. Returns a report of what changed.
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

  const hotelLocked = (h: HotelOption) => next.lockedComponentIds.includes(h.id);

  // Strategy 1: swap to cheaper flight if not locked
  if (before > target && next.flight && !next.lockedComponentIds.includes(next.flight.id)) {
    const cheaper = dataset.flights
      .filter((f) => f.from === next.flight!.from && f.fare < next.flight!.fare)
      .filter((f) => !next.preferences.avoidEarlyFlights || !f.earlyMorning)
      .sort((a, b) => a.fare - b.fare)[0];
    if (cheaper) {
      deltas.push(`Flight → ${cheaper.airline} ${cheaper.flightNo} (−₹${(next.flight.fare - cheaper.fare).toLocaleString("en-IN")}/pax)`);
      next.flight = cheaper;
    }
  }

  // Strategy 2: swap unlocked hotels to a cheaper comparable
  next.hotels = next.hotels.map((h) => {
    if (hotelLocked(h)) return h;
    const cheaper = dataset.hotels
      .filter((c) => c.pricePerNight < h.pricePerNight && c.cleanliness >= 7.5)
      .sort((a, b) => b.cleanliness - a.cleanliness)[0];
    const currentTotal = costTotals(next.costs).total;
    if (cheaper && currentTotal > target) {
      deltas.push(`Hotel ${h.name} → ${cheaper.name} (−₹${(h.pricePerNight - cheaper.pricePerNight).toLocaleString("en-IN")}/night)`);
      return cheaper;
    }
    return h;
  });

  next.costs = computeCosts(next);
  let after = costTotals(next.costs).total;

  // Strategy 3: trim food tier if still over
  if (after > target && next.preferences.budgetTier !== "economical") {
    next.preferences = { ...next.preferences, budgetTier: "economical" };
    deltas.push("Food assumptions → economical tier");
    next.costs = computeCosts(next);
    after = costTotals(next.costs).total;
  }

  const ok = after <= target;
  const mutation: Mutation = {
    id: `mut_${Date.now()}`,
    at: now(),
    summary: ok
      ? `Optimized to ₹${after.toLocaleString("en-IN")} (target ₹${target.toLocaleString("en-IN")})`
      : `Could not reach ₹${target.toLocaleString("en-IN")} without touching locked items`,
    reason: `Target budget ₹${target.toLocaleString("en-IN")}`,
    deltas: deltas.length ? deltas : ["No safe changes available"],
    costBefore: before,
    costAfter: after,
  };

  return {
    blob: next,
    mutation,
    ok,
    message: ok
      ? `Reached ₹${after.toLocaleString("en-IN")}. Saved ₹${(before - after).toLocaleString("en-IN")}.`
      : `Best I can do is ₹${after.toLocaleString("en-IN")} while keeping your locked items. Unlock the hotel or a place to go lower.`,
  };
}

export function structuredCloneBlob(blob: TripBlob): TripBlob {
  return JSON.parse(JSON.stringify(blob));
}
