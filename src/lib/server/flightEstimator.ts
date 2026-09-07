import "server-only";
import type { FlightOption } from "../types";

// ============================================================================
// Honest, route-aware flight ESTIMATOR (no live-fare API).
// Computes a plausible duration, stop count and fare band from the great-circle
// distance between the origin and the destination gateway. Clearly labeled as
// an estimate. Route-context enrichment (Tavily) can refine these numbers.
// ============================================================================

interface Coord {
  lat: number;
  lng: number;
}

// Compact coordinate table: major Indian + world hubs. Keys are lowercase.
// Unknown cities fall back to a country/region centroid, then a wide estimate.
const COORDS: Record<string, Coord> = {
  // India — metros & gateways
  delhi: { lat: 28.56, lng: 77.1 },
  "new delhi": { lat: 28.56, lng: 77.1 },
  mumbai: { lat: 19.09, lng: 72.87 },
  bengaluru: { lat: 13.2, lng: 77.71 },
  bangalore: { lat: 13.2, lng: 77.71 },
  hyderabad: { lat: 17.24, lng: 78.43 },
  chennai: { lat: 12.99, lng: 80.17 },
  kolkata: { lat: 22.65, lng: 88.45 },
  pune: { lat: 18.58, lng: 73.92 },
  ahmedabad: { lat: 23.07, lng: 72.63 },
  goa: { lat: 15.38, lng: 73.83 },
  kochi: { lat: 10.15, lng: 76.39 },
  cochin: { lat: 10.15, lng: 76.39 },
  jaipur: { lat: 26.82, lng: 75.81 },
  lucknow: { lat: 26.76, lng: 80.89 },
  guwahati: { lat: 26.11, lng: 91.59 },
  srinagar: { lat: 33.99, lng: 74.77 },
  leh: { lat: 34.14, lng: 77.55 },
  bagdogra: { lat: 26.68, lng: 88.33 },
  dehradun: { lat: 30.19, lng: 78.18 },
  chandigarh: { lat: 30.67, lng: 76.79 },
  mangaluru: { lat: 12.96, lng: 74.89 },
  mangalore: { lat: 12.96, lng: 74.89 },
  varanasi: { lat: 25.45, lng: 82.86 },
  udaipur: { lat: 24.62, lng: 73.9 },
  bhubaneswar: { lat: 20.24, lng: 85.82 },
  // world hubs
  london: { lat: 51.47, lng: -0.45 },
  paris: { lat: 49.01, lng: 2.55 },
  "new york": { lat: 40.64, lng: -73.78 },
  dubai: { lat: 25.25, lng: 55.36 },
  singapore: { lat: 1.36, lng: 103.99 },
  "san francisco": { lat: 37.62, lng: -122.38 },
  toronto: { lat: 43.68, lng: -79.61 },
  sydney: { lat: -33.95, lng: 151.18 },
  tokyo: { lat: 35.55, lng: 139.78 },
  frankfurt: { lat: 50.04, lng: 8.56 },
  doha: { lat: 25.27, lng: 51.61 },
  bangkok: { lat: 13.69, lng: 100.75 },
  "kuala lumpur": { lat: 2.75, lng: 101.71 },
  colombo: { lat: 7.18, lng: 79.88 },
  kathmandu: { lat: 27.7, lng: 85.36 },
};

// India centroid fallback for unknown Indian-sounding places.
const INDIA_CENTROID: Coord = { lat: 22.0, lng: 79.0 };

function normalizeCity(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/airport|international|intl|city/g, "")
    .trim();
}

export function lookupCoord(raw: string): { coord: Coord; known: boolean } {
  const key = normalizeCity(raw);
  if (COORDS[key]) return { coord: COORDS[key], known: true };
  // try first word (e.g. "Bengaluru Kempegowda")
  const first = key.split(/\s+/)[0];
  if (COORDS[first]) return { coord: COORDS[first], known: true };
  return { coord: INDIA_CENTROID, known: false };
}

function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RouteEstimate {
  distanceKm: number;
  known: boolean;
  domestic: boolean;
  durationHours: number; // total incl. typical connection time
  stops: number;
  stopHint: string;
  fareLow: number;
  fareHigh: number;
}

