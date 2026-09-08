import "server-only";
import type { FlightOption } from "../types";

// ============================================================================
// Global route-aware flight ESTIMATOR & AIRLINE DISPATCHER
// Computes realistic duration, stops, connecting hubs, authentic airlines,
// baggage allowances, and market-accurate fare bands for domestic and
// international routes worldwide.
// ============================================================================

interface Coord {
  lat: number;
  lng: number;
}

// Comprehensive coordinate table: major Indian cities + world gateways & tourist hubs.
const COORDS: Record<string, Coord> = {
  // --- India: Metros & Gateways ---
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
  dabolim: { lat: 15.38, lng: 73.83 },
  mopa: { lat: 15.75, lng: 73.87 },
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
  amritsar: { lat: 31.71, lng: 74.8 },
  indore: { lat: 22.72, lng: 75.8 },
  coimbatore: { lat: 11.03, lng: 77.04 },
  visakhapatnam: { lat: 17.72, lng: 83.22 },
  vizag: { lat: 17.72, lng: 83.22 },
  patna: { lat: 25.59, lng: 85.09 },
  thiruvananthapuram: { lat: 8.48, lng: 76.92 },
  trivandrum: { lat: 8.48, lng: 76.92 },
  "port blair": { lat: 11.64, lng: 92.73 },
  andaman: { lat: 11.64, lng: 92.73 },
  tawang: { lat: 27.59, lng: 91.86 },
  ladakh: { lat: 34.14, lng: 77.55 },
  kashmir: { lat: 33.99, lng: 74.77 },
  coorg: { lat: 12.34, lng: 75.8 },
  meghalaya: { lat: 25.57, lng: 91.88 },
  shillong: { lat: 25.57, lng: 91.88 },
  munnar: { lat: 10.09, lng: 77.06 },
  ooty: { lat: 11.41, lng: 76.69 },
  manali: { lat: 32.24, lng: 77.19 },
  shimla: { lat: 31.1, lng: 77.17 },
  rishikesh: { lat: 30.08, lng: 78.26 },

  // --- North America: USA, Canada, Caribbean, Mexico ---
  miami: { lat: 25.79, lng: -80.29 },
  "miami beach": { lat: 25.79, lng: -80.29 },
  "fort lauderdale": { lat: 26.07, lng: -80.15 },
  orlando: { lat: 28.43, lng: -81.31 },
  tampa: { lat: 27.97, lng: -82.53 },
  florida: { lat: 27.99, lng: -81.76 },
  "key west": { lat: 24.55, lng: -81.75 },
  "new york": { lat: 40.64, lng: -73.78 },
  nyc: { lat: 40.64, lng: -73.78 },
  jfk: { lat: 40.64, lng: -73.78 },
  newark: { lat: 40.69, lng: -74.17 },
  boston: { lat: 42.36, lng: -71.01 },
  "washington dc": { lat: 38.95, lng: -77.45 },
  washington: { lat: 38.95, lng: -77.45 },
  chicago: { lat: 41.97, lng: -87.9 },
  atlanta: { lat: 33.64, lng: -84.42 },
  dallas: { lat: 32.89, lng: -97.04 },
  houston: { lat: 29.99, lng: -95.34 },
  austin: { lat: 30.19, lng: -97.67 },
  denver: { lat: 39.85, lng: -104.67 },
  "las vegas": { lat: 36.08, lng: -115.15 },
  vegas: { lat: 36.08, lng: -115.15 },
  phoenix: { lat: 33.43, lng: -112.01 },
  "los angeles": { lat: 33.94, lng: -118.41 },
  la: { lat: 33.94, lng: -118.41 },
  lax: { lat: 33.94, lng: -118.41 },
  "san francisco": { lat: 37.62, lng: -122.38 },
  sfo: { lat: 37.62, lng: -122.38 },
  "san diego": { lat: 32.73, lng: -117.19 },
  seattle: { lat: 47.45, lng: -122.31 },
  hawaii: { lat: 21.32, lng: -157.92 },
  honolulu: { lat: 21.32, lng: -157.92 },
  toronto: { lat: 43.68, lng: -79.61 },
  vancouver: { lat: 49.19, lng: -123.18 },
  montreal: { lat: 45.47, lng: -73.74 },
  "mexico city": { lat: 19.43, lng: -99.07 },
  cancun: { lat: 21.04, lng: -86.87 },
  nassau: { lat: 25.04, lng: -77.46 },
  bahamas: { lat: 25.04, lng: -77.46 },
  "san juan": { lat: 18.44, lng: -66.0 },
  "puerto rico": { lat: 18.44, lng: -66.0 },

  // --- Europe ---
  london: { lat: 51.47, lng: -0.45 },
  heathrow: { lat: 51.47, lng: -0.45 },
  gatwick: { lat: 51.15, lng: -0.19 },
  paris: { lat: 49.01, lng: 2.55 },
  cdg: { lat: 49.01, lng: 2.55 },
  rome: { lat: 41.8, lng: 12.24 },
  milan: { lat: 45.63, lng: 8.72 },
  venice: { lat: 45.5, lng: 12.35 },
  florence: { lat: 43.81, lng: 11.2 },
  madrid: { lat: 40.49, lng: -3.56 },
  barcelona: { lat: 41.3, lng: 2.08 },
  lisbon: { lat: 38.77, lng: -9.13 },
  amsterdam: { lat: 52.31, lng: 4.76 },
  schiphol: { lat: 52.31, lng: 4.76 },
  frankfurt: { lat: 50.04, lng: 8.56 },
  munich: { lat: 48.35, lng: 11.78 },
  berlin: { lat: 52.37, lng: 13.5 },
  zurich: { lat: 47.46, lng: 8.55 },
  geneva: { lat: 46.24, lng: 6.11 },
  switzerland: { lat: 47.46, lng: 8.55 },
  vienna: { lat: 48.11, lng: 16.57 },
  prague: { lat: 50.1, lng: 14.26 },
  budapest: { lat: 47.44, lng: 19.26 },
  athens: { lat: 37.94, lng: 23.94 },
  santorini: { lat: 36.4, lng: 25.43 },
  greece: { lat: 37.94, lng: 23.94 },
  istanbul: { lat: 41.28, lng: 28.73 },
  turkey: { lat: 41.28, lng: 28.73 },
  dublin: { lat: 53.42, lng: -6.27 },
  edinburgh: { lat: 55.95, lng: -3.37 },
  scotland: { lat: 55.95, lng: -3.37 },
  copenhagen: { lat: 55.62, lng: 12.65 },
  stockholm: { lat: 59.65, lng: 17.92 },
  oslo: { lat: 60.19, lng: 11.1 },
  helsinki: { lat: 60.32, lng: 24.96 },
  dubrovnik: { lat: 42.56, lng: 18.27 },
  croatia: { lat: 42.56, lng: 18.27 },
  reykjavik: { lat: 63.98, lng: -22.6 },
  iceland: { lat: 63.98, lng: -22.6 },

  // --- Middle East & Central Asia ---
  dubai: { lat: 25.25, lng: 55.36 },
  dxb: { lat: 25.25, lng: 55.36 },
  "abu dhabi": { lat: 24.43, lng: 54.65 },
  doha: { lat: 25.27, lng: 51.61 },
  muscat: { lat: 23.59, lng: 58.28 },
  oman: { lat: 23.59, lng: 58.28 },
  riyadh: { lat: 24.96, lng: 46.7 },
  jeddah: { lat: 21.68, lng: 39.15 },
  "kuwait city": { lat: 29.23, lng: 47.98 },
  manama: { lat: 26.27, lng: 50.63 },
  bahrain: { lat: 26.27, lng: 50.63 },
  "tel aviv": { lat: 32.01, lng: 34.88 },
  cairo: { lat: 30.12, lng: 31.4 },
  egypt: { lat: 30.12, lng: 31.4 },

  // --- East Asia, SE Asia & Oceania ---
  singapore: { lat: 1.36, lng: 103.99 },
  changi: { lat: 1.36, lng: 103.99 },
  bangkok: { lat: 13.69, lng: 100.75 },
  thailand: { lat: 13.69, lng: 100.75 },
  phuket: { lat: 8.11, lng: 98.31 },
  "koh samui": { lat: 9.55, lng: 100.06 },
  "chiang mai": { lat: 18.77, lng: 98.96 },
  "kuala lumpur": { lat: 2.75, lng: 101.71 },
  malaysia: { lat: 2.75, lng: 101.71 },
  penang: { lat: 5.3, lng: 100.27 },
  bali: { lat: -8.75, lng: 115.17 },
  denpasar: { lat: -8.75, lng: 115.17 },
  indonesia: { lat: -8.75, lng: 115.17 },
  jakarta: { lat: -6.13, lng: 106.66 },
  tokyo: { lat: 35.55, lng: 139.78 },
  narita: { lat: 35.76, lng: 140.39 },
  haneda: { lat: 35.55, lng: 139.78 },
  japan: { lat: 35.55, lng: 139.78 },
  osaka: { lat: 34.43, lng: 135.24 },
  kyoto: { lat: 34.43, lng: 135.24 },
  seoul: { lat: 37.46, lng: 126.44 },
  incheon: { lat: 37.46, lng: 126.44 },
  korea: { lat: 37.46, lng: 126.44 },
  "hong kong": { lat: 22.31, lng: 113.91 },
  taipei: { lat: 25.08, lng: 121.23 },
  taiwan: { lat: 25.08, lng: 121.23 },
  manila: { lat: 14.51, lng: 121.02 },
  philippines: { lat: 14.51, lng: 121.02 },
  hanoi: { lat: 21.22, lng: 105.81 },
  "ho chi minh city": { lat: 10.82, lng: 106.65 },
  vietnam: { lat: 10.82, lng: 106.65 },
  "da nang": { lat: 16.04, lng: 108.2 },
  "siem reap": { lat: 13.41, lng: 103.81 },
  colombo: { lat: 7.18, lng: 79.88 },
  "sri lanka": { lat: 7.18, lng: 79.88 },
  male: { lat: 4.19, lng: 73.53 },
  maldives: { lat: 4.19, lng: 73.53 },
  kathmandu: { lat: 27.7, lng: 85.36 },
  nepal: { lat: 27.7, lng: 85.36 },
  bhutan: { lat: 27.4, lng: 89.42 },
  paro: { lat: 27.4, lng: 89.42 },
  sydney: { lat: -33.95, lng: 151.18 },
  melbourne: { lat: -37.67, lng: 144.84 },
  australia: { lat: -33.95, lng: 151.18 },
  auckland: { lat: -37.01, lng: 174.79 },
  "new zealand": { lat: -37.01, lng: 174.79 },
  fiji: { lat: -17.76, lng: 177.44 },

  // --- South America & Africa ---
  "rio de janeiro": { lat: -22.81, lng: -43.25 },
  "sao paulo": { lat: -23.43, lng: -46.47 },
  brazil: { lat: -22.81, lng: -43.25 },
  "buenos aires": { lat: -34.82, lng: -58.54 },
  argentina: { lat: -34.82, lng: -58.54 },
  lima: { lat: -12.02, lng: -77.11 },
  peru: { lat: -12.02, lng: -77.11 },
  "cape town": { lat: -33.96, lng: 18.6 },
  johannesburg: { lat: -26.14, lng: 28.25 },
  "south africa": { lat: -33.96, lng: 18.6 },
  nairobi: { lat: -1.32, lng: 36.93 },
  kenya: { lat: -1.32, lng: 36.93 },
  zanzibar: { lat: -6.22, lng: 39.22 },
  tanzania: { lat: -6.22, lng: 39.22 },
  casablanca: { lat: 33.37, lng: -7.59 },
  morocco: { lat: 33.37, lng: -7.59 },
  marrakech: { lat: 31.61, lng: -8.04 },
};

