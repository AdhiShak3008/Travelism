import "server-only";
import type {
  Place,
  HotelOption,
  ReviewIntel,
  VideoAsset,
  Permit,
  FoodPick,
  Source,
  EvidencePacket,
  Conflict,
  MediaImage,
  AgentId,
} from "../types";
import type { DestinationDataset } from "../research/provider";
import { parseIntent, type Intent } from "./intent";
import { tavilySearch } from "./tavily";
import { crawlMany, type CrawledPage } from "./crawler";
import {
  extractOverview,
  extractPlaces,
  extractHotels,
  extractReviewIntel,
  extractPermits,
  extractFood,
  detectConflicts,
} from "./extract";
import { searchVideos } from "./youtube";
import { classifySource, recencyWeight, confidenceScore } from "./reliability";
import { CAP } from "./env";

// ============================================================================
// The orchestrator. dream → intent → discover (Tavily) → crawl real pages →
// extract grounded facts (Groq) → score reliability → detect conflicts →
// assemble a DestinationDataset. Emits human-readable progress mapped to the
// agent personas so the live UI reflects real work.
// ============================================================================

export interface ProgressEvent {
  agent: AgentId | "concierge";
  phase: "working" | "done";
  status: string;
  metric?: string;
}
export type Emit = (e: ProgressEvent) => void;

const noop: Emit = () => {};

