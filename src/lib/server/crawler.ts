import "server-only";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { CRAWLER_UA } from "./env";

// ============================================================================
// Self-hosted crawler. This is the "visit individual websites and scrape the
// most accurate info" layer. It is built to be resilient, accurate, traceable
// and COMPLIANT — it respects robots.txt and rate-limits per domain. It does
// not attempt to defeat anti-bot protections; blocked pages fail gracefully.
// ============================================================================

export interface CrawledPage {
  url: string;
  canonicalUrl: string;
  finalUrl: string; // after redirects
  title: string;
  siteName?: string;
  description?: string;
  /** cleaned main-content text, capped */
  text: string;
  /** structured data extracted from the page */
  jsonLd: unknown[];
  meta: Record<string, string>;
  images: string[];
  publishedAt?: string;
  modifiedAt?: string;
  fetchedAt: string;
  status: number;
  ok: boolean;
  blockedReason?: string;
  wordCount: number;
}

const CACHE = new Map<string, { page: CrawledPage; expires: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12h freshness for crawled pages
const ROBOTS_CACHE = new Map<string, { robots: ReturnType<typeof robotsParser>; expires: number }>();
const ROBOTS_TTL_MS = 1000 * 60 * 60 * 24;

// per-domain politeness (per-host, so parallel cross-domain crawling is fast)
const lastHit = new Map<string, number>();
const MIN_DOMAIN_INTERVAL = 400; // ms between requests to the SAME host

const FETCH_TIMEOUT = 9000;
const MAX_BYTES = 3_000_000; // 3MB cap
const MAX_TEXT = 16_000; // chars fed downstream

function domainOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function politeWait(host: string) {
  const now = Date.now();
  const last = lastHit.get(host) ?? 0;
  const wait = Math.max(0, MIN_DOMAIN_INTERVAL - (now - last));
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

async function getRobots(origin: string): Promise<ReturnType<typeof robotsParser> | null> {
  const cached = ROBOTS_CACHE.get(origin);
  if (cached && cached.expires > Date.now()) return cached.robots;
  try {
    const robotsUrl = `${origin}/robots.txt`;
    const res = await fetchWithTimeout(robotsUrl, 6000);
    const body = res.ok ? await res.text() : "";
    const robots = robotsParser(robotsUrl, body);
    ROBOTS_CACHE.set(origin, { robots, expires: Date.now() + ROBOTS_TTL_MS });
    return robots;
  } catch {
    return null; // if robots can't be fetched, proceed conservatively (allow)
  }
}

async function isAllowed(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const robots = await getRobots(u.origin);
    if (!robots) return true;
    const allowed = robots.isAllowed(url, CRAWLER_UA);
    return allowed !== false; // undefined => allowed
  } catch {
    return true;
  }
}

async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT, signal?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  if (signal) signal.addEventListener("abort", () => ctrl.abort());
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": CRAWLER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Crawl a single URL: robots check → fetch → extract main content, JSON-LD,
 * OpenGraph, canonical, images, timestamps. Cached with TTL. Never throws for
 * expected failures (blocked, non-HTML, timeout) — returns ok:false instead.
 */
export async function crawl(url: string, signal?: AbortSignal): Promise<CrawledPage> {
  const cached = CACHE.get(url);
  if (cached && cached.expires > Date.now()) return cached.page;

  const host = domainOf(url);

  const base: CrawledPage = {
    url,
    canonicalUrl: url,
    finalUrl: url,
    title: "",
    text: "",
    jsonLd: [],
    meta: {},
    images: [],
    fetchedAt: new Date().toISOString(),
    status: 0,
    ok: false,
    wordCount: 0,
  };

  try {
    const allowed = await isAllowed(url);
    if (!allowed) {
      return finalize(url, { ...base, blockedReason: "Disallowed by robots.txt" });
    }

    await politeWait(host);
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT, signal);
    base.status = res.status;
    base.finalUrl = res.url || url;

    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok) return finalize(url, { ...base, blockedReason: `HTTP ${res.status}` });
    if (!ct.includes("html")) return finalize(url, { ...base, blockedReason: `Non-HTML (${ct.split(";")[0]})` });

    const html = await readCapped(res, MAX_BYTES);
    const parsed = extract(html, base.finalUrl);
    return finalize(url, { ...base, ...parsed, ok: true });
  } catch (e) {
    const reason = e instanceof Error && e.name === "AbortError" ? "Timeout" : "Fetch error";
    return finalize(url, { ...base, blockedReason: reason });
  }
}

function finalize(key: string, page: CrawledPage): CrawledPage {
  page.wordCount = page.text ? page.text.split(/\s+/).length : 0;
  CACHE.set(key, { page, expires: Date.now() + CACHE_TTL_MS });
  return page;
}

/** Crawl many URLs with bounded concurrency. */
export async function crawlMany(urls: string[], concurrency = 4, signal?: AbortSignal): Promise<CrawledPage[]> {
  const unique = Array.from(new Set(urls));
  const out: CrawledPage[] = [];
  let i = 0;
  async function worker() {
    while (i < unique.length) {
      const idx = i++;
      // eslint-disable-next-line no-await-in-loop
      out[idx] = await crawl(unique[idx], signal);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  return out.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------
function extract(html: string, url: string): Partial<CrawledPage> {
  const $ = cheerio.load(html);

  // strip noise
  $("script, style, noscript, iframe, svg, form, nav, footer, header, aside").remove();

  const meta: Record<string, string> = {};
  $("meta").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property");
    const content = $(el).attr("content");
    if (name && content) meta[name.toLowerCase()] = content;
  });

  const title =
    meta["og:title"] || $("title").first().text().trim() || $("h1").first().text().trim() || "";
  const description = meta["og:description"] || meta["description"] || "";
  const siteName = meta["og:site_name"];
  const canonical = $('link[rel="canonical"]').attr("href") || url;

  // JSON-LD structured data
  const jsonLd: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const data = JSON.parse(raw);
      jsonLd.push(data);
    } catch {
      /* ignore malformed */
    }
  });

  // main content heuristic
  const candidates = ["article", "main", '[role="main"]', "#content", ".content", ".post", ".entry-content"];
  let container = $("body");
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 400) {
      container = el as typeof container;
      break;
    }
  }
  const text = normalizeWs(container.text()).slice(0, MAX_TEXT);

  // images (absolute, reasonable)
  const images: string[] = [];
  const og = meta["og:image"];
  if (og) images.push(absolutize(og, url));
  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && !src.startsWith("data:")) images.push(absolutize(src, url));
  });

  return {
    title,
    description,
    siteName,
    canonicalUrl: absolutize(canonical, url),
    jsonLd,
    meta,
    text,
    images: Array.from(new Set(images)).slice(0, 12),
    publishedAt: meta["article:published_time"] || jsonLdDate(jsonLd, "datePublished"),
    modifiedAt: meta["article:modified_time"] || jsonLdDate(jsonLd, "dateModified"),
  };
}

function jsonLdDate(nodes: unknown[], key: string): string | undefined {
  for (const n of nodes) {
    if (n && typeof n === "object" && key in (n as Record<string, unknown>)) {
      const v = (n as Record<string, unknown>)[key];
      if (typeof v === "string") return v;
    }
  }
  return undefined;
}

function absolutize(src: string, base: string): string {
  try {
    return new URL(src, base).toString();
  } catch {
    return src;
  }
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").replace(/\n{2,}/g, "\n").trim();
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();
  const decoder = new TextDecoder();
  let received = 0;
  let out = "";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (received >= maxBytes) {
      reader.cancel();
      break;
    }
  }
  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
