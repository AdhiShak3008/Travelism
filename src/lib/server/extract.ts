import "server-only";
import { z } from "zod";
import { chatJSON } from "./groq";
import { ENV } from "./env";
import type { CrawledPage } from "./crawler";

const FAST = ENV.GROQ_MODEL_FAST;

// ============================================================================
// Extraction pipeline. Agents read REAL crawled page text and return
// structured claims grounded in that text with market-accurate currency
// conversion and complete attribute mapping.
// ============================================================================

const SYS = `You are an extraction engine for a high-fidelity travel intelligence system.
You are given the DESTINATION and text scraped from REAL web pages (with URLs).
Extract structured facts grounded in the provided text.
CRITICAL CURRENCY INSTRUCTION: If any prices are expressed in foreign currencies ($ USD, € EUR, £ GBP, AED, SGD, THB, JPY), you MUST convert them to Indian Rupees (INR) using approximate current rates:
- 1 USD ($) ≈ 87 INR (e.g., $350/night = 30450 INR; $120 activity = 10440 INR)
- 1 EUR (€) ≈ 95 INR (e.g., €250/night = 23750 INR)
- 1 GBP (£) ≈ 112 INR
- 1 AED ≈ 24 INR
- 1 SGD ≈ 65 INR
- 1 THB ≈ 2.5 INR
Never output unconverted foreign numbers (e.g. putting 350 for a $350 room).
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
{ "tagline": short evocative one-liner, "summary": 2-3 sentence editorial overview, "region": administrative region/country, "bestSeason": best months to visit, "gateway": nearest major airport/city to fly into, "facts": up to 5 concrete facts (altitude, driving/transit times, highlights) }

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
category: "core" = must-see in the town/hub; "adventure" = trek/water sport/wildlife/expedition; "enroute" = worth stopping on the way in or a nearby day trip.
EVERY place MUST have a non-empty "name" and a one-line "blurb".
Return JSON exactly: { "places": [ { "name": string, "altNames": string[], "category": "core"|"adventure"|"enroute", "blurb": string, "description": string, "durationHours": number, "distanceKm": number, "travelTime": string, "bestTime": string, "difficulty": "easy"|"moderate"|"hard", "accessible": "yes"|"partial"|"no", "permitRequired": boolean, "facts": string[] } ] }

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
  pricePerNight: z.number().min(0).max(500000).optional(),
  cleanliness: z.number().min(0).max(10).optional(),
  bathroomScore: z.number().min(0).max(10).optional(),
  amenities: z.array(z.string()).max(10).default([]),
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
    ? `Traveler priorities to weight heavily: ${priorities.join(", ")}. Estimate cleanliness/bathroomScore (0-10) from review language.`
    : "";
  const res = await chatJSON(
    [
      { role: "system", content: SYS },
      {
        role: "user",
        content: `DESTINATION: ${destination}
${focus}

From the pages, extract 3-6 real hotels/resorts with accurate pricing in INR (convert USD $ to INR using 1 USD = 87 INR, e.g. $400/night -> 34800 INR/night).
Include:
- name: Hotel Name
- location: neighborhood/area in ${destination}
- room: e.g. "Deluxe Ocean View Room", "King Suite", "Standard Double Room"
- pricePerNight: price per night in INR (e.g. 28000 for a luxury US hotel, 6500 for a boutique stay in Asia)
- cleanliness: score out of 10
- bathroomScore: score out of 10
- amenities: list of 4-8 top features (e.g. "Rooftop Pool", "Ocean View", "Free High-Speed Wi-Fi", "Full-Service Spa", "Valet Parking", "Fitness Center", "Beach Access", "Breakfast Included", "Air Conditioning")
- policies: clear human-readable sentences (e.g. "Check-in: 3:00 PM · Check-out: 11:00 AM", "Free cancellation up to 48h before arrival", "Pet-friendly accommodation"). NEVER return shorthand codes like "ckin3" or "petok".
- hasElevator: boolean
- overallRating: score out of 5
- reviewCount: number of reviews
- whyReasons: 2-3 reasons why this stay was selected

Return JSON: { "hotels": [ ... ] }

