import "server-only";
import type { TripWorkflowState, AuditIssue } from "./state";
import { chatJSON } from "../groq";
import { ENV } from "../env";
import { z } from "zod";
import { scrapeLiveSubjectImages } from "../imageScraper";
import { getCuratedPlaceImage, getCuratedExperienceImage } from "../../research/media";
import type { Place, Experience, HotelOption, TripBlob } from "../../types";
import type { DestinationDataset } from "../../research/provider";

const FAST = ENV.GROQ_MODEL_FAST;

// ============================================================================
// LangGraph Node 1: Intent & Constraints Parser
// ============================================================================
const IntentSchema = z.object({
  action: z.enum(["add_places", "add_activities", "change_stay", "adjust_budget", "general_refine"]),
  targetKeywords: z.array(z.string()).default([]),
  budgetAdjustment: z.enum(["increase", "decrease", "unchanged"]).default("unchanged"),
  paceAdjustment: z.enum(["relaxed", "fast_paced", "unchanged"]).default("unchanged"),
  summary: z.string(),
});

export async function intentNode(state: TripWorkflowState): Promise<Partial<TripWorkflowState>> {
  const { userRequest, destination } = state;
  const prompt = `Analyze this travel modification request for ${destination}: "${userRequest}".
Extract the user's primary action, target keywords/activities, and preferences.`;

  try {
    const res = await chatJSON(
      [
        { role: "system", content: "You are a travel intent parser. Return strict JSON." },
        { role: "user", content: prompt },
      ],
      IntentSchema,
      { model: FAST, reasoning: "low", maxTokens: 1000 }
    );

    return {
      logs: [`[IntentNode] Understood intent: ${res.summary} (Action: ${res.action})`],
    };
  } catch {
    return {
      logs: [`[IntentNode] Proceeding with general refinement for "${userRequest}"`],
    };
  }
}

// ============================================================================
// LangGraph Node 2: Discovery Node (Search & Verified Photography)
// ============================================================================
const DiscoverySchema = z.object({
  places: z.array(z.object({
    name: z.string(),
    category: z.string().default("core"),
    blurb: z.string().default(""),
    durationHours: z.number().default(2),
  })).default([]),
  experiences: z.array(z.object({
    name: z.string(),
    category: z.string().default("tour"),
    blurb: z.string().default(""),
    price: z.number().default(1500),
    durationHours: z.number().default(3),
  })).default([]),
});

