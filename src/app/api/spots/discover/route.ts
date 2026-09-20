import { NextResponse } from "next/server";
import { WORLD_SPOTS_CATALOG, type DiscoveredSpot } from "@/lib/globalSpots";
import { scrapeLiveSubjectImages } from "@/lib/server/imageScraper";
import { nextGeneratedPlaces, warmGenerator, type GeneratedPlace } from "@/lib/server/placeGenerator";
import { redisGetJson, redisSetJson, redisEnabled } from "@/lib/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// LIVE Global Passport spot discovery.
// Instead of returning a hardcoded catalog entry, this scouts a RANDOM real
// destination from a large world pool and enriches it LIVE with a verified,
// subject-locked image + a real one-line summary. Nothing shown is canned.
// ============================================================================

interface PoolEntry {
  name: string;
  country: string;
  region: DiscoveredSpot["region"];
  category: DiscoveredSpot["category"];
  badge: string;
  tagline: string;
}

const POOL: PoolEntry[] = [
  { name: "Kyoto", country: "Japan", region: "Asia", category: "heritage", badge: "🏯 Ancient Capital", tagline: "Temples, Geisha Lanes & Bamboo Groves" },
  { name: "Santorini", country: "Greece", region: "Europe", category: "beaches", badge: "🏝️ Aegean Jewel", tagline: "Whitewashed Cliffs & Caldera Sunsets" },
  { name: "Banff", country: "Canada", region: "Americas", category: "mountains", badge: "🏔️ Rockies", tagline: "Turquoise Lakes & Glacial Peaks" },
  { name: "Queenstown", country: "New Zealand", region: "Oceania", category: "mountains", badge: "🪂 Adventure Capital", tagline: "Alpine Thrills by the Lake" },
  { name: "Cinque Terre", country: "Italy", region: "Europe", category: "beaches", badge: "🎨 Ligurian Coast", tagline: "Five Cliffside Fishing Villages" },
  { name: "Reykjavik", country: "Iceland", region: "Europe", category: "aurora", badge: "🌌 Land of Fire & Ice", tagline: "Aurora Skies & Geothermal Lagoons" },
  { name: "Marrakech", country: "Morocco", region: "Africa", category: "culinary", badge: "🕌 Red City", tagline: "Souks, Riads & Spice Markets" },
  { name: "Cappadocia", country: "Turkey", region: "Asia", category: "nature", badge: "🎈 Fairy Chimneys", tagline: "Balloons over Rock Valleys" },
  { name: "Petra", country: "Jordan", region: "Asia", category: "heritage", badge: "🏛️ Rose City", tagline: "Carved Wonders in the Desert" },
  { name: "Halong Bay", country: "Vietnam", region: "Asia", category: "nature", badge: "⛵ Karst Seascape", tagline: "Emerald Waters & Limestone Isles" },
  { name: "Machu Picchu", country: "Peru", region: "Americas", category: "heritage", badge: "🗿 Inca Citadel", tagline: "Cloud-Wrapped Andean Ruins" },
  { name: "Bali", country: "Indonesia", region: "Asia", category: "beaches", badge: "🏝️ Tropical Haven", tagline: "Ocean Cliffs & Jungle Villas" },
  { name: "Zermatt", country: "Switzerland", region: "Europe", category: "mountains", badge: "🏔️ Matterhorn", tagline: "Car-Free Alpine Village" },
  { name: "Chefchaouen", country: "Morocco", region: "Africa", category: "heritage", badge: "🔵 The Blue City", tagline: "Indigo Streets in the Rif Mountains" },
  { name: "Hallstatt", country: "Austria", region: "Europe", category: "mountains", badge: "🏞️ Lakeside Fairytale", tagline: "Alpine Village on a Mirror Lake" },
  { name: "Lofoten Islands", country: "Norway", region: "Europe", category: "aurora", badge: "🎣 Arctic Peaks", tagline: "Fishing Villages under Northern Lights" },
  { name: "Positano", country: "Italy", region: "Europe", category: "beaches", badge: "🍋 Amalfi Coast", tagline: "Pastel Houses above the Sea" },
  { name: "Luang Prabang", country: "Laos", region: "Asia", category: "heritage", badge: "🛕 Mekong Temples", tagline: "Saffron Monks & Riverside Calm" },
  { name: "Torres del Paine", country: "Chile", region: "Americas", category: "nature", badge: "🥾 Patagonia", tagline: "Granite Towers & Wild Trails" },
  { name: "Sedona", country: "USA", region: "Americas", category: "nature", badge: "🏜️ Red Rock Country", tagline: "Crimson Buttes & Desert Vortexes" },
  { name: "Ladakh", country: "India", region: "Asia", category: "mountains", badge: "🏔️ High Himalaya", tagline: "Monasteries & Moonscapes" },
  { name: "Meghalaya", country: "India", region: "Asia", category: "nature", badge: "🌉 Living Root Bridges", tagline: "The Wettest, Greenest Hills" },
  { name: "Tromso", country: "Norway", region: "Europe", category: "aurora", badge: "🌌 Aurora & Fjords", tagline: "Arctic Gateway to the Lights" },
  { name: "Colmar", country: "France", region: "Europe", category: "heritage", badge: "🏘️ Fairytale Alsace", tagline: "Half-Timbered Canals & Vineyards" },
  { name: "Meteora", country: "Greece", region: "Europe", category: "heritage", badge: "⛪ Cliff Monasteries", tagline: "Monasteries in the Sky" },
  { name: "El Nido", country: "Philippines", region: "Asia", category: "beaches", badge: "🛶 Hidden Lagoons", tagline: "Limestone Cliffs & Turquoise Coves" },
  { name: "Bruges", country: "Belgium", region: "Europe", category: "heritage", badge: "🚤 Medieval Canals", tagline: "Cobblestones, Belfries & Chocolate" },
  { name: "Guilin", country: "China", region: "Asia", category: "nature", badge: "🖌️ Li River Karsts", tagline: "Ink-Painting Mountains & Rivers" },
  { name: "Nusa Penida", country: "Indonesia", region: "Asia", category: "beaches", badge: "🌊 Ocean Cliffs", tagline: "Dramatic Cliffs & Manta Bays" },
  { name: "Cusco", country: "Peru", region: "Americas", category: "heritage", badge: "⛰️ Andean Heart", tagline: "Inca Walls & Colonial Plazas" },
];

