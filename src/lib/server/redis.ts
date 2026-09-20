import "server-only";
import { ENV, CAP } from "./env";

// ============================================================================
// Minimal Upstash Redis client over the REST API (no SDK dependency).
// Upstash exposes each Redis command as an HTTP call authenticated with a
// bearer token, which is ideal for serverless (no TCP pool). Every method
// degrades gracefully to a no-op when Upstash isn't configured, so the rest of
// the app never has to branch on availability.
// ============================================================================

const BASE = ENV.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const TOKEN = ENV.UPSTASH_REDIS_REST_TOKEN;

export function redisEnabled(): boolean {
  return CAP.redis;
}

/** Run a single Redis command via the Upstash REST endpoint. */
async function command<T = unknown>(parts: (string | number)[], signal?: AbortSignal): Promise<T | null> {
  if (!BASE || !TOKEN) return null;
  try {
    // Path-style command: /SET/key/value/EX/3600  (segments are URL-encoded)
    const path = parts.map((p) => encodeURIComponent(String(p))).join("/");
    const res = await fetch(`${BASE}/${path}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      // small timeout budget so a slow cache never blocks the request
      signal: signal ?? AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: T; error?: string };
    if (data.error) return null;
    return (data.result ?? null) as T | null;
  } catch {
    return null;
  }
}

/** GET a string value (returns null on miss / any failure). */
export async function redisGet(key: string, signal?: AbortSignal): Promise<string | null> {
  return command<string>(["GET", key], signal);
}

/** SET a string value with a TTL in seconds. */
export async function redisSetEx(key: string, value: string, ttlSeconds: number, signal?: AbortSignal): Promise<void> {
  // For large JSON payloads, use the pipeline/body form to avoid URL length limits.
  if (!BASE || !TOKEN) return;
  try {
    const res = await fetch(`${BASE}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["SET", key, value, "EX", String(ttlSeconds)]]),
      signal: signal ?? AbortSignal.timeout(3000),
    });
    void res;
  } catch {
    /* non-fatal — cache writes never block or throw */
  }
}

/** Atomic counter increment (used for hit/miss metrics). Best-effort. */
export async function redisIncr(key: string, signal?: AbortSignal): Promise<number | null> {
  return command<number>(["INCR", key], signal);
}

/** SET a JSON value (serialized as string) with a TTL in seconds. */
export async function redisSetJson<T>(key: string, value: T, ttlSeconds: number, signal?: AbortSignal): Promise<void> {
  return redisSetEx(key, JSON.stringify(value), ttlSeconds, signal);
}

/** GET and deserialize a JSON value (returns null on miss / parse error). */
export async function redisGetJson<T>(key: string, signal?: AbortSignal): Promise<T | null> {
  const raw = await redisGet(key, signal);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
