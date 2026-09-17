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
  // Strip conversational request prefixes. Loop so stacked fillers like
  // "i wanna explore ..." ("i wanna" + "explore") are fully peeled off.
  const PREFIX = /^(?:plan(?:\s+a)?(?:\s+trip|\s+tour|\s+vacation|\s+package)?\s+to|i(?:'d)?\s*(?:wanna|wan(?:t|na)|would\s+like|want|feel\s+like)(?:\s+to)?(?:\s+(?:go(?:\s+to)?|visit|see|explore|check\s+out|travel\s+to|head\s+to))?|let'?s(?:\s+go(?:\s+to)?)?|gonna(?:\s+(?:go\s+to|visit|explore))?|take\s+me\s+to|looking\s+for|show\s+me|give\s+me|explore|discover|visit|see|go\s+to|head\s+to|travel\s+to|fly\s+to|trip\s+to|tour\s+of)\s+/i;
  // peel up to 3 stacked prefixes
  for (let i = 0; i < 3 && PREFIX.test(s); i++) {
    s = s.replace(PREFIX, "").trim();
  }
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
  // ---- Scout geographic classification & vagueness detection ----
  /** What kind of place the user actually named. */
  destinationType: z
    .enum(["city", "country", "region", "landmark", "area", "multi", "fictional", "vague", "unknown"])
    .optional()
    .default("unknown"),
  /** For fictional/pop-culture references: what it maps to, shown to the user. */
  culturalNote: z.string().optional(),
  /** The concrete base city to actually anchor the search (e.g. landmark "Taj Mahal" -> "Agra"). */
  resolvedHub: z.string().optional(),
  /** 0-1 how confident Scout is that it correctly identified a real place. */
  geoConfidence: z.coerce.number().min(0).max(1).optional().default(0.8),
  /** True when the request is too vague to pin to a real place. */
  isVague: z.boolean().optional().default(false),
  /** Why it's vague, shown to the user (e.g. "You described a vibe, not a place"). */
  vagueReason: z.string().optional(),
  /** Concrete destinations that would satisfy a vague request (for clarification chips). */
  suggestedDestinations: z.array(z.string()).max(6).optional().default([]),
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
  /** Dietary constraints carried from the traveler's profile (for Foodie). */
  dietary: z.array(z.string()).max(8).optional(),
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
        content: `You are SCOUT, the destination-resolution agent for a travel investigation system. Your job is to (a) classify exactly what kind of place the traveler named, (b) resolve it to a concrete base city to search, and (c) honestly detect when the request is too VAGUE to pin to a real place. Return STRICT JSON only.

GEOGRAPHIC CLASSIFICATION — set "destinationType" to ONE of:
- "city"     → a specific city/town (e.g. "Kyoto", "Udaipur", "Lisbon").
- "country"  → a whole country (e.g. "Japan", "France", "Sri Lanka"). Pick its best first-time base city as "resolvedHub" (Japan → "Tokyo", France → "Paris", Sri Lanka → "Colombo").
- "region"   → a multi-city area/circuit OR a named mountain range / natural region (e.g. "Scandinavia", "Kerala", "Tuscany", "the Appalachians", "the Rockies", "the Alps", "the Dolomites"). Input may be lowercase or slightly misspelled (e.g. "american appalachias") — still classify it as a real region and decompose into practical hub cities in "destinations" (e.g. Appalachians → ["Asheville","Gatlinburg","Shenandoah","Roanoke"]). Do NOT mark a named geographic range as "vague".
- "landmark" → a specific sight/monument/park (e.g. "Taj Mahal", "Eiffel Tower", "Machu Picchu"). Set "resolvedHub" to the base city travelers actually stay in (Taj Mahal → "Agra", Machu Picchu → "Cusco", Eiffel Tower → "Paris").
- "area"     → a natural feature/sub-area (e.g. "Lake Como", "Amalfi Coast", "Nubra Valley"). Set "resolvedHub" to the practical base.
- "multi"    → several distinct destinations (e.g. "Paris to Rome"). Fill "destinations" in order.
- "fictional"→ a MOVIE / TV / GAME / BOOK reference or fictional setting, NOT a literal place (e.g. "places from GTA 6", "Game of Thrones locations", "where Lord of the Rings was filmed", "Emily in Paris", "the Harry Potter world", "Wakanda"). Map it to the REAL-WORLD locations it's based on or filmed at. See POP-CULTURE below.
- "vague"    → NO real place is named; only a vibe/theme/criteria (e.g. "somewhere warm", "a beach holiday", "mountains and snow", "anywhere in Europe", "a romantic getaway", "somewhere cheap"). See VAGUENESS below.
- "unknown"  → cannot tell / gibberish.

POP-CULTURE / FICTIONAL MAPPING (destinationType "fictional"):
- Identify the media and map it to the REAL destinations it depicts or was filmed in. Set "destinations" to those real places and "resolvedHub" to the primary one.
- SPECIFIC TITLE vs. WHOLE FRANCHISE — read carefully:
  - A specific installment maps to ITS setting: "GTA 6 / Vice City" → Miami & Florida; "GTA 5 / Los Santos" → Los Angeles; "GTA 4 / Liberty City" → New York; "GTA San Andreas" → Los Angeles, San Francisco & Las Vegas.
  - A FRANCHISE / SERIES reference — bare "GTA", "the GTA games", "the full GTA package", "the whole GTA series", "all the GTA cities" — means a MULTI-CITY tour of ALL the real cities across the series. For GTA that's destinations ["Miami","Los Angeles","New York","Las Vegas","San Francisco"], resolvedHub "Miami", and destinationType "fictional" (multi-city). NEVER collapse a franchise request to just one game's city.
  - Likewise: "James Bond locations" → many (London, Nassau, Venice, Montenegro…); "Assassin's Creed cities" → the real cities each game recreates.
  Other examples:
  - "Game of Thrones locations" → destinations ["Dubrovnik","Reykjavik","Belfast","Seville"], resolvedHub "Dubrovnik".
  - "Lord of the Rings / Middle-earth" → New Zealand → destinations ["Queenstown","Wellington","Matamata"], resolvedHub "Queenstown".
  - "Harry Potter" → destinations ["Edinburgh","Oxford","London"], resolvedHub "Edinburgh".
  - "Emily in Paris" → destinations ["Paris"], resolvedHub "Paris".
- ALWAYS set "culturalNote": a friendly one-liner. For a franchise, say so, e.g. "The GTA games are set across fictionalized Miami, LA, New York, Vegas & San Francisco — here's a real-world tour of all of them." For a single title: "GTA 6 is set in a fictionalized Miami & Florida — here's the real thing." NEVER present the fictional name as a bookable place.
- Treat words like "package", "full", "whole", "complete" here as meaning "the entire series / everything", NOT booking fluff.
- If a fictional world has NO real-world basis (pure fantasy), map to the closest real filming/inspiration location and say so in culturalNote.

RESOLUTION:
- "resolvedHub": the SINGLE concrete city to anchor the search on. For city=itself; country/landmark/area=the real base city; region/multi=first hub. For vague, leave empty.
- "geoConfidence": 0-1. High (>0.85) for clear real places; low (<0.5) for vague/ambiguous/misspelled.

VAGUENESS DETECTION (be honest — do NOT invent a specific place the user didn't name):
- If the traveler describes only a vibe, climate, budget, season, or activity WITHOUT naming a real city/country/region/landmark, set "isVague": true, "destinationType": "vague".
- "vagueReason": one friendly sentence, e.g. "You described the kind of trip, not a place — here are a few that fit."
- "suggestedDestinations": 3-6 concrete real destinations that match the described vibe (e.g. for "somewhere warm with beaches in December" → ["Goa","Bali","Phuket","Zanzibar","Maldives"]). These become clarification options.
- When vague, still fill "destination" with a short label of the vibe (e.g. "A warm beach escape") but keep "destinations" empty.

DESTINATION HYGIENE:
1. NEVER include booking fluff ("the whole", "full package", "tour of", "trip to", "all-inclusive") inside "destination"/"destinations".
2. MULTI/REGION: combined title in "destination", ordered hubs in "destinations".
3. "region": broader administrative region/countries.
4. Capture activities/vibes across all destinations in "priorities".`,
      },
      {
        role: "user",
        content: `RAW REQUEST: "${dream}"
NORMALIZED: "${cleanedDream || dream}"
(Use the RAW REQUEST to judge intent — words like "full", "whole", "package", "series", "all the ... cities" signal the ENTIRE franchise/series, not one title.)

Return JSON:
{
  "destination": combined journey title if multi-destination (e.g. "Scandinavia (Copenhagen, Oslo & Stockholm)", "Lake Como & Mallorca", "Paris & Rome"), primary destination if single, or a short vibe label if vague (e.g. "A warm beach escape"),
  "destinations": array of visited destinations in chronological sequence, e.g. ["Copenhagen", "Oslo", "Stockholm", "Bergen"] or ["Paris", "Rome"] (empty if vague),
  "destinationType": "city" | "country" | "region" | "landmark" | "area" | "multi" | "fictional" | "vague" | "unknown",
  "culturalNote": friendly one-liner mapping a fictional/media reference to real places (only if destinationType is "fictional"),
  "resolvedHub": the single concrete base city to search (e.g. "Agra" for Taj Mahal, "Tokyo" for Japan, "Miami" for GTA 6); empty if vague,
  "geoConfidence": 0.0-1.0 confidence you identified a real place,
  "isVague": true if only a vibe/theme was given with no real place,
  "vagueReason": one friendly sentence explaining the vagueness (only if isVague),
  "suggestedDestinations": 3-6 concrete real destinations matching the vibe (only if isVague),
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
  const resolvedHub = parsed.resolvedHub ? cleanDestinationName(parsed.resolvedHub) : "";
  let destinations = (parsed.destinations && parsed.destinations.length > 0 ? parsed.destinations : [])
    .map(cleanDestinationName)
    .filter(Boolean);

  // For a country/landmark/area, anchor the working destination to the resolved
  // base city so all downstream searches (places/hotels/experiences) hit a real
  // hub — e.g. "Japan" → Tokyo, "Taj Mahal" → Agra, "Amalfi Coast" → Sorrento.
  if (
    !parsed.isVague &&
    resolvedHub &&
    ["country", "landmark", "area"].includes(parsed.destinationType || "") &&
    destinations.length <= 1
  ) {
    destinations = [resolvedHub];
  }

  if (destinations.length === 0) {
    if (destination.includes("&")) {
      destinations = destination.split("&").map((s) => cleanDestinationName(s.trim())).filter(Boolean);
    } else if (/\b(?:then|to|and)\b/i.test(destination)) {
      destinations = destination.split(/\b(?:then|to|and)\b/i).map((s) => cleanDestinationName(s.trim())).filter(Boolean);
    } else {
      destinations = [destination];
    }
  }

  let region = parsed.region;
  let durationDays = parsed.durationDays;
  let priorities = parsed.priorities || [];

  // Live-first: trust Scout's own decomposition of a region into hubs. Only when
  // Scout returned a SINGLE broad label with no real hubs do we fall back to the
  // legacy circuit hints (kept purely as a resilience net, not the primary path).
  const scoutDecomposed = destinations.length >= 2;
  if (!scoutDecomposed) {
    const lookupKey = destination.toLowerCase().replace(/^(?:the\s+)/i, "").trim();
    const rawLookupKey = cleanedDream.toLowerCase().replace(/^(?:the\s+)/i, "").trim();
    const matchedCircuit =
      KNOWN_REGIONAL_CIRCUITS[lookupKey] ||
      KNOWN_REGIONAL_CIRCUITS[rawLookupKey] ||
      Object.entries(KNOWN_REGIONAL_CIRCUITS).find(([k]) => lookupKey.includes(k) || rawLookupKey.includes(k))?.[1];
    if (matchedCircuit) {
      destinations = [...matchedCircuit.destinations];
      destination = matchedCircuit.canonicalTitle;
      region = region || matchedCircuit.region;
      durationDays = durationDays || matchedCircuit.defaultDays;
      priorities = Array.from(new Set([...(matchedCircuit.priorities || []), ...priorities]));
    }
  }

  return {
    ...parsed,
    destination,
    destinations,
    resolvedHub: resolvedHub || destinations[0] || destination,
    region,
    durationDays,
    priorities,
    stayMode: parsed.stayMode || stayModeFallback || "hotels",
    isSelfSupported: parsed.isSelfSupported ?? isSelfSupportedFallback,
  };
}

/** Short user-facing note describing how Scout interpreted the request. */
export function scoutInterpretationNote(intent: Intent): string | undefined {
  if (intent.destinationType === "fictional" && intent.culturalNote) return intent.culturalNote;
  if (intent.destinationType === "landmark" && intent.resolvedHub)
    return `${intent.destination} is best explored from ${intent.resolvedHub} — anchoring your trip there.`;
  if (intent.destinationType === "country" && intent.resolvedHub)
    return `Starting your ${intent.destination} trip from ${intent.resolvedHub}.`;
  return undefined;
}
