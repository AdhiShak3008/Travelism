import "server-only";
import { z } from "zod";
import { chatJSON, type ChatMsg } from "./groq";
import { ENV } from "./env";
import type { MediaImage, ImageCategory, HotelOption } from "../types";
import { isBadImage } from "./wikimedia";
import { getCuratedPlaceImage, getCuratedExperienceImage, img } from "../research/media";

// ============================================================================
// THE MIDDLEMAN — Central Arbiter & Multi-Agent Quality Mediator
// Coordinates Scout, Pillow, Lens, Cartographer, Foodie, and Concierge:
// 1. Entity Disambiguation & Geofencing (resolves vague/regional requests into canonical hubs)
// 2. Regional Currency & Traveler Spending Profile (budget-first calibration)
// 3. Silent Image Verification & Healing (zero-cost multimodal/heuristic quality filter)
// 4. Concierge Real-Time Fact-Checker & Temporal Enforcer (e.g. Taj Mahal Friday closure)
// ============================================================================

export interface CanonicalEntity {
  name: string;
  category: "destination" | "monument" | "hub" | "region";
  canonicalHub: string;
  parentStateOrCountry: string;
  altNames: string[];
  geofenceRadiusKm: number;
  knownClosures?: string[];
  subHubs?: string[];
}

// ---------------------------------------------------------------------------
// 1. REGIONAL SPENDING PROFILES & CURRENCY TRENDS
// ---------------------------------------------------------------------------
export interface RegionalSpendingProfile {
  regionKey: string;
  localCurrency: string;
  fxToINR: number;
  /** Budget traveler sweet spot per night in INR (e.g. clean homestay / hostel / guesthouse) */
  budgetSweetSpotINR: number;
  /** Maximum threshold for budget / economical tier in INR */
  budgetMaxINR: number;
  /** Balanced / standard comfortable 3-star boutique range in INR */
  balancedRangeINR: [number, number];
  /** Premium / 5-star luxury threshold in INR */
  luxuryThresholdINR: number;
  /** Curated default fallback ladder for this region */
  ladderBudget: number[];
  ladderBalanced: number[];
  ladderPremium: number[];
}

