import { NextRequest } from "next/server";
import { estimateRoute, buildRouteFlights } from "@/lib/server/flightEstimator";
import { enrichRoute } from "@/lib/server/flightContext";

export const runtime = "nodejs";
export const maxDuration = 60;

// Route-aware flight ESTIMATES for origin → gateway. No live fares; honest math
// + optional web route-context enrichment (typical duration/stops/cost).
export async function POST(req: NextRequest) {
  const { origin, gateway } = (await req.json().catch(() => ({}))) as { origin?: string; gateway?: string };
  if (!gateway) return json({ error: "missing gateway" }, 400);

  const base = estimateRoute(origin ?? "", gateway);
  const { est, hint, sourceUrl } = await enrichRoute(origin ?? "", gateway, base, req.signal).catch(() => ({
    est: base,
    hint: undefined,
    sourceUrl: undefined,
  }));

  const flights = buildRouteFlights(origin ?? "", gateway, est, "src_estimate");
  return json(
    {
      flights,
      meta: {
        distanceKm: est.distanceKm,
        durationHours: est.durationHours,
        stops: est.stops,
        domestic: est.domestic,
        known: est.known,
        enriched: !!hint?.found,
        sourceUrl,
        note: est.known
          ? "Estimated from route distance" + (hint?.found ? " + web route context" : "")
          : "Rough estimate — origin/gateway not precisely mapped",
      },
    },
    200
  );
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
