import "server-only";
import type { DestinationDataset } from "../research/provider";
import { redisGet, redisSetEx, redisIncr, redisEnabled } from "./redis";

// ============================================================================
// Two-tier cache-aside layer for investigation datasets.
//
//   L1  in-process LRU        — instant, per-instance, survives within a warm
//                               serverless container. Handles hot repeats.
//   L2  Upstash Redis (REST)  — shared across instances, survives restarts,
//                               TTL-based expiry. Handles the long tail.
//
// Key = a NORMALIZED SEMANTIC TRIP SIGNATURE (not the raw dream string), so
// "explore Kyoto for 4 days" and "Kyoto trip, four days" resolve to the SAME
// entry. Reads follow cache-aside (check cache → miss → caller computes → fill).
// Freshness uses TTL + stale-while-revalidate: a stale-but-usable entry is
// served instantly while the caller refreshes in the background.
//
// Everything degrades gracefully: with no Redis configured it runs L1-only;
// a cold cache simply misses and the caller does the live investigation.
// ============================================================================

const NS = "inv:v1"; // bump to invalidate all entries on schema changes
const FRESH_TTL_S = 60 * 60 * 24; // 24h — considered fresh
const STALE_TTL_S = 60 * 60 * 24 * 3; // 3d — still served, triggers revalidation
const L1_MAX = 100; // max entries held in-memory per instance

type CacheSource = "l1" | "l2" | "miss";

interface Entry {
  dataset: DestinationDataset;
  storedAt: number; // epoch ms
}

// ---- L1: simple LRU via Map insertion order ----
const l1 = new Map<string, Entry>();

function l1Get(key: string): Entry | undefined {
  const e = l1.get(key);
  if (!e) return undefined;
  // refresh recency: delete + re-set moves it to the "most recent" end
  l1.delete(key);
  l1.set(key, e);
  return e;
}

function l1Set(key: string, entry: Entry): void {
  if (l1.has(key)) l1.delete(key);
  l1.set(key, entry);
  // evict least-recently-used (oldest insertion) while over capacity
  while (l1.size > L1_MAX) {
    const oldest = l1.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    l1.delete(oldest);
  }
}

// ---- Metrics (best-effort; local counters + optional Redis counters) ----
const metrics = { hits: 0, misses: 0, l1Hits: 0, l2Hits: 0 };

export function cacheMetrics() {
  const total = metrics.hits + metrics.misses;
  return {
    ...metrics,
    total,
    hitRate: total > 0 ? +(metrics.hits / total).toFixed(3) : 0,
    redis: redisEnabled(),
  };
}

// ---- Semantic key normalization ----
// Collapse a free-text dream into a stable signature. We deliberately keep this
// cheap (pure string ops, no LLM) so it runs before the expensive parse.
export function normalizeTripKey(dream: string): string {
  const STOP = new Set([
    "a","an","the","for","to","in","of","and","or","my","our","we","i","want","wanna",
    "would","like","love","go","going","visit","see","explore","trip","tour","travel",
    "please","some","just","really","also","then","around","across","plan","planning",
  ]);
  // normalize durations: "four days"/"4 day"/"4-day" → "4d"
  const words = new Set([
    ["one",1],["two",2],["three",3],["four",4],["five",5],["six",6],["seven",7],
    ["eight",8],["nine",9],["ten",10],["eleven",11],["twelve",12],["fourteen",14],
  ] as [string, number][]);
  let s = " " + dream.toLowerCase().trim() + " ";
  for (const [w, n] of words) s = s.replace(new RegExp(`\\b${w}\\b`, "g"), String(n));
  // duration token
  const durMatch = s.match(/(\d+)\s*(?:-|\s)?\s*(day|days|night|nights|week|weeks)/);
  let durTok = "";
  if (durMatch) {
    let n = parseInt(durMatch[1], 10);
    if (/week/.test(durMatch[2])) n *= 7;
    durTok = `${n}d`;
  }
  // strip punctuation, drop stopwords + standalone numbers, sort remaining tokens
  const tokens = s
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOP.has(t))
    .filter((t) => !/^\d+$/.test(t)); // raw numbers folded into durTok
  const core = Array.from(new Set(tokens)).sort().join("-");
  return `${NS}:${core}${durTok ? `:${durTok}` : ""}`;
}

function isFresh(entry: Entry): boolean {
  return Date.now() - entry.storedAt < FRESH_TTL_S * 1000;
}

export interface CacheReadResult {
  dataset: DestinationDataset | null;
  source: CacheSource;
  /** true when a stale entry was served and the caller should revalidate. */
  stale: boolean;
  key: string;
}

/** Cache-aside READ: L1 → L2 → miss. Promotes L2 hits into L1. */
export async function readDatasetCache(dream: string, signal?: AbortSignal): Promise<CacheReadResult> {
  const key = normalizeTripKey(dream);

  // L1
  const local = l1Get(key);
  if (local) {
    metrics.hits++;
    metrics.l1Hits++;
    void redisIncr(`${NS}:m:hit`);
    return { dataset: local.dataset, source: "l1", stale: !isFresh(local), key };
  }

  // L2
  if (redisEnabled()) {
    const raw = await redisGet(key, signal);
    if (raw) {
      try {
        const entry = JSON.parse(raw) as Entry;
        l1Set(key, entry); // promote to L1
        metrics.hits++;
        metrics.l2Hits++;
        void redisIncr(`${NS}:m:hit`);
        return { dataset: entry.dataset, source: "l2", stale: !isFresh(entry), key };
      } catch {
        /* corrupt entry → treat as miss */
      }
    }
  }

  metrics.misses++;
  void redisIncr(`${NS}:m:miss`);
  return { dataset: null, source: "miss", stale: false, key };
}

/** Cache-aside WRITE: fill both tiers. */
export async function writeDatasetCache(dream: string, dataset: DestinationDataset, signal?: AbortSignal): Promise<void> {
  const key = normalizeTripKey(dream);
  const entry: Entry = { dataset, storedAt: Date.now() };
  l1Set(key, entry);
  if (redisEnabled()) {
    // Store with the longer stale TTL; freshness is judged by storedAt on read.
    await redisSetEx(key, JSON.stringify(entry), STALE_TTL_S, signal);
  }
}