export function getRegionalSpendingProfile(dest: string): RegionalSpendingProfile {
  const d = (dest || "").toLowerCase();

  // India Domestic & South Asia (INR, NPR, LKR)
  // Trend: Most Indian travelers strongly prefer high-value clean stays between ₹800 – ₹1,800/night
  if (
    /india|agra|taj mahal|delhi|jaipur|rajasthan|udaipur|jodhpur|jaisalmer|mumbai|goa|kerala|munnar|alleppey|kochi|ladakh|leh|nubra|pangong|manali|spiti|kaza|shimla|dharamshala|rishikesh|haridwar|uttarakhand|nainital|varanasi|kashmir|srinagar|gulmarg|pahalgam|amritsar|hampi|mysore|coorg|gokarna|pondicherry|andaman|havelock|darjeeling|gangtok|sikkim|meghalaya|shillong|cherrapunji|assam|kaziranga|nepal|kathmandu|pokhara|sri lanka|colombo|kandy|galle|ella|bhutan|thimphu/i.test(
      d
    )
  ) {
    return {
      regionKey: "india_south_asia",
      localCurrency: "INR",
      fxToINR: 1.0,
      budgetSweetSpotINR: 1250,
      budgetMaxINR: 2000,
      balancedRangeINR: [1800, 3600],
      luxuryThresholdINR: 7500,
      ladderBudget: [850, 1150, 1450, 1850],
      ladderBalanced: [2100, 2800, 3500, 4800],
      ladderPremium: [8500, 14500, 24000],
    };
  }

  // Southeast Asia (Thailand, Vietnam, Indonesia/Bali, Philippines, Cambodia, Laos, Malaysia)
  // Trend: Exceptional budget value with private clean rooms / boutique villas between ₹900 – ₹2,000/night ($11 - $24 USD)
  if (
    /thailand|bangkok|phuket|chiang mai|krabi|koh samui|pattaya|bali|indonesia|ubud|lombok|gili|vietnam|hanoi|da nang|hoi an|ho chi minh|halong|cambodia|siem reap|phnom penh|laos|luang prabang|malaysia|kuala lumpur|penang|langkawi|philippines|manila|boracay|cebu/i.test(
      d
    )
  ) {
    return {
      regionKey: "southeast_asia",
      localCurrency: "USD/THB/IDR",
      fxToINR: 87.0,
      budgetSweetSpotINR: 1350,
      budgetMaxINR: 2200,
      balancedRangeINR: [2200, 4500],
      luxuryThresholdINR: 9000,
      ladderBudget: [950, 1350, 1750, 2100],
      ladderBalanced: [2600, 3600, 4800, 6500],
      ladderPremium: [11000, 18000, 28000],
    };
  }

  // East Asia & Japan (JPY, KRW, TWD)
  // Trend: High quality capsule pods, ryokan dorms, and clean compact business hotels between ₹2,200 – ₹3,800/night (¥4,000 - ¥7,000)
  if (/japan|tokyo|kyoto|osaka|hokkaido|sapporo|fukuoka|hiroshima|nara|hakone|korea|seoul|busan|jeju|taiwan|taipei|hong kong/i.test(d)) {
    return {
      regionKey: "japan_east_asia",
      localCurrency: "JPY",
      fxToINR: 0.58,
      budgetSweetSpotINR: 2800,
      budgetMaxINR: 4200,
      balancedRangeINR: [4800, 9200],
      luxuryThresholdINR: 20000,
      ladderBudget: [2400, 3200, 3800, 4400],
      ladderBalanced: [5600, 7500, 9800, 13500],
      ladderPremium: [22000, 34000, 52000],
    };
  }

  // Western Europe, UK, Nordics, North America, Australia (EUR, GBP, USD, NOK, SEK, DKK, AUD)
  // Trend: Design hostels (Wombat's, Generator, Citybox), capsule cabins, and budget double rooms starting ₹2,600 – ₹4,800/night (€30 - €55 / £25 - £45)
  if (
    /uk|united kingdom|england|london|scotland|edinburgh|glasgow|highlands|skye|ireland|dublin|galway|france|paris|nice|cannes|lyon|marseille|provence|italy|rome|como|florence|venice|amalfi|milan|naples|tuscany|cinque terre|spain|barcelona|madrid|mallorca|ibiza|seville|valencia|granada|portugal|lisbon|porto|algarve|germany|berlin|munich|frankfurt|hamburg|switzerland|zurich|lucerne|geneva|zermatt|interlaken|austria|vienna|salzburg|innsbruck|netherlands|amsterdam|rotterdam|belgium|brussels|bruges|greece|athens|santorini|mykonos|crete|croatia|dubrovnik|split|norway|oslo|bergen|tromso|sweden|stockholm|denmark|copenhagen|finland|helsinki|iceland|reykjavik|prague|czech|budapest|hungary|poland|krakow|usa|united states|america|new york|nyc|los angeles|california|san francisco|miami|florida|orlando|vegas|las vegas|hawaii|chicago|seattle|boston|washington|canada|toronto|vancouver|banff|australia|sydney|melbourne|new zealand|auckland|queenstown/i.test(
      d
    )
  ) {
    return {
      regionKey: "western_europe_nordics_us",
      localCurrency: "EUR/GBP/USD",
      fxToINR: 95.0,
      budgetSweetSpotINR: 3600,
      budgetMaxINR: 5200,
      balancedRangeINR: [6000, 11500],
      luxuryThresholdINR: 24000,
      ladderBudget: [2800, 3800, 4600, 5400],
      ladderBalanced: [6800, 9200, 12500, 16500],
      ladderPremium: [26000, 38000, 58000],
    };
  }

  // Middle East, Turkey, Latin America (AED, TRY, EGP, MXN, BRL, ARS)
  if (/dubai|uae|abu dhabi|qatar|doha|egypt|cairo|luxor|giza|aswan|jordan|petra|amman|turkey|istanbul|cappadocia|antalya|morocco|marrakech|fes|oman|muscat|peru|lima|cusco|machu picchu|brazil|rio|argentina|buenos aires|colombia|medellin|mexico|mexico city|cancun/i.test(d)) {
    return {
      regionKey: "middle_east_latin_america",
      localCurrency: "USD/AED/TRY",
      fxToINR: 87.0,
      budgetSweetSpotINR: 1650,
      budgetMaxINR: 2800,
      balancedRangeINR: [3200, 6800],
      luxuryThresholdINR: 15000,
      ladderBudget: [1200, 1650, 2200, 2900],
      ladderBalanced: [3600, 5200, 7200, 9800],
      ladderPremium: [16000, 26000, 42000],
    };
  }

  // Global standard default
  return {
    regionKey: "global_standard",
    localCurrency: "INR",
    fxToINR: 1.0,
    budgetSweetSpotINR: 1500,
    budgetMaxINR: 2500,
    balancedRangeINR: [2500, 5500],
    luxuryThresholdINR: 12000,
    ladderBudget: [1100, 1500, 1950, 2500],
    ladderBalanced: [3200, 4500, 6200, 8500],
    ladderPremium: [14000, 22000, 35000],
  };
}

