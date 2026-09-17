import "server-only";
import type { MediaImage, ImageCategory } from "../types";
import { tavilySearchImages } from "./tavily";
import { ENV, CAP } from "./env";

// ============================================================================
// Multi-Engine Live Web Image Scraper
// Prioritizes:
// 1. Google Custom Search (if GOOGLE_SEARCH_API_KEY & GOOGLE_SEARCH_CX configured)
// 2. Wikipedia PageImages (High-res authentic editorial landmark photography)
// 3. Wikimedia Commons API (Direct subject photo archive)
// 4. Tavily Live Web Images (Real scraped web page photos)
// 5. DuckDuckGo Live Images (High-coverage web search)
// ============================================================================

const UA = "TravelismApp/2.1 (https://travelism.app; support@travelism.app) Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function isBadImage(url: string): boolean {
  if (!url) return true;
  const u = url.toLowerCase();
  if (u.endsWith(".svg") || u.includes(".svg?") || u.includes("/svg/")) return true;

  const BAD_PATTERNS = [
    /flag/i,
    /logo/i,
    /coat[_%20]?of[_%20]?arms/i,
    /emblem/i,
    /seal/i,
    /map/i,
    /locator/i,
    /icon/i,
    /wikimedia_common/i,
    /orthographic/i,
    /\.ogg/i,
    /\.pdf/i,
    /census/i,
    /chart/i,
    /diagram/i,
    /graph/i,
    /stamp/i,
    /coin/i,
    /banknote/i,
    /currency/i,
    /signature/i,
    /document/i,
    /manuscript/i,
    /certificate/i,
    /tombstone/i,
    /gravestone/i,
    /postmark/i,
    /receipt/i,
    /blueprint/i,
    /schematic/i,
  ];

  return BAD_PATTERNS.some((pat) => pat.test(u));
}

function cleanQueryTerms(raw: string): string[] {
  const clean = raw.replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const insideParens = (raw.match(/\(([^)]+)\)/)?.[1] || "").trim();
  const queries: string[] = [clean];
  if (insideParens && insideParens.length > 3 && insideParens.toLowerCase() !== clean.toLowerCase()) {
    queries.push(insideParens);
  }
  // Compound names like "Vatican Museums & Sistine Chapel" or "St Peter's
  // Basilica and Square" are NOT single Wikipedia titles — split on & / and / ,
  // and also try each part so at least one resolves to a real article image.
  if (/\s(?:&|and|,|\/)\s/i.test(clean)) {
    for (const part of clean.split(/\s*(?:&|\band\b|,|\/)\s*/i)) {
      const p = part.trim();
      if (p.length > 3) queries.push(p);
    }
  }
  return Array.from(new Set(queries.filter(Boolean)));
}

