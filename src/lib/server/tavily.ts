import "server-only";
import { ENV } from "./env";

// ============================================================================
// Tavily — AI-native search. Used for DISCOVERY: it returns ranked source URLs
// and (optionally) pre-extracted page content, which seeds the crawler.
// ============================================================================

const TAVILY_URL = "https://api.tavily.com/search";

export interface TavilyResult {
  title: string;
  url: string;
  content: string; // Tavily's cleaned snippet/content
  score: number;
  publishedDate?: string;
  rawContent?: string;
}

export interface TavilySearchOpts {
  maxResults?: number;
  /** "basic" is fast; "advanced" digs deeper */
  depth?: "basic" | "advanced";
  includeRawContent?: boolean;
  includeImages?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
  topic?: "general" | "news";
  signal?: AbortSignal;
}

export interface TavilySearchResponse {
  results: TavilyResult[];
  images: string[];
}

export class TavilyError extends Error {}

export async function tavilySearch(query: string, opts: TavilySearchOpts = {}): Promise<TavilyResult[]> {
  const resp = await tavilySearchFull(query, opts);
  return resp.results;
}

/** Real-time web image scraper via Tavily: extracts actual photos from indexed travel pages */
export async function tavilySearchImages(query: string, limit = 4, signal?: AbortSignal): Promise<string[]> {
  if (!ENV.TAVILY_API_KEY) return [];
  try {
    const resp = await tavilySearchFull(query, {
      maxResults: limit,
      depth: "basic",
      includeImages: true,
      signal,
    });
    return resp.images.slice(0, limit);
  } catch {
    return [];
  }
}

export async function tavilySearchFull(query: string, opts: TavilySearchOpts = {}): Promise<TavilySearchResponse> {
  if (!ENV.TAVILY_API_KEY) throw new TavilyError("TAVILY_API_KEY not configured");

  const body = {
    query,
    max_results: opts.maxResults ?? 8,
    search_depth: opts.depth ?? "advanced",
    include_raw_content: opts.includeRawContent ?? false,
    include_images: opts.includeImages ?? false,
    include_image_descriptions: true,
    include_answer: false,
    include_domains: opts.includeDomains,
    exclude_domains: opts.excludeDomains,
    topic: opts.topic ?? "general",
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(TAVILY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ENV.TAVILY_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(Math.min(4000, 500 * 2 ** attempt));
        lastErr = new TavilyError(`Tavily ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new TavilyError(`Tavily ${res.status}: ${txt.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        results?: {
          title: string;
          url: string;
          content: string;
          score: number;
          published_date?: string;
          raw_content?: string;
        }[];
        images?: (string | { url: string; description?: string })[];
      };

      const results = (data.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: r.published_date,
        rawContent: r.raw_content,
      }));

      const rawImages = data.images ?? [];
      const images: string[] = rawImages
        .map((img) => (typeof img === "string" ? img : img?.url))
        .filter((url): url is string => Boolean(url && typeof url === "string" && url.startsWith("http")));

      return { results, images };
    } catch (e) {
      lastErr = e;
      if (e instanceof TavilyError && !String(e.message).match(/429|5\d\d/)) throw e;
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new TavilyError("Tavily failed");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
