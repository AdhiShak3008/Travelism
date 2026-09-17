import "server-only";
import { ENV } from "./env";

// ============================================================================
// Google Places API (New) integration.
// Provides REAL place data — rating, review count, coordinates, official
// photos, address, price level — for hotels and attractions. Enriches the
// live investigation when a Places-enabled key is configured; degrades to a
// no-op (returns null) otherwise so the app keeps working on free sources.
//
// Requires: "Places API (New)" enabled on the Google Cloud project + billing.
// Key resolution reuses GOOGLE_MAPS_API_KEY (falls back to GOOGLE_API_KEY via env.ts).
// ============================================================================

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_PHOTO_BASE = "https://places.googleapis.com/v1";

export interface PlaceDetails {
  name: string;
  address?: string;
  rating?: number; // 0-5
  reviewCount?: number;
  lat?: number;
  lon?: number;
  priceLevel?: number; // 0-4 (Places PRICE_LEVEL_* mapped to number)
  /** Ready-to-use photo URLs (already resolved via the photo media endpoint). */
  photoUrls: string[];
  placeId?: string;
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  priceLevel?: string;
  photos?: { name?: string; widthPx?: number; heightPx?: number }[];
}

/** Build a usable image URL from a Places photo resource name. */
function photoUrl(photoName: string, apiKey: string, maxWidth = 1200): string {
  return `${PLACES_PHOTO_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
}

/**
 * Look up a single place (hotel/attraction) via Places API (New) Text Search.
 * Returns real rating/reviews/coords/photos, or null when Places is unavailable
 * or the place can't be confidently matched.
 */
export async function lookupPlace(
  query: string,
  opts: { locationBias?: string; maxPhotos?: number; signal?: AbortSignal } = {}
): Promise<PlaceDetails | null> {
  const apiKey = ENV.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const maxPhotos = opts.maxPhotos ?? 4;
  const textQuery = opts.locationBias ? `${query} ${opts.locationBias}` : query;

  try {
    const res = await fetch(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Field mask keeps the request cheap — only what we render.
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.priceLevel,places.photos",
      },
      body: JSON.stringify({ textQuery, maxResultCount: 1 }),
      signal: opts.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { places?: RawPlace[] };
    const p = data.places?.[0];
    if (!p) return null;

    const photoUrls = (p.photos ?? [])
      .slice(0, maxPhotos)
      .map((ph) => (ph.name ? photoUrl(ph.name, apiKey) : null))
      .filter((u): u is string => Boolean(u));

    return {
      name: p.displayName?.text ?? query,
      address: p.formattedAddress,
      rating: typeof p.rating === "number" ? p.rating : undefined,
      reviewCount: typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
      lat: p.location?.latitude,
      lon: p.location?.longitude,
      priceLevel: p.priceLevel ? PRICE_LEVEL_MAP[p.priceLevel] : undefined,
      photoUrls,
      placeId: p.id,
    };
  } catch {
    return null;
  }
}

/** Whether Places enrichment is available (key present). */
export function placesEnabled(): boolean {
  return !!ENV.GOOGLE_MAPS_API_KEY;
}