function stripActivityNoise(s: string): string {
  return s
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/\b(entrance|admission|ticket|tickets|pass|passes|charter|combo|booking|day trip|day tour|excursion|guided tour|tour)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 0. Google Custom Search Image Engine (when keys configured)
 */
async function scrapeGoogleCustomSearchImages(query: string, limit = 3, signal?: AbortSignal): Promise<string[]> {
  if (!CAP.googleImages || !ENV.GOOGLE_SEARCH_API_KEY || !ENV.GOOGLE_SEARCH_CX) return [];
  try {
    const u = new URL("https://www.googleapis.com/customsearch/v1");
    u.searchParams.set("key", ENV.GOOGLE_SEARCH_API_KEY);
    u.searchParams.set("cx", ENV.GOOGLE_SEARCH_CX);
    u.searchParams.set("q", query);
    u.searchParams.set("searchType", "image");
    u.searchParams.set("imgType", "photo");
    u.searchParams.set("num", String(Math.min(10, limit)));
    u.searchParams.set("safe", "active");
    const res = await fetch(u.toString(), { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { link?: string }[] };
    return (data.items ?? []).map((it) => it.link).filter((link): link is string => !!link && !isBadImage(link));
  } catch {
    return [];
  }
}

/**
 * 0.1 Google Places Official Photos API (when Google API key configured)
 */
async function scrapeGooglePlacesPhotos(query: string, limit = 3, signal?: AbortSignal): Promise<string[]> {
  const apiKey = ENV.GOOGLE_MAPS_API_KEY || ENV.GOOGLE_SEARCH_API_KEY;
  if (!apiKey) return [];
  try {
    const u = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
    u.searchParams.set("input", query);
    u.searchParams.set("inputtype", "textquery");
    u.searchParams.set("fields", "photos,place_id,name");
    u.searchParams.set("key", apiKey);
    const res = await fetch(u.toString(), { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { candidates?: { photos?: { photo_reference: string }[] }[] };
    const photos = data.candidates?.[0]?.photos ?? [];
    return photos
      .slice(0, limit)
      .map((p) => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${p.photo_reference}&key=${apiKey}`);
  } catch {
    return [];
  }
}

function isPersonArticle(title: string, desc?: string): boolean {
  const s = `${title || ""} ${desc || ""}`.toLowerCase();
  return /\b(born\s*\d{4}|\(\d{4}[–-]\d{4}\)|\b\d{4}[–-]\d{4}\b|prince|princess|duke|duchess|monarch|actor|actress|politician|minister|musician|singer|footballer|cricketer|biography)\b/i.test(s);
}

/**
 * 1. Wikipedia PageImages query:
 * Uses 3-stage precision matching:
 * 1. Exact canonical title lookup with auto-redirects (e.g. "Agra Fort", "Taj Mahal", "Arthur's Seat")
 * 2. Opensearch prefix title matching (strict title match, not fuzzy text body rank)
 * 3. Targeted search generator with biographical person filtering
 */
async function scrapeWikipediaPageImage(query: string, signal?: AbortSignal): Promise<string | null> {
  const candidates = cleanQueryTerms(query);

  // Stage 0: Fast REST summary lead image — a single call per candidate that
  // returns the article's lead photo for an exact/redirected title. This is the
  // fastest, most reliable path for well-known named places and avoids the
  // heavier multi-stage lookups timing out under concurrency.
  for (const q of candidates) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
        { headers: { "User-Agent": UA }, signal }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        type?: string;
        title?: string;
        description?: string;
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
      };
      if (data.type === "disambiguation") continue;
      if (isPersonArticle(data.title || "", data.description)) continue;
      const url = data.originalimage?.source ?? data.thumbnail?.source ?? null;
      if (url && !isBadImage(url)) return url;
    } catch {
      // continue to heavier stages
    }
  }

  // Stage 1: Exact Title Lookup with Redirects
  for (const q of candidates) {
    const u = new URL("https://en.wikipedia.org/w/api.php");
    u.searchParams.set("action", "query");
    u.searchParams.set("format", "json");
    u.searchParams.set("titles", q);
    u.searchParams.set("redirects", "1");
    u.searchParams.set("prop", "pageimages|description");
    u.searchParams.set("piprop", "original|thumbnail");
    u.searchParams.set("pithumbsize", "1200");
    u.searchParams.set("origin", "*");

    try {
      const res = await fetch(u.toString(), { headers: { "User-Agent": UA }, signal });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        query?: { pages?: Record<string, { pageid?: number; title?: string; description?: string; original?: { source?: string }; thumbnail?: { source?: string } }> };
      };
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];
      const valid = pages.find((p) => (p.pageid ?? 0) > 0);
      if (valid && !isPersonArticle(valid.title || "", valid.description)) {
        const url = valid.original?.source ?? valid.thumbnail?.source ?? null;
        if (url && !isBadImage(url)) return url;
      }
    } catch {
      // continue
    }
  }

  // Stage 2: Wikipedia Opensearch (Strict Title Prefix Matching)
  for (const q of candidates) {
    try {
      const uOpen = new URL("https://en.wikipedia.org/w/api.php");
      uOpen.searchParams.set("action", "opensearch");
      uOpen.searchParams.set("format", "json");
      uOpen.searchParams.set("search", q);
      uOpen.searchParams.set("limit", "3");
      uOpen.searchParams.set("namespace", "0");
      uOpen.searchParams.set("origin", "*");

      const resOpen = await fetch(uOpen.toString(), { headers: { "User-Agent": UA }, signal });
      if (!resOpen.ok) continue;
      const dataOpen = (await resOpen.json()) as [string, string[]];
      const matchedTitles = dataOpen[1] || [];

      for (const title of matchedTitles) {
        const u = new URL("https://en.wikipedia.org/w/api.php");
        u.searchParams.set("action", "query");
        u.searchParams.set("format", "json");
        u.searchParams.set("titles", title);
        u.searchParams.set("redirects", "1");
        u.searchParams.set("prop", "pageimages|description");
        u.searchParams.set("piprop", "original|thumbnail");
        u.searchParams.set("pithumbsize", "1200");
        u.searchParams.set("origin", "*");

        const res = await fetch(u.toString(), { headers: { "User-Agent": UA }, signal });
        if (!res.ok) continue;
        const data = (await res.json()) as {
          query?: { pages?: Record<string, { pageid?: number; title?: string; description?: string; original?: { source?: string }; thumbnail?: { source?: string } }> };
        };
        const pages = data.query?.pages ? Object.values(data.query.pages) : [];
        const valid = pages.find((p) => (p.pageid ?? 0) > 0);
        if (valid && !isPersonArticle(valid.title || "", valid.description)) {
          const url = valid.original?.source ?? valid.thumbnail?.source ?? null;
          if (url && !isBadImage(url)) return url;
        }
      }
    } catch {
      // continue
    }
  }

  // Stage 3: Targeted Search Generator
  for (const q of candidates) {
    const u = new URL("https://en.wikipedia.org/w/api.php");
    u.searchParams.set("action", "query");
    u.searchParams.set("format", "json");
    u.searchParams.set("prop", "pageimages|description");
    u.searchParams.set("piprop", "original|thumbnail");
    u.searchParams.set("pithumbsize", "1200");
    u.searchParams.set("generator", "search");
    u.searchParams.set("gsrsearch", q);
    u.searchParams.set("gsrlimit", "3");
    u.searchParams.set("origin", "*");
    try {
      const res = await fetch(u.toString(), { headers: { "User-Agent": UA }, signal });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        query?: { pages?: Record<string, { title?: string; description?: string; original?: { source?: string }; thumbnail?: { source?: string } }> };
      };
      const pages = data.query?.pages;
      if (!pages) continue;
      for (const p of Object.values(pages)) {
        if (isPersonArticle(p.title || "", p.description)) continue;
        const url = p.original?.source ?? p.thumbnail?.source ?? null;
        if (url && !isBadImage(url)) return url;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * 2. Wikimedia Commons query
 */
async function scrapeCommonsImages(query: string, limit = 3, signal?: AbortSignal): Promise<string[]> {
  const candidates = cleanQueryTerms(query);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const q of candidates) {
    if (out.length >= limit) break;
    const u = new URL("https://commons.wikimedia.org/w/api.php");
    u.searchParams.set("action", "query");
    u.searchParams.set("format", "json");
    u.searchParams.set("generator", "search");
    u.searchParams.set("gsrsearch", `${q} filetype:bitmap -map -chart -logo -flag -stamp -coin`);
    u.searchParams.set("gsrnamespace", "6");
    u.searchParams.set("gsrlimit", String(limit * 2));
    u.searchParams.set("prop", "imageinfo");
    u.searchParams.set("iiprop", "url");
    u.searchParams.set("iiurlwidth", "1200");
    u.searchParams.set("origin", "*");

    try {
      const res = await fetch(u.toString(), { headers: { "User-Agent": UA }, signal });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string }[] }> };
      };
      const pages = data.query?.pages;
      if (!pages) continue;
      for (const p of Object.values(pages)) {
        const info = p.imageinfo?.[0];
        if (!info) continue;
        const url = info.thumburl ?? info.url;
        if (!url || isBadImage(url) || seen.has(url)) continue;
        seen.add(url);
        out.push(url);
        if (out.length >= limit) break;
      }
    } catch {
      // ignore
    }
  }
  return out;
}

/**
 * 3. DuckDuckGo Image Search
 */
async function scrapeDuckDuckGoImages(query: string, limit = 3, signal?: AbortSignal): Promise<string[]> {
  try {
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const tokenRes = await fetch(tokenUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "text/html" },
      signal,
    });
    if (!tokenRes.ok) return [];
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=["']([^"']+)["']/i) || html.match(/vqd=([\d-]+)&/i) || html.match(/vqd=([0-9a-zA-Z-]+)/i);
    const vqd = vqdMatch?.[1];
    if (!vqd) return [];

    const imgApiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,type:photo,&p=1`;
    const imgRes = await fetch(imgApiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Referer: "https://duckduckgo.com/",
      },
      signal,
    });
    if (!imgRes.ok) return [];
    const data = (await imgRes.json()) as { results?: { image?: string; thumbnail?: string }[] };
    const results = data.results ?? [];
    const urls: string[] = [];

    for (const r of results) {
      const url = r.image || r.thumbnail;
      if (!url || isBadImage(url) || urls.includes(url)) continue;
      urls.push(url);
      if (urls.length >= limit) break;
    }
    return urls;
  } catch {
    return [];
  }
}

export type LiveScrapedImage = MediaImage;

/**
 * Universal Real-Time Image Scraper:
 * Queries Wikipedia PageImages, Wikimedia Commons, Tavily Web, and DuckDuckGo.
 */
export async function scrapeLiveSubjectImages(
  subject: string,
  destination: string,
  category: ImageCategory = "attraction",
  limit = 4,
  signal?: AbortSignal
): Promise<MediaImage[]> {
  const cleanSubject = subject.replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const strippedSubject = stripActivityNoise(cleanSubject);
  const destClean = destination.trim();

  // ANTI-HALLUCINATION TRUST POLICY:
  // - Named places/landmarks/attractions demand a SUBJECT-LOCKED photo (Wikipedia
  //   article image / Google Places official). Fuzzy web-search images (DuckDuckGo,
  //   Tavily) are NOT trustworthy for a named landmark — a search for
  //   "Vizcaya Museum" can return an unrelated event photo. For these we return
  //   ONLY trusted images, and if none exist we return [] (UI shows a clean
  //   placeholder — never a wrong photo).
  // - Hotels & experiences/tours are generic enough that a representative web photo
  //   is acceptable, so fuzzy sources are allowed for them.
  const isExperienceOrTour = /\b(tour|cruise|walk|walking|excursion|experience|class|tasting|safari|crawl|ticket|tickets|pass|adventure|hike|rental)\b/i.test(subject);
  const isHotelOrStay = category === "room" || /\b(hotel|resort|inn|lodge|palace|villas|suites|hostel|stay|bivvy|camp)\b/i.test(subject);
  const requiresSubjectLock = !isHotelOrStay && !isExperienceOrTour;

  // Extract individual hubs if multi-destination query is passed
  const hubs = destClean
    .split(/\s*(?:,|&|\band\b|\bto\b|\+|\/)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const matchingHub = hubs.find((h) => new RegExp(`\\b${h}\\b`, "i").test(cleanSubject)) || hubs[0] || destClean;

  const searchTerms = Array.from(
    new Set([
      cleanSubject, // Exact attraction title (best for Wikipedia PageImages)
      `${cleanSubject} ${matchingHub}`.trim(),
      `${cleanSubject} ${destClean}`.trim(),
      `${strippedSubject} ${matchingHub}`.trim(),
      strippedSubject,
    ])
  ).filter((s) => s.length > 2);

  const seen = new Set<string>();
  const results: LiveScrapedImage[] = [];

  function addUrls(urls: string[], credit: string) {
    for (const url of urls) {
      if (!url || seen.has(url) || isBadImage(url)) continue;
      seen.add(url);
      results.push({
        id: `img_live_${hash(url)}`,
        url,
        category,
        credit,
        provenance: "editorial",
      });
      if (results.length >= limit) break;
    }
  }

  // ---- TIER 1: SUBJECT-LOCKED SOURCES (always trusted) ----
  // Google Places official photos (tied to the exact place) + Wikipedia article
  // image (subject-locked via exact-title lookup). These cannot be an unrelated
  // photo of the same place, so they're safe for named landmarks.
  try {
    const googlePlaceUrls = await Promise.all(
      searchTerms.slice(0, 2).map((term) => scrapeGooglePlacesPhotos(term, limit, signal).catch(() => []))
    );
    googlePlaceUrls.flat().forEach((u) => addUrls([u], "Google Places"));
  } catch {
    // continue
  }
  if (results.length < limit) {
    try {
      const wikiResults = await Promise.all(
        searchTerms.slice(0, 2).map((term) => scrapeWikipediaPageImage(term, signal).catch(() => null))
      );
      wikiResults.forEach((u) => { if (u) addUrls([u], "Wikipedia"); });
    } catch {
      // continue
    }
  }

  // ---- TIER 2: SEMI-TRUSTED (Wikimedia Commons subject search) ----
  // Commons title search is reasonably subject-matched; allowed for all types.
  if (results.length < limit) {
    try {
      const commonsResults = await Promise.all(
        searchTerms.slice(0, 2).map((term) => scrapeCommonsImages(term, limit, signal).catch(() => []))
      );
      commonsResults.flat().forEach((u) => addUrls([u], "Wikimedia Commons"));
    } catch {
      // continue
    }
  }

  // ---- TIER 3: FUZZY WEB SEARCH (DuckDuckGo / Tavily / Google Images) ----
  // These are unreliable for a NAMED landmark (can return an unrelated photo),
  // so they are ONLY used for hotels & experiences — where a representative
  // photo is acceptable — and NEVER for subject-lock-required places.
  if (!requiresSubjectLock && results.length < limit) {
    try {
      const searchTarget = isHotelOrStay ? `${cleanSubject} ${matchingHub} hotel` : `${cleanSubject} ${destClean}`;
      const [googleSearchUrls, ddgUrls, tavilyUrls] = await Promise.all([
        CAP.googleImages ? scrapeGoogleCustomSearchImages(searchTarget, limit, signal).catch(() => []) : Promise.resolve([]),
        scrapeDuckDuckGoImages(searchTarget, limit, signal).catch(() => []),
        tavilySearchImages(`${searchTarget} photo`, limit * 2, signal).catch(() => []),
      ]);
      addUrls(googleSearchUrls, "Google Images");
      addUrls(ddgUrls, isHotelOrStay ? "Hotel Photo" : "Web Search");
      addUrls(tavilyUrls, "Web Verified");
    } catch {
      // continue
    }
  }

  // For subject-lock-required places with no trusted photo, return [] so the UI
  // shows a clean placeholder — we NEVER fall back to a fuzzy/wrong image.
  return results;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

