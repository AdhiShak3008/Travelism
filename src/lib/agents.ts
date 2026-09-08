import type { AgentId, AgentActivity } from "./types";

interface AgentMeta {
  id: AgentId;
  name: string;
  glyph: string;
  role: string;
  /** default idle status line */
  idle: string;
}

export const AGENTS: Record<AgentId, AgentMeta> = {
  concierge: {
    id: "concierge",
    name: "Concierge",
    glyph: "🎩",
    role: "Orchestration & synthesis",
    idle: "Standing by",
  },
  scout: {
    id: "scout",
    name: "Scout",
    glyph: "🛰️",
    role: "Destination discovery",
    idle: "Awaiting a dream",
  },
  wingman: {
    id: "wingman",
    name: "Wingman",
    glyph: "✈️",
    role: "Flights & air travel",
    idle: "Idle",
  },
  pillow: {
    id: "pillow",
    name: "Pillow",
    glyph: "🛏️",
    role: "Hotels & stays",
    idle: "Idle",
  },
  toilet_inspector: {
    id: "toilet_inspector",
    name: "Toilet Inspector",
    glyph: "🚽",
    role: "Bathroom & hygiene evidence",
    idle: "Idle",
  },
  roadrunner: {
    id: "roadrunner",
    name: "Roadrunner",
    glyph: "🚙",
    role: "Ground transport & routes",
    idle: "Idle",
  },
  daydreamer: {
    id: "daydreamer",
    name: "Daydreamer",
    glyph: "🗺️",
    role: "Itinerary planning",
    idle: "Idle",
  },
  review_detective: {
    id: "review_detective",
    name: "Review Detective",
    glyph: "🕵️",
    role: "Review analysis",
    idle: "Idle",
  },
  lens: {
    id: "lens",
    name: "Lens",
    glyph: "📸",
    role: "Image & media discovery",
    idle: "Idle",
  },
  reel_scout: {
    id: "reel_scout",
    name: "Reel Scout",
    glyph: "📺",
    role: "Video discovery",
    idle: "Idle",
  },
  gatekeeper: {
    id: "gatekeeper",
    name: "Gatekeeper",
    glyph: "🪪",
    role: "Permits & documents",
    idle: "Idle",
  },
  foodie: {
    id: "foodie",
    name: "Foodie",
    glyph: "🍜",
    role: "Restaurants & food",
    idle: "Idle",
  },
  weather_witch: {
    id: "weather_witch",
    name: "Weather Witch",
    glyph: "🌦️",
    role: "Weather & conditions",
    idle: "Idle",
  },
  packrat: {
    id: "packrat",
    name: "Packrat",
    glyph: "🎒",
    role: "Packing & prep",
    idle: "Idle",
  },
  penny_pincher: {
    id: "penny_pincher",
    name: "Penny Pincher",
    glyph: "💸",
    role: "Cost optimization",
    idle: "Idle",
  },
  cross_examiner: {
    id: "cross_examiner",
    name: "Cross Examiner",
    glyph: "⚖️",
    role: "Conflict detection",
    idle: "Idle",
  },
  cartographer: {
    id: "cartographer",
    name: "Cartographer",
    glyph: "🧭",
    role: "Interactive maps & route timelines",
    idle: "Idle",
  },
  bean_counter: {
    id: "bean_counter",
    name: "Bean Counter",
    glyph: "🧮",
    role: "Cost accounting",
    idle: "Idle",
  },
};

export const AGENT_ORDER: AgentId[] = [
  "scout",
  "pillow",
  "toilet_inspector",
  "lens",
  "reel_scout",
  "review_detective",
  "roadrunner",
  "wingman",
  "foodie",
  "gatekeeper",
  "weather_witch",
  "daydreamer",
  "cartographer",
  "penny_pincher",
  "cross_examiner",
  "bean_counter",
];

export function makeIdleActivity(id: AgentId, priority = 0.5): AgentActivity {
  const m = AGENTS[id];
  return {
    id,
    name: m.name,
    glyph: m.glyph,
    role: m.role,
    phase: "idle",
    status: m.idle,
    priority,
  };
}
