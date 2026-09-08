import type { AgentId, AgentActivity } from "./types";

export interface ParentAgentMeta {
  id: string;
  name: string;
  glyph: string;
  division: string;
  description: string;
  childAgentIds: AgentId[];
}

export const PARENT_AGENTS: ParentAgentMeta[] = [
  {
    id: "discovery_master",
    name: "Geography & Landmark Discovery Master",
    glyph: "🔭",
    division: "Division 1: Sights & Visual Intel",
    description: "Orchestrates place mapping, multi-engine live web photography scraping, and authentic video scouting.",
    childAgentIds: ["scout", "lens", "reel_scout"],
  },
  {
    id: "hospitality_director",
    name: "Hospitality & Cleanliness Director",
    glyph: "🏨",
    division: "Division 2: Accommodations & Hygiene",
    description: "Evaluates shortlisted resorts, scans verified guest reviews, and performs bathroom hygiene inspections.",
    childAgentIds: ["pillow", "review_detective", "toilet_inspector"],
  },
  {
    id: "logistics_master",
    name: "Transit & Logistics Master",
    glyph: "✈️",
    division: "Division 3: Flights, Roads & Paperwork",
    description: "Calculates live airline fares and routes, maps ground road travel times, and checks visa & permit requirements.",
    childAgentIds: ["wingman", "roadrunner", "gatekeeper"],
  },
  {
    id: "experience_director",
    name: "Experiences & Route Design Director",
    glyph: "🎟️",
    division: "Division 4: Activities, Maps & Food",
    description: "Curates verified bookable activities, generates interactive route maps, finds authentic dining gems, and monitors seasonal climate windows.",
    childAgentIds: ["daydreamer", "cartographer", "foodie", "weather_witch"],
  },
  {
    id: "master_concierge",
    name: "Executive Synthesis Concierge",
    glyph: "👑",
    division: "Division 5: Itinerary & Risk Auditing",
    description: "Detects and flags conflicting claims, optimizes budget efficiency, and synthesizes the final custom package.",
    childAgentIds: ["cross_examiner", "penny_pincher", "concierge"],
  },
];

export interface ParentAgentState {
  meta: ParentAgentMeta;
  phase: "idle" | "working" | "done";
  progressPct: number;
  activeChildrenCount: number;
  completedChildrenCount: number;
  children: AgentActivity[];
  liveStatus: string;
}

export function computeParentAgentStates(agents: AgentActivity[]): ParentAgentState[] {
  const agentMap = new Map<AgentId, AgentActivity>();
  agents.forEach((a) => agentMap.set(a.id, a));

  return PARENT_AGENTS.map((meta) => {
    const children = meta.childAgentIds
      .map((id) => agentMap.get(id))
      .filter((a): a is AgentActivity => Boolean(a));

    const total = Math.max(1, children.length);
    const done = children.filter((c) => c.phase === "done").length;
    const working = children.filter((c) => c.phase === "working").length;
    const progressPct = Math.round((done / total) * 100);

    let phase: ParentAgentState["phase"] = "idle";
    if (done === total) phase = "done";
    else if (working > 0 || done > 0) phase = "working";

    let liveStatus = "Standing by";
    if (phase === "done") {
      liveStatus = "Division mission complete";
    } else if (phase === "working") {
      const activeChild = children.find((c) => c.phase === "working");
      liveStatus = activeChild ? `${activeChild.name}: ${activeChild.status}` : "Synthesizing data...";
    }

    return {
      meta,
      phase,
      progressPct,
      activeChildrenCount: working,
      completedChildrenCount: done,
      children,
      liveStatus,
    };
  });
}
