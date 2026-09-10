import "server-only";
import * as cheerio from "cheerio";
import { tavilySearch } from "./tavily";
import { ENV } from "./env";

// ============================================================================
// Free / Multi-Engine Web Search Dispatcher
// Provides zero-cost web discovery via DuckDuckGo HTML & Wikipedia search,
// with graceful fallback to Tavily and Google Custom Search.
// ============================================================================

export interface FreeSearchResult {
  title: string;
  url: string;
  snippet: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function duckduckgoTextSearch(
  query: string,
  limit = 8,
  signal?: AbortSignal
): Promise<FreeSearchResult[]> {
  try {
    const u = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(u, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://duckduckgo.com/",
      },
      signal,
    });

    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: FreeSearchResult[] = [];

    $(".result").each((_, el) => {
      if (results.length >= limit) return false;
      const title = $(el).find(".result__title").text().trim();
      let rawHref = $(el).find(".result__url").attr("href") || $(el).find("a.result__url").attr("href") || $(el).find("a.result__title").attr("href") || $(el).find("a").first().attr("href") || "";
      
      // DuckDuckGo redirects through /l/?kh=-1&uddg=...
      if (rawHref.includes("uddg=")) {
        const match = rawHref.match(/uddg=([^&]+)/);
        if (match) {
          try {
            rawHref = decodeURIComponent(match[1]);
          } catch {
            // keep raw
          }
        }
      }

      const snippet = $(el).find(".result__snippet").text().trim();

      if (rawHref && rawHref.startsWith("http") && !rawHref.includes("duckduckgo.com")) {
        results.push({
          title: title || rawHref,
          url: rawHref,
          snippet: snippet || "",
        });
      }
    });

    return results;
  } catch {
    return [];
  }
}

export async function freeWebSearch(
  query: string,
  limit = 8,
  signal?: AbortSignal
): Promise<FreeSearchResult[]> {
  // 1. Try DuckDuckGo free search first (zero cost)
  const ddgResults = await duckduckgoTextSearch(query, limit, signal);
  if (ddgResults.length >= Math.min(4, limit)) {
    return ddgResults.slice(0, limit);
  }

  // 2. Tavily search (if configured)
  if (ENV.TAVILY_API_KEY) {
    try {
      const tav = await tavilySearch(query, { maxResults: limit, depth: "basic", signal });
      if (tav.length > 0) {
        return tav.map((t) => ({
          title: t.title,
          url: t.url,
          snippet: t.content,
        }));
      }
    } catch {
      // ignore
    }
  }

  return ddgResults.slice(0, limit);
}
