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
import { fetchWikiImages } from "./wikimedia";
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
    const pages = await crawlMany(fresh, 6, signal);
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

  const bathFocus = intent.priorities.some((p) => /bath|toilet|hygien|clean/i.test(p));
  const hotelQuery = bathFocus
    ? `best clean hotels in ${dest} with good bathrooms reviews cleanliness`
    : `best hotels to stay in ${dest} reviews price`;

  // ---- PHASE 1: run ALL discovery+crawl tracks in parallel ----
  emit({ agent: "scout", phase: "working", status: `Mapping ${dest}` });
  emit({ agent: "pillow", phase: "working", status: "Comparing stays" });
  emit({ agent: "foodie", phase: "working", status: "Scouting food" });
  emit({ agent: "gatekeeper", phase: "working", status: "Checking permits & documents" });

  const [overviewPages, placePages, hotelPages, foodPages, permitPages] = await Promise.all([
    discoverAndCrawl(`${dest} travel guide things to do overview best time`, 5),
    discoverAndCrawl(`top attractions and places to visit in ${dest} itinerary`, 7),
    discoverAndCrawl(hotelQuery, 6),
    discoverAndCrawl(`best restaurants and local food in ${dest} where to eat`, 4),
    discoverAndCrawl(`permits visa documents required to visit ${dest} entry requirements`, 3),
  ]);

  // ---- PHASE 2: run ALL extractions in parallel ----
  const [overview, extractedPlaces0, extractedHotels, extractedFood, extractedPermits] = await Promise.all([
    extractOverview(dest, overviewPages, signal).catch(() => ({} as Awaited<ReturnType<typeof extractOverview>>)),
    extractPlaces(dest, [...overviewPages, ...placePages], signal).catch((e) => {
      console.error("[investigate] extractPlaces failed:", e instanceof Error ? e.message : e);
      return [];
    }),
    extractHotels(dest, intent.priorities, hotelPages, signal).catch(() => []),
    extractFood(dest, foodPages, signal).catch(() => []),
    extractPermits(dest, permitPages, signal).catch(() => []),
  ]);

  let extractedPlaces = extractedPlaces0;
  if (extractedPlaces.length === 0) {
    const morePages = await discoverAndCrawl(`famous landmarks beaches temples viewpoints in ${dest}`, 6);
    extractedPlaces = await extractPlaces(dest, [...placePages, ...morePages], signal).catch(() => []);
  }
  emit({ agent: "scout", phase: "done", status: `Mapped ${dest}`, metric: `${extractedPlaces.length} places` });

  // Hotel extraction sometimes returns empty on the fast model — retry once
  // with a fresh crawl + default model so stays are never silently missing.
  let extractedHotelsFinal = extractedHotels;
  let hotelPagesFinal = hotelPages;
  if (extractedHotelsFinal.length === 0) {
    const moreHotelPages = await discoverAndCrawl(`hotels resorts homestays in ${dest} with prices and reviews`, 6);
    hotelPagesFinal = [...hotelPages, ...moreHotelPages];
    extractedHotelsFinal = await extractHotels(dest, intent.priorities, hotelPagesFinal, signal).catch(() => []);
  }

  // build Place[] with media + source provenance
  const allPageSourceIds = uniq([...overviewPages, ...placePages].map((p) => sourceIdFor(p.finalUrl || p.url)));
  const placeImages = collectImages([...overviewPages, ...placePages]);

  // Fetch real, licensed photos per place from Wikimedia (free, no key), in
  // parallel with bounded concurrency. Falls back to crawled images, then a
  // neutral placeholder — never a fabricated photo of a real place.
  emit({ agent: "lens", phase: "working", status: "Gathering visitor photos" });
  const [rawWikiPlaceImages, heroImgs] = await Promise.all([
    mapLimited(extractedPlaces, 6, (p) => fetchWikiImages(`${p.name} ${dest}`, "attraction", 3, signal).catch(() => [])),
    fetchWikiImages(dest, "landscape", 1, signal).catch(() => []),
  ]);
  // Dedup images across places so two places don't show the same photo.
  const usedImageUrls = new Set<string>();
  const wikiPlaceImages = rawWikiPlaceImages.map((arr) => {
    const kept = arr.filter((im) => !usedImageUrls.has(im.url));
    kept.forEach((im) => usedImageUrls.add(im.url));
    return kept;
  });

  const places: Place[] = extractedPlaces.map((p, i) => {
    const wiki = wikiPlaceImages[i] ?? [];
    const crawled = placeImages.slice(i * 2, i * 2 + 2);
    const imgs = [...wiki, ...crawled].slice(0, 4);
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

  // ---- LENS: real Wikimedia photos + crawled images ----
  const wikiPhotoCount = wikiPlaceImages.reduce((s, arr) => s + arr.length, 0);
  const totalPhotos = wikiPhotoCount + placeImages.length;
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

  // ---- PILLOW + REVIEW DETECTIVE: hotels (crawl+extract already done in phase 1/2) ----
  emit({ agent: "pillow", phase: "done", status: "Stays compared", metric: `${extractedHotelsFinal.length} shortlisted` });
  if (bathFocus) emit({ agent: "toilet_inspector", phase: "done", status: "Bathroom evidence gathered" });

  const hotelImages = collectImages(hotelPagesFinal);
  const hotelSourceIds = uniq(hotelPagesFinal.map((p) => sourceIdFor(p.finalUrl || p.url))).slice(0, 4);

  // Review intel per hotel — run in PARALLEL (was the biggest sequential cost).
  emit({ agent: "review_detective", phase: "working", status: "Reading recent traveller reviews" });
  const reviews: Record<string, ReviewIntel> = {};
  const reviewIntels = await mapLimited(extractedHotelsFinal, 4, async (h, i) => {
    try {
      const ri = await extractReviewIntel(h.name, hotelPagesFinal, signal);
      return {
        entityId: `hotel_${i}`,
        overall: ri.overall ?? h.overallRating ?? 4.0,
        count: ri.count ?? h.reviewCount ?? 0,
        aspects: ri.aspects,
        positives: ri.positives,
        negatives: ri.negatives,
        recentConcern: ri.recentConcern,
        trend: ri.trend,
      } as ReviewIntel;
    } catch {
      return {
        entityId: `hotel_${i}`,
        overall: h.overallRating ?? 4.0,
        count: h.reviewCount ?? 0,
        aspects: [],
        positives: [],
        negatives: [],
        trend: "stable",
      } as ReviewIntel;
    }
  });

  const hotels: HotelOption[] = extractedHotelsFinal.map((h, i) => {
    const riId = `ri_${i}`;
    const intel = reviewIntels[i];
    reviews[riId] = intel;
    const cleanliness = h.cleanliness ?? aspect(intel, "clean") ?? 8.0;
    const bathroomScore = h.bathroomScore ?? aspect(intel, "bath") ?? 7.5;
    const imgs = hotelImages.slice(i * 2, i * 2 + 2);
    return {
      id: `hotel_${i}`,
      name: h.name,
      location: h.location ?? dest,
      room: h.room ?? "Standard room",
      pricePerNight: sanePrice(h.pricePerNight, intent.budgetTier),
      images: imgs.length ? imgs : [placeholderImage("room")],
      videoIds: [],
      cleanliness,
      bathroomScore,
      reviewIntelId: riId,
      policies: h.policies ?? [],
      amenities: h.amenities ?? [],
      hasElevator: h.hasElevator ?? false,
      sourceIds: hotelSourceIds,
      whyReasons: h.whyReasons?.length ? h.whyReasons : defaultWhy(intent, cleanliness, bathroomScore),
      confidence: 0.72,
    };
  });
  emit({ agent: "review_detective", phase: "done", status: "Reviews analyzed", metric: `${Object.values(reviews).reduce((s, r) => s + r.count, 0)} reviews` });

  // ---- FOODIE (extracted in phase 2) ----
  const foodImages = collectImages(foodPages);
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

  // ---- GATEKEEPER (extracted in phase 2) ----
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

  // ---- CROSS EXAMINER: conflicts (parallel with review intel earlier finish) ----
  emit({ agent: "cross_examiner", phase: "working", status: "Checking for conflicts" });
  const conflicts = await buildConflicts(dest, hotels[0]?.name, [...overviewPages, ...hotelPagesFinal], sourceIdFor, signal);
  emit({ agent: "cross_examiner", phase: "done", status: "Conflicts flagged", metric: `${conflicts.length}` });

  // ---- Evidence packets (grounding the top hotel's key attributes) ----
  const evidence = buildEvidence(hotels[0], reviews, hotelPagesFinal, sourceIdFor);

  const gateway = overview.gateway ?? intent.region ?? `${dest} (nearest airport)`;

  const dataset: DestinationDataset = {
    meta: {
      id: `dest_${destinationKey(dest)}`,
      name: dest,
      tagline: overview.tagline ?? `Discover ${dest}.`,
      region: overview.region ?? intent.region ?? "",
      gateway,
      hero: (heroImgs[0] ?? wikiPlaceImages.flat()[0] ?? placeImages[0] ?? hotelImages[0])?.url ?? placeholderImage("landscape").url,
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

// ============================================================================
// Targeted RE-INVESTIGATION. A steering comment ("more scenic places and
// buddhist sites") becomes a scoped live crawl that discovers NEW places and
// returns them (plus their sources) to merge into the existing reveal.
// ============================================================================
export interface RefineResult {
  places: Place[];
  sources: Record<string, Source>;
  query: string;
  found: number;
}

export async function refinePlaces(
  destination: string,
  request: string,
  existingNames: string[],
  emit: Emit = noop,
  signal?: AbortSignal
): Promise<RefineResult> {
  const sources: Record<string, Source> = {};
  const sourceIdFor = (url: string): string => {
    const c = classifySource(url);
    const id = "src_" + hashStr(url);
    if (!sources[id]) {
      sources[id] = { id, label: c.label, url, type: c.type, reliability: c.reliability, checkedAt: new Date().toISOString() };
    }
    return id;
  };

  emit({ agent: "scout", phase: "working", status: `Searching: ${request}` });

  // Turn the free-text request into a focused search query.
  const query = `${request} in ${destination}`.replace(/\s+/g, " ").trim();
  const results = await tavilySearch(query, { maxResults: 7, depth: "advanced", signal }).catch(() => []);
  const pages = await crawlMany(results.map((r) => r.url), 4, signal);
  // backfill from Tavily content when a page was blocked
  for (const p of pages) {
    sourceIdFor(p.finalUrl || p.url);
    if ((!p.text || p.wordCount < 40) && !p.ok) {
      const tav = results.find((r) => r.url === p.url);
      if (tav?.content) {
        p.text = tav.content.slice(0, 4000);
        p.wordCount = p.text.split(/\s+/).length;
        p.ok = true;
      }
    }
  }

  emit({ agent: "scout", phase: "working", status: "Extracting new places" });
  let extracted = await extractPlaces(destination, pages, signal).catch(() => []);

  // Drop places we already have (case-insensitive name / altName match).
  const have = new Set(existingNames.map((n) => n.toLowerCase().trim()));
  extracted = extracted.filter((p) => {
    const names = [p.name, ...(p.altNames ?? [])].map((n) => n.toLowerCase().trim());
    return !names.some((n) => have.has(n));
  });

  emit({ agent: "lens", phase: "working", status: "Fetching photos for new places" });
  const wikiImgs = await mapLimited(extracted, 4, (p) =>
    fetchWikiImages(`${p.name} ${destination}`, "attraction", 3, signal).catch(() => [])
  );
  const crawlImgs = collectImages(pages);
  const usedUrls = new Set<string>();

  const pageSourceIds = uniq(pages.map((p) => sourceIdFor(p.finalUrl || p.url))).slice(0, 3);

  const places: Place[] = extracted.map((p, i) => {
    const wiki = (wikiImgs[i] ?? []).filter((im) => !usedUrls.has(im.url));
    wiki.forEach((im) => usedUrls.add(im.url));
    const imgs = [...wiki, ...crawlImgs.slice(i, i + 1)].slice(0, 4);
    return {
      id: `place_refine_${Date.now()}_${i}_${destinationKey(p.name)}`,
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
      sourceIds: pageSourceIds,
      confidence: 0.68,
      routeOrder: routeOrderFor(p.category ?? "core", 50 + i),
    };
  });

  emit({ agent: "scout", phase: "done", status: `Found ${places.length} new places`, metric: `${places.length}` });
  return { places, sources, query, found: places.length };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

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

/** Guard against garbage prices (0, ratings, or values expressed in thousands). */
function sanePrice(price: number | undefined, tier?: string): number {
  if (price == null || price <= 0) return estimatePrice(tier);
  if (price < 100) return Math.round(price * 1000); // e.g. 23.6 -> 23,600
  if (price < 400) return estimatePrice(tier); // ambiguous small number → estimate
  if (price > 100000) return estimatePrice(tier);
  return Math.round(price);
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

/** Map over items with bounded concurrency, preserving order. */
async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
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