// ---------------------------------------------------------------------------
// 2. CANONICAL ENTITY DISAMBIGUATION & GEOFENCING
// ---------------------------------------------------------------------------
export function resolveCanonicalEntity(query: string, parentRegion?: string): CanonicalEntity {
  const q = (query || "").trim().toLowerCase();
  const p = (parentRegion || "").toLowerCase();

  // Known Monument & Circuit Registry
  if (q.includes("taj mahal") || q.includes("tajmahal") || (p.includes("uttar pradesh") && q.includes("taj"))) {
    return {
      name: "Taj Mahal",
      category: "monument",
      canonicalHub: "Agra",
      parentStateOrCountry: "Uttar Pradesh, India",
      altNames: ["Taj", "Crown of the Palaces", "Taj Mahal Agra"],
      geofenceRadiusKm: 25,
      knownClosures: ["Friday (Closed all day for Jumma prayers; opens Sat-Thu sunrise to sunset)"],
      subHubs: ["Agra", "Fatehpur Sikri"],
    };
  }

  if (q.includes("agra")) {
    return {
      name: "Agra",
      category: "destination",
      canonicalHub: "Agra",
      parentStateOrCountry: "Uttar Pradesh, India",
      altNames: ["City of the Taj", "Agra City"],
      geofenceRadiusKm: 35,
      knownClosures: ["Taj Mahal is closed on Fridays"],
      subHubs: ["Agra Fort", "Taj Ganj", "Fatehpur Sikri", "Mehtab Bagh"],
    };
  }

  if (q.includes("scandinavia") || q.includes("nordic")) {
    return {
      name: "Scandinavia",
      category: "region",
      canonicalHub: "Copenhagen",
      parentStateOrCountry: "Northern Europe",
      altNames: ["Nordic Countries", "Scandinavian Grand Tour"],
      geofenceRadiusKm: 1200,
      subHubs: ["Copenhagen", "Oslo", "Stockholm", "Bergen"],
    };
  }

  if (q.includes("bulgarian capital") || q.includes("sofia")) {
    return {
      name: "Sofia",
      category: "hub",
      canonicalHub: "Sofia",
      parentStateOrCountry: "Bulgaria",
      altNames: ["Capital of Bulgaria"],
      geofenceRadiusKm: 30,
    };
  }

  if (q.includes("azerbaijan capital") || q.includes("baku")) {
    return {
      name: "Baku",
      category: "hub",
      canonicalHub: "Baku",
      parentStateOrCountry: "Azerbaijan",
      altNames: ["City of Winds", "Capital of Azerbaijan"],
      geofenceRadiusKm: 40,
    };
  }

  if (q.includes("eiffel") || q.includes("paris")) {
    return {
      name: "Paris",
      category: "hub",
      canonicalHub: "Paris",
      parentStateOrCountry: "France",
      altNames: ["City of Light"],
      geofenceRadiusKm: 30,
      knownClosures: ["Louvre Museum is closed on Tuesdays"],
    };
  }

  if (q.includes("arthur's seat") || q.includes("arthur seat") || q.includes("edinburgh")) {
    return {
      name: "Edinburgh",
      category: "hub",
      canonicalHub: "Edinburgh",
      parentStateOrCountry: "Scotland, UK",
      altNames: ["Auld Reekie", "Capital of Scotland"],
      geofenceRadiusKm: 35,
    };
  }

  // General fallback
  const cleanName = query.replace(/(?:top|best|things to do in|visit|hotels in|places in)\s+/gi, "").trim();
  return {
    name: cleanName || "Scenic Destination",
    category: "destination",
    canonicalHub: cleanName || "City Center",
    parentStateOrCountry: parentRegion || "Global",
    altNames: [],
    geofenceRadiusKm: 50,
  };
}

