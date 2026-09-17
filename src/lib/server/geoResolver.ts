// ============================================================================
// LIVE geo resolver — resolves free-text place/region names to real, canonical
// destinations using the internet (Wikipedia REST + MediaWiki geosearch +
// OpenStreetMap Nominatim). NO hardcoded destination tables.
//
// Used to (a) confirm a name is a real place, (b) get its canonical title and
// coordinates, and (c) for regions/ranges, discover the real cities/towns that
// serve as practical travel hubs — all fetched at request time.
// ============================================================================

import { freeWebSearch } from "./freeSearch";

const UA = "TravelismBot/2.1 (travel research; contact travelism.app)";
const WIKI_REST = "https://en.wikipedia.org/api/rest_v1";
const WIKI_API = "https://en.wikipedia.org/w/api.php";
const NOMINATIM = "https://nominatim.openstreetmap.org";

export interface ResolvedPlace {
  /** Canonical title from Wikipedia (e.g. "Appalachian Mountains"). */
  canonicalName: string;
  /** Short display name (e.g. "Appalachian Mountains"). */
  displayName: string;
  lat?: number;
  lon?: number;
  /** How Wikipedia/OSM classifies it (helps decide region vs city). */
  kind: "city" | "region" | "natural" | "landmark" | "country" | "unknown";
  /** Real nearby cities/towns that work as travel hubs (for regions/ranges). */
  hubs: string[];
  /** One-line summary from Wikipedia. */
  summary?: string;
  /** True if we could confirm this is a real place at all. */
  found: boolean;
}

async function j<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Wikipedia REST summary — canonical title, type, coordinates, extract. */
async function wikiSummary(name: string, signal?: AbortSignal) {
  const data = await j<{
    title?: string;
    type?: string;
    extract?: string;
    coordinates?: { lat: number; lon: number };
    description?: string;
  }>(`${WIKI_REST}/page/summary/${encodeURIComponent(name)}`, signal);
  if (!data || data.type === "disambiguation" || !data.title) return null;
  return data;
}

/** Wikipedia full-text search — tolerates misspellings and returns the best
 *  matching real article title (e.g. "american appalachias" → "Appalachia").
 *  Uses the built-in "suggestion" (did-you-mean) when available. Fully live. */
async function wikiFuzzyTitle(name: string, signal?: AbortSignal): Promise<string | null> {
  const url =
    `${WIKI_API}?action=query&format=json&list=search&srlimit=1&srinfo=suggestion&srprop=&origin=*` +
    `&srsearch=${encodeURIComponent(name)}`;
  const data = await j<{
    query?: { search?: Array<{ title: string }>; searchinfo?: { suggestion?: string } };
  }>(url, signal);
  return data?.query?.search?.[0]?.title || data?.query?.searchinfo?.suggestion || null;
}