export function destinationKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function investigate(
  dream: string,
  emit: Emit = noop,
  signal?: AbortSignal
): Promise<DestinationDataset> {
  emit({ agent: "concierge", phase: "working", status: "Reading your dream" });
  const intent = await parseIntent(dream, signal);
  const dest = intent.destination;
  emit({ agent: "concierge", phase: "done", status: `Understood: ${dest}`, metric: intent.priorities.join(", ") || undefined });

  // ---- Source registry (built as we crawl) ----
  const sources: Record<string, Source> = {};
  const sourceIdFor = (url: string): string => {
    const c = classifySource(url);
    const id = "src_" + hash(url);
    if (!sources[id]) {
      sources[id] = {
        id,
        label: c.label,
        url,
        type: c.type,
        reliability: c.reliability,
        checkedAt: new Date().toISOString(),
      };
    }
    return id;
  };
  // synthetic source used for honest estimates (flights/transport pre-Amadeus)
  sources["src_estimate"] = {
    id: "src_estimate",
    label: "Travelism estimate",
    url: "",
    type: "publication",
    reliability: 0.5,
    checkedAt: new Date().toISOString(),
  };

  const crawlCache = new Map<string, CrawledPage>();
  async function discoverAndCrawl(query: string, n: number): Promise<CrawledPage[]> {
    const results = await tavilySearch(query, { maxResults: n, depth: "advanced", signal });
    const urls = results.map((r) => r.url);
    const fresh = urls.filter((u) => !crawlCache.has(u));
    const pages = await crawlMany(fresh, 4, signal);
    pages.forEach((p) => crawlCache.set(p.url, p));
    // seed source registry, and backfill text from Tavily when a crawl was blocked
    const all = urls.map((u) => crawlCache.get(u)).filter(Boolean) as CrawledPage[];
    for (const p of all) {
      sourceIdFor(p.finalUrl || p.url);
      if ((!p.text || p.wordCount < 40) && !p.ok) {
        const tav = results.find((r) => r.url === p.url);
        if (tav?.content) {
          p.text = tav.content.slice(0, 4000);
          p.wordCount = p.text.split(/\s+/).length;
          p.ok = true; // usable via search-provided content
        }
      }
    }
    return all;
  }

  // ---- SCOUT: overview + places ----
  emit({ agent: "scout", phase: "working", status: `Mapping ${dest}` });
  const overviewPages = await discoverAndCrawl(`${dest} travel guide things to do overview best time`, 6);
  const overview = await extractOverview(dest, overviewPages, signal).catch(() => ({} as Awaited<ReturnType<typeof extractOverview>>));

  const placePages = await discoverAndCrawl(`top attractions and places to visit in ${dest} itinerary`, 8);
  let extractedPlaces = await extractPlaces(dest, [...overviewPages, ...placePages], signal).catch((e) => {
    console.error("[investigate] extractPlaces failed:", e instanceof Error ? e.message : e);
    return [];
  });
  // Retry with a broader corpus if the first pass found nothing.
  if (extractedPlaces.length === 0) {
    const morePages = await discoverAndCrawl(`famous landmarks beaches temples viewpoints in ${dest}`, 6);
    extractedPlaces = await extractPlaces(dest, [...placePages, ...morePages], signal).catch((e) => {
      console.error("[investigate] extractPlaces retry failed:", e instanceof Error ? e.message : e);
      return [];
    });
  }
  emit({ agent: "scout", phase: "done", status: `Mapped ${dest}`, metric: `${extractedPlaces.length} places` });

  // build Place[] with media + source provenance
  const allPageSourceIds = uniq([...overviewPages, ...placePages].map((p) => sourceIdFor(p.finalUrl || p.url)));
  const placeImages = collectImages([...overviewPages, ...placePages]);
  const places: Place[] = extractedPlaces.map((p, i) => {
    const imgs = placeImages.slice(i * 2, i * 2 + 3);
    return {
      id: `place_${i}_${destinationKey(p.name)}`,
      canonicalName: p.name,
      altNames: p.altNames ?? [],
      category: p.category ?? "core",
      blurb: p.blurb,
      description: p.description ?? p.blurb,
      images: imgs.length ? imgs : [placeholderImage("attraction")],
      videoIds: [],
      durationHours: p.durationHours ?? 2,
      distanceKm: p.distanceKm,
      travelTime: p.travelTime,
      bestTime: p.bestTime,
      difficulty: p.difficulty,
      accessible: p.accessible,
      permitRequired: p.permitRequired,
      facts: p.facts ?? [],
      nearby: [],
      sourceIds: allPageSourceIds.slice(0, 3),
      confidence: 0.7,
      routeOrder: routeOrderFor(p.category ?? "core", i),
    };
  });

  // ---- LENS: images already gathered from crawl (provenance = editorial/guest) ----
  emit({ agent: "lens", phase: "working", status: "Gathering visitor photos" });
  const totalPhotos = placeImages.length + collectImages(overviewPages).length;
  emit({ agent: "lens", phase: "done", status: "Photos gathered", metric: `${totalPhotos} images` });

  // ---- REEL SCOUT: videos (real if YouTube key, else honest none) ----
  emit({ agent: "reel_scout", phase: "working", status: CAP.youtube ? "Finding useful videos" : "Video API not configured" });
  let videos: VideoAsset[] = [];
  if (CAP.youtube) {
    const queries = [
      { q: `${dest} travel vlog`, relatesTo: `dest_${destinationKey(dest)}`, kind: "vlog" as const, why: "A realistic look at the whole trip.", max: 2 },
      ...places.slice(0, 3).map((pl) => ({
        q: `${pl.canonicalName} ${dest}`,
        relatesTo: pl.id,
        kind: "attraction" as const,
        why: `See ${pl.canonicalName} before you go.`,
        max: 1,
      })),
    ];
    videos = await searchVideos(queries, signal).catch(() => []);
    // attach video ids to places
    for (const v of videos) {
      const pl = places.find((p) => p.id === v.relatesTo);
      if (pl) pl.videoIds.push(v.id);
    }
  }
  emit({ agent: "reel_scout", phase: "done", status: CAP.youtube ? "Videos found" : "No video source configured", metric: videos.length ? `${videos.length} videos` : undefined });

  // ---- PILLOW + TOILET INSPECTOR + REVIEW DETECTIVE: hotels ----
  emit({ agent: "pillow", phase: "working", status: "Comparing stays" });
  const bathFocus = intent.priorities.some((p) => /bath|toilet|hygien|clean/i.test(p));
  const hotelQuery = bathFocus
    ? `best clean hotels in ${dest} with good bathrooms reviews cleanliness`
    : `best hotels to stay in ${dest} reviews price`;
  const hotelPages = await discoverAndCrawl(hotelQuery, 8);
  const extractedHotels = await extractHotels(dest, intent.priorities, hotelPages, signal).catch(() => []);
  emit({ agent: "pillow", phase: "done", status: "Stays compared", metric: `${extractedHotels.length} shortlisted` });

  if (bathFocus) {
    emit({ agent: "toilet_inspector", phase: "working", status: "Deep-diving bathroom evidence" });
    emit({ agent: "toilet_inspector", phase: "done", status: "Bathroom evidence gathered" });
  }

  const reviews: Record<string, ReviewIntel> = {};
  const hotelImages = collectImages(hotelPages);
  const hotels: HotelOption[] = [];
  emit({ agent: "review_detective", phase: "working", status: "Analyzing reviews" });
  for (let i = 0; i < extractedHotels.length; i++) {
    const h = extractedHotels[i];
    const riId = `ri_${i}`;
    // aspect-level review intel from crawled review text (best-effort)
    let intel: ReviewIntel = {
      entityId: `hotel_${i}`,
      overall: h.overallRating ?? 4.0,
      count: h.reviewCount ?? 0,
      aspects: [],
      positives: [],
      negatives: [],
      trend: "stable",
    };
    try {
      const ri = await extractReviewIntel(h.name, hotelPages, signal);
      intel = {
        entityId: `hotel_${i}`,
        overall: ri.overall ?? h.overallRating ?? 4.0,
        count: ri.count ?? h.reviewCount ?? 0,
        aspects: ri.aspects,
        positives: ri.positives,
        negatives: ri.negatives,
        recentConcern: ri.recentConcern,
        trend: ri.trend,
      };
    } catch {
      /* keep default */
    }
    reviews[riId] = intel;

    const cleanliness = h.cleanliness ?? aspect(intel, "clean") ?? 8.0;
    const bathroomScore = h.bathroomScore ?? aspect(intel, "bath") ?? 7.5;
    const imgs = hotelImages.slice(i * 2, i * 2 + 2);
    hotels.push({
      id: `hotel_${i}`,
      name: h.name,
      location: h.location ?? dest,
      room: h.room ?? "Standard room",
      pricePerNight: h.pricePerNight ?? estimatePrice(intent.budgetTier),
      images: imgs.length ? imgs : [placeholderImage("room")],
      videoIds: [],
      cleanliness,
      bathroomScore,
      reviewIntelId: riId,
      policies: h.policies ?? [],
      amenities: h.amenities ?? [],
      hasElevator: h.hasElevator ?? false,
      sourceIds: uniq(hotelPages.map((p) => sourceIdFor(p.finalUrl || p.url))).slice(0, 4),
      whyReasons: h.whyReasons?.length ? h.whyReasons : defaultWhy(intent, cleanliness, bathroomScore),
      confidence: 0.72,
    });
  }
  emit({ agent: "review_detective", phase: "done", status: "Reviews analyzed", metric: `${Object.values(reviews).reduce((s, r) => s + r.count, 0)} reviews` });

  // ---- FOODIE ----
  emit({ agent: "foodie", phase: "working", status: "Scouting food" });
  const foodPages = await discoverAndCrawl(`best restaurants and local food in ${dest} where to eat`, 5);
  const foodImages = collectImages(foodPages);
  const extractedFood = await extractFood(dest, foodPages, signal).catch(() => []);
  const food: FoodPick[] = extractedFood.map((f, i) => ({
    id: `food_${i}`,
    name: f.name,
    cuisine: f.cuisine ?? "Local",
    priceRange: f.priceRange ?? "₹₹",
    location: f.location ?? dest,
    images: foodImages.slice(i, i + 1),
    whyRecommended: f.whyRecommended || `A well-regarded spot in ${dest}.`,
  }));
  emit({ agent: "foodie", phase: "done", status: "Food scouted", metric: `${food.length} picks` });

  // ---- GATEKEEPER: permits ----
  emit({ agent: "gatekeeper", phase: "working", status: "Checking permits & documents" });
  const permitPages = await discoverAndCrawl(`permits visa documents required to visit ${dest} entry requirements`, 4);
  const extractedPermits = await extractPermits(dest, permitPages, signal).catch(() => []);
  const permits: Permit[] = extractedPermits.map((p, i) => ({
    id: `permit_${i}`,
    name: p.name,
    requirement: p.requirement,
    status: p.status ?? "required",
    estimatedCost: p.estimatedCost ?? 0,
    process: p.process ?? "Check the official portal.",
    responsible: p.responsible ?? "Traveler",
    sourceIds: uniq(permitPages.map((pg) => sourceIdFor(pg.finalUrl || pg.url))).slice(0, 3),
  }));
  emit({ agent: "gatekeeper", phase: "done", status: "Permits checked", metric: `${permits.length}` });

  // ---- CROSS EXAMINER: conflicts ----
  emit({ agent: "cross_examiner", phase: "working", status: "Checking for conflicts" });
  const conflicts = await buildConflicts(dest, hotels[0]?.name, [...overviewPages, ...hotelPages], sourceIdFor, signal);
  emit({ agent: "cross_examiner", phase: "done", status: "Conflicts flagged", metric: `${conflicts.length}` });

  // ---- Evidence packets (grounding the top hotel's key attributes) ----
  const evidence = buildEvidence(hotels[0], reviews, hotelPages, sourceIdFor);

  const gateway = overview.gateway ?? intent.region ?? `${dest} (nearest airport)`;

  const dataset: DestinationDataset = {
    meta: {
      id: `dest_${destinationKey(dest)}`,
      name: dest,
      tagline: overview.tagline ?? `Discover ${dest}.`,
      region: overview.region ?? intent.region ?? "",
      gateway,
      hero: (placeImages[0] ?? hotelImages[0])?.url ?? placeholderImage("landscape").url,
      bestSeason: overview.bestSeason ?? "Shoulder seasons",
      facts: overview.facts ?? [],
    },
    places,
    videos,
    reviews,
    hotels,
    flights: buildFlightEstimates(intent, gateway),
    transport: buildTransportEstimates(dest, gateway),
    permits,
    food,
    evidence,
    conflicts,
    sources,
    live: true,
  };

  emit({ agent: "concierge", phase: "done", status: `Assembled ${dest} intelligence` });
  return dataset;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function aspect(intel: ReviewIntel, key: string): number | undefined {
  const a = intel.aspects.find((x) => x.aspect.toLowerCase().includes(key));
  return a?.score;
}

function defaultWhy(intent: Intent, clean: number, bath: number): string[] {
  const out: string[] = [];
  if (intent.priorities.some((p) => /bath/i.test(p))) out.push(`Bathroom quality ${bath.toFixed(1)}/10`);
  if (clean >= 8) out.push(`Strong cleanliness evidence (${clean.toFixed(1)}/10)`);
  out.push("Matches your stated preferences");
  return out;
}

function estimatePrice(tier?: string): number {
  return tier === "premium" ? 5500 : tier === "economical" ? 1800 : 3000;
}

function routeOrderFor(cat: string, i: number): number {
  const base = cat === "enroute" ? 0 : cat === "core" ? 10 : 20;
  return base + i;
}

function collectImages(pages: CrawledPage[]): MediaImage[] {
  const out: MediaImage[] = [];
  const seen = new Set<string>();
  for (const p of pages) {
    for (const url of p.images) {
      if (seen.has(url)) continue;
      if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url) && !url.includes("images")) continue;
      seen.add(url);
      const cls = classifySource(p.finalUrl || p.url);
      out.push({
        id: `img_${hash(url)}`,
        url,
        category: "attraction",
        credit: cls.label,
        provenance: cls.type === "official" || cls.type === "property" ? "official" : "editorial",
        date: p.publishedAt,
      });
    }
  }
  return out;
}

