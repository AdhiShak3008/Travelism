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
  includeDomains?: string[];
  excludeDomains?: string[];
  topic?: "general" | "news";
  signal?: AbortSignal;
}

export class TavilyError extends Error {}

export async function tavilySearch(query: string, opts: TavilySearchOpts = {}): Promise<TavilyResult[]> {
  if (!ENV.TAVILY_API_KEY) throw new TavilyError("TAVILY_API_KEY not configured");

  const body = {
    query,
    max_results: opts.maxResults ?? 8,
    search_depth: opts.depth ?? "advanced",
    include_raw_content: opts.includeRawContent ?? false,
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
      };
      return (data.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: r.published_date,
        rawContent: r.raw_content,
      }));
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
