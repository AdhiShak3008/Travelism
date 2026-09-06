import type {
  SteeringSignal,
  SignalCategory,
  SignalScope,
  AgentId,
  Mood,
  MoodKey,
  Preferences,
} from "./types";

// ============================================================================
// COMMENT PARSER
// Turns natural language ("The bathroom needs to be genuinely clean") into
// structured steering signals: category, scope, affected agents, and concrete
// downstream effects that the optimizer / research layer consume.
//
// This is a deterministic rule engine. In a live system an LLM would produce
// the same structured shape; keeping it deterministic makes the demo reliable.
// ============================================================================

interface Rule {
  test: RegExp;
  category: SignalCategory;
  agents: AgentId[];
  /** effects merged into the signal */
  effects: (m: RegExpMatchArray, text: string) => Record<string, string | number | boolean>;
  /** interpretation shown back to the user */
  say: (m: RegExpMatchArray) => string;
  /** mood nudges (key -> delta) */
  mood?: Partial<Record<MoodKey, number>>;
}

const rupee = (s: string): number | undefined => {
  const m = s.replace(/,/g, "").match(/(?:₹|rs\.?|inr)\s*([\d]+(?:\.\d+)?)\s*(k|thousand)?/i);
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  if (m[2]) n *= 1000;
  return Math.round(n);
};

