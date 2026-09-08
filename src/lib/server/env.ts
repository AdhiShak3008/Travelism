import "server-only";

// ============================================================================
// Server env + capability detection. Features gate honestly on what's present.
// Never import this from client components.
// ============================================================================

function get(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export const ENV = {
  GROQ_API_KEY: get("GROQ_API_KEY"),
  GROQ_MODEL: get("GROQ_MODEL") ?? "openai/gpt-oss-120b",
  GROQ_MODEL_FAST: get("GROQ_MODEL_FAST") ?? "openai/gpt-oss-20b",
  TAVILY_API_KEY: get("TAVILY_API_KEY"),
  DATABASE_URL: get("DATABASE_URL"),
  YOUTUBE_API_KEY: get("YOUTUBE_API_KEY") ?? get("GOOGLE_SEARCH_API_KEY") ?? get("GOOGLE_API_KEY"),
  GOOGLE_MAPS_API_KEY: get("GOOGLE_MAPS_API_KEY") ?? get("GOOGLE_API_KEY"),
  GOOGLE_SEARCH_API_KEY: get("GOOGLE_SEARCH_API_KEY") ?? get("GOOGLE_API_KEY"),
  GOOGLE_SEARCH_CX: get("GOOGLE_SEARCH_CX") ?? get("GOOGLE_CX"),
  AMADEUS_CLIENT_ID: get("AMADEUS_CLIENT_ID"),
  AMADEUS_CLIENT_SECRET: get("AMADEUS_CLIENT_SECRET"),
} as const;

export const CAP = {
  /** the reasoning brain — required for any real investigation */
  llm: !!ENV.GROQ_API_KEY,
  /** discovery of crawlable URLs + pre-extracted content */
  search: !!ENV.TAVILY_API_KEY,
  /** persistence + crawl cache */
  db: !!ENV.DATABASE_URL,
  /** real videos */
  youtube: !!ENV.YOUTUBE_API_KEY,
  /** real places/photos/geo */
  places: !!ENV.GOOGLE_MAPS_API_KEY,
  /** official Google Image Search engine */
  googleImages: !!ENV.GOOGLE_SEARCH_API_KEY && !!ENV.GOOGLE_SEARCH_CX,
  /** real flight offers */
  flights: !!ENV.AMADEUS_CLIENT_ID && !!ENV.AMADEUS_CLIENT_SECRET,
} as const;

/** Live investigation possible when we can both reason and discover. */
export const CAN_INVESTIGATE_LIVE = CAP.llm && CAP.search;

export function capabilitySummary() {
  return {
    live: CAN_INVESTIGATE_LIVE,
    ...CAP,
  };
}

/** Contact/UA for polite crawling. */
export const CRAWLER_UA =
  "TravelismBot/1.0 (+https://travelism.app/bot; research assistant; respects robots.txt)";
