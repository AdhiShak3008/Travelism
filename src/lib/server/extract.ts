import "server-only";
import { z } from "zod";
import { chatJSON } from "./groq";
import { ENV } from "./env";
import type { CrawledPage } from "./crawler";

const FAST = ENV.GROQ_MODEL_FAST; // gpt-oss-20b — for simple, high-volume extractions

// ============================================================================
// Extraction pipeline. Agents do NOT invent user-facing facts. Instead Groq
// reads REAL crawled page text and returns structured claims grounded in that
// text. Each claim carries the source URL it came from.
// ============================================================================

const SYS = `You are an extraction engine for a travel intelligence system.
You are given the DESTINATION and text scraped from a REAL web page (with its URL).
Extract only facts that are actually supported by the provided text.
Never invent facts. If the page doesn't support a field, omit it.
Return STRICT JSON only.`;

// ---------- Destination overview ----------
const OverviewSchema = z.object({
  tagline: z.string().max(200).optional(),
  summary: z.string().max(900).optional(),
  region: z.string().optional(),
  bestSeason: z.string().optional(),
  gateway: z.string().optional(),
  facts: z.array(z.string().max(140)).max(6).optional(),
});
export type Overview = z.infer<typeof OverviewSchema>;

export async function extractOverview(
  destination: string,
  pages: CrawledPage[],
  signal?: AbortSignal
): Promise<Overview> {
  const corpus = pageCorpus(pages, 8);
  return chatJSON(
    [
      { role: "system", content: SYS },
      {
        role: "user",
        content: `DESTINATION: ${destination}

From the pages below, produce a JSON object:
{ "tagline": short evocative one-liner, "summary": 2-3 sentence editorial overview, "region": administrative region/country, "bestSeason": best months to visit, "gateway": nearest major airport/city to fly into, "facts": up to 5 concrete facts (altitude, permits, drive times) }

PAGES:
${corpus}`,
      },
    ],
    OverviewSchema,
    { signal, model: FAST, reasoning: "low", maxTokens: 1500 }
  );
}

// ---------- Places / attractions ----------
const PlaceSchema = z.object({
  name: z.string(),
  altNames: z.array(z.string()).max(4).optional().default([]),
  category: z.enum(["core", "adventure", "enroute"]).optional().default("core"),
  blurb: z.string().max(220).optional().default(""),
  description: z.string().max(900).optional(),
  durationHours: z.coerce.number().min(0.1).max(24).optional(),
  distanceKm: z.coerce.number().min(0).max(4000).optional(),
  travelTime: z.string().optional(),
  bestTime: z.string().optional(),
  difficulty: z.enum(["easy", "moderate", "hard"]).optional(),
  accessible: z.enum(["yes", "partial", "no"]).optional(),
  permitRequired: z.boolean().optional(),
  facts: z.array(z.string().max(160)).max(4).optional().default([]),
});
const PlacesSchema = z.object({ places: z.array(PlaceSchema).max(14) });
export type ExtractedPlace = z.infer<typeof PlaceSchema>;

export async function extractPlaces(
  destination: string,
  pages: CrawledPage[],
  signal?: AbortSignal
): Promise<ExtractedPlace[]> {
  const corpus = pageCorpus(pages, 10);
  const res = await chatJSON(
    [
      { role: "system", content: SYS },
      {
        role: "user",
        content: `DESTINATION: ${destination}

List the notable places/attractions/beaches/temples/viewpoints travelers actually visit in and around ${destination}, grounded in the pages. Aim for 6-12 places.
Resolve duplicates (same place under different names) into ONE entry with altNames.
category: "core" = must-see in the town/hub; "adventure" = trek/high-altitude/permit/expedition; "enroute" = worth stopping on the way in.
EVERY place MUST have a non-empty "name" and a one-line "blurb".
Return JSON exactly: { "places": [ { "name": string, "altNames": string[], "category": "core"|"adventure"|"enroute", "blurb": string, "description": string, "durationHours": number, "distanceKm": number, "travelTime": string, "bestTime": string, "difficulty": "easy"|"moderate"|"hard", "accessible": "yes"|"partial"|"no", "permitRequired": boolean, "facts": string[] } ] }
Include a place only if the text mentions it. Omit optional fields you can't support, but never omit name/blurb/category.

PAGES:
${corpus}`,
      },
    ],
    PlacesSchema,
    { signal, reasoning: "low", maxTokens: 6000 }
  );
  return res.places;
}