const RULES: Rule[] = [
  // --- Bathroom / hygiene ---
  {
    test: /(bathroom|toilet|washroom|hygiene|clean bathroom|water pressure|hot water)/i,
    category: "priority",
    agents: ["pillow", "toilet_inspector", "review_detective", "lens"],
    effects: () => ({ priority_bathroom_cleanliness: true, hotel_investigation_depth: "high" }),
    say: () => "Bathroom quality and hygiene are a top priority. Toilet Inspector is now active.",
    mood: { comfort: 1 },
  },
  {
    test: /\bclean\b|cleanliness|spotless|tidy/i,
    category: "priority",
    agents: ["pillow", "review_detective"],
    effects: () => ({ priority_cleanliness: true }),
    say: () => "Cleanliness matters to you. We'll weight it heavily in hotel selection.",
    mood: { comfort: 1 },
  },
  // --- Luxury / not luxury ---
  {
    test: /(don'?t need luxury|no luxury|not luxury|nothing fancy|no frills)/i,
    category: "preference",
    agents: ["pillow", "penny_pincher"],
    effects: () => ({ deprioritize_luxury: true, deprioritize: "spa,gym,luxury_amenities" }),
    say: () => "No need for luxury. We'll deprioritize spa/gym/premium amenities.",
  },
  // --- Budget flights ---
  {
    test: /(cheap flights?|economical flights?|budget flights?|flights? can be (?:cheap|economical))/i,
    category: "budget",
    agents: ["wingman", "penny_pincher"],
    effects: () => ({ flight_tier: "economical" }),
    say: () => "Flights should be economical. Wingman will favor lower fares.",
  },
  // --- Early flights ---
  {
    test: /(hate|no|avoid|not).{0,12}(early|morning) flight|early morning flight/i,
    category: "constraint",
    agents: ["wingman"],
    effects: () => ({ avoid_early_flights: true }),
    say: () => "You dislike early flights. Wingman will avoid pre-dawn departures.",
  },
  // --- Scenery / photography ---
  {
    test: /(scenic|scenery|landscape|beautiful views?|photograph|photography|photos?)/i,
    category: "priority",
    agents: ["lens", "daydreamer", "scout"],
    effects: () => ({ priority_scenery: true, prioritize: "viewpoints,scenic_routes,golden_hour" }),
    say: () => "Scenery and photography are priorities. Lens and Daydreamer will favor viewpoints and scenic routes.",
    mood: { scenic: 2, photography: 2 },
  },
  // --- Food ---
  {
    test: /(good food|great food|love food|foodie|local food|cuisine)/i,
    category: "priority",
    agents: ["foodie"],
    effects: () => ({ priority_food: true }),
    say: () => "Good food matters. Foodie will dig into local spots.",
    mood: { food: 2 },
  },
  {
    test: /(not expensive restaurants?|cheap eats?|budget food|affordable food)/i,
    category: "budget",
    agents: ["foodie", "penny_pincher"],
    effects: () => ({ food_tier: "budget" }),
    say: () => "You want good food without expensive restaurants. Foodie will favor value spots.",
  },
  // --- Pace / no rush ---
  {
    test: /(don'?t rush|no rush|not rush|relaxed|slow|take it easy|fewer.{0,20}experiences|rather have fewer)/i,
    category: "preference",
    agents: ["daydreamer"],
    effects: () => ({ pace: "comfortable" }),
    say: () => "You'd rather not rush. Daydreamer will build a relaxed pace.",
    mood: { rushing: -2, comfort: 1 },
  },
  {
    test: /(fast paced|pack in|as much as possible|see everything|maximize)/i,
    category: "preference",
    agents: ["daydreamer"],
    effects: () => ({ pace: "fast" }),
    say: () => "You want to see as much as possible. Daydreamer will build a fuller pace.",
    mood: { rushing: 2 },
  },
  // --- Parents / accessibility ---
  {
    test: /(parents?|elderly|senior|can'?t walk|mobility|wheelchair|difficulty walking|knee)/i,
    category: "accessibility",
    agents: ["daydreamer", "pillow", "roadrunner", "review_detective"],
    effects: () => ({
      accessibility: "reduced_mobility",
      reduce_walking: true,
      prioritize_dropoff_proximity: true,
      require_elevator: true,
    }),
    say: () => "Traveling with reduced mobility. We'll cut walking, favor elevators and close drop-offs.",
    mood: { comfort: 1, adventure: -1 },
  },
  // --- Hotel changes ---
  {
    test: /(don'?t.{0,10}change hotels?|not change hotels?|same hotel|one hotel|fewer.{0,10}(hotel|accommodation) change)/i,
    category: "constraint",
    agents: ["pillow", "daydreamer"],
    effects: () => ({ minimize_hotel_changes: true }),
    say: () => "You prefer not to change hotels often. We'll minimize accommodation changes.",
  },
  {
    test: /(one hotel change is fine|hotel change.{0,20}fine|okay to change hotel)/i,
    category: "constraint",
    agents: ["pillow"],
    effects: (_, text) => {
      const t = rupee(text);
      const out: Record<string, string | number | boolean> = { hotel_change_allowed: true };
      if (t) out.threshold_savings = t;
      return out;
    },
    say: () => "A hotel change is acceptable if it saves enough.",
  },
  // --- Long scenic drives ok ---
  {
    test: /(don'?t mind long drives?|okay with long drives?|long drives? are fine)/i,
    category: "preference",
    agents: ["roadrunner"],
    effects: () => ({ tolerate_long_drives: true }),
    say: () => "Long drives are fine if they're scenic. Roadrunner will allow longer scenic legs.",
    mood: { scenic: 1 },
  },
  // --- Nightlife ---
  {
    test: /(don'?t care about nightlife|no nightlife|skip nightlife)/i,
    category: "exclusion",
    agents: ["daydreamer"],
    effects: () => ({ exclude_nightlife: true }),
    say: () => "Nightlife is not a priority. We'll set it aside.",
    mood: { nightlife: -2 },
  },
  // --- Corrections / distrust ---
  {
    test: /(don'?t trust|looks wrong|seems wrong|this is wrong|incorrect|not accurate)/i,
    category: "correction",
    agents: ["cross_examiner", "review_detective"],
    effects: () => ({ reverify: true }),
    say: () => "Flagged for re-verification. Cross Examiner will double-check the sources.",
  },
  // --- Find alternatives ---
  {
    test: /(find alternatives?|similar to this|other options?|something else|show me alternatives?)/i,
    category: "investigation",
    agents: ["concierge"],
    effects: () => ({ find_alternatives: true }),
    say: () => "We'll surface alternative options similar to this.",
  },
  // --- Make cheaper ---
  {
    test: /(cheaper|reduce cost|save money|lower.{0,10}(cost|price|budget)|under\s*(?:₹|rs|inr))/i,
    category: "budget",
    agents: ["penny_pincher", "bean_counter"],
    effects: (_, text) => {
      const t = rupee(text);
      const out: Record<string, string | number | boolean> = t ? { target_budget: t } : { reduce_cost: true };
      return out;
    },
    say: (m) => {
      const t = rupee(m.input ?? "");
      return t ? `Targeting a budget under ₹${t.toLocaleString("en-IN")}. Penny Pincher will optimize.` : "Penny Pincher will look for savings.";
    },
  },
  // --- Make nicer ---
  {
    test: /(nicer|better hotel|upgrade|more comfortable|premium)/i,
    category: "preference",
    agents: ["pillow"],
    effects: () => ({ upgrade_comfort: true }),
    say: () => "You'd like something nicer. Pillow will look at higher-comfort stays.",
    mood: { comfort: 1 },
  },
];

let sigCounter = 0;

export function parseComment(
  text: string,
  scope: SignalScope,
  entityId?: string
): SteeringSignal[] {
  const clean = text.trim();
  if (!clean) return [];
  const matched: SteeringSignal[] = [];
  const seen = new Set<SignalCategory>();

  for (const rule of RULES) {
    const m = clean.match(rule.test);
    if (!m) continue;
    // avoid firing two near-identical categories for the same short comment
    const key = `${rule.category}:${Object.keys(rule.effects(m, clean)).join(",")}`;
    if (seen.has(key as SignalCategory)) continue;
    seen.add(key as SignalCategory);

    sigCounter++;
    matched.push({
      id: `sig_${Date.now()}_${sigCounter}`,
      category: rule.category,
      scope,
      entityId,
      text: clean,
      interpretation: rule.say(m),
      affectedAgents: rule.agents,
      effects: rule.effects(m, clean),
      createdAt: new Date().toISOString(),
    });
  }

  // Fallback: capture the comment even if no rule fired, as a soft preference.
  if (matched.length === 0) {
    sigCounter++;
    matched.push({
      id: `sig_${Date.now()}_${sigCounter}`,
      category: "preference",
      scope,
      entityId,
      text: clean,
      interpretation: "Noted as a soft preference the agents will keep in mind.",
      affectedAgents: ["concierge"],
      effects: { note: clean.slice(0, 120) },
      createdAt: new Date().toISOString(),
    });
  }

  return matched;
}

export function moodDeltaFromComment(text: string): Partial<Record<MoodKey, number>> {
  const clean = text.trim();
  const delta: Partial<Record<MoodKey, number>> = {};
  if (!clean) return delta;
  for (const rule of RULES) {
    if (rule.mood && rule.test.test(clean)) {
      for (const [k, v] of Object.entries(rule.mood)) {
        delta[k as MoodKey] = (delta[k as MoodKey] ?? 0) + (v as number);
      }
    }
  }
  return delta;
}

// ---------------------------------------------------------------------------
// Preference engine: fold accumulated signals into a Preferences object.
// ---------------------------------------------------------------------------
export function derivePreferences(
  signals: SteeringSignal[],
  base: Preferences
): Preferences {
  const p: Preferences = {
    ...base,
    priorities: [...base.priorities],
    deprioritized: [...base.deprioritized],
    accessibilityNeeds: [...base.accessibilityNeeds],
  };

  for (const s of signals) {
    const e = s.effects;
    if (e.flight_tier === "economical" || e.food_tier === "budget") p.budgetTier = "economical";
    if (e.upgrade_comfort) p.budgetTier = "premium";
    if (e.pace) p.pace = e.pace as Preferences["pace"];
    if (e.avoid_early_flights) p.avoidEarlyFlights = true;
    if (e.minimize_hotel_changes) p.minimizeHotelChanges = true;
    if (e.hotel_change_allowed) p.minimizeHotelChanges = false;
    if (typeof e.threshold_savings === "number") p.hotelChangeSavingsThreshold = e.threshold_savings;
    if (typeof e.target_budget === "number") p.budgetTotal = e.target_budget;
    if (e.priority_bathroom_cleanliness && !p.priorities.includes("bathroom_cleanliness"))
      p.priorities.push("bathroom_cleanliness");
    if (e.priority_cleanliness && !p.priorities.includes("cleanliness")) p.priorities.push("cleanliness");
    if (e.priority_scenery && !p.priorities.includes("scenery")) p.priorities.push("scenery");
    if (e.priority_food && !p.priorities.includes("food")) p.priorities.push("food");
    if (e.deprioritize_luxury && !p.deprioritized.includes("luxury")) p.deprioritized.push("luxury");
    if (e.exclude_nightlife && !p.deprioritized.includes("nightlife")) p.deprioritized.push("nightlife");
    if (e.accessibility === "reduced_mobility" && !p.accessibilityNeeds.includes("reduced_mobility"))
      p.accessibilityNeeds.push("reduced_mobility");
  }
  return p;
}

export function applyMoodDelta(mood: Mood, delta: Partial<Record<MoodKey, number>>): Mood {
  const next = { ...mood };
  for (const [k, v] of Object.entries(delta)) {
    const key = k as MoodKey;
    next[key] = Math.max(0, Math.min(10, next[key] + (v as number)));
  }
  return next;
}