/** Rough hub used for connection labeling based on region. */
function likelyHubs(origin: Coord, distanceKm: number): string {
  if (distanceKm < 2500) return "Delhi / Mumbai";
  if (origin.lng < 40) return "Doha / Dubai / a European hub"; // west of India
  if (origin.lng > 110) return "Bangkok / Singapore / Delhi"; // east
  return "Delhi / Dubai";
}

export function estimateRoute(originRaw: string, gatewayRaw: string): RouteEstimate {
  const o = lookupCoord(originRaw);
  const g = lookupCoord(gatewayRaw);
  const distanceKm = Math.round(haversineKm(o.coord, g.coord));
  const known = o.known && g.known;

  // Domestic if both resolve within India-ish lng/lat box.
  const inIndia = (c: Coord) => c.lat > 6 && c.lat < 37 && c.lng > 68 && c.lng < 98;
  const domestic = inIndia(o.coord) && inIndia(g.coord);

  // Flight time: cruise ~750 km/h + fixed taxi/climb overhead; add connection time.
  const airHours = distanceKm / 750 + 0.6;
  let stops = 0;
  let connectionHours = 0;
  if (distanceKm > 1400) {
    stops = 1;
    connectionHours = 1.5;
  }
  if (distanceKm > 6500) {
    stops = 2;
    connectionHours = 3.5;
  }
  // Domestic Indian routes to hill gateways almost always have 1 stop.
  if (domestic && distanceKm > 900 && stops === 0) {
    stops = 1;
    connectionHours = 1.0;
  }
  const durationHours = Math.round((airHours + connectionHours) * 10) / 10;

  // Fare band: per-km rates differ domestic vs international; round trip is 2x
  // one-way but we quote per-person one leg here (card shows per person).
  const perKm = domestic ? 4.2 : 3.0;
  const base = Math.max(domestic ? 2500 : 22000, distanceKm * perKm);
  const fareLow = Math.round((base * 0.8) / 100) * 100;
  const fareHigh = Math.round((base * 1.5) / 100) * 100;

  return {
    distanceKm,
    known,
    domestic,
    durationHours,
    stops,
    stopHint: stops === 0 ? "Nonstop" : `via ${likelyHubs(o.coord, distanceKm)}`,
    fareLow,
    fareHigh,
  };
}

function fmtDuration(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h${mins ? ` ${mins}m` : ""}`;
}

/** Build outbound + return flight estimates for origin → gateway. */
export function buildRouteFlights(
  originRaw: string,
  gatewayRaw: string,
  est: RouteEstimate,
  sourceId: string
): FlightOption[] {
  const origin = originRaw.trim() || "Your city";
  const gw = gatewayRaw.split(/[(,]/)[0].trim();
  const dur = fmtDuration(est.durationHours);
  const carrier = est.domestic ? "Multiple carriers" : "International carriers";
  const baggage = est.domestic ? "15 kg check-in · 7 kg cabin" : "23–30 kg check-in · 7 kg cabin";
  const cabin = "Economy";

  const mk = (id: string, from: string, to: string, depart: string, arrive: string, early: boolean): FlightOption => ({
    id,
    airline: carrier,
    flightNo: "est",
    from,
    to,
    depart,
    arrive,
    layover: est.stopHint,
    baggage,
    fare: Math.round((est.fareLow + est.fareHigh) / 2),
    sourceId,
    earlyMorning: early,
    duration: dur,
    stops: est.stops,
    stopDetail: est.stops === 0 ? "Nonstop" : est.stopHint,
    cabin,
    refundable: false,
    fareLow: est.fareLow,
    fareHigh: est.fareHigh,
    estimated: true,
    onTime: 80,
  });

  // Simple plausible clock times; duration is the real signal.
  return [
    mk("flight_out_1", origin, gw, "08:30", arriveClock("08:30", est.durationHours), false),
    mk("flight_out_2", origin, gw, "20:15", arriveClock("20:15", est.durationHours), false),
    mk("flight_ret_1", gw, origin, "10:00", arriveClock("10:00", est.durationHours), false),
    mk("flight_ret_2", gw, origin, "22:40", arriveClock("22:40", est.durationHours), false),
  ];
}

function arriveClock(depart: string, durH: number): string {
  const [h, m] = depart.split(":").map(Number);
  const total = (h * 60 + m + Math.round(durH * 60)) % (24 * 60);
  const label = total < h * 60 + m ? " (+1d)" : "";
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}${label}`;
}