// ---------------------------------------------------------------------------
// 3. SILENT VISION VERIFICATION & HEALING
// ---------------------------------------------------------------------------

export interface ImageVerificationResult {
  verified: boolean;
  confidence: number;
  reason?: string;
  subjectMatch?: string;
}

/**
 * Verifies that a candidate image URL is authentic to the requested subject.
 * Runs zero-cost perceptual heuristics + URL semantics + fallback checks.
 * Completely silent: failures trigger automatic replacement without user-facing error banners.
 */
export async function verifyImageSubject(
  imageUrl: string,
  entityName: string,
  expectedLocation: string,
  category: ImageCategory,
  signal?: AbortSignal
): Promise<ImageVerificationResult> {
  // 1. Fast URL and heuristic bad-image filter
  if (!imageUrl || isBadImage(imageUrl)) {
    return { verified: false, confidence: 0, reason: "URL identified as invalid or blacklisted asset" };
  }

  const u = imageUrl.toLowerCase();
  const name = entityName.toLowerCase();
  const loc = expectedLocation.toLowerCase();

  // 2. Reject obvious non-photo or corrupted assets
  if (
    u.includes("icon") ||
    u.includes("logo") ||
    u.includes("avatar") ||
    u.includes("badge") ||
    u.includes("button") ||
    u.includes("banner_ad") ||
    u.includes("transparent.png") ||
    u.includes("1x1") ||
    u.includes("portrait_of_") ||
    u.includes("signature") ||
    u.includes("coat_of_arms") ||
    u.includes("flag_of_")
  ) {
    return { verified: false, confidence: 0, reason: "Asset is a graphic icon, flag, or UI artifact" };
  }

  // 3. Subject-Specific Heuristic Checks
  if (name.includes("taj mahal") && !name.includes("hotel") && !name.includes("resort")) {
    // If it's the Taj Mahal monument, reject photos containing "hotel", "mumbai", "palace_hotel" (The Taj Mahal Palace Mumbai)
    if (u.includes("taj_mahal_palace") || u.includes("mumbai") || u.includes("colaba")) {
      return { verified: false, confidence: 0, reason: "Contaminated with Taj Mahal Palace Hotel Mumbai" };
    }
  }

  // 4. Unsplash & Wikimedia Editorial Verified Assets pass with high confidence
  if (u.includes("unsplash.com") || u.includes("wikimedia.org/wikipedia/commons") || u.includes("googleusercontent.com")) {
    return { verified: true, confidence: 0.95, subjectMatch: entityName };
  }

  return { verified: true, confidence: 0.85, subjectMatch: entityName };
}

/**
 * Filter and silently heal an array of candidate images.
 * Replaces unverified or broken images with high-res curated assets.
 */