// Regional centroid fallbacks (to guarantee international destinations never default to India)
const REGION_FALLBACKS: { pattern: RegExp; coord: Coord }[] = [
  { pattern: /us|usa|united states|america|florida|california|texas|new york/i, coord: { lat: 37.09, lng: -95.71 } },
  { pattern: /europe|uk|britain|england|france|italy|spain|germany|swiss/i, coord: { lat: 48.85, lng: 10.0 } },
  { pattern: /asia|se asia|thailand|indonesia|japan|korea|vietnam|malaysia/i, coord: { lat: 15.87, lng: 100.99 } },
  { pattern: /middle east|uae|dubai|arabia|qatar|oman/i, coord: { lat: 25.0, lng: 45.0 } },
  { pattern: /australia|oceania|new zealand/i, coord: { lat: -25.27, lng: 133.77 } },
  { pattern: /africa|kenya|egypt|morocco|south africa/i, coord: { lat: 0.0, lng: 25.0 } },
  { pattern: /latin america|south america|brazil|peru|caribbean/i, coord: { lat: -14.23, lng: -51.92 } },
];

const INDIA_CENTROID: Coord = { lat: 22.0, lng: 79.0 };

function normalizeCity(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/airport|international|intl|city|county|island|resort|beach/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
}

export function lookupCoord(raw: string): { coord: Coord; known: boolean } {
  if (!raw || !raw.trim()) return { coord: INDIA_CENTROID, known: false };
  const key = normalizeCity(raw);
  if (COORDS[key]) return { coord: COORDS[key], known: true };

  // Try substring / first 2 words
  const words = key.split(/\s+/);
  for (let i = words.length; i >= 1; i--) {
    const sub = words.slice(0, i).join(" ");
    if (COORDS[sub]) return { coord: COORDS[sub], known: true };
  }
  // Try matching any entry containing the key
  for (const [k, v] of Object.entries(COORDS)) {
    if (k.includes(key) || key.includes(k)) return { coord: v, known: true };
  }

  // Check regional fallback
  for (const rf of REGION_FALLBACKS) {
    if (rf.pattern.test(raw)) return { coord: rf.coord, known: true };
  }

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

/** Identify connecting hubs based on geographic sectors */
function determineConnectingHubs(o: Coord, g: Coord, distanceKm: number, domestic: boolean): { stops: number; hub: string; connectionHours: number } {
  if (domestic) {
    if (distanceKm < 1000) return { stops: 0, hub: "Nonstop", connectionHours: 0 };
    if (distanceKm < 2200) return { stops: 1, hub: "via Delhi / Mumbai / Kolkata", connectionHours: 1.5 };
    return { stops: 1, hub: "via Delhi / Kolkata", connectionHours: 2.0 };
  }

  // International:
  // Long haul North America (e.g. India to US / Miami ~14,000 km)
  if (distanceKm > 10000) {
    // 1-stop via Gulf / Europe is the standard route for India -> US
    const viaHub = o.lng > 70 ? "via Dubai (DXB) / Doha (DOH)" : "via London (LHR) / Frankfurt (FRA)";
    return { stops: 1, hub: viaHub, connectionHours: 4.5 };
  }

  // Medium haul Europe / UK (~6,000 - 9,000 km)
  if (distanceKm > 5500) {
    return { stops: 1, hub: "via Doha / Dubai / Vienna", connectionHours: 2.5 };
  }

  // Regional Asia / Middle East (~2,500 - 5,500 km)
  if (distanceKm > 2500) {
    if (g.lng > 95) return { stops: 0, hub: "Nonstop or via Singapore / Bangkok", connectionHours: 1.0 };
    return { stops: 0, hub: "Nonstop or via Dubai", connectionHours: 1.0 };
  }

  return { stops: 0, hub: "Nonstop", connectionHours: 0 };
}

export function estimateRoute(originRaw: string, gatewayRaw: string): RouteEstimate {
  const o = lookupCoord(originRaw);
  const g = lookupCoord(gatewayRaw);
  const distanceKm = Math.max(300, Math.round(haversineKm(o.coord, g.coord)));
  const known = o.known && g.known;

  // Domestic if both resolve within India-ish bounding box
  const inIndia = (c: Coord) => c.lat > 6 && c.lat < 37 && c.lng > 68 && c.lng < 98;
  const domestic = inIndia(o.coord) && inIndia(g.coord);

  const { stops, hub, connectionHours } = determineConnectingHubs(o.coord, g.coord, distanceKm, domestic);

  // Flight time: cruise ~820 km/h + 45 min takeoff/descent/taxi
  const airHours = distanceKm / 820 + 0.75;
  const durationHours = Math.round((airHours + connectionHours) * 10) / 10;

  // Market-accurate Fare Modeling:
  // - Domestic: base ~₹3,500 to ₹9,500
  // - Regional International (Dubai/SE Asia): ~₹16,000 to ₹35,000 one-way
  // - Long-haul Europe: ~₹32,000 to ₹65,000 one-way
  // - Ultra Long-haul USA / Miami / Australia: ~₹55,000 to ₹1,10,000 one-way (₹1.1L - ₹2.2L round trip)
  let baseFare: number;
  if (domestic) {
    baseFare = Math.max(3200, Math.min(12000, 2500 + distanceKm * 3.2));
  } else if (distanceKm < 4500) {
    baseFare = Math.max(14000, 10000 + distanceKm * 3.8);
  } else if (distanceKm < 8500) {
    baseFare = Math.max(30000, 18000 + distanceKm * 4.2);
  } else {
    // Ultra long haul (India to Americas)
    baseFare = Math.max(52000, 25000 + distanceKm * 4.1);
  }

  const fareLow = Math.round((baseFare * 0.85) / 500) * 500;
  const fareHigh = Math.round((baseFare * 1.35) / 500) * 500;

  return {
    distanceKm,
    known,
    domestic,
    durationHours,
    stops,
    stopHint: hub,
    fareLow,
    fareHigh,
  };
}

function fmtDuration(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h${mins ? ` ${mins}m` : ""}`;
}

interface AirlineSpec {
  name: string;
  code: string;
  cabin: string;
  onTime: number;
  baggage: string;
  fareMultiplier: number;
}

function getAirlinesForSector(domestic: boolean, distanceKm: number): AirlineSpec[] {
  if (domestic) {
    return [
      { name: "IndiGo", code: "6E", cabin: "Economy", onTime: 86, baggage: "15 kg check-in · 7 kg cabin", fareMultiplier: 0.95 },
      { name: "Air India", code: "AI", cabin: "Economy", onTime: 80, baggage: "20 kg check-in · 7 kg cabin", fareMultiplier: 1.05 },
      { name: "Akasa Air", code: "QP", cabin: "Economy", onTime: 84, baggage: "15 kg check-in · 7 kg cabin", fareMultiplier: 0.9 },
      { name: "SpiceJet", code: "SG", cabin: "Economy", onTime: 75, baggage: "15 kg check-in · 7 kg cabin", fareMultiplier: 0.88 },
    ];
  }

  if (distanceKm > 9000) {
    // Long-haul / USA / Americas / Australia
    return [
      { name: "Emirates", code: "EK", cabin: "Economy", onTime: 88, baggage: "2 x 23 kg check-in · 7 kg cabin", fareMultiplier: 1.08 },
      { name: "Qatar Airways", code: "QR", cabin: "Economy", onTime: 89, baggage: "2 x 23 kg check-in · 7 kg cabin", fareMultiplier: 1.04 },
      { name: "British Airways", code: "BA", cabin: "Economy", onTime: 82, baggage: "23 kg check-in · 7 kg cabin", fareMultiplier: 0.98 },
      { name: "Air India", code: "AI", cabin: "Economy", onTime: 78, baggage: "2 x 23 kg check-in · 8 kg cabin", fareMultiplier: 0.92 },
      { name: "Lufthansa", code: "LH", cabin: "Economy", onTime: 84, baggage: "23 kg check-in · 8 kg cabin", fareMultiplier: 1.06 },
    ];
  }

  if (distanceKm > 4500) {
    // Europe / UK
    return [
      { name: "Qatar Airways", code: "QR", cabin: "Economy", onTime: 89, baggage: "25 kg check-in · 7 kg cabin", fareMultiplier: 1.05 },
      { name: "Emirates", code: "EK", cabin: "Economy", onTime: 88, baggage: "25 kg check-in · 7 kg cabin", fareMultiplier: 1.08 },
      { name: "Air India", code: "AI", cabin: "Economy", onTime: 79, baggage: "25 kg check-in · 7 kg cabin", fareMultiplier: 0.92 },
      { name: "Lufthansa", code: "LH", cabin: "Economy", onTime: 85, baggage: "23 kg check-in · 8 kg cabin", fareMultiplier: 1.02 },
    ];
  }

  // SE Asia / Middle East
  return [
    { name: "Singapore Airlines", code: "SQ", cabin: "Economy", onTime: 92, baggage: "25 kg check-in · 7 kg cabin", fareMultiplier: 1.15 },
    { name: "Emirates", code: "EK", cabin: "Economy", onTime: 88, baggage: "25 kg check-in · 7 kg cabin", fareMultiplier: 1.08 },
    { name: "IndiGo International", code: "6E", cabin: "Economy", onTime: 85, baggage: "20 kg check-in · 7 kg cabin", fareMultiplier: 0.85 },
    { name: "Thai Airways", code: "TG", cabin: "Economy", onTime: 83, baggage: "20 kg check-in · 7 kg cabin", fareMultiplier: 0.96 },
  ];
}

/** Build rich outbound + return flight options for origin → gateway. */
export function buildRouteFlights(
  originRaw: string,
  gatewayRaw: string,
  est: RouteEstimate,
  sourceId: string
): FlightOption[] {
  const origin = originRaw.trim() || "Your city";
  const gw = gatewayRaw.split(/[(,]/)[0].trim();
  const dur = fmtDuration(est.durationHours);
  const airlines = getAirlinesForSector(est.domestic, est.distanceKm);

  const baseFare = Math.round((est.fareLow + est.fareHigh) / 2);

  const outTimes = [
    { depart: "04:30", early: true, durOffset: 0 },
    { depart: "09:15", early: false, durOffset: 0.2 },
    { depart: "16:40", early: false, durOffset: -0.1 },
    { depart: "21:50", early: false, durOffset: 0.5 },
  ];

  const retTimes = [
    { depart: "08:15", early: false, durOffset: 0 },
    { depart: "13:40", early: false, durOffset: 0.3 },
    { depart: "19:20", early: false, durOffset: -0.2 },
    { depart: "23:05", early: false, durOffset: 0.4 },
  ];

  const flights: FlightOption[] = [];

  // Outbound flights
  outTimes.forEach((t, i) => {
    const carrier = airlines[i % airlines.length];
    const optionFare = Math.round((baseFare * carrier.fareMultiplier) / 500) * 500;
    const durH = est.durationHours + t.durOffset;
    flights.push({
      id: `flight_out_${i + 1}`,
      airline: carrier.name,
      flightNo: `${carrier.code}-${100 + (i + 1) * 117}`,
      from: origin,
      to: gw,
      depart: t.depart,
      arrive: arriveClock(t.depart, durH),
      layover: est.stopHint,
      baggage: carrier.baggage,
      fare: optionFare,
      sourceId,
      earlyMorning: t.early,
      duration: fmtDuration(durH),
      stops: est.stops,
      stopDetail: est.stops === 0 ? "Nonstop" : est.stopHint,
      cabin: carrier.cabin,
      refundable: i === 0 || i === 1,
      fareLow: Math.round((est.fareLow * carrier.fareMultiplier) / 500) * 500,
      fareHigh: Math.round((est.fareHigh * carrier.fareMultiplier) / 500) * 500,
      estimated: true,
      onTime: carrier.onTime,
    });
  });

  // Return flights
  retTimes.forEach((t, i) => {
    const carrier = airlines[(i + 1) % airlines.length];
    const optionFare = Math.round((baseFare * carrier.fareMultiplier) / 500) * 500;
    const durH = est.durationHours + t.durOffset;
    flights.push({
      id: `flight_ret_${i + 1}`,
      airline: carrier.name,
      flightNo: `${carrier.code}-${200 + (i + 1) * 113}`,
      from: gw,
      to: origin,
      depart: t.depart,
      arrive: arriveClock(t.depart, durH),
      layover: est.stopHint,
      baggage: carrier.baggage,
      fare: optionFare,
      sourceId,
      earlyMorning: false,
      duration: fmtDuration(durH),
      stops: est.stops,
      stopDetail: est.stops === 0 ? "Nonstop" : est.stopHint,
      cabin: carrier.cabin,
      refundable: i === 0,
      fareLow: Math.round((est.fareLow * carrier.fareMultiplier) / 500) * 500,
      fareHigh: Math.round((est.fareHigh * carrier.fareMultiplier) / 500) * 500,
      estimated: true,
      onTime: carrier.onTime,
    });
  });

  return flights;
}

function arriveClock(depart: string, durH: number): string {
  const [h, m] = depart.split(":").map(Number);
  const totalMins = h * 60 + m + Math.round(durH * 60);
  const daysAdded = Math.floor(totalMins / (24 * 60));
  const remMins = totalMins % (24 * 60);
  const hh = Math.floor(remMins / 60);
  const mm = remMins % 60;
  const dayLabel = daysAdded > 0 ? ` (+${daysAdded}d)` : "";
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}${dayLabel}`;
}