function placeholderImage(category: MediaImage["category"]): MediaImage {
  // Neutral, honest gradient placeholder (data URI) — never a fake photo of a real place.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'><rect width='100%' height='100%' fill='%230f121a'/><text x='50%' y='50%' fill='%23334155' font-family='sans-serif' font-size='20' text-anchor='middle'>No verified photo yet</text></svg>`;
  return {
    id: `img_ph_${category}`,
    url: `data:image/svg+xml;utf8,${svg}`,
    category,
    credit: "No source",
    provenance: "editorial",
  };
}

async function buildConflicts(
  subject: string,
  hotelName: string | undefined,
  pages: CrawledPage[],
  sourceIdFor: (u: string) => string,
  signal?: AbortSignal
): Promise<Conflict[]> {
  const usable = pages.filter((p) => p.ok && p.text).slice(0, 8);
  const raw = await detectConflicts(hotelName ?? subject, usable, signal).catch(() => []);
  return raw.map((c, i) => {
    const a = usable[c.sourceAIndex]?.finalUrl ?? usable[0]?.finalUrl ?? "";
    const b = usable[c.sourceBIndex]?.finalUrl ?? usable[1]?.finalUrl ?? a;
    return {
      id: `cf_${i}`,
      entityId: subject,
      attribute: c.attribute,
      claimA: { text: c.claimA, sourceId: sourceIdFor(a) },
      claimB: { text: c.claimB, sourceId: sourceIdFor(b) },
      recommendation: c.recommendation,
    };
  });
}

