import { NextResponse } from "next/server";
import { WORLD_SPOTS_CATALOG, type DiscoveredSpot } from "@/lib/globalSpots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const excludeIds = (searchParams.get("exclude") || "").split(",").filter(Boolean);
    const category = searchParams.get("category");

    let pool: DiscoveredSpot[] = WORLD_SPOTS_CATALOG;
    if (category && category !== "all") {
      const filtered = pool.filter((s) => s.category === category);
      if (filtered.length > 0) {
        pool = filtered;
      }
    }

    // Filter out recently seen spots if pool is large enough
    let candidates = pool.filter((s) => !excludeIds.includes(s.id));
    if (candidates.length === 0) {
      candidates = pool; // loop around if all exhausted
    }

    // Pick random or next spot
    const randomIndex = Math.floor(Math.random() * (candidates.length || 1));
    const spot = candidates[randomIndex] || WORLD_SPOTS_CATALOG[0];

    return NextResponse.json({
      spot,
      totalAvailable: WORLD_SPOTS_CATALOG.length,
      scoutedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      spot: WORLD_SPOTS_CATALOG[0],
      totalAvailable: WORLD_SPOTS_CATALOG.length,
      scoutedAt: new Date().toISOString(),
    });
  }
}
