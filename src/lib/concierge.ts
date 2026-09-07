import type { TripBlob } from "./types";
import type { DestinationDataset } from "./research/provider";

// ============================================================================
// CONCIERGE INTENT ROUTER
// Turns a free-text chat instruction into a structured action. Deterministic
// rule-based matching (an LLM could return the same shape later). The store
// executes the action and reports concretely what changed.
// ============================================================================

export type ConciergeAction =
  | { kind: "budget_target"; amount: number }
  | { kind: "reduce_cost"; pct: number }
  | { kind: "upgrade_hotel" }
  | { kind: "cheaper_hotel" }
  | { kind: "swap_hotel_named"; query: string }
  | { kind: "lock_hotel" }
  | { kind: "set_duration"; days: number }
  | { kind: "add_days"; delta: number }
  | { kind: "set_travelers"; n: number }
  | { kind: "remove_place"; query: string }
  | { kind: "avoid_early_flights" }
  | { kind: "set_pace"; pace: "comfortable" | "balanced" | "fast" }
  | { kind: "answer"; text: string }
  | { kind: "preference" } // falls through to the steering-signal path
  | { kind: "unknown" };

function num(str: string): number | undefined {
  const m = str.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k|thousand|lakh|l)?/i);
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  const unit = m[2]?.toLowerCase();
  if (unit === "k" || unit === "thousand") n *= 1000;
  if (unit === "lakh" || unit === "l") n *= 100000;
  return Math.round(n);
}

function rupees(str: string): number | undefined {
  const m = str.match(/(?:₹|rs\.?|inr)\s*([\d.,]+\s*(?:k|thousand|lakh|l)?)/i);
  if (m) return num(m[1]);
  // "under 75000" without symbol
  const m2 = str.match(/(?:under|below|less than|max|budget of|around|about)\s*([\d.,]+\s*(?:k|thousand|lakh|l)?)/i);
  if (m2) return num(m2[1]);
  return undefined;
}