// ---------- Hotels ----------
const HotelSchema = z.object({
  name: z.string(),
  location: z.string().optional(),
  room: z.string().optional(),
  pricePerNight: z.number().min(0).max(200000).optional(),
  cleanliness: z.number().min(0).max(10).optional(),
  bathroomScore: z.number().min(0).max(10).optional(),
  amenities: z.array(z.string()).max(8).default([]),
  policies: z.array(z.string()).max(6).default([]),
  hasElevator: z.boolean().optional(),
  overallRating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().min(0).optional(),
  whyReasons: z.array(z.string().max(120)).max(6).default([]),
});
const HotelsSchema = z.object({ hotels: z.array(HotelSchema).max(8) });
export type ExtractedHotel = z.infer<typeof HotelSchema>;

export async function extractHotels(
  destination: string,
  priorities: string[],
  pages: CrawledPage[],
  signal?: AbortSignal
): Promise<ExtractedHotel[]> {
  const corpus = pageCorpus(pages, 10);
  const focus = priorities.length
    ? `Traveler priorities to weight heavily: ${priorities.join(", ")}. Estimate cleanliness/bathroomScore (0-10) from review language when possible.`
    : "";
  const res = await chatJSON(
    [
      { role: "system", content: SYS },
      {
        role: "user",
        content: `DESTINATION: ${destination}
${focus}

From the pages, extract real hotels/stays with any details supported: name, location, room, pricePerNight (INR), cleanliness(0-10), bathroomScore(0-10), amenities[], policies[], hasElevator, overallRating(0-5), reviewCount, whyReasons[] (short justifications tied to the traveler's priorities).
Return JSON: { "hotels": [ ... ] }. Omit fields you cannot support.

PAGES:
${corpus}`,
      },
    ],
    HotelsSchema,
    // Hotels are high-value and price-sensitive — use the stronger model.
    { signal, reasoning: "low", maxTokens: 4500 }
  );
  return res.hotels;
}

// ---------- Review intelligence (aspect-level) ----------
const AspectSchema = z.object({ aspect: z.string(), score: z.number().min(0).max(10), mentions: z.number().min(0).default(0) });
const ReviewSchema = z.object({
  overall: z.number().min(0).max(5).optional(),
  count: z.number().min(0).optional(),
  aspects: z.array(AspectSchema).max(12).default([]),
  positives: z.array(z.string().max(80)).max(6).default([]),
  negatives: z.array(z.string().max(80)).max(6).default([]),
  recentConcern: z.string().max(160).optional(),
  trend: z.enum(["improving", "stable", "declining"]).default("stable"),
});
export type ExtractedReview = z.infer<typeof ReviewSchema>;

export async function extractReviewIntel(
  entityName: string,
  pages: CrawledPage[],
  signal?: AbortSignal
): Promise<ExtractedReview> {
  const corpus = pageCorpus(pages, 8);
  return chatJSON(
    [
      { role: "system", content: SYS },
      {
        role: "user",
        content: `ENTITY: ${entityName}

From the review text below, produce aspect-level sentiment (0-10 per aspect like Cleanliness, Bathroom, Hot water, Bed, Staff, Noise, Location, Value / or Food, Service, Atmosphere for restaurants). Weight recent reviews more. Identify recurring positives/negatives and any recent concern. Return JSON {overall,count,aspects[],positives[],negatives[],recentConcern,trend}.

REVIEWS:
${corpus}`,
      },
    ],
    ReviewSchema,
    { signal, model: FAST, reasoning: "low", maxTokens: 2000 }
  );
}

// ---------- Permits ----------
const PermitSchema = z.object({
  name: z.string(),
  requirement: z.string().max(200),
  status: z.enum(["required", "pending", "not_required"]).default("required"),
  estimatedCost: z.number().min(0).optional(),
  process: z.string().max(240).optional(),
  responsible: z.string().max(80).optional(),
});
const PermitsSchema = z.object({ permits: z.array(PermitSchema).max(5) });
export type ExtractedPermit = z.infer<typeof PermitSchema>;

