import "server-only";
import { z } from "zod";
import { chatJSON } from "./groq";

// ============================================================================
// Dream → structured intent. Groq resolves the destination and pulls out
// priorities/constraints that steer the whole investigation.
// ============================================================================

// Lenient number: tolerates 0 / out-of-range / strings by mapping to undefined
// rather than throwing (the model sometimes returns 0 for "unspecified").
const optDays = z.coerce.number().optional().transform((n) => (n && n >= 1 && n <= 60 ? n : undefined));
const optTravelers = z.coerce.number().optional().transform((n) => (n && n >= 1 && n <= 20 ? n : undefined));

const IntentSchema = z.object({
  destination: z.string(),
  destinations: z.array(z.string()).default([]),
  region: z.string().optional(),
  originCity: z.string().optional(),
  durationDays: optDays,
  travelers: optTravelers,
  budgetTier: z.enum(["economical", "balanced", "premium"]).optional(),
  pace: z.enum(["comfortable", "balanced", "fast"]).optional(),
  stayMode: z.enum(["hotels", "wild_camping", "campsites_refugios", "homestays", "none"]).optional(),
  isSelfSupported: z.boolean().optional(),
  priorities: z.array(z.string()).max(8).default([]),
  deprioritized: z.array(z.string()).max(8).default([]),
  accessibilityNeeds: z.array(z.string()).max(5).default([]),
  avoidEarlyFlights: z.boolean().optional(),
});
export type Intent = z.infer<typeof IntentSchema>;

export async function parseIntent(dream: string, signal?: AbortSignal): Promise<Intent> {
  const isSelfSupportedFallback = /bikepacking|backpacking|wild\s*camp|bivvy|bivouac|self[\s-]supported|tent/i.test(dream);
  const stayModeFallback = /wild\s*camp|bivvy|bivouac|tent/i.test(dream)
    ? "wild_camping"
    : /no\s*hotel|without\s*hotel/i.test(dream)
    ? "none"
    : /campsite|refugio|mountain\s*hut|bothy/i.test(dream)
    ? "campsites_refugios"
    : /homestay/i.test(dream)
    ? "homestays"
    : undefined;

  const parsed = await chatJSON(
    [
      {
        role: "system",
        content: `You interpret a traveler's free-text dream into structured intent for a travel investigation system. Return STRICT JSON only.
CRITICAL FOR MULTI-DESTINATION JOURNEYS:
If the traveler describes a journey spanning multiple cities, regions, or countries (e.g. "Lake Como then Mallorca", "Paris to Lucerne to Rome", "Tokyo, Kyoto & Osaka"):
1. Set "destination" to the combined journey title, e.g. "Lake Como & Mallorca" or "Paris, Lucerne & Rome".
2. Set "destinations" to the ordered array of all visited destinations in sequence, e.g. ["Lake Como", "Mallorca"] or ["Paris", "Lucerne", "Rome"].
3. If only one destination is visited, set "destination" to that city/region and "destinations" to [destination].
4. Capture all activities, sights, and vibes across all destinations in "priorities".`,
      },
      {
        role: "user",
        content: `DREAM: "${dream}"

Return JSON:
{
  "destination": combined journey title if multi-destination (e.g. "Lake Como & Mallorca", "Paris & Rome") or primary destination if single,
  "destinations": array of visited destinations in chronological sequence, e.g. ["Lake Como", "Mallorca"] or ["Paris", "Lucerne", "Rome"],
  "region": broader region or countries (e.g. "Italy & Spain" or "Western Europe"),
  "originCity": where they're departing from if mentioned,
  "durationDays": number if mentioned/implied (e.g. "7 days" => 7),
  "travelers": number if mentioned,
  "budgetTier": "economical" | "balanced" | "premium" (from cues like "cheap flights", "clean but not luxury"),
  "pace": "comfortable" | "balanced" | "fast" (e.g. "don't rush me" => comfortable),
  "stayMode": "wild_camping" | "campsites_refugios" | "homestays" | "hotels" | "none" (default to "hotels" for regular city/resort holidays),
  "isSelfSupported": true if bikepacking, self-supported backpacking, hiking with tent/bivvy,
  "priorities": normalized tags they care about e.g. ["boat_tours","beaches","hiking","scenery","photography","food"],
  "deprioritized": tags they don't care about e.g. ["nightlife","luxury","hotels"],
  "accessibilityNeeds": e.g. ["reduced_mobility"] if traveling with elderly/can't walk far,
  "avoidEarlyFlights": true if they dislike early departures
}`,
      },
    ],
    IntentSchema,
    { signal, reasoning: "medium", maxTokens: 900 }
  );

  let destinations = parsed.destinations && parsed.destinations.length > 0 ? parsed.destinations : [];
  if (destinations.length === 0) {
    if (parsed.destination.includes("&")) {
      destinations = parsed.destination.split("&").map((s) => s.trim()).filter(Boolean);
    } else if (/\b(?:then|to|and)\b/i.test(parsed.destination)) {
      destinations = parsed.destination.split(/\b(?:then|to|and)\b/i).map((s) => s.trim()).filter(Boolean);
    } else {
      destinations = [parsed.destination];
    }
  }

  return {
    ...parsed,
    destinations,
    stayMode: parsed.stayMode || stayModeFallback || "hotels",
    isSelfSupported: parsed.isSelfSupported ?? isSelfSupportedFallback,
  };
}
