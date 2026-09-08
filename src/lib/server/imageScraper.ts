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

const UA = "Travelism/2.0 (travel research agent; contact travelism.app)";

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
 * 1. Wikipedia PageImages query
 */
async function scrapeWikipediaPageImage(query: string, signal?: AbortSignal): Promise<string | null> {
  const candidates = cleanQueryTerms(query);
  for (const q of candidates) {
    const u = new URL("https://en.wikipedia.org/w/api.php");
    u.searchParams.set("action", "query");
    u.searchParams.set("format", "json");
    u.searchParams.set("prop", "pageimages");
    u.searchParams.set("piprop", "original|thumbnail");
    u.searchParams.set("pithumbsize", "1200");
    u.searchParams.set("generator", "search");
    u.searchParams.set("gsrsearch", q);
    u.searchParams.set("gsrlimit", "1");
    u.searchParams.set("origin", "*");
    try {
      const res = await fetch(u.toString(), { headers: { "User-Agent": UA }, signal });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        query?: { pages?: Record<string, { original?: { source?: string }; thumbnail?: { source?: string } }> };
      };
      const pages = data.query?.pages;
      if (!pages) continue;
      const first = Object.values(pages)[0];
      const url = first?.original?.source ?? first?.thumbnail?.source ?? null;
      if (url && !isBadImage(url)) return url;
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

  const searchTerms = Array.from(
    new Set([
      `${cleanSubject} ${destClean}`.trim(),
      `${strippedSubject} ${destClean}`.trim(),
      cleanSubject,
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

  // 0. Google Custom Search (when configured)
  if (CAP.googleImages) {
    for (const term of searchTerms) {
      if (results.length >= limit) break;
      try {
        const googleUrls = await scrapeGoogleCustomSearchImages(term, limit - results.length, signal);
        addUrls(googleUrls, "Google Images");
      } catch {
        // continue
      }
    }
  }

  // 1. Wikipedia PageImages
  for (const term of searchTerms) {
    if (results.length >= limit) break;
    try {
      const wikiUrl = await scrapeWikipediaPageImage(term, signal);
      if (wikiUrl) addUrls([wikiUrl], "Wikipedia");
    } catch {
      // continue
    }
  }

  // 2. Wikimedia Commons
  if (results.length < limit) {
    for (const term of searchTerms) {
      if (results.length >= limit) break;
      try {
        const commons = await scrapeCommonsImages(term, limit - results.length, signal);
        addUrls(commons, "Wikimedia Commons");
      } catch {
        // continue
      }
    }
  }

  // 3. Tavily Live Web Search Images
  if (results.length < limit) {
    try {
      const tavilyUrls = await tavilySearchImages(`${cleanSubject} ${destClean} photo`, limit * 2, signal);
      addUrls(tavilyUrls, "Web Verified");
    } catch {
      // ignore
    }
  }

  // 4. DuckDuckGo Live Images
  if (results.length < limit) {
    try {
      const ddgUrls = await scrapeDuckDuckGoImages(`${cleanSubject} ${destClean}`, limit - results.length, signal);
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