PAGES:
${corpus}`,
      },
    ],
    HotelsSchema,
    { signal, reasoning: "low", maxTokens: 4500 }
  );

  return (res.hotels || []).map((h) => ({
    ...h,
    policies: (h.policies || []).map(formatPolicy),
  }));
}

function formatPolicy(p: string): string {
  const l = p.trim().toLowerCase();
  if (l === "ckin3" || l === "checkin3" || l.includes("checkin 3")) return "Check-in from 3:00 PM";
  if (l === "ckout" || l === "checkout" || l.includes("checkout 11")) return "Check-out by 11:00 AM";
  if (l === "freecn" || l === "free cancellation") return "Free cancellation before arrival";
  if (l === "petok" || l === "pets allowed") return "Pet-friendly accommodation";
  if (l.startsWith("ckin")) return `Check-in from ${p.replace(/ckin/i, "").trim() || "3:00 PM"}`;
  if (l.startsWith("ckout")) return `Check-out by ${p.replace(/ckout/i, "").trim() || "11:00 AM"}`;
  return p;
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

// ---------- Experiences (bookable things to do, with realistic prices) ----------
const ExperienceSchema = z.object({
  experiences: z
    .array(
      z.object({
        name: z.string(),
        category: z
          .enum(["theme_park", "water", "adventure", "wildlife", "tour", "cultural", "wellness", "food_exp", "nightlife"])
          .optional()
          .default("tour"),
        blurb: z.string().max(180).optional().default(""),
        price: z.coerce.number().min(0).max(50000).optional(),
        priceNote: z.string().max(60).optional(),
        perPerson: z.boolean().optional().default(true),
        durationHours: z.coerce.number().min(0.25).max(12).optional().default(3),
        difficulty: z.enum(["easy", "moderate", "hard"]).optional(),
        familyFriendly: z.boolean().optional(),
        minAge: z.coerce.number().min(0).max(21).optional(),
        location: z.string().max(80).optional(),
        whyRecommended: z.string().max(160).optional(),
      })
    )
    .max(10),
});
export type ExtractedExperience = z.infer<typeof ExperienceSchema>["experiences"][number];

export async function extractExperiences(
  destination: string,
  pages: CrawledPage[],
  signal?: AbortSignal
): Promise<ExtractedExperience[]> {
  const corpus = pageCorpus(pages, 8);
  if (!corpus) return [];
  const res = await chatJSON(
    [
      { role: "system", content: SYS },
      {
        role: "user",
        content: `DESTINATION: ${destination}
Extract BOOKABLE, individual single-session activities and experiences in ${destination} (e.g. white water rafting, monastery guided tour, paragliding, boat charters, snorkeling/scuba, wildlife safari, museum passes, food & wine walks, day excursions). Aim for 4-8 activities.

CRITICAL RULES:
1. EXCLUDE MULTI-DAY PACKAGES: NEVER extract multi-day tour agency vacation packages (e.g. REJECT "6 Nights/7 Days Tour Package", "5D/4N Package", or hotel+cab bundles). Duration MUST be between 1 and 8 hours for a single activity.
2. PRICING REALISM: Prices must reflect realistic per-person activity rates in INR:
   - Guided walking tours & museum passes: 500 – 1,800 INR
   - White-water rafting, kayaking, water sports: 1,200 – 3,500 INR
   - Paragliding, adventure zip-lining, day safaris: 2,500 – 5,000 INR
   - Private boat/yacht charter: 3,000 – 8,000 INR per person
   - Free attractions/prayers: 0 INR
   - High-cost international activities (US/Europe/Japan/Dubai): convert realistic rates ($40 – $180 ≈ 3,500 – 15,500 INR).
   - NEVER output exorbitant numbers like 40,000+ INR for a single rafting or paragliding session.
3. Capture: name (clean activity name), category ("theme_park"|"water"|"adventure"|"wildlife"|"tour"|"cultural"|"wellness"|"food_exp"|"nightlife"), blurb, price (in INR), priceNote (e.g. "per person", "incl. gear"), perPerson (boolean), durationHours (1-8), difficulty ("easy"|"moderate"|"hard"), familyFriendly, minAge, location, whyRecommended.

Return JSON: { "experiences": [ ... ] }

PAGES:
${corpus}`,
      },
    ],
    ExperienceSchema,
    { signal, reasoning: "low", maxTokens: 3500 }
  );

  // Filter out any multi-day packages that might have slipped through
  const filtered = (res.experiences || []).filter((e) => {
    const isPackage = /\b(\d+\s*days?|\d+\s*nights?|package|tour package|\d+d\/\d+n)\b/i.test(e.name);
    return !isPackage;
  });

  return filtered;
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
