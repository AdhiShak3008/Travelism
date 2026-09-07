import "server-only";
import type {
  Place,
  HotelOption,
  ReviewIntel,
  VideoAsset,
  Permit,
  FoodPick,
  Experience,
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
  extractExperiences,
  detectConflicts,
} from "./extract";
import { searchVideos } from "./youtube";
import { fetchWikiImages, isBadImage } from "./wikimedia";
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
  let intent: Intent;
  try {
    intent = await parseIntent(dream, signal);
  } catch (e) {
    console.error("[investigate] parseIntent failed, using fallback:", e instanceof Error ? e.message : e);
    // Minimal fallback: grab a capitalized place-ish token from the dream.
    const guess = dream.match(/(?:to|in|visit|explore)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/)?.[1]?.trim();
    intent = {
      destination: guess || dream.split(/\s+/).slice(0, 3).join(" "),
      durationDays: undefined,
      travelers: undefined,
      priorities: [],
      deprioritized: [],
      accessibilityNeeds: [],
    };
  }
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
  // For broad/country destinations, anchor the stay search to a real city
  // (the gateway) so we don't get empty "hotels in <whole country>" results.
  const stayLocus = staySearchLocus(dest, intent);
  const hotelQuery = bathFocus
    ? `best clean hotels in ${stayLocus} with good bathrooms reviews cleanliness`
    : `best hotels to stay in ${stayLocus} reviews price`;

  // ---- PHASE 1: run ALL discovery+crawl tracks in parallel ----
  emit({ agent: "scout", phase: "working", status: `Mapping ${dest}` });
  emit({ agent: "pillow", phase: "working", status: "Comparing stays" });
  emit({ agent: "foodie", phase: "working", status: "Scouting food" });
  emit({ agent: "gatekeeper", phase: "working", status: "Checking permits & documents" });

  const [overviewPages, placePages, hotelPages, foodPages, permitPages, experiencePages] = await Promise.all([
    discoverAndCrawl(`${dest} travel guide things to do overview best time`, 5),
    discoverAndCrawl(`top attractions and places to visit in ${dest} itinerary`, 7),
    discoverAndCrawl(hotelQuery, 6),
    discoverAndCrawl(`best restaurants and local food in ${dest} where to eat`, 4),
    discoverAndCrawl(`permits visa documents required to visit ${dest} entry requirements`, 3),
    discoverAndCrawl(`things to do in ${dest} tickets price paragliding safari water sports adventure activities tours`, 5),
  ]);

  // ---- PHASE 2: run ALL extractions in parallel ----
  const [overview, extractedPlaces0, extractedHotels, extractedFood, extractedPermits, extractedExperiences] = await Promise.all([
    extractOverview(dest, overviewPages, signal).catch(() => ({} as Awaited<ReturnType<typeof extractOverview>>)),
    extractPlaces(dest, [...overviewPages, ...placePages], signal).catch((e) => {
      console.error("[investigate] extractPlaces failed:", e instanceof Error ? e.message : e);
      return [];
    }),
    extractHotels(dest, intent.priorities, hotelPages, signal).catch(() => []),
    extractFood(dest, foodPages, signal).catch(() => []),
    extractPermits(dest, permitPages, signal).catch(() => []),
    extractExperiences(dest, [...experiencePages, ...placePages], signal).catch(() => []),
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
    // scenery-focused hero query avoids flags/maps for country-level destinations
    fetchWikiImages(`${dest} landscape scenery`, "landscape", 2, signal).catch(() => []),
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
    // Prefer crawled hotel photos; backfill with area/destination imagery so
    // galleries are never bare. Landscape context is honestly the destination.
    const crawled = hotelImages.slice(i * 3, i * 3 + 4);
    const backfill = crawled.length < 3 ? wikiPlaceImages.flat().slice(i, i + 3) : [];
    const combined = [...crawled, ...backfill];
    const seen = new Set<string>();
    const imgs = combined.filter((im) => (seen.has(im.url) ? false : (seen.add(im.url), true))).slice(0, 5);
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

  // ---- Experiences (bookable things to do, with prices) ----
  emit({ agent: "daydreamer", phase: "working", status: "Finding things to do" });
  const expSourceIds = uniq(experiencePages.map((p) => sourceIdFor(p.finalUrl || p.url))).slice(0, 3);
  // Fetch photos of the ACTIVITY TYPE (not the destination) so cards aren't
  // mismatched. Empty result → UI shows a clean category card, never a wrong photo.
  const expWiki = await mapLimited(extractedExperiences, 4, (e) =>
    fetchWikiImages(activityImageQuery(e.name, e.category), "attraction", 1, signal).catch(() => [])
  );
  const experiences: Experience[] = extractedExperiences.map((e, i) => ({
    id: `exp_${i}`,
    name: e.name,
    category: e.category ?? "tour",
    blurb: e.blurb || `A popular thing to do in ${dest}.`,
    description: e.whyRecommended,
    price: saneExperiencePrice(e.price),
    priceNote: e.price ? e.priceNote : undefined,
    perPerson: e.perPerson ?? true,
    durationHours: e.durationHours,
    difficulty: e.difficulty,
    familyFriendly: e.familyFriendly,
    minAge: e.minAge,
    location: e.location ?? dest,
    images: expWiki[i] ?? [],
    whyRecommended: e.whyRecommended,
    sourceIds: expSourceIds,
    estimated: !e.price,
    confidence: e.price ? 0.7 : 0.5,
  }));
  emit({ agent: "daydreamer", phase: "done", status: "Things to do found", metric: `${experiences.length}` });

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
    experiences,
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

// Broad destinations (countries / large regions) need the stay search anchored
// to a real city, else "hotels in France" returns nothing usable.
const BROAD_DESTINATIONS = /^(india|france|italy|spain|japan|thailand|indonesia|usa|united states|america|germany|switzerland|nepal|bhutan|sri lanka|vietnam|greece|portugal|australia|canada|brazil|egypt|morocco|turkey|uk|england|scotland|europe|rajasthan|kerala|himachal|himachal pradesh|uttarakhand|karnataka|goa|ladakh|kashmir|northeast india|south india|north india)$/i;

function staySearchLocus(dest: string, intent: Intent): string {
  void intent;
  if (BROAD_DESTINATIONS.test(dest.trim())) {
    return `the most popular tourist city in ${dest}`;
  }
  return dest;
}

// Map an experience to a search term for a RELEVANT activity photo (generic
// stock of the activity type), not the destination — avoids mismatched images.
const ACTIVITY_KEYWORDS: { test: RegExp; q: string }[] = [
  { test: /paraglid/i, q: "paragliding" },
  { test: /zip.?lin/i, q: "zipline" },
  { test: /raft/i, q: "white water rafting" },
  { test: /scuba|dive|snorkel/i, q: "scuba diving underwater" },
  { test: /balloon/i, q: "hot air balloon" },
  { test: /go.?kart/i, q: "go kart racing" },
  { test: /bungee/i, q: "bungee jumping" },
  { test: /paintball/i, q: "paintball" },
  { test: /laser tag/i, q: "laser tag arena" },
  { test: /zorbing/i, q: "zorbing ball" },
  { test: /rock climb|climbing/i, q: "rock climbing" },
  { test: /trek|hike|hiking/i, q: "mountain trekking hikers" },
  { test: /safari|wildlife|jungle/i, q: "wildlife safari jeep" },
  { test: /ski|snowboard/i, q: "skiing snow" },
  { test: /kayak/i, q: "kayaking" },
  { test: /surf/i, q: "surfing wave" },
  { test: /jet ?ski/i, q: "jet ski" },
  { test: /parasail/i, q: "parasailing beach" },
  { test: /yak|camel|elephant|horse ride/i, q: "animal ride tourism" },
  { test: /boat|cruise|ferry|houseboat/i, q: "boat cruise" },
  { test: /theme park|amusement|water park|disney|universal/i, q: "amusement park rides" },
  { test: /film city|studio/i, q: "film studio set" },
  { test: /cook|culinary|food tour|tasting/i, q: "food cooking class" },
  { test: /spa|wellness|yoga|massage/i, q: "spa wellness" },
  { test: /museum|gallery|heritage|temple|palace|fort/i, q: "heritage architecture" },
];

const CATEGORY_FALLBACK_Q: Record<string, string> = {
  theme_park: "amusement park",
  water: "water sports beach",
  adventure: "adventure sports outdoor",
  wildlife: "wildlife safari",
  tour: "sightseeing tour",
  cultural: "cultural heritage",
  wellness: "spa wellness",
  food_exp: "local food",
  nightlife: "city nightlife",
};

function activityImageQuery(name: string, category?: string): string {
  for (const k of ACTIVITY_KEYWORDS) if (k.test.test(name)) return k.q;
  return CATEGORY_FALLBACK_Q[category ?? "tour"] ?? "travel activity";
}

/** Guard experience prices; 0 = free (kept), tiny/huge = treat as unknown (0). */
function saneExperiencePrice(price: number | undefined): number {
  if (price == null) return 0;
  if (price === 0) return 0;
  if (price < 20 || price > 500000) return 0;
  return Math.round(price);
}

/** Guard against garbage prices (0, ratings, or values expressed in thousands). */
function sanePrice(price: number | undefined, tier?: string): number {
  if (price == null || price <= 0) return estimatePrice(tier);
  if (price < 80) return Math.round(price * 1000); // e.g. 23.6 -> 23,600 (thousands)
  // ₹80–₹1200/night is implausibly low for a real hotel → likely a misread
  // number or a truncated figure. Fall back to a tier estimate.
  if (price < 1200) return estimatePrice(tier);
  if (price > 150000) return estimatePrice(tier);
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
      if (seen.has(url) || isBadImage(url)) continue;
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
  // Drop noisy/garbage conflicts: price-like claims in mismatched currencies, or
  // claims that are basically just numbers (extraction artifacts).
  const clean = raw.filter((c) => {
    const both = `${c.claimA} ${c.claimB}`;
    const currencies = (both.match(/[$€£₹]/g) ?? []).map((s) => s);
    if (new Set(currencies).size > 1) return false; // mixed currencies → unreliable
    const isJustNumber = (s: string) => /^[\s$€£₹\d.,/-]+$/.test(s.trim());
    if (isJustNumber(c.claimA) || isJustNumber(c.claimB)) return false;
    if (c.claimA.trim().length < 8 || c.claimB.trim().length < 8) return false;
    return true;
  });
  return clean.map((c, i) => {
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

// Flights are honest, richer ESTIMATES until Amadeus (Tier 3) is wired.
// We model a plausible fare band, likely stops and duration for the sector.
function buildFlightEstimates(intent: Intent, gateway: string) {
  const origin = intent.originCity ?? "your city";
  const gwShort = gateway.split(/[(,]/)[0].trim();
  const base = intent.budgetTier === "premium" ? 8200 : intent.budgetTier === "economical" ? 4800 : 6400;
  const low = Math.round(base * 0.8);
  const high = Math.round(base * 1.45);
  // Domestic India sectors: usually 1 stop, ~4-6h with connection.
  const mk = (
    id: string,
    from: string,
    to: string,
    depart: string,
    arrive: string,
    duration: string,
    early: boolean,
    airline: string,
    fare: number
  ) => ({
    id,
    airline,
    flightNo: "est",
    from,
    to,
    depart,
    arrive,
    layover: "1 stop · via a metro hub",
    baggage: "15 kg check-in · 7 kg cabin",
    fare,
    sourceId: "src_estimate",
    earlyMorning: early,
    duration,
    stops: 1,
    stopDetail: "typically via Kolkata / Delhi",
    cabin: "Economy",
    refundable: false,
    fareLow: low,
    fareHigh: high,
    estimated: true,
    onTime: 82,
  });

  return [
    mk("flight_out_1", origin, gwShort, "06:10", "11:20", "5h 10m", true, "Low-cost carrier", low),
    mk("flight_out_2", origin, gwShort, "09:40", "14:35", "4h 55m", false, "Full-service carrier", base),
    mk("flight_ret_1", gwShort, origin, "14:10", "19:05", "4h 55m", false, "Full-service carrier", base),
    mk("flight_ret_2", gwShort, origin, "16:30", "21:40", "5h 10m", false, "Low-cost carrier", low),
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
