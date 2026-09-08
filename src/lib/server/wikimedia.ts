import "server-only";
import type { MediaImage, ImageCategory } from "../types";
import { getCuratedExperienceImage } from "../research/media";
import { scrapeLiveSubjectImages } from "./imageScraper";
import { tavilySearchImages } from "./tavily";

// ============================================================================
// Multi-Tier Real-Time Web Image Scraper:
// 1. Wikipedia PageImages & Opensearch with query normalization
// 2. Wikimedia Commons API search
// 3. Tavily Real-Time Web Image Scraper (extracts authentic web page photos)
// 4. Strict junk filter (no coins, maps, charts, stamps, docs, diagrams)
// 5. Authentic topic-matched travel photography fallback
// ============================================================================

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const WIKI_API = "https://en.wikipedia.org/w/api.php";
const UA = "TravelismBot/1.0 (travel research; contact travelism.app)";

interface WikiImage {
  url: string;
  descriptionUrl: string;
  artist?: string;
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  return res.json();
}

/** Clean search queries by removing parenthetical aliases and noise */
export function cleanQuery(raw: string): string[] {
  const clean = raw.replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const insideParens = (raw.match(/\(([^)]+)\)/)?.[1] || "").trim();
  const queries: string[] = [clean];
  if (insideParens && insideParens.length > 3 && insideParens.toLowerCase() !== clean.toLowerCase()) {
    queries.push(insideParens);
  }
  return queries.filter(Boolean);
}

/** Best lead image for a subject via Wikipedia PageImages (original size or 1200px thumb). */
async function wikipediaLeadImage(query: string, signal?: AbortSignal): Promise<string | null> {
  const candidates = cleanQuery(query);

  for (const q of candidates) {
    const u = new URL(WIKI_API);
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
      const data = (await getJson(u.toString(), signal)) as {
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
 * Strict image validator: rejects flags, logos, maps, coats of arms, SVGs,
 * icons, coin scans, stamps, genealogical/census charts, historical documents,
 * signatures, gravestones, and non-photo media.
 */
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
    /microscope/i,
  ];

  return BAD_PATTERNS.some((pat) => pat.test(u));
}

/** Multiple Commons images for a subject. */
async function commonsImages(query: string, n: number, signal?: AbortSignal): Promise<WikiImage[]> {
  const candidates = cleanQuery(query);
  const out: WikiImage[] = [];
  const seen = new Set<string>();

  for (const q of candidates) {
    if (out.length >= n) break;
    const u = new URL(COMMONS_API);
    u.searchParams.set("action", "query");
    u.searchParams.set("format", "json");
    u.searchParams.set("generator", "search");
    u.searchParams.set("gsrsearch", `${q} filetype:bitmap -map -chart -logo -flag -stamp -coin`);
    u.searchParams.set("gsrnamespace", "6"); // File namespace
    u.searchParams.set("gsrlimit", String(n * 2));
    u.searchParams.set("prop", "imageinfo");
    u.searchParams.set("iiprop", "url|extmetadata");
    u.searchParams.set("iiurlwidth", "1200");
    u.searchParams.set("origin", "*");
    try {
      const data = (await getJson(u.toString(), signal)) as {
        query?: {
          pages?: Record<
            string,
            { imageinfo?: { thumburl?: string; url?: string; descriptionurl?: string; extmetadata?: { Artist?: { value?: string } } }[] }
          >;
        };
      };
      const pages = data.query?.pages;
      if (!pages) continue;
      for (const p of Object.values(pages)) {
        const info = p.imageinfo?.[0];
        if (!info) continue;
        const url = info.thumburl ?? info.url;
        if (!url || isBadImage(url) || seen.has(url)) continue;
        seen.add(url);
        out.push({
          url,
          descriptionUrl: info.descriptionurl ?? url,
          artist: stripHtml(info.extmetadata?.Artist?.value),
        });
        if (out.length >= n) break;
      }
    } catch {
      // ignore
    }
  }
  return out;
}

/**
 * Gather up to `n` real verified images for a subject:
 * 1. Wikipedia Lead Photo
 * 2. Wikimedia Commons
 * 3. Real-Time Web Scraped Images (Tavily search images)
 * 4. Curated topic-accurate fallback
 */
export async function fetchWikiImages(
  subject: string,
  category: ImageCategory,
  n = 3,
  signal?: AbortSignal
): Promise<MediaImage[]> {
  try {
    const live = await scrapeLiveSubjectImages(subject, "", category, n, signal);
    if (live.length > 0) return live;
  } catch {
    // ignore
  }

  const fallback = getCuratedExperienceImage(category, subject);
  return [fallback];
}

/** Fetch verified images for an activity or bookable experience */
export async function fetchActivityImages(
  name: string,
  category: string,
  destination: string,
  signal?: AbortSignal
): Promise<MediaImage[]> {
  try {
    const live = await scrapeLiveSubjectImages(name, destination, "attraction", 2, signal);
    if (live.length > 0) return live;
  } catch {
    // ignore
  }

  return [getCuratedExperienceImage(category, name)];
}

function toMedia(url: string, category: ImageCategory, credit: string, source: string): MediaImage {
  void source;
  return {
    id: `img_wiki_${hash(url)}`,
    url,
    category,
    credit: credit.slice(0, 60),
    provenance: "editorial",
  };
}

function stripHtml(s?: string): string | undefined {
  if (!s) return undefined;
  return s.replace(/<[^>]+>/g, "").trim() || undefined;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
