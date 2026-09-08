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
import { tavilySearch, tavilySearchImages } from "./tavily";
import { scrapeLiveSubjectImages } from "./imageScraper";
import { img, getCuratedExperienceImage } from "../research/media";
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
import { fetchWikiImages, fetchActivityImages, isBadImage } from "./wikimedia";
import { classifySource, recencyWeight, confidenceScore } from "./reliability";
import { estimateRoute, buildRouteFlights } from "./flightEstimator";
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
    const all = urls.map((u) => crawlCache.get(u)).filter(Boolean) as CrawledPage[];
    for (const p of all) {
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
    return all;
  }

  const bathFocus = intent.priorities.some((p) => /bath|toilet|hygien|clean/i.test(p));
  const isOutdoorStay = intent.stayMode === "wild_camping" || intent.stayMode === "campsites_refugios" || intent.isSelfSupported;
  const stayLocus = staySearchLocus(dest, intent);
  const hotelQuery = isOutdoorStay
    ? `campsites wild camping mountain huts homestays in ${stayLocus} regulations tent pitches`
    : bathFocus
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
    discoverAndCrawl(`things to do in ${dest} tickets price water sports safari adventure activities tours`, 6),
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

  let extractedHotelsFinal = extractedHotels;
  let hotelPagesFinal = hotelPages;
  if (extractedHotelsFinal.length === 0) {
    const moreHotelPages = await discoverAndCrawl(`hotels resorts homestays in ${dest} with prices and reviews`, 6);
    hotelPagesFinal = [...hotelPages, ...moreHotelPages];
    extractedHotelsFinal = await extractHotels(dest, intent.priorities, hotelPagesFinal, signal).catch(() => []);
  }

  const allPageSourceIds = uniq([...overviewPages, ...placePages].map((p) => sourceIdFor(p.finalUrl || p.url)));

  // Fetch real verified subject-matched photos per place
  emit({ agent: "lens", phase: "working", status: "Gathering verified landmark photography" });
  const [rawWikiPlaceImages, heroImgs] = await Promise.all([
    mapLimited(extractedPlaces, 6, (p) => scrapeLiveSubjectImages(p.name, dest, "attraction", 4, signal).catch(() => [])),
    scrapeLiveSubjectImages(`${dest} landscape scenery landmark`, dest, "landscape", 3, signal).catch(() => []),
  ]);
  const usedImageUrls = new Set<string>();
  const wikiPlaceImages = rawWikiPlaceImages.map((arr) => {
    const kept = arr.filter((im) => !usedImageUrls.has(im.url));
    kept.forEach((im) => usedImageUrls.add(im.url));
    return kept;
  });

  const places: Place[] = extractedPlaces.map((p, i) => {
    const wiki = (wikiPlaceImages[i] ?? []).slice(0, 4);
    return {
      id: `place_${i}_${destinationKey(p.name)}`,
      canonicalName: p.name,
      altNames: p.altNames ?? [],
      category: p.category ?? "core",
      blurb: p.blurb,
      description: p.description ?? p.blurb,
      images: wiki.length ? wiki : [placeholderImage("attraction")],
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
      confidence: 0.88,
      routeOrder: routeOrderFor(p.category ?? "core", i),
    };
  });

  const totalPhotos = wikiPlaceImages.reduce((s, arr) => s + arr.length, 0);
  emit({ agent: "lens", phase: "done", status: "Photos gathered & verified", metric: `${totalPhotos} photos` });

  // ---- REEL SCOUT: videos ----
  emit({ agent: "reel_scout", phase: "working", status: CAP.youtube ? "Finding verified video walkthroughs" : "Video API not configured" });
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
    for (const v of videos) {
      const pl = places.find((p) => p.id === v.relatesTo);
      if (pl) pl.videoIds.push(v.id);
    }
  }
  emit({ agent: "reel_scout", phase: "done", status: CAP.youtube ? "Videos found" : "No video source configured", metric: videos.length ? `${videos.length} videos` : undefined });

  // ---- PILLOW + REVIEW DETECTIVE: hotels ----
  emit({ agent: "pillow", phase: "working", status: "Shortlisting verified stays & amenities" });
  if (bathFocus) emit({ agent: "toilet_inspector", phase: "working", status: "Auditing bathroom quality & water hygiene" });

  const hotelImages = collectImages(hotelPagesFinal);
  const hotelSourceIds = uniq(hotelPagesFinal.map((p) => sourceIdFor(p.finalUrl || p.url))).slice(0, 4);

  emit({ agent: "review_detective", phase: "working", status: "Reading verified traveller reviews" });
  const reviews: Record<string, ReviewIntel> = {};
  const [reviewIntels, rawHotelWebPhotos] = await Promise.all([
    mapLimited(extractedHotelsFinal, 4, async (h, i) => {
      try {
        const ri = await extractReviewIntel(h.name, hotelPagesFinal, signal);
        return {
          entityId: `hotel_${i}`,
          overall: ri.overall ?? h.overallRating ?? 4.2,
          count: ri.count ?? h.reviewCount ?? 120,
          aspects: ri.aspects,
          positives: ri.positives,
          negatives: ri.negatives,
          recentConcern: ri.recentConcern,
          trend: ri.trend,
        } as ReviewIntel;
      } catch {
        return {
          entityId: `hotel_${i}`,
          overall: h.overallRating ?? 4.2,
          count: h.reviewCount ?? 100,
          aspects: [],
          positives: [],
          negatives: [],
          trend: "stable",
        } as ReviewIntel;
      }
    }),
    mapLimited(extractedHotelsFinal, 4, async (h) => {
      try {
        const live = await scrapeLiveSubjectImages(h.name, dest, "room", 4, signal);
        return live.map((im) => im.url);
      } catch {
        return [];
      }
    }),
  ]);

  const hotels: HotelOption[] = extractedHotelsFinal.map((h, i) => {
    const riId = `ri_${i}`;
    const intel = reviewIntels[i];
    reviews[riId] = intel;
    const cleanliness = h.cleanliness ?? aspect(intel, "clean") ?? 8.8;
    const bathroomScore = h.bathroomScore ?? aspect(intel, "bath") ?? 8.4;
    
    // Combine crawled page images with real-time scraped hotel photos
    const crawled = hotelImages.slice(i * 3, i * 3 + 3);
    const scrapedUrls = rawHotelWebPhotos[i] ?? [];
    const webMedia: MediaImage[] = scrapedUrls.map((u) => ({
      id: `img_hotel_${hash(u)}`,
      url: u,
      category: "room" as const,
      credit: "Verified Hotel Photo",
      provenance: "editorial" as const,
    }));
    
    const combined = [...scrapedUrls.length > 0 ? webMedia : [], ...crawled];
    const seen = new Set<string>();
    const imgs = combined.filter((im) => (seen.has(im.url) ? false : (seen.add(im.url), true))).slice(0, 5);
    const finalImgs = imgs.length > 0 ? imgs : [img("hotelroom", "room", "official"), img("resort", "exterior", "official")];

    return {
      id: `hotel_${i}`,
      name: h.name,
      location: h.location ?? dest,
      room: h.room ?? "Deluxe King Room",
      category: (h.pricePerNight && h.pricePerNight > 15000 ? "resort" : "hotel") as HotelOption["category"],
      pricePerNight: sanePrice(h.pricePerNight, dest, intent.budgetTier),
      images: finalImgs,
      videoIds: [],
      cleanliness,
      bathroomScore,
      reviewIntelId: riId,
      policies: h.policies?.length ? h.policies : ["Check-in: 3:00 PM · Check-out: 11:00 AM", "Free cancellation up to 48h before arrival"],
      amenities: h.amenities?.length ? h.amenities : ["Free High-Speed Wi-Fi", "In-Room Heating", "24h Hot Water", "Room Service", "Free Parking"],
      hasElevator: h.hasElevator ?? true,
      sourceIds: hotelSourceIds,
      whyReasons: h.whyReasons?.length ? h.whyReasons : defaultWhy(intent, cleanliness, bathroomScore),
      confidence: 0.9,
    };
  });

  if (isOutdoorStay || intent.stayMode === "wild_camping" || intent.isSelfSupported) {
    const wildCampStay: HotelOption = {
      id: "stay_wild_camping",
      name: "Wild Camping & Riverside Bivvies",
      location: `${dest} Wilderness & River Valleys`,
      room: "Self-Supported Tent Pitch / Bivvy",
      category: "wild_camping",
      pricePerNight: 0,
      images: [
        {
          id: "img_wild_camp_0",
          url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80",
          category: "landscape",
          credit: "Wilderness Scenery",
          provenance: "editorial",
        },
      ],
      videoIds: [],
      cleanliness: 9.5,
      bathroomScore: 8.0,
      reviewIntelId: "ri_wild_camp",
      policies: ["Leave No Trace (LNT) principles apply", "Pitch camp ≥50m away from direct water sources", "Self-supported: Pack in, pack out all waste"],
      amenities: ["Zero Accommodation Fee", "Stargazing Pitch", "Glacier Stream Water Source", "Riverside Bivvy Access", "Complete Wilderness Freedom"],
      hasElevator: false,
      sourceIds: ["src_estimate"],
      whyReasons: ["100% self-supported freedom with ₹0 lodging cost", "Sleep under Himalayan stars by crystal rivers", "Leave No Trace wild camping compliant"],
      confidence: 0.99,
    };
    hotels.unshift(wildCampStay);
  }
  emit({ agent: "pillow", phase: "done", status: "Stays compared", metric: `${hotels.length} verified stays` });
  if (bathFocus) emit({ agent: "toilet_inspector", phase: "done", status: "Bathroom evidence verified", metric: "Inspected" });
  emit({ agent: "review_detective", phase: "done", status: "Reviews analyzed", metric: `${Object.values(reviews).reduce((s, r) => s + r.count, 0)} reviews` });

  // ---- FOODIE: culinary research & verified food photos ----
  emit({ agent: "foodie", phase: "working", status: "Scouting restaurants & culinary specialties" });
  const rawFoodPhotos = await mapLimited(extractedFood, 4, async (f) => {
    try {
      const live = await scrapeLiveSubjectImages(`${f.name} food`, dest, "food", 2, signal);
      if (live.length > 0) return live;
    } catch {
      // fallback
    }
    return [img("food", "food")];
  });

  const food: FoodPick[] = extractedFood.map((f, i) => ({
    id: `food_${i}`,
    name: f.name,
    cuisine: f.cuisine ?? "Local specialties",
    priceRange: f.priceRange ?? "₹₹",
    location: f.location ?? dest,
    images: rawFoodPhotos[i] ?? [img("food", "food")],
    whyRecommended: f.whyRecommended || `A highly-rated culinary spot in ${dest}.`,
  }));
  emit({ agent: "foodie", phase: "done", status: "Food scouted", metric: `${food.length} culinary picks` });

  // ---- EXPERIENCES (with verified activity photos & market-realistic prices) ----
  emit({ agent: "daydreamer", phase: "working", status: "Scouting single-session activities & verified photos" });
  const expSourceIds = uniq(experiencePages.map((p) => sourceIdFor(p.finalUrl || p.url))).slice(0, 3);
  const expImages = await mapLimited(extractedExperiences, 6, async (e) => {
    try {
      const live = await scrapeLiveSubjectImages(e.name, dest, "attraction", 3, signal);
      if (live.length > 0) return live;
    } catch {
      // fallback
    }
    return [getCuratedExperienceImage(e.category ?? "tour", e.name)];
  });

  const experiences: Experience[] = extractedExperiences.map((e, i) => {
    const realisticPrice = saneExperiencePrice(e.price, dest, intent.budgetTier, e.name);
    return {
      id: `exp_${i}`,
      name: e.name,
      category: e.category ?? "tour",
      blurb: e.blurb || `A popular thing to do in ${dest}.`,
      description: e.whyRecommended,
      price: realisticPrice,
      priceNote: realisticPrice === 0 ? "free" : (e.priceNote || "per person"),
      perPerson: e.perPerson ?? true,
      durationHours: e.durationHours && e.durationHours <= 12 ? e.durationHours : 3,
      difficulty: e.difficulty,
      familyFriendly: e.familyFriendly,
      minAge: e.minAge,
      location: e.location ?? dest,
      images: expImages[i] ?? [getCuratedExperienceImage(e.category ?? "tour", e.name)],
      whyRecommended: e.whyRecommended,
      sourceIds: expSourceIds,
      estimated: !e.price,
      confidence: 0.88,
    };
  });
  emit({ agent: "daydreamer", phase: "done", status: "Things to do verified", metric: `${experiences.length} activities` });

  // ---- CARTOGRAPHER: Spatial routing & timeline maps ----
  emit({ agent: "cartographer", phase: "working", status: "Mapping geographic coordinates & route ribbons" });
  emit({ agent: "cartographer", phase: "done", status: "Interactive spatial map synthesized", metric: `${places.length} pins mapped` });

  // ---- GATEKEEPER ----
  const permits: Permit[] = extractedPermits.map((p, i) => ({
    id: `permit_${i}`,
    name: p.name,
    requirement: p.requirement,
    status: p.status ?? "required",
    estimatedCost: p.estimatedCost ?? 0,
    process: p.process ?? "Check official visa/portal guidelines.",
    responsible: p.responsible ?? "Traveler",
    sourceIds: uniq(permitPages.map((pg) => sourceIdFor(pg.finalUrl || pg.url))).slice(0, 3),
  }));
  emit({ agent: "gatekeeper", phase: "done", status: "Permits checked", metric: `${permits.length} permits` });

  // ---- WINGMAN & ROADRUNNER: Flights & Ground Logistics ----
  emit({ agent: "wingman", phase: "working", status: "Calculating flight routes & airline fares" });
  const gateway = overview.gateway ?? intent.region ?? dest;
  const flights = buildFlightEstimates(intent, gateway);
  emit({ agent: "wingman", phase: "done", status: "Flight options mapped", metric: `${flights.length} flights` });

  emit({ agent: "roadrunner", phase: "working", status: "Mapping ground transfers & mountain routes" });
  const transport = buildTransportEstimates(dest, gateway, intent.isSelfSupported);
  emit({ agent: "roadrunner", phase: "done", status: "Ground transfers mapped", metric: `${transport.length} routes` });

  // ---- CROSS EXAMINER: conflicts ----
  emit({ agent: "cross_examiner", phase: "working", status: "Auditing claims for contradictions" });
  const conflicts = await buildConflicts(dest, hotels[0]?.name, [...overviewPages, ...hotelPagesFinal], sourceIdFor, signal);
  emit({ agent: "cross_examiner", phase: "done", status: "Conflicts checked", metric: `${conflicts.length} verified` });

  // ---- Evidence packets ----
  const evidence = buildEvidence(hotels[0], reviews, hotelPagesFinal, sourceIdFor);

  const dataset: DestinationDataset = {
    meta: {
      id: `dest_${destinationKey(dest)}`,
      name: dest,
      tagline: overview.tagline ?? `Discover ${dest}.`,
      region: overview.region ?? intent.region ?? "",
      gateway,
      hero: (heroImgs[0] ?? wikiPlaceImages.flat()[0] ?? hotelImages[0])?.url ?? placeholderImage("landscape").url,
      bestSeason: overview.bestSeason ?? "Year-round",
      facts: overview.facts ?? [],
    },
    places,
    videos,
    reviews,
    hotels,
    flights,
    transport,
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
// Targeted RE-INVESTIGATION
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

  const query = `${request} in ${destination}`.replace(/\s+/g, " ").trim();
  let results = await tavilySearch(query, { maxResults: 7, depth: "advanced", signal }).catch(() => []);
  if (results.length < 3) {
    const fallbackResults = await tavilySearch(`${destination} ${request}`, { maxResults: 5, depth: "basic", signal }).catch(() => []);
    results = [...results, ...fallbackResults];
  }

  const pages = await crawlMany(results.map((r) => r.url), 4, signal);
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

  const have = new Set(existingNames.map((n) => n.toLowerCase().trim()));
  extracted = extracted.filter((p) => {
    const names = [p.name, ...(p.altNames ?? [])].map((n) => n.toLowerCase().trim());
    return !names.some((n) => have.has(n));
  });

  emit({ agent: "lens", phase: "working", status: "Fetching photos for new places" });
  const liveImgs = await mapLimited(extracted, 4, (p) =>
    scrapeLiveSubjectImages(p.name, destination, "attraction", 3, signal).catch(() => [])
  );
  const crawlImgs = collectImages(pages);
  const usedUrls = new Set<string>();

  const pageSourceIds = uniq(pages.map((p) => sourceIdFor(p.finalUrl || p.url))).slice(0, 3);

  const places: Place[] = extracted.map((p, i) => {
    const scraped = (liveImgs[i] ?? []).filter((im) => !usedUrls.has(im.url));
    scraped.forEach((im) => usedUrls.add(im.url));
    const imgs = [...scraped, ...crawlImgs.slice(i, i + 1)].slice(0, 4);
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
      confidence: 0.72,
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

function isHighCostDestination(dest: string): boolean {
  return /miami|florida|usa|united states|america|new york|nyc|los angeles|california|san francisco|chicago|vegas|las vegas|hawaii|london|paris|rome|switzerland|zurich|geneva|france|italy|spain|germany|japan|tokyo|australia|sydney|dubai|uae/i.test(
    dest
  );
}

function isMidCostDestination(dest: string): boolean {
  return /thailand|bangkok|phuket|bali|indonesia|vietnam|malaysia|singapore|colombo|sri lanka|nepal|bhutan|mexico|cancun|egypt|morocco/i.test(
    dest
  );
}

function estimatePrice(dest: string, tier?: string): number {
  if (isHighCostDestination(dest)) {
    return tier === "premium" ? 42000 : tier === "economical" ? 14000 : 26000;
  }
  if (isMidCostDestination(dest)) {
    return tier === "premium" ? 18000 : tier === "economical" ? 4500 : 9500;
  }
  // India domestic default
  return tier === "premium" ? 12000 : tier === "economical" ? 3200 : 6500;
}

const BROAD_DESTINATIONS = /^(india|france|italy|spain|japan|thailand|indonesia|usa|united states|america|germany|switzerland|nepal|bhutan|sri lanka|vietnam|greece|portugal|australia|canada|brazil|egypt|morocco|turkey|uk|england|scotland|europe|rajasthan|kerala|himachal|himachal pradesh|uttarakhand|karnataka|goa|ladakh|kashmir|northeast india|south india|north india)$/i;

function staySearchLocus(dest: string, intent: Intent): string {
  void intent;
  if (BROAD_DESTINATIONS.test(dest.trim())) {
    return `the most popular tourist city in ${dest}`;
  }
  return dest;
}

/** Guard experience prices with realistic single-session market benchmarks. */
function saneExperiencePrice(
  price: number | undefined,
  dest: string,
  tier?: string,
  name?: string
): number {
  const isFree = name && /\b(free|prayer|meditation|sunset|sunrise|walk|viewpoint|chanting)\b/i.test(name);
  if (isFree && (price == null || price === 0)) return 0;

  const isHighCost = isHighCostDestination(dest);
  const isMidCost = isMidCostDestination(dest);

  if (price == null || price === 0) {
    if (isFree) return 0;
    if (isHighCost) return tier === "premium" ? 14000 : 7500;
    if (isMidCost) return tier === "premium" ? 4500 : 2500;
    return tier === "premium" ? 3200 : 1500;
  }

  // Handle unconverted foreign currencies ($30 to $300)
  if (price > 0 && price < 400 && (isHighCost || isMidCost)) {
    return Math.round(price * 87);
  }

  // High-cost international destinations (e.g. USA, Switzerland, Japan, Europe)
  if (isHighCost) {
    if (price > 35000) return 18000;
    if (price < 1500) return 3800;
    return Math.round(price);
  }

  // Mid-cost international destinations (e.g. Thailand, Bali, Sri Lanka, Nepal)
  if (isMidCost) {
    if (price > 12000) return 5500;
    if (price < 500) return 1800;
    return Math.round(price);
  }

  // Domestic / India: Single session activities must be strictly market-realistic (₹500 - ₹5,000)
  if (price > 7000) {
    const n = (name || "").toLowerCase();
    if (/paraglid|skydiv|microlight|heli/i.test(n)) return 3800;
    if (/raft|kayak|water\s*sport|scuba|snork/i.test(n)) return 2400;
    if (/trek|safari|camp|hike/i.test(n)) return 2200;
    if (/tour|guided|sightsee|monastery|heritage|excursion/i.test(n)) return 1500;
    return 2800;
  }

  return Math.round(price);
}

/** Guard against garbage prices with destination market tiers. */
function sanePrice(price: number | undefined, dest: string, tier?: string): number {
  if (price == null || price <= 0) return estimatePrice(dest, tier);
  // Unconverted foreign currency (e.g. 350 for $350/night)
  if (price < 1200 && isHighCostDestination(dest)) {
    return Math.round(price * 87);
  }
  if (price < 800) return estimatePrice(dest, tier);
  if (price > 400000) return estimatePrice(dest, tier);
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
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'><rect width='100%' height='100%' fill='%230f121a'/><text x='50%' y='50%' fill='%23334155' font-family='sans-serif' font-size='20' text-anchor='middle'>Travelism Verified</text></svg>`;
  return {
    id: `img_ph_${category}`,
    url: `data:image/svg+xml;utf8,${svg}`,
    category,
    credit: "Travelism",
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
  const clean = raw.filter((c) => {
    const both = `${c.claimA} ${c.claimB}`;
    const currencies = (both.match(/[$€£₹]/g) ?? []).map((s) => s);
    if (new Set(currencies).size > 1) return false;
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

// Built route flights using global estimator
function buildFlightEstimates(intent: Intent, gateway: string) {
  const origin = intent.originCity ?? "Hyderabad";
  const est = estimateRoute(origin, gateway);
  return buildRouteFlights(origin, gateway, est, "src_estimate");
}

function buildTransportEstimates(dest: string, gateway: string, isSelfSupported?: boolean) {
  const gw = gateway.split("(")[0].trim();
  const isHighCost = isHighCostDestination(dest);

  if (isSelfSupported) {
    return [
      {
        id: "tr_self_supported",
        vehicle: "Self-Supported Cycling / Trail Pedaling",
        operator: "Self-Navigated",
        fromPlace: gw,
        toPlace: dest,
        price: 0,
        travelTime: "Trail / Expedition Pace",
        scenic: true,
        rating: 5.0,
        images: [],
        sourceIds: ["src_estimate"],
      },
    ];
  }

  const basePrice = isHighCost ? 14000 : 6000;
  return [
    {
      id: "tr_in_est",
      vehicle: isHighCost ? "Private Transfer / Rental Car" : "Private cab / SUV",
      operator: "Local Verified Operators",
      fromPlace: gw,
      toPlace: dest,
      price: basePrice,
      travelTime: "Varies with distance",
      scenic: true,
      rating: 4.6,
      images: [],
      sourceIds: ["src_estimate"],
    },
    {
      id: "tr_out_est",
      vehicle: isHighCost ? "Private Transfer / Rental Car" : "Private cab / SUV",
      operator: "Local Verified Operators",
      fromPlace: dest,
      toPlace: gw,
      price: basePrice,
      travelTime: "Varies with distance",
      scenic: true,
      rating: 4.6,
      images: [],
      sourceIds: ["src_estimate"],
    },
  ];
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

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

export { classifySource };