export function routeInstruction(
  raw: string,
  blob: TripBlob,
  dataset: DestinationDataset
): ConciergeAction {
  const t = raw.toLowerCase().trim();

  // ---- Questions (answer, don't mutate) ----
  if (/\bwhy\b.*(hotel|stay|pick|chose|choose)/.test(t)) {
    const h = blob.hotels[0];
    if (h) return { kind: "answer", text: `We chose ${h.name} because: ${h.whyReasons.join("; ")}. Cleanliness ${h.cleanliness}/10, bathroom ${h.bathroomScore}/10.` };
  }
  if (/(best time|when.*(go|visit|travel)|which month|season)/.test(t)) {
    return { kind: "answer", text: `The best time to visit ${dataset.meta.name} is ${dataset.meta.bestSeason}.` };
  }
  if (/(weather|climate|temperature|cold|hot|rain|snow)/.test(t) && /\?|weather|climate/.test(t)) {
    const fact = dataset.meta.facts.find((f) => /°|temp|weather|season|rain|snow|climate|winter|summer|monsoon/i.test(f));
    return { kind: "answer", text: fact ? fact : `Best season is ${dataset.meta.bestSeason}. For live weather, check closer to your dates.` };
  }
  if (/(how.*(get there|reach)|which airport|gateway|fly into)/.test(t)) {
    return { kind: "answer", text: `You'd fly into ${dataset.meta.gateway}, then continue by road.` };
  }
  if (/(permit|visa|document)/.test(t) && /\?|need|require/.test(t)) {
    const names = blob.permits.filter((p) => p.status !== "not_required").map((p) => p.name);
    return { kind: "answer", text: names.length ? `You'll need: ${names.join(", ")}.` : "No special permits are required for this trip." };
  }
  if (/(how much|total cost|what.*cost|price of the trip)/.test(t)) {
    const total = blob.costs.reduce((s, c) => s + c.amount, 0);
    return { kind: "answer", text: `Your trip currently totals ₹${Math.round(total).toLocaleString("en-IN")} for ${blob.travelers} travellers.` };
  }

  // ---- Budget ----
  const budget = rupees(t);
  if (budget && /(cheaper|reduce|save|lower|under|below|less than|budget|max)/.test(t)) {
    return { kind: "budget_target", amount: budget };
  }
  if (/(cheaper|save money|reduce cost|lower.*(cost|price)|too expensive|bring.*down)/.test(t)) {
    return { kind: "reduce_cost", pct: 0.9 };
  }

  // ---- Hotel ----
  if (/(nicer|better hotel|upgrade|more (comfortable|luxurious|premium)|fancier)/.test(t)) {
    return { kind: "upgrade_hotel" };
  }
  if (/(cheaper hotel|budget (hotel|stay)|less expensive (hotel|stay))/.test(t)) {
    return { kind: "cheaper_hotel" };
  }
  if (/(keep|lock|don'?t change|hold).*(hotel|stay|room)/.test(t)) {
    return { kind: "lock_hotel" };
  }
  // "switch to the boutique / the X hotel"
  const swapM = t.match(/(?:switch to|change to|pick|choose|book|use)\s+(?:the\s+)?([a-z0-9 '&-]{3,40})(?:\s+(?:hotel|stay|resort|inn))?/);
  if (swapM && /(hotel|stay|resort|inn|the )/.test(t)) {
    const q = swapM[1].trim();
    if (dataset.hotels.some((h) => h.name.toLowerCase().includes(q) || q.includes(h.name.toLowerCase().split(" ")[0]))) {
      return { kind: "swap_hotel_named", query: q };
    }
  }

  // ---- Duration ----
  const setDaysM = t.match(/(?:make it|set (?:it )?to|change to|do)\s+(\d+)\s*days?/) || t.match(/(\d+)\s*days?\s*(?:trip|total|please)?$/);
  if (setDaysM) return { kind: "set_duration", days: parseInt(setDaysM[1], 10) };
  const addM = t.match(/add\s+(\d+)?\s*(?:more\s+)?days?/);
  if (addM) return { kind: "add_days", delta: addM[1] ? parseInt(addM[1], 10) : 1 };
  const dropM = t.match(/(?:remove|drop|cut|one less)\s+(\d+)?\s*days?/);
  if (dropM) return { kind: "add_days", delta: -(dropM[1] ? parseInt(dropM[1], 10) : 1) };

  // ---- Travelers ----
  const travM = t.match(/(\d+)\s*(?:people|travellers?|travelers?|of us|adults?|persons?|pax)/);
  if (travM) return { kind: "set_travelers", n: parseInt(travM[1], 10) };

  // ---- Remove a place ----
  const rmM = t.match(/(?:remove|drop|skip|take out|get rid of|don'?t want)\s+(?:the\s+)?([a-z0-9 '&-]{3,40})/);
  if (rmM) {
    const q = rmM[1].trim();
    const hit = blob.selectedPlaceIds
      .map((id) => dataset.places.find((p) => p.id === id))
      .find((p) => p && (p.canonicalName.toLowerCase().includes(q) || q.includes(p.canonicalName.toLowerCase().split(" ")[0])));
    if (hit) return { kind: "remove_place", query: q };
  }

  // ---- Flights ----
  if (/(hate|no|avoid|not|dislike).{0,14}(early|morning) flight|no red.?eye|later flight/.test(t)) {
    return { kind: "avoid_early_flights" };
  }

  // ---- Pace ----
  if (/(more relaxed|slow down|less rushed|take it easy|don'?t rush)/.test(t)) return { kind: "set_pace", pace: "comfortable" };
  if (/(faster|pack more in|see more|busier|more packed)/.test(t)) return { kind: "set_pace", pace: "fast" };

  // A comment that clearly expresses a preference → route to steering path.
  if (/(prefer|care about|important|love|hate|don'?t (like|need|want)|rather)/.test(t)) {
    return { kind: "preference" };
  }

  return { kind: "unknown" };
}