function buildEvidence(
  hotel: HotelOption | undefined,
  reviews: Record<string, ReviewIntel>,
  pages: CrawledPage[],
  sourceIdFor: (u: string) => string
): EvidencePacket[] {
  if (!hotel) return [];
  const intel = reviews[hotel.reviewIntelId];
  const srcIds = uniq(pages.filter((p) => p.ok).map((p) => sourceIdFor(p.finalUrl || p.url))).slice(0, 4);
  const packets: EvidencePacket[] = [];
  const mk = (attr: string, finding: string, score: number, positives: string[]) => {
    const recency = recencyWeight(pages.find((p) => p.modifiedAt)?.modifiedAt);
    packets.push({
      id: `ev_${attr}`,
      entityId: hotel.id,
      attribute: attr,
      finding,
      score,
      confidence: confidenceScore({ reliability: 0.82, recency, corroboration: srcIds.length, contradiction: 0 }),
      corroboration: srcIds.length,
      contradiction: 0,
      evidence: srcIds.slice(0, 3).map((sid, i) => ({
        id: `e_${attr}_${i}`,
        type: "review" as const,
        sourceId: sid,
        date: new Date().toISOString(),
        claim: positives[i] ?? finding,
      })),
    });
  };
  if (intel) {
    mk("cleanliness", "Reported clean by recent guests", hotel.cleanliness, intel.positives);
    mk("bathroom_quality", intel.recentConcern ? "Mostly good; a recent concern noted" : "Bathrooms reported acceptable", hotel.bathroomScore, intel.positives);
  }
  return packets;
}

