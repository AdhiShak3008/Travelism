import "server-only";
import { z } from "zod";
import { tavilySearch } from "./tavily";
import { chatJSON } from "./groq";
import { ENV } from "./env";
import type { RouteEstimate } from "./flightEstimator";

// ============================================================================
// Route-context enrichment. Uses Tavily to find REAL-WORLD typical route info
// ("Paris to Guwahati usually 15-18h, 1-2 stops via Delhi/Doha, ~₹55-90k") and
// blends it into the distance-based estimate, citing where it came from.
// Compliant: reads travel-guide/route pages, not live fare pages.
// ============================================================================

const HintSchema = z.object({
  durationText: z.string().optional(), // e.g. "15h 30m" or "14-18 hours"
  minHours: z.coerce.number().min(0.5).max(48).optional(),
  stops: z.coerce.number().min(0).max(3).optional(),
  hubs: z.array(z.string()).max(4).optional().default([]),
  fareLowInr: z.coerce.number().min(0).optional(),
  fareHighInr: z.coerce.number().min(0).optional(),
  found: z.boolean().default(false),
});
export type RouteHint = z.infer<typeof HintSchema>;

export interface EnrichedRoute {
  est: RouteEstimate;
  hint?: RouteHint;
  sourceUrl?: string;
}

export async function enrichRoute(
  originRaw: string,
  gatewayRaw: string,
  est: RouteEstimate,
  signal?: AbortSignal
): Promise<EnrichedRoute> {
  if (!ENV.TAVILY_API_KEY || !ENV.GROQ_API_KEY) return { est };
  const origin = originRaw.trim();
  const gw = gatewayRaw.split(/[(,]/)[0].trim();
  if (!origin || !gw) return { est };

  try {
    const results = await tavilySearch(
      `${origin} to ${gw} flight duration number of stops typical route via which hub`,
      { maxResults: 4, depth: "basic", signal }
    );
    if (!results.length) return { est };
    const corpus = results
      .map((r) => `URL: ${r.url}\n${r.content.slice(0, 900)}`)
      .join("\n\n---\n\n");

    const hint = await chatJSON(
      [
        {
          role: "system",
          content: "You extract typical flight-route facts (NOT live fares) from travel content. Return STRICT JSON only. Only fill fields the text supports.",
        },
        {
          role: "user",
          content: `ROUTE: ${origin} → ${gw}
From the pages, extract typical route facts. Return JSON:
{ "durationText": short human duration if stated, "minHours": lowest typical total hours as a number, "stops": typical number of stops (0-3), "hubs": common connecting cities, "fareLowInr": typical low fare in INR if stated, "fareHighInr": typical high fare in INR if stated, "found": true if you found anything useful }

PAGES:
${corpus}`,
        },
      ],
      HintSchema,
      { signal, model: ENV.GROQ_MODEL_FAST, reasoning: "low", maxTokens: 700 }
    ).catch(() => undefined);

    if (!hint || !hint.found) return { est };

    // Blend: prefer sourced numbers when they look sane, else keep distance math.
    const blended: RouteEstimate = { ...est };
    if (hint.minHours && hint.minHours >= est.durationHours * 0.5 && hint.minHours <= est.durationHours * 1.8) {
      blended.durationHours = Math.round(((hint.minHours + est.durationHours) / 2) * 10) / 10;
    }
    if (typeof hint.stops === "number") blended.stops = Math.max(est.stops, hint.stops);
    if (hint.hubs && hint.hubs.length) blended.stopHint = `via ${hint.hubs.slice(0, 2).join(" / ")}`;
    if (hint.fareLowInr && hint.fareHighInr && hint.fareHighInr > hint.fareLowInr && hint.fareLowInr > 500) {
      // average the sourced band with our distance band to stay grounded
      blended.fareLow = Math.round((blended.fareLow + hint.fareLowInr) / 2 / 100) * 100;
      blended.fareHigh = Math.round((blended.fareHigh + hint.fareHighInr) / 2 / 100) * 100;
    }

    return { est: blended, hint, sourceUrl: results[0]?.url };
  } catch {
    return { est };
  }
}
