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

  const isExperienceOrTour = /\b(tour|cruise|walk|walking|excursion|experience|class|tasting|safari|crawl|ticket|tickets|pass|adventure|hike|rental)\b/i.test(subject);

  // 0. Google Custom Search & Google Places API (when configured)
  try {
    const [googleSearchUrls, googlePlaceUrls] = await Promise.all([
      CAP.googleImages
        ? Promise.all(searchTerms.slice(0, 2).map((term) => scrapeGoogleCustomSearchImages(term, limit, signal).catch(() => [])))
        : Promise.resolve([]),
      Promise.all(searchTerms.slice(0, 2).map((term) => scrapeGooglePlacesPhotos(term, limit, signal).catch(() => []))),
    ]);
    googleSearchUrls.flat().forEach((u) => addUrls([u], "Google Images"));
    googlePlaceUrls.flat().forEach((u) => addUrls([u], "Google Places"));
  } catch {
    // continue
  }

  // If this is a commercial tour/activity, query DuckDuckGo & Tavily FIRST to get genuine tour photos
  if (isExperienceOrTour && results.length < limit) {
    try {
      const [ddgUrls, tavilyUrls] = await Promise.all([
        scrapeDuckDuckGoImages(`${cleanSubject} ${destClean} travel`, limit - results.length, signal).catch(() => []),
        tavilySearchImages(`${cleanSubject} ${destClean} tour photo`, limit * 2, signal).catch(() => []),
      ]);
      addUrls(ddgUrls, "Web Search");
      addUrls(tavilyUrls, "Web Verified");
    } catch {
      // continue
    }
  }

  // 1 & 2. Wikipedia PageImages & Wikimedia Commons
  if (results.length < limit) {
    try {
      const [wikiResults, commonsResults] = await Promise.all([
        Promise.all(searchTerms.slice(0, 2).map((term) => scrapeWikipediaPageImage(term, signal).catch(() => null))),
        Promise.all(searchTerms.slice(0, 2).map((term) => scrapeCommonsImages(term, limit, signal).catch(() => []))),
      ]);
      wikiResults.forEach((u) => { if (u) addUrls([u], "Wikipedia"); });
      commonsResults.flat().forEach((u) => addUrls([u], "Wikimedia Commons"));
    } catch {
      // continue
    }
  }

  // 3 & 4. Tavily & DuckDuckGo Fallback for remaining slots
  if (results.length < limit) {
    try {
      const [tavilyUrls, ddgUrls] = await Promise.all([
        tavilySearchImages(`${cleanSubject} ${destClean} photo`, limit * 2, signal).catch(() => []),
        scrapeDuckDuckGoImages(`${cleanSubject} ${destClean}`, limit - results.length, signal).catch(() => []),
      ]);
      addUrls(tavilyUrls, "Web Verified");
      addUrls(ddgUrls, "Web Search");
    } catch {
      // ignore
    }
  }

  return results;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

