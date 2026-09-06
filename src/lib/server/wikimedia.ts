import "server-only";
import type { MediaImage, ImageCategory } from "../types";

// ============================================================================
// Wikimedia Commons image search — free, no API key, real licensed photos.
// Used to give places/hotels reliable real imagery without Google Places.
// We query the MediaWiki API on commons.wikimedia.org and Wikipedia's
// PageImages for the best representative photo.
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

/** Best lead image for a subject via Wikipedia PageImages (original size). */
async function wikipediaLeadImage(query: string, signal?: AbortSignal): Promise<string | null> {
  const u = new URL(WIKI_API);
  u.searchParams.set("action", "query");
  u.searchParams.set("format", "json");
  u.searchParams.set("prop", "pageimages");
  u.searchParams.set("piprop", "original|thumbnail");
  u.searchParams.set("pithumbsize", "1200");
  u.searchParams.set("generator", "search");
  u.searchParams.set("gsrsearch", query);
  u.searchParams.set("gsrlimit", "1");
  u.searchParams.set("origin", "*");
  try {
    const data = (await getJson(u.toString(), signal)) as {
      query?: { pages?: Record<string, { original?: { source?: string }; thumbnail?: { source?: string } }> };
    };
    const pages = data.query?.pages;
    if (!pages) return null;
    const first = Object.values(pages)[0];
    return first?.original?.source ?? first?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

/** Multiple Commons images for a subject (for galleries). */
async function commonsImages(query: string, n: number, signal?: AbortSignal): Promise<WikiImage[]> {
  const u = new URL(COMMONS_API);
  u.searchParams.set("action", "query");
  u.searchParams.set("format", "json");
  u.searchParams.set("generator", "search");
  u.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  u.searchParams.set("gsrnamespace", "6"); // File namespace
  u.searchParams.set("gsrlimit", String(n));
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
    if (!pages) return [];
    const out: WikiImage[] = [];
    for (const p of Object.values(pages)) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const url = info.thumburl ?? info.url;
      if (!url) continue;
      out.push({
        url,
        descriptionUrl: info.descriptionurl ?? url,
        artist: stripHtml(info.extmetadata?.Artist?.value),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Gather up to `n` real images for a subject. Tries Wikipedia lead image first
 * (usually the most representative), then fills from Commons search.
 */
export async function fetchWikiImages(
  subject: string,
  category: ImageCategory,
  n = 3,
  signal?: AbortSignal
): Promise<MediaImage[]> {
  const seen = new Set<string>();
  const images: MediaImage[] = [];

  const lead = await wikipediaLeadImage(subject, signal);
  if (lead && !seen.has(lead)) {
    seen.add(lead);
    images.push(toMedia(lead, category, "Wikipedia", "https://en.wikipedia.org"));
  }

  if (images.length < n) {
    const commons = await commonsImages(subject, n * 2, signal);
    for (const c of commons) {
      if (images.length >= n) break;
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      images.push(toMedia(c.url, category, c.artist ?? "Wikimedia Commons", c.descriptionUrl));
    }
  }
  return images;
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