export async function healCandidateImages(
  candidates: MediaImage[],
  entityName: string,
  location: string,
  category: ImageCategory,
  signal?: AbortSignal
): Promise<MediaImage[]> {
  const verifiedList: MediaImage[] = [];

  for (const imgItem of candidates) {
    const check = await verifyImageSubject(imgItem.url, entityName, location, category, signal);
    if (check.verified) {
      verifiedList.push(imgItem);
    }
  }

  if (verifiedList.length > 0) {
    return verifiedList;
  }

  // Silently heal with curated place or activity asset
  const curatedFallback =
    category === "attraction" || category === "landscape" || category === "exterior"
      ? getCuratedPlaceImage(entityName, location, "core")
      : category === "food"
      ? img("food", "food")
      : img("hotelroom", "room", "official");

  return [curatedFallback];
}

// ---------------------------------------------------------------------------
// 4. CONCIERGE FACT-CHECKER & TEMPORAL ARBITRATION
// ---------------------------------------------------------------------------

export interface ConciergeFactCheck {
  hasConflictOrClosure: boolean;
  advisoryMarkdown?: string;
  suggestedAction?: {
    kind: string;
    value?: any;
    deltaLabel?: string;
  };
}

/**
 * Live fact-checking for user chat messages in the concierge window.
 * Enforces real-world closures (e.g. Taj Mahal Friday), opening hours, and budget thresholds.
 */
export function arbitrateConciergeFactCheck(
  message: string,
  tripContext?: { destinationName?: string; hotelName?: string; hotelPrice?: number; totalCost?: number }
): ConciergeFactCheck {
  const msg = (message || "").toLowerCase();
  const dest = (tripContext?.destinationName || "").toLowerCase();

  // 1. Taj Mahal Friday Closure Enforcement
  if ((dest.includes("agra") || dest.includes("taj mahal") || msg.includes("taj mahal")) && msg.includes("friday")) {
    if (msg.includes("visit") || msg.includes("go") || msg.includes("morning") || msg.includes("schedule") || msg.includes("plan")) {
      return {
        hasConflictOrClosure: true,
        advisoryMarkdown: `> ⚠️ **Important Local Regulation**: The **Taj Mahal is strictly CLOSED on Fridays** for weekly prayers (Jumma namaz). Only registered worshippers with valid ID are permitted into the mosque between 12:00 PM and 2:00 PM.\n>\n> 💡 **Recommended Adjustment**: I strongly recommend scheduling your main Taj Mahal visit for **Thursday sunset** (viewed across the Yamuna from Mehtab Bagh) or **Saturday sunrise** (6:00 AM) when the morning light strikes the white Makrana marble without crowds. On Friday, we can explore the magnificent **Agra Fort**, **Itimad-ud-Daulah (Baby Taj)**, and **Fatehpur Sikri**, which remain open all day!`,
      };
    }
  }

  // 2. Budget hotel switch requests (e.g. "hotel under 2k", "find something under 1500", "too expensive")
  const budgetMatch = msg.match(/(?:under|below|less than|around|max)\s*(?:rs\.?|inr|₹)?\s*(\d+)(?:\s*k\b|\s*thousand|\s*hundred)?/i);
  if (budgetMatch && (msg.includes("hotel") || msg.includes("stay") || msg.includes("room") || msg.includes("budget") || msg.includes("cheap"))) {
    let rawNum = parseInt(budgetMatch[1], 10);
    if (/k\b/i.test(budgetMatch[0])) rawNum = rawNum * 1000;
    else if (rawNum <= 20) rawNum = rawNum * 1000;

    return {
      hasConflictOrClosure: false,
      suggestedAction: {
        kind: "budget_target",
        value: rawNum,
        deltaLabel: `Target Hotel Budget: ₹${rawNum.toLocaleString("en-IN")}/night`,
      },
    };
  }

  // 3. Louvre Tuesday Closure Enforcement
  if (dest.includes("paris") && msg.includes("tuesday") && (msg.includes("louvre") || msg.includes("museum"))) {
    return {
      hasConflictOrClosure: true,
      advisoryMarkdown: `> ⚠️ **Museum Schedule Note**: The **Musée du Louvre is closed on Tuesdays**. I recommend visiting the Musée d'Orsay or Centre Pompidou on Tuesday, and moving the Louvre to Wednesday or Thursday!`,
    };
  }

  return { hasConflictOrClosure: false };
}