export async function discoveryNode(state: TripWorkflowState): Promise<Partial<TripWorkflowState>> {
  const { userRequest, destination } = state;
  const prompt = `DESTINATION: ${destination}
USER REQUEST: "${userRequest}"

Discover 2-3 authentic spots ("places") and 2-3 bookable activities ("experiences") matching this request.
Return JSON with the exact structure:
{
  "places": [
    { "name": "Spot Name", "category": "core", "blurb": "Short description", "durationHours": 2 }
  ],
  "experiences": [
    { "name": "Activity Name", "category": "tour", "blurb": "Short description", "price": 2500, "durationHours": 3 }
  ]
}`;

  try {
    const res = await chatJSON(
      [
        {
          role: "system",
          content: "You are a travel discovery engine. You MUST return strict JSON with 'places' and 'experiences' arrays.",
        },
        { role: "user", content: prompt },
      ],
      DiscoverySchema,
      { model: FAST, reasoning: "low", maxTokens: 2000 }
    );

    // Fetch verified photos in parallel for discovered entities
    const discoveredPlaces: Place[] = await Promise.all(
      res.places.map(async (p, idx) => {
        const liveImgs = await scrapeLiveSubjectImages(p.name, destination, "attraction", 2).catch(() => []);
        const images = liveImgs.length > 0 ? liveImgs : [getCuratedPlaceImage(p.name, destination, p.category)];
        return {
          id: `lg_place_${Date.now()}_${idx}`,
          canonicalName: p.name,
          altNames: [],
          category: (p.category === "adventure" || p.category === "enroute" ? p.category : "core"),
          blurb: p.blurb,
          description: p.blurb,
          images,
          videoIds: [],
          durationHours: p.durationHours,
          facts: [],
          nearby: [],
          sourceIds: ["src_estimate"],
          confidence: 0.95,
          routeOrder: idx + 1,
        };
      })
    );

    const discoveredExperiences: Experience[] = await Promise.all(
      res.experiences.map(async (e, idx) => {
        const liveImgs = await scrapeLiveSubjectImages(e.name, destination, "attraction", 2).catch(() => []);
        const images = liveImgs.length > 0 ? liveImgs : [getCuratedExperienceImage(e.category, e.name)];
        return {
          id: `lg_exp_${Date.now()}_${idx}`,
          name: e.name,
          category: e.category as any,
          blurb: e.blurb,
          description: e.blurb,
          price: e.price,
          perPerson: true,
          durationHours: e.durationHours,
          location: destination,
          images,
          sourceIds: ["src_estimate"],
          estimated: true,
          confidence: 0.95,
        };
      })
    );

    return {
      discoveredPlaces,
      discoveredExperiences,
      logs: [
        `[DiscoveryNode] Discovered ${discoveredPlaces.length} spots and ${discoveredExperiences.length} activities with verified photos`,
      ],
    };
  } catch (err) {
    console.error("[DiscoveryNode Error]:", err);
    return {
      discoveredPlaces: [],
      discoveredExperiences: [],
      logs: [`[DiscoveryNode] Discovery fallback: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

// ============================================================================
// LangGraph Node 3: Synthesizer Node (Updates Blob & Dataset)
// ============================================================================
export async function synthesizeNode(state: TripWorkflowState): Promise<Partial<TripWorkflowState>> {
  const { blob, dataset, discoveredPlaces = [], discoveredExperiences = [] } = state;

  const nextPlaces = [...discoveredPlaces, ...(dataset?.places || [])];
  const nextExperiences = [...discoveredExperiences, ...(dataset?.experiences || [])];

  const updatedDataset: DestinationDataset = {
    ...(dataset || {}),
    meta: dataset?.meta || {
      id: state.destination.toLowerCase().replace(/\s+/g, "-"),
      name: state.destination,
      tagline: `Experience ${state.destination}`,
      region: "Global",
      gateway: state.destination,
      hero: nextPlaces[0]?.images?.[0]?.url ?? "",
      bestSeason: "Year-round",
      facts: [],
    },
    places: nextPlaces,
    videos: dataset?.videos || [],
    reviews: dataset?.reviews || {},
    hotels: dataset?.hotels || [],
    flights: dataset?.flights || [],
    transport: dataset?.transport || [],
    permits: dataset?.permits || [],
    food: dataset?.food || [],
    experiences: nextExperiences,
    evidence: dataset?.evidence || [],
    conflicts: dataset?.conflicts || [],
  };

  const existingPlaceIds = blob?.selectedPlaceIds || [];
  const existingExpIds = blob?.selectedExperienceIds || [];
  const existingExps = blob?.experiences || [];

  const updatedBlob: Partial<TripBlob> = {
    ...(blob || {}),
    destinationName: state.destination,
    destinationId: blob?.destinationId || state.destination.toLowerCase().replace(/\s+/g, "-"),
    selectedPlaceIds: Array.from(new Set([...discoveredPlaces.map((p) => p.id), ...existingPlaceIds])),
    selectedExperienceIds: Array.from(new Set([...discoveredExperiences.map((e) => e.id), ...existingExpIds])),
    experiences: Array.from(new Set([...discoveredExperiences, ...existingExps])),
    updatedAt: new Date().toISOString(),
  };

  return {
    blob: updatedBlob as TripBlob,
    dataset: updatedDataset,
    iteration: (state.iteration || 0) + 1,
    logs: [`[SynthesizerNode] Synthesized itinerary version (Iteration ${(state.iteration || 0) + 1})`],
  };
}

// ============================================================================
// LangGraph Node 4: Feasibility & Safety Auditor Node
// ============================================================================
export async function auditNode(state: TripWorkflowState): Promise<Partial<TripWorkflowState>> {
  const { blob, destination } = state;
  const issues: AuditIssue[] = [];

  // Check 1: Excessive activities in a single day
  const totalItems = (blob?.selectedPlaceIds?.length || 0) + (blob?.selectedExperienceIds?.length || 0);
  const days = blob?.durationDays || 3;
  if (totalItems / days > 5) {
    issues.push({
      type: "transit_overload",
      severity: "warning",
      message: `Schedule is dense: ${totalItems} total spots across ${days} days (>5 per day).`,
      suggestion: "Spread activities across an additional day or select top priority highlights.",
    });
  }

  // Check 2: High altitude destination check
  const isHighAltitude = /ladakh|leh|tawang|spiti|rohtang|pangong|khardung/i.test(destination);
  if (isHighAltitude && days < 4) {
    issues.push({
      type: "altitude_risk",
      severity: "critical",
      message: `High altitude destination (${destination}) requires at least 24-48h acclimatization.`,
      suggestion: "Include an initial rest day at base altitude to prevent AMS.",
    });
  }

  return {
    auditIssues: issues,
    status: issues.some((i) => i.severity === "critical") ? "needs_review" : "completed",
    logs: [
      `[AuditNode] Feasibility audit completed: ${issues.length} issues found (${issues.filter((i) => i.severity === "critical").length} critical)`,
    ],
  };
}

// ============================================================================
// LangGraph Node 5: Finalize Node
// ============================================================================
export async function finalizeNode(state: TripWorkflowState): Promise<Partial<TripWorkflowState>> {
  return {
    status: "completed",
    logs: [`[FinalizeNode] Trip workflow completed successfully and ready for UI rendering.`],
  };
}