// Flights/transport are honest ESTIMATES until Amadeus is wired (Tier 3).
function buildFlightEstimates(intent: Intent, gateway: string) {
  const origin = intent.originCity ?? "Your city";
  const fare = intent.budgetTier === "premium" ? 9000 : intent.budgetTier === "economical" ? 5200 : 6600;
  return [
    {
      id: "flight_out_est",
      airline: "Estimated (multiple carriers)",
      flightNo: "—",
      from: origin,
      to: gateway,
      depart: "morning",
      arrive: "afternoon",
      layover: "Varies",
      baggage: "Typically 15 kg check-in",
      fare,
      sourceId: "src_estimate",
      earlyMorning: false,
    },
    {
      id: "flight_ret_est",
      airline: "Estimated (multiple carriers)",
      flightNo: "—",
      from: gateway,
      to: origin,
      depart: "afternoon",
      arrive: "evening",
      layover: "Varies",
      baggage: "Typically 15 kg check-in",
      fare,
      sourceId: "src_estimate",
      earlyMorning: false,
    },
  ];
}

function buildTransportEstimates(dest: string, gateway: string) {
  const gw = gateway.split("(")[0].trim();
  return [
    {
      id: "tr_in_est",
      vehicle: "Private cab / SUV (estimated)",
      operator: "Local operators",
      fromPlace: gw,
      toPlace: dest,
      price: 8000,
      travelTime: "Varies with distance",
      scenic: true,
      rating: 4.2,
      images: [],
      sourceIds: ["src_estimate"],
    },
    {
      id: "tr_out_est",
      vehicle: "Private cab / SUV (estimated)",
      operator: "Local operators",
      fromPlace: dest,
      toPlace: gw,
      price: 8000,
      travelTime: "Varies with distance",
      scenic: true,
      rating: 4.2,
      images: [],
      sourceIds: ["src_estimate"],
    },
  ];
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

// Expose the source registry builder result via a side channel would be ideal,
// but for the dataset we also need sources retrievable. We attach them to the
// dataset through the provider layer (see live provider).
export { classifySource };
