import "server-only";
import { z } from "zod";
import { chatJSON } from "./groq";

// ============================================================================
// Dream → structured intent. Groq resolves the destination and pulls out
// priorities/constraints that steer the whole investigation.
// ============================================================================

export function cleanDreamInput(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  // Strip conversational request prefixes
  s = s.replace(/^(?:plan(?:\s+a)?(?:\s+trip|\s+tour|\s+vacation|\s+package)?\s+to|explore|take\s+me\s+to|i\s+want\s+to\s+visit|looking\s+for|show\s+me|give\s+me|i'd\s+like\s+to\s+go\s+to|i\s+want|trip\s+to|tour\s+of)\s+/i, "");
  // Strip trailing package fluff like ", the whole package", "the whole thing", "all inclusive", etc.
  s = s.replace(/(?:,\s*)?(?:the\s+)?(?:whole|full|complete|entire|all-inclusive|all\s*inclusive)\s*(?:package|tour|trip|deal|experience|circuit|vacation|holiday|itinerary|thing|deal)\s*$/i, "");
  s = s.replace(/(?:,\s*)?(?:the\s+whole|the\s+full|all\s+of\s+it|the\s+entire\s+thing)\s*$/i, "");
  return s.trim();
}

export function cleanDestinationName(dest: string): string {
  if (!dest) return "";
  let s = dest.trim();
  s = s.replace(/(?:,\s*)?(?:the\s+)?(?:whole|full|complete|entire|all-inclusive|all\s*inclusive)\s*(?:package|tour|trip|deal|experience|circuit|vacation|holiday|itinerary|thing|deal)\s*$/i, "");
  s = s.replace(/(?:,\s*)?(?:the\s+whole|the\s+full|all\s+of\s+it|the\s+entire\s+thing)\s*$/i, "");
  s = s.replace(/\s*,\s*the\b/i, "");
  s = s.replace(/\bthe\s+whole\b/i, "").trim();
  return s;
}

export const KNOWN_REGIONAL_CIRCUITS: Record<string, {
  canonicalTitle: string;
  destinations: string[];
  region: string;
  gateway: string;
  priorities?: string[];
  defaultDays?: number;
}> = {
  scandinavia: {
    canonicalTitle: "Scandinavia (Copenhagen, Oslo, Stockholm & Bergen)",
    destinations: ["Copenhagen", "Oslo", "Stockholm", "Bergen"],
    region: "Northern Europe / Scandinavia",
    gateway: "Copenhagen Airport (CPH)",
    priorities: ["fjords", "scenery", "historic_cities", "design", "coastal", "culture"],
    defaultDays: 9,
  },
  scandinavian: {
    canonicalTitle: "Scandinavia (Copenhagen, Oslo, Stockholm & Bergen)",
    destinations: ["Copenhagen", "Oslo", "Stockholm", "Bergen"],
    region: "Northern Europe / Scandinavia",
    gateway: "Copenhagen Airport (CPH)",
    priorities: ["fjords", "scenery", "historic_cities", "design", "coastal", "culture"],
    defaultDays: 9,
  },
  nordics: {
    canonicalTitle: "The Nordics (Reykjavik, Oslo, Stockholm & Copenhagen)",
    destinations: ["Reykjavik", "Oslo", "Stockholm", "Copenhagen"],
    region: "Northern Europe",
    gateway: "Keflavík International Airport (KEF)",
    priorities: ["northern_lights", "glaciers", "fjords", "scenery", "historic_cities"],
    defaultDays: 10,
  },
  "the nordics": {
    canonicalTitle: "The Nordics (Reykjavik, Oslo, Stockholm & Copenhagen)",
    destinations: ["Reykjavik", "Oslo", "Stockholm", "Copenhagen"],
    region: "Northern Europe",
    gateway: "Keflavík International Airport (KEF)",
    priorities: ["northern_lights", "glaciers", "fjords", "scenery", "historic_cities"],
    defaultDays: 10,
  },
  "eastern europe": {
    canonicalTitle: "Eastern Europe (Prague, Vienna, Budapest & Kraków)",
    destinations: ["Prague", "Vienna", "Budapest", "Kraków"],
    region: "Central & Eastern Europe",
    gateway: "Václav Havel Airport Prague (PRG)",
    priorities: ["castles", "architecture", "history", "food", "photography"],
    defaultDays: 8,
  },
  "the balkans": {
    canonicalTitle: "The Balkans (Dubrovnik, Kotor, Sarajevo & Belgrade)",
    destinations: ["Dubrovnik", "Kotor", "Sarajevo", "Belgrade"],
    region: "Southeastern Europe",
    gateway: "Dubrovnik Airport (DBV)",
    priorities: ["coastal", "history", "scenery", "mountains", "food"],
    defaultDays: 8,
  },
  balkans: {
    canonicalTitle: "The Balkans (Dubrovnik, Kotor, Sarajevo & Belgrade)",
    destinations: ["Dubrovnik", "Kotor", "Sarajevo", "Belgrade"],
    region: "Southeastern Europe",
    gateway: "Dubrovnik Airport (DBV)",
    priorities: ["coastal", "history", "scenery", "mountains", "food"],
    defaultDays: 8,
  },
  "the baltics": {
    canonicalTitle: "The Baltics (Tallinn, Riga & Vilnius)",
    destinations: ["Tallinn", "Riga", "Vilnius"],
    region: "Northeastern Europe",
    gateway: "Lennart Meri Tallinn Airport (TLL)",
    priorities: ["medieval_old_towns", "castles", "baltic_coast", "cafes"],
    defaultDays: 7,
  },
  baltics: {
    canonicalTitle: "The Baltics (Tallinn, Riga & Vilnius)",
    destinations: ["Tallinn", "Riga", "Vilnius"],
    region: "Northeastern Europe",
    gateway: "Lennart Meri Tallinn Airport (TLL)",
    priorities: ["medieval_old_towns", "castles", "baltic_coast", "cafes"],
    defaultDays: 7,
  },
  benelux: {
    canonicalTitle: "Benelux (Amsterdam, Brussels & Luxembourg)",
    destinations: ["Amsterdam", "Brussels", "Luxembourg"],
    region: "Western Europe",
    gateway: "Amsterdam Airport Schiphol (AMS)",
    priorities: ["canals", "museums", "architecture", "biking", "food"],
    defaultDays: 7,
  },
  patagonia: {
    canonicalTitle: "Patagonia (Bariloche, El Calafate & Puerto Natales)",
    destinations: ["Bariloche", "El Calafate", "Puerto Natales"],
    region: "South America (Argentina & Chile)",
    gateway: "Teniente Luis Candelaria Airport (BRC)",
    priorities: ["glaciers", "hiking", "national_parks", "wildlife", "scenery"],
    defaultDays: 9,
  },
  "golden triangle": {
    canonicalTitle: "Golden Triangle (Delhi, Agra & Jaipur)",
    destinations: ["Delhi", "Agra", "Jaipur"],
    region: "North India",
    gateway: "Indira Gandhi International Airport (DEL)",
    priorities: ["monuments", "heritage", "taj_mahal", "forts", "palaces", "food"],
    defaultDays: 6,
  },
  indochina: {
    canonicalTitle: "Indochina (Hanoi, Luang Prabang, Siem Reap & Bangkok)",
    destinations: ["Hanoi", "Luang Prabang", "Siem Reap", "Bangkok"],
    region: "Southeast Asia",
    gateway: "Noi Bai International Airport (HAN)",
    priorities: ["temples", "angkor_wat", "street_food", "rivers", "culture"],
    defaultDays: 10,
  },
  "scottish highlands": {
    canonicalTitle: "Scottish Highlands (Edinburgh, Inverness & Isle of Skye)",
    destinations: ["Edinburgh", "Inverness", "Isle of Skye", "Fort William"],
    region: "Scotland, UK",
    gateway: "Edinburgh Airport (EDI)",
    priorities: ["castles", "lochs", "scenery", "whisky", "hiking"],
    defaultDays: 7,
  },
  "central europe": {
    canonicalTitle: "Central Europe (Berlin, Prague, Vienna & Budapest)",
    destinations: ["Berlin", "Prague", "Vienna", "Budapest"],
    region: "Central Europe",
    gateway: "Berlin Brandenburg Airport (BER)",
    priorities: ["history", "castles", "museums", "architecture", "nightlife"],
    defaultDays: 9,
  },
  "iberian peninsula": {
    canonicalTitle: "Iberian Peninsula (Madrid, Barcelona, Lisbon & Porto)",
    destinations: ["Madrid", "Barcelona", "Lisbon", "Porto"],
    region: "Southern Europe",
    gateway: "Adolfo Suárez Madrid–Barajas Airport (MAD)",
    priorities: ["tapas", "architecture", "coastal", "wine", "beaches"],
    defaultDays: 10,
  },
  "french riviera": {
    canonicalTitle: "French Riviera (Nice, Cannes, Monaco & Saint-Tropez)",
    destinations: ["Nice", "Cannes", "Monaco", "Saint-Tropez"],
    region: "Provence-Alpes-Côte d'Azur, France",
    gateway: "Nice Côte d'Azur Airport (NCE)",
    priorities: ["coastal", "luxury", "yachts", "beaches", "scenery"],
    defaultDays: 7,
  },
  "greek islands": {
    canonicalTitle: "Greek Islands (Athens, Santorini, Mykonos & Crete)",
    destinations: ["Athens", "Santorini", "Mykonos", "Crete"],
    region: "Greece",
    gateway: "Athens International Airport (ATH)",
    priorities: ["beaches", "sunsets", "ancient_ruins", "ferry_trips", "seafood"],
    defaultDays: 8,
  },
};

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
  const cleanedDream = cleanDreamInput(dream);
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
CRITICAL DESTINATION RULES:
1. NEVER include conversational baggage or booking fluff (e.g. "the whole", "the package", "full package", "tour of", "trip to", "all-inclusive") inside "destination" or "destinations".
2. MULTI-DESTINATION JOURNEYS & REGIONAL CIRCUITS:
   - If the traveler describes multiple destinations (e.g. "Paris to Rome", "Tokyo & Kyoto", "Lake Como then Mallorca"), set "destination" to the combined journey title (e.g. "Paris & Rome") and "destinations" to the ordered array ["Paris", "Rome"].
   - If the traveler names a broad geographic region or circuit (e.g. "Scandinavia", "The Nordics", "Eastern Europe", "The Balkans", "Benelux", "Patagonia", "Golden Triangle"):
     Decompose the region into its premier constituent hub cities in "destinations" (e.g. for Scandinavia: ["Copenhagen", "Oslo", "Stockholm", "Bergen"]).
3. Set "region" to the broader administrative region or countries (e.g. "Northern Europe / Scandinavia").
4. Capture all activities, sights, and vibes across all destinations in "priorities".`,
      },
      {
        role: "user",
        content: `DREAM: "${cleanedDream || dream}"

Return JSON:
{
  "destination": combined journey title if multi-destination (e.g. "Scandinavia (Copenhagen, Oslo & Stockholm)", "Lake Como & Mallorca", "Paris & Rome") or primary destination if single,
  "destinations": array of visited destinations in chronological sequence, e.g. ["Copenhagen", "Oslo", "Stockholm", "Bergen"] or ["Paris", "Rome"],
  "region": broader region or countries (e.g. "Northern Europe / Scandinavia" or "Western Europe"),
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

  let destination = cleanDestinationName(parsed.destination);
  let destinations = (parsed.destinations && parsed.destinations.length > 0 ? parsed.destinations : [])
    .map(cleanDestinationName)
    .filter(Boolean);

  if (destinations.length === 0) {
    if (destination.includes("&")) {
      destinations = destination.split("&").map((s) => cleanDestinationName(s.trim())).filter(Boolean);
    } else if (/\b(?:then|to|and)\b/i.test(destination)) {
      destinations = destination.split(/\b(?:then|to|and)\b/i).map((s) => cleanDestinationName(s.trim())).filter(Boolean);
    } else {
      destinations = [destination];
    }
  }

  // Check known regional circuits if single broad destination was returned
  const lookupKey = destination.toLowerCase().replace(/^(?:the\s+)/i, "").trim();
  const rawLookupKey = cleanedDream.toLowerCase().replace(/^(?:the\s+)/i, "").trim();
  const matchedCircuit = KNOWN_REGIONAL_CIRCUITS[lookupKey] || KNOWN_REGIONAL_CIRCUITS[rawLookupKey] ||
    Object.entries(KNOWN_REGIONAL_CIRCUITS).find(([k]) => lookupKey.includes(k) || rawLookupKey.includes(k))?.[1];

  let region = parsed.region;
  let durationDays = parsed.durationDays;
  let priorities = parsed.priorities || [];

  if (matchedCircuit && (destinations.length <= 1 || destinations.some((d) => d.toLowerCase().includes("scandinavia") || d.toLowerCase().includes("balkan") || d.toLowerCase().includes("nordic") || d.toLowerCase().includes("baltic")))) {
    destinations = [...matchedCircuit.destinations];
    destination = matchedCircuit.canonicalTitle;
    region = region || matchedCircuit.region;
    durationDays = durationDays || matchedCircuit.defaultDays;
    priorities = Array.from(new Set([...(matchedCircuit.priorities || []), ...priorities]));
  }

  return {
    ...parsed,
    destination,
    destinations,
    region,
    durationDays,
    priorities,
    stayMode: parsed.stayMode || stayModeFallback || "hotels",
    isSelfSupported: parsed.isSelfSupported ?? isSelfSupportedFallback,
  };
}