/** OSM Nominatim — robust real-place confirmation + classification + bbox. */
async function osmLookup(name: string, signal?: AbortSignal) {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(name)}&format=jsonv2&limit=1&extratags=1&addressdetails=1`;
  const arr = await j<
    Array<{
      lat: string;
      lon: string;
      name?: string;
      display_name?: string;
      type?: string;
      class?: string;
      addresstype?: string;
    }>
  >(url, signal);
  return arr && arr.length ? arr[0] : null;
}

function classifyKind(osmClass?: string, osmType?: string, wikiDesc?: string): ResolvedPlace["kind"] {
  const c = (osmClass || "").toLowerCase();
  const t = (osmType || "").toLowerCase();
  const d = (wikiDesc || "").toLowerCase();
  if (c === "boundary" && t === "administrative") {
    if (/country/.test(d)) return "country";
    return "region";
  }
  if (c === "natural" || /mountain range|mountains|range|massif|valley|plateau|coast|desert|forest/.test(d))
    return "natural";
  if (c === "place" && /(city|town|village|municipality|suburb)/.test(t)) return "city";
  if (/city|town|capital/.test(d)) return "city";
  if (/national park|monument|landmark|temple|castle|fort|waterfall|lake|peak/.test(d)) return "landmark";
  if (/region|province|state|area|county/.test(d)) return "region";
  return "unknown";
}

/**
 * For a region/natural feature, discover real nearby cities/towns to use as
 * travel hubs via MediaWiki geosearch (returns real place articles near a
 * coordinate), filtered to populated places using their Wikipedia summaries.
 */
async function discoverHubsNear(lat: number, lon: number, signal?: AbortSignal): Promise<string[]> {
  // geosearch: nearby geotagged Wikipedia articles within a wide radius
  const url =
    `${WIKI_API}?action=query&format=json&list=geosearch&origin=*` +
    `&gscoord=${lat}%7C${lon}&gsradius=10000&gslimit=60`;
  const data = await j<{ query?: { geosearch?: Array<{ title: string; lat: number; lon: number; dist: number }> } }>(
    url,
    signal
  );
  const candidates = data?.query?.geosearch ?? [];
  if (candidates.length === 0) return [];

  // Confirm which candidates are actual populated places (cities/towns) via
  // their summaries — keep only real settlements, not peaks/rivers/parks.
  // Score by settlement rank (city > town > village) so bigger hubs win.
  const checked = await Promise.all(
    candidates.slice(0, 40).map(async (g) => {
      const s = await wikiSummary(g.title, signal);
      const desc = (s?.description ?? "").toLowerCase();
      const extract = (s?.extract ?? "").slice(0, 160).toLowerCase();
      const blob = `${desc} ${extract}`;
      const isNonHub = /\b(mountain|peak|river|lake|national park|state park|forest|trail|summit|ridge|falls?|glacier|valley|reservoir|creek)\b/.test(
        desc
      );
      if (isNonHub) return null;
      let rank = 0;
      if (/\bcity\b/.test(blob)) rank = 3;
      else if (/\btown\b/.test(blob)) rank = 2;
      else if (/\b(village|municipality|county seat|borough|community)\b/.test(blob)) rank = 1;
      if (rank === 0) return null;
      return { title: s?.title ?? g.title, rank, dist: g.dist };
    })
  );
  const hubs = checked
    .filter((x): x is { title: string; rank: number; dist: number } => Boolean(x))
    .sort((a, b) => b.rank - a.rank || a.dist - b.dist);
  // de-dup by title
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of hubs) {
    if (!seen.has(h.title)) {
      seen.add(h.title);
      out.push(h.title);
    }
    if (out.length >= 5) break;
  }
  return out;
}

/**
 * Live web search to discover the real hub cities for a region. Reads actual
 * travel articles ("best cities/towns to visit in <region>"), extracts
 * candidate place names, and confirms each is a real settlement via Wikipedia.
 * Fully internet-sourced — no static destination tables.
 */
async function discoverHubsViaWeb(region: string, signal?: AbortSignal): Promise<string[]> {
  // Free web search first (DuckDuckGo); only falls back to Tavily if configured
  // and DDG is thin — keeps region decomposition zero-cost by default.
  let results;
  try {
    results = await freeWebSearch(`best cities and towns to visit in ${region} for travelers`, 8, signal);
  } catch {
    return [];
  }
  const text = results.map((r) => `${r.title}. ${r.snippet}`).join("  ");
  if (!text) return [];

  // Extract candidate proper-noun place names (1-3 capitalized words).
  const raw = text.match(/\b([A-Z][a-zâàéèA-Za-z'-]+(?:\s+[A-Z][a-zâàéèA-Za-z'-]+){0,2})\b/g) ?? [];
  const STOP = new Set([
    "The","A","An","This","That","These","Those","Best","Top","Visit","Travel","Guide","Things","Places",
    "Where","When","How","Why","Day","Trip","Tour","Region","Area","Mountains","Mountain","National","Park",
    "You","Your","We","Our","Here","There","North","South","East","West","And","Or","For","With","Of","In","On",
  ]);
  const freq = new Map<string, number>();
  for (const m of raw) {
    const clean = m.trim();
    if (clean.length < 3) continue;
    if (STOP.has(clean.split(/\s+/)[0])) continue;
    if (clean.toLowerCase() === region.toLowerCase()) continue;
    freq.set(clean, (freq.get(clean) ?? 0) + 1);
  }
  // Most-mentioned candidates first
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 14);

  // Confirm each is a real settlement (city/town) via Wikipedia summary.
  const confirmed = await Promise.all(
    ranked.map(async (cand) => {
      const s = await wikiSummary(cand, signal);
      const desc = (s?.description ?? "").toLowerCase();
      const isSettlement = /\b(city|town|village|municipality|commune|comune|county seat|capital|borough)\b/.test(desc);
      return isSettlement ? s?.title ?? cand : null;
    })
  );
  const seen = new Set<string>();
  const hubs: string[] = [];
  for (const h of confirmed) {
    if (h && !seen.has(h)) {
      seen.add(h);
      hubs.push(h);
    }
    if (hubs.length >= 5) break;
  }
  return hubs;
}

/**
 * Resolve a free-text destination/region name to a real place using the
 * internet. Returns canonical name, classification, and — for regions — a set
 * of real hub cities discovered live. No static tables.
 */
export async function resolveLivePlace(rawName: string, signal?: AbortSignal): Promise<ResolvedPlace> {
  const name = (rawName || "").trim();
  const empty: ResolvedPlace = {
    canonicalName: name,
    displayName: name,
    kind: "unknown",
    hubs: [],
    found: false,
  };
  if (!name) return empty;

  let [wiki, osm] = await Promise.all([wikiSummary(name, signal), osmLookup(name, signal)]);

  // Direct lookups missed (often a misspelling) → try a fuzzy Wikipedia title
  // suggestion and re-resolve against the corrected name. Fully live.
  if (!wiki && !osm) {
    const fuzzy = await wikiFuzzyTitle(name, signal);
    if (fuzzy && fuzzy.toLowerCase() !== name.toLowerCase()) {
      [wiki, osm] = await Promise.all([wikiSummary(fuzzy, signal), osmLookup(fuzzy, signal)]);
    }
  }

  // Neither source confirms a real place → not found (caller asks to clarify).
  if (!wiki && !osm) return empty;

  const canonicalName = wiki?.title || osm?.name || name;
  const lat = wiki?.coordinates?.lat ?? (osm ? parseFloat(osm.lat) : undefined);
  const lon = wiki?.coordinates?.lon ?? (osm ? parseFloat(osm.lon) : undefined);
  const kind = classifyKind(osm?.class, osm?.type ?? osm?.addresstype, wiki?.description);

  let hubs: string[] = [];
  // Regions & natural features (mountain ranges, valleys, coasts) aren't a
  // single searchable hub — discover the real hub cities live. Prefer reading
  // actual travel articles (web search); fall back to coordinate geosearch.
  if (kind === "region" || kind === "natural" || kind === "country") {
    hubs = await discoverHubsViaWeb(canonicalName, signal).catch(() => []);
    if (hubs.length === 0 && lat != null && lon != null) {
      hubs = await discoverHubsNear(lat, lon, signal).catch(() => []);
    }
  }

  return {
    canonicalName,
    displayName: canonicalName,
    lat,
    lon,
    kind,
    hubs,
    summary: wiki?.extract,
    found: true,
  };
}