export async function extractPermits(
  destination: string,
  pages: CrawledPage[],
  signal?: AbortSignal
): Promise<ExtractedPermit[]> {
  if (pages.length === 0) return [];
  const corpus = pageCorpus(pages, 6);
  const res = await chatJSON(
    [
      { role: "system", content: SYS },
      {
        role: "user",
        content: `DESTINATION: ${destination}
Extract any permits/documents/visas required to visit ${destination}, grounded in the pages. Return JSON { "permits": [ {name, requirement, status, estimatedCost(INR), process, responsible} ] }. If none are required, return an empty array.

PAGES:
${corpus}`,
      },
    ],
    PermitsSchema,
    { signal, model: FAST, reasoning: "low", maxTokens: 1500 }
  );
  return res.permits;
}

// ---------- Food ----------
const FoodSchema = z.object({
  food: z
    .array(
      z.object({
        name: z.string(),
        cuisine: z.string().optional().default("Local"),
        priceRange: z.string().optional().default("₹₹"),
        location: z.string().optional(),
        whyRecommended: z.string().max(180).optional().default(""),
      })
    )
    .max(6),
});
export type ExtractedFood = z.infer<typeof FoodSchema>["food"][number];

export async function extractFood(
  destination: string,
  pages: CrawledPage[],
  signal?: AbortSignal
): Promise<ExtractedFood[]> {
  const corpus = pageCorpus(pages, 6);
  if (!corpus) return [];
  const res = await chatJSON(
    [
      { role: "system", content: SYS },
      {
        role: "user",
        content: `DESTINATION: ${destination}
Extract ACTUAL restaurants/cafes/eateries (named establishments, not article titles) in ${destination} from the pages. Aim for 2-4. Return JSON { "food": [ {name, cuisine, priceRange (₹/₹₹/₹₹₹), location, whyRecommended} ] }. Only real named places supported by the text.

PAGES:
${corpus}`,
      },
    ],
    FoodSchema,
    { signal, model: FAST, reasoning: "low", maxTokens: 1500 }
  );
  return res.food;
}

// ---------- Conflict detection ----------
const ConflictSchema = z.object({
  conflicts: z
    .array(
      z.object({
        attribute: z.string(),
        claimA: z.string().max(200),
        sourceAIndex: z.number(),
        claimB: z.string().max(200),
        sourceBIndex: z.number(),
        recommendation: z.string().max(200),
      })
    )
    .max(5),
});
export type RawConflict = z.infer<typeof ConflictSchema>["conflicts"][number];

export async function detectConflicts(
  subject: string,
  pages: CrawledPage[],
  signal?: AbortSignal
): Promise<RawConflict[]> {
  const usable = pages.filter((p) => p.ok && p.text).slice(0, 8);
  if (usable.length < 2) return [];
  const corpus = usable.map((p, i) => `[SOURCE ${i}] ${p.finalUrl}\n${p.text.slice(0, 1400)}`).join("\n\n---\n\n");
  const res = await chatJSON(
    [
      { role: "system", content: SYS },
      {
        role: "user",
        content: `SUBJECT: ${subject}
Find places where the sources CONTRADICT each other on a concrete attribute (e.g., hot water availability, travel time, opening hours, price). For each, cite the source indices. Recommend conservative planning. Return JSON { "conflicts": [ {attribute, claimA, sourceAIndex, claimB, sourceBIndex, recommendation} ] }. Empty array if none.

SOURCES:
${corpus}`,
      },
    ],
    ConflictSchema,
    { signal, reasoning: "medium", maxTokens: 1800 }
  );
  return res.conflicts;
}

// ---------------------------------------------------------------------------
function pageCorpus(pages: CrawledPage[], max: number): string {
  return pages
    .filter((p) => p.ok && p.text && p.wordCount > 40)
    .slice(0, max)
    .map((p) => `URL: ${p.finalUrl}\nTITLE: ${p.title}\n${p.text.slice(0, 2200)}`)
    .join("\n\n=====\n\n");
}
