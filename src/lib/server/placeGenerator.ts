import "server-only";
import { z } from "zod";
import { chatJSON } from "./groq";
import { CAP } from "./env";

// ============================================================================
// LLM place generator — the source of destinations for the discovery feeds.
// Instead of a hardcoded list, we ask the model for random real destinations
// ("whatever comes to mind") and enrich each LIVE (image + weather + summary)
// downstream. A rolling in-memory buffer is topped up in the background so the
// feeds stay instant and keep serving fresh, varied places across requests.
// ============================================================================

export type SpotCategory = "beaches" | "mountains" | "heritage" | "nature" | "aurora" | "culinary";

export interface GeneratedPlace {
  name: string;
  country: string;
  region: "Asia" | "Europe" | "Americas" | "Africa" | "Oceania";
  category: SpotCategory;
  tagline: string;
  badge: string;
}

const PlaceSchema = z.object({
  places: z
    .array(
      z.object({
        name: z.string(),
        country: z.string(),
        region: z.enum(["Asia", "Europe", "Americas", "Africa", "Oceania"]).catch("Asia"),
        category: z.enum(["beaches", "mountains", "heritage", "nature", "aurora", "culinary"]).catch("nature"),
        tagline: z.string(),
        badge: z.string(),
      })
    )
    .default([]),
});

// Rolling buffer of generated names + a "seen" set so we don't repeat the same
// places within a session's lifetime of the server process.
const buffer: GeneratedPlace[] = [];
const seen = new Set<string>();
let generating = false;

const REGION_HINTS = ["Asia", "Europe", "Americas", "Africa", "Oceania", "the Middle East", "the Nordics", "Southeast Asia", "South America"];

function keyOf(p: GeneratedPlace): string {
  return p.name.toLowerCase().trim();
}

/** Ask the model for a fresh batch of random real destinations. */
async function generateBatch(count = 12, signal?: AbortSignal): Promise<GeneratedPlace[]> {
  if (!CAP.llm) return [];
  // Nudge variety with a random region + seed so successive batches differ.
  const hint = REGION_HINTS[Math.floor(Math.random() * REGION_HINTS.length)];
  const seed = Math.floor(Math.random() * 1e6);
  try {
    const res = await chatJSON(
      [
        {
          role: "system",
          content:
            "You are a well-traveled destination curator. Return STRICT JSON only. Suggest REAL, specific, visit-worthy travel destinations from ALL OVER THE WORLD — a genuinely random, eclectic mix (famous and lesser-known), not the usual top-10 clichés. Each must be a real place with a Wikipedia article. Avoid whole countries; prefer specific cities, towns, natural wonders, or landmarks.",
        },
        {
          role: "user",
          content: `Give me ${count} random real destinations (variety seed ${seed}, lean toward ${hint} but mix in others). For each return:
{ "name": specific place name (e.g. "Hallstatt", "Chefchaouen", "Torres del Paine"), "country", "region": one of Asia|Europe|Americas|Africa|Oceania, "category": one of beaches|mountains|heritage|nature|aurora|culinary, "tagline": a short evocative 3-6 word phrase, "badge": a short emoji + 1-3 word label (e.g. "🏔️ Alpine Village") }
Return JSON: { "places": [ ... ] }. Make the list surprising and globally diverse — different from a typical list.`,
        },
      ],
      PlaceSchema,
      { signal, model: undefined, reasoning: "low", maxTokens: 1500, temperature: 1.0 }
    );
    return res.places.filter((p) => p.name && p.country);
  } catch {
    return [];
  }
}

/** Refill the buffer in the background until it holds at least `target` places. */
export async function ensureBuffer(target = 10, signal?: AbortSignal): Promise<void> {
  if (generating || buffer.length >= target) return;
  generating = true;
  try {
    let attempts = 0;
    while (buffer.length < target && attempts < 3) {
      attempts++;
      const batch = await generateBatch(12, signal);
      for (const p of batch) {
        const k = keyOf(p);
        if (!seen.has(k)) {
          seen.add(k);
          buffer.push(p);
        }
      }
      if (batch.length === 0) break;
      // keep the seen-set from growing unbounded across a long-lived process
      if (seen.size > 500) seen.clear();
    }
  } finally {
    generating = false;
  }
}

/**
 * Pop up to `n` freshly-generated places. Triggers a background refill so the
 * next call is instant. Returns [] only if the LLM is unavailable AND the
 * buffer is empty (callers then fall back to their own last-resort).
 */
export async function nextGeneratedPlaces(n: number, opts: { category?: string; exclude?: Set<string>; signal?: AbortSignal } = {}): Promise<GeneratedPlace[]> {
  // Ensure we have something to serve (blocks only on a cold buffer).
  if (buffer.length < n) await ensureBuffer(Math.max(10, n + 4), opts.signal);

  const out: GeneratedPlace[] = [];
  for (let i = 0; i < buffer.length && out.length < n; ) {
    const p = buffer[i];
    const matchesCat = !opts.category || opts.category === "all" || p.category === opts.category;
    const notExcluded = !opts.exclude || !opts.exclude.has(keyOf(p));
    if (matchesCat && notExcluded) {
      out.push(p);
      buffer.splice(i, 1); // consume it
    } else {
      i++;
    }
  }
  // Top the buffer back up for next time (non-blocking).
  void ensureBuffer(10, opts.signal);
  return out;
}

/** Kick off buffer warming at startup so the first request is fast. */
export function warmGenerator(): void {
  void ensureBuffer(10);
}