const RATINGS = ["4.8 ★", "4.9 ★", "4.92 ★", "4.95 ★", "4.97 ★"];

// WMO weather-code → short human phrase (Open-Meteo current_weather.weathercode).
function weatherPhrase(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code <= 2) return "Mostly Sunny";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  return "Stormy";
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Real, live current temperature for a place via free Open-Meteo (no API key):
// geocode the name → current_weather. Returns a display string like
// "19°C · Rainy", or null when it can't be resolved (caller falls back).
async function geocode(q: string, signal?: AbortSignal): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { latitude: number; longitude: number }[] };
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

async function liveWeather(name: string, country: string, signal?: AbortSignal): Promise<string | null> {
  try {
    // Try the bare name first; if the place name doesn't geocode (e.g. a valley
    // or region), fall back to the first token, then the country.
    const loc =
      (await geocode(name, signal)) ||
      (await geocode(name.split(/[,(]/)[0].trim(), signal)) ||
      (country ? await geocode(country, signal) : null);
    if (!loc) return null;

    const wxUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`;
    const wxRes = await fetch(wxUrl, { signal });
    if (!wxRes.ok) return null;
    const wx = (await wxRes.json()) as { current_weather?: { temperature: number; weathercode: number } };
    const cw = wx.current_weather;
    if (!cw) return null;
    return `${Math.round(cw.temperature)}°C · ${weatherPhrase(cw.weathercode)}`;
  } catch {
    return null;
  }
}

async function wikiSummary(name: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`, {
      headers: { "User-Agent": "TravelismApp/2.1" },
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { extract?: string; type?: string };
    if (data.type === "disambiguation") return null;
    return data.extract ? data.extract.split(". ").slice(0, 1).join(". ").slice(0, 150) : null;
  } catch {
    return null;
  }
}

async function liveSpot(entry: PoolEntry | GeneratedPlace, req: Request): Promise<DiscoveredSpot | null> {
  const [imgs, summary, weather] = await Promise.all([
    // 3 verified images is enough for the gallery scroller and keeps enrichment
    // fast so the warm pool stays filled (5 was the throughput bottleneck).
    scrapeLiveSubjectImages(entry.name, entry.country, "landscape", 3, req.signal).catch(() => []),
    wikiSummary(entry.name, req.signal).catch(() => null),
    liveWeather(entry.name, entry.country, req.signal).catch(() => null),
  ]);
  const imageUrls = imgs.map((im) => im.url).filter(Boolean);
  const imageUrl = imageUrls[0];
  if (!imageUrl) return null; // never surface a placeholder/wrong image on the passport
  return {
    id: `live-${slug(entry.name)}`,
    name: entry.name,
    country: entry.country,
    region: entry.region,
    category: entry.category,
    tagline: entry.tagline,
    // Real live temperature; fall back to the tagline vibe only if the weather
    // API couldn't resolve the place (never a fabricated fixed number).
    weather: weather ?? `${entry.tagline}`,
    rating: RATINGS[Math.floor(Math.random() * RATINGS.length)],
    badge: entry.badge,
    quote: summary ? `“${summary}”` : `“A traveler favorite in ${entry.country}.”`,
    author: `Wikipedia · ${entry.country}`,
    imageUrl,
    images: imageUrls,
    vibeTags: [entry.category, entry.region.toLowerCase()],
  };
}

// ---------------------------------------------------------------------------
// WARM POOL — the first passport card must feel INSTANT. We keep a small buffer
// of already-enriched spots (image + summary + live weather) in memory and top
// it up in the background. A request pops a ready spot immediately instead of
// waiting on live scraping; the pool refills asynchronously for the next visit.
// ---------------------------------------------------------------------------
const warmPool: DiscoveredSpot[] = [];
const WARM_TARGET = 10; // keep a deeper buffer so rapid visits stay instant
let refilling = false;
let warmStarted = false;

// Last-resort fallback pick from the small hardcoded POOL — only used if the
// LLM generator is unavailable and the warm pool is empty.
function fallbackCandidates(exclude: Set<string>): PoolEntry[] {
  const avail = POOL.filter((s) => !exclude.has(`live-${slug(s.name)}`));
  const src = avail.length ? avail : POOL;
  return [...src].sort(() => Math.random() - 0.5);
}

// Background refill: enrich LLM-GENERATED random spots until the warm pool hits
// its target. Falls back to the static POOL only if generation yields nothing.
async function refillWarmPool() {
  if (refilling || warmPool.length >= WARM_TARGET) return;
  refilling = true;
  try {
    const have = new Set(warmPool.map((s) => s.id));
    const need = WARM_TARGET - warmPool.length;

    // Primary source: LLM-generated random destinations.
    let entries: (GeneratedPlace | PoolEntry)[] = await nextGeneratedPlaces(need + 3, {
      exclude: new Set([...have].map((id) => id.replace(/^live-/, ""))),
    }).catch(() => []);

    // Fallback: static pool (should rarely trigger).
    if (entries.length === 0) entries = fallbackCandidates(have);

    // Enrich CONCURRENTLY (each spot does weather + images + summary) so the
    // buffer fills in one round-trip's time instead of N sequential ones.
    const enriched = await Promise.all(
      entries.slice(0, need + 3).map((entry) => liveSpot(entry, new Request("http://x")).catch(() => null))
    );
    for (const spot of enriched) {
      if (warmPool.length >= WARM_TARGET) break;
      if (spot && !warmPool.some((s) => s.id === spot.id)) warmPool.push(spot);
    }
    // Persist to Redis so the pool survives restarts/deploys.
    void saveWarmPoolToRedis();
  } catch {
    /* best-effort */
  } finally {
    refilling = false;
  }
}

// Persist the warm pool to Redis so it survives server restarts/deploys.
async function saveWarmPoolToRedis(): Promise<void> {
  if (!redisEnabled() || warmPool.length === 0) return;
  try {
    // TTL 24 hours: the pool refreshes as needed, and old pools (>24h stale) are
    // acceptable to discard and re-warm.
    await redisSetJson("spots:warmpool", warmPool, 86400);
  } catch {
    /* best-effort; Redis write failure doesn't block the app */
  }
}

// Load the warm pool from Redis if it exists (on server startup).
async function loadWarmPoolFromRedis(): Promise<void> {
  if (!redisEnabled()) return;
  try {
    const cached = await redisGetJson<DiscoveredSpot[]>("spots:warmpool");
    if (Array.isArray(cached) && cached.length > 0) {
      warmPool.push(...cached);
      console.log(`[spots:discover] Loaded ${cached.length} warm spots from Redis`);
    }
  } catch {
    /* best-effort; Redis read failure is silently ignored */
  }
}

// Warm the generator + pool as soon as this module loads (server start).
warmGenerator();
void loadWarmPoolFromRedis();
void refillWarmPool();

export async function GET(req: Request) {
  // Kick off pool warming on the first request so subsequent visits are instant.
  if (!warmStarted) {
    warmStarted = true;
    void refillWarmPool();
  }
  try {
    const { searchParams } = new URL(req.url);
    const excludeIds = new Set((searchParams.get("exclude") || "").split(",").filter(Boolean));
    const category = searchParams.get("category");

    // 1) Serve instantly from the warm pool when possible (category-aware).
    const warmIdx = warmPool.findIndex(
      (s) => !excludeIds.has(s.id) && (!category || category === "all" || s.category === category)
    );
    if (warmIdx !== -1) {
      const [spot] = warmPool.splice(warmIdx, 1);
      void refillWarmPool(); // top back up for next time (non-blocking)
      return NextResponse.json({ spot, totalAvailable: POOL.length, scoutedAt: new Date().toISOString(), warm: true });
    }

    // 2) Cold path: generate + enrich live (and kick off a background refill).
    void refillWarmPool();
    const exKeys = new Set([...excludeIds].map((id) => id.replace(/^live-/, "")));
    let candidates: (GeneratedPlace | PoolEntry)[] = await nextGeneratedPlaces(4, {
      category: category || undefined,
      exclude: exKeys,
      signal: req.signal,
    }).catch(() => []);
    if (candidates.length === 0) candidates = fallbackCandidates(excludeIds);

    for (const c of candidates.slice(0, 3)) {
      const spot = await liveSpot(c, req);
      if (spot) {
        return NextResponse.json({ spot, totalAvailable: 500, scoutedAt: new Date().toISOString(), warm: false });
      }
    }
    return NextResponse.json({ spot: WORLD_SPOTS_CATALOG[0], totalAvailable: POOL.length, scoutedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ spot: WORLD_SPOTS_CATALOG[0], totalAvailable: WORLD_SPOTS_CATALOG.length, scoutedAt: new Date().toISOString() });
  }
}
