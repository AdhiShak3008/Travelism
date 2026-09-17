import { NextRequest } from "next/server";
import { scrapeLiveSubjectImages } from "@/lib/server/imageScraper";

export const runtime = "nodejs";
export const maxDuration = 30;

// ============================================================================
// LIVE GLOBAL DISCOVERY FEED
// Returns a batch of RANDOM real-world destinations with a verified subject-
// locked image + real facts. Powers the infinite showcase feeds on the landing
// and login pages. Non-hardcoded: destinations are drawn from a large rotating
// world pool and enriched live (image + Wikipedia summary) per request.
// ============================================================================

// A large, diverse pool of real global destinations to randomize from. This is
// a seed list of *names* only — all imagery + descriptions are fetched live, so
// nothing shown is hardcoded/canned.
const WORLD_POOL: { name: string; country: string; tag: string }[] = [
  { name: "Kyoto", country: "Japan", tag: "Ancient Temples" },
  { name: "Santorini", country: "Greece", tag: "Cliffside Sunsets" },
  { name: "Banff", country: "Canada", tag: "Rockies & Lakes" },
  { name: "Queenstown", country: "New Zealand", tag: "Adventure Capital" },
  { name: "Cinque Terre", country: "Italy", tag: "Coastal Villages" },
  { name: "Reykjavik", country: "Iceland", tag: "Northern Lights" },
  { name: "Marrakech", country: "Morocco", tag: "Souks & Riads" },
  { name: "Cappadocia", country: "Turkey", tag: "Hot Air Balloons" },
  { name: "Petra", country: "Jordan", tag: "Rose City" },
  { name: "Halong Bay", country: "Vietnam", tag: "Karst Seascape" },
  { name: "Machu Picchu", country: "Peru", tag: "Inca Citadel" },
  { name: "Bali", country: "Indonesia", tag: "Island Serenity" },
  { name: "Zermatt", country: "Switzerland", tag: "Matterhorn Views" },
  { name: "Dubrovnik", country: "Croatia", tag: "Adriatic Walls" },
  { name: "Chefchaouen", country: "Morocco", tag: "The Blue City" },
  { name: "Hallstatt", country: "Austria", tag: "Alpine Lake Village" },
  { name: "Ubud", country: "Indonesia", tag: "Jungle & Rice Terraces" },
  { name: "Interlaken", country: "Switzerland", tag: "Between Two Lakes" },
  { name: "Jaipur", country: "India", tag: "The Pink City" },
  { name: "Ladakh", country: "India", tag: "High Himalaya" },
  { name: "Meghalaya", country: "India", tag: "Living Root Bridges" },
  { name: "Kerala Backwaters", country: "India", tag: "Houseboat Country" },
  { name: "Salzburg", country: "Austria", tag: "Baroque Old Town" },
  { name: "Lofoten Islands", country: "Norway", tag: "Arctic Peaks" },
  { name: "Positano", country: "Italy", tag: "Amalfi Coast" },
  { name: "Kotor", country: "Montenegro", tag: "Bay & Fortress" },
  { name: "Luang Prabang", country: "Laos", tag: "Mekong Temples" },
  { name: "Torres del Paine", country: "Chile", tag: "Patagonian Wilds" },
  { name: "Sedona", country: "USA", tag: "Red Rock Country" },
  { name: "Kyrgyzstan", country: "Kyrgyzstan", tag: "Nomad Highlands" },
  { name: "Faroe Islands", country: "Denmark", tag: "Windswept Cliffs" },
  { name: "Gili Islands", country: "Indonesia", tag: "Coral Reefs" },
  { name: "Guilin", country: "China", tag: "Li River Karsts" },
  { name: "Bagan", country: "Myanmar", tag: "Temple Plains" },
  { name: "Sapa", country: "Vietnam", tag: "Terraced Valleys" },
  { name: "Tromso", country: "Norway", tag: "Aurora & Fjords" },
  { name: "Cusco", country: "Peru", tag: "Andean Heart" },
  { name: "Colmar", country: "France", tag: "Fairytale Alsace" },
  { name: "Meteora", country: "Greece", tag: "Cliff Monasteries" },
  { name: "Wanaka", country: "New Zealand", tag: "Lakeside Calm" },
  { name: "Coorg", country: "India", tag: "Coffee Hills" },
  { name: "Ronda", country: "Spain", tag: "Clifftop Town" },
  { name: "Plitvice Lakes", country: "Croatia", tag: "Waterfall Terraces" },
  { name: "Nusa Penida", country: "Indonesia", tag: "Ocean Cliffs" },
  { name: "El Nido", country: "Philippines", tag: "Lagoons & Limestone" },
  { name: "Antelope Canyon", country: "USA", tag: "Slot Canyons" },
  { name: "Gokarna", country: "India", tag: "Quiet Beaches" },
  { name: "Bruges", country: "Belgium", tag: "Medieval Canals" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Live Wikipedia summary for a real one-line description (non-hardcoded).
async function wikiSummary(name: string, signal?: AbortSignal): Promise<{ extract?: string } | null> {
  try {
    const u = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
    const res = await fetch(u, { headers: { "User-Agent": "TravelismApp/2.1" }, signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { extract?: string; type?: string };
    if (data.type === "disambiguation") return null;
    return { extract: data.extract };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const count = Math.min(6, Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "3", 10)));
  const picks = shuffle(WORLD_POOL).slice(0, count);

  const cards = await Promise.all(
    picks.map(async (p) => {
      const query = `${p.name} ${p.country}`;
      const [imgs, summary] = await Promise.all([
        scrapeLiveSubjectImages(p.name, p.country, "landscape", 1, req.signal).catch(() => []),
        wikiSummary(p.name, req.signal).catch(() => null),
      ]);
      const image = imgs[0]?.url ?? null;
      // Only surface cards that have a verified subject-locked image — never a
      // placeholder or wrong photo on the marketing feeds.
      if (!image) return null;
      const blurb = summary?.extract
        ? summary.extract.split(". ").slice(0, 1).join(". ").slice(0, 140)
        : `${p.tag} in ${p.country}`;
      return {
        name: p.name,
        country: p.country,
        tag: p.tag,
        image,
        blurb,
      };
    })
  );

  const results = cards.filter(Boolean);
  return new Response(JSON.stringify({ places: results }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
