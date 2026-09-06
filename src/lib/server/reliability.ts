import "server-only";
import type { SourceType } from "../types";

// ============================================================================
// Source reliability model. Classifies a URL into a source type and assigns a
// base reliability weight. Recency, corroboration and specificity are layered
// on top by the extraction pipeline.
// ============================================================================

interface Classification {
  type: SourceType;
  reliability: number;
  label: string;
}

// domain hints → type. Order matters (first match wins).
const RULES: { test: RegExp; type: SourceType; reliability: number }[] = [
  // government / official tourism
  { test: /\.gov(\.[a-z]{2})?(\/|$)/i, type: "government", reliability: 0.96 },
  { test: /\.gov\.[a-z]{2}/i, type: "government", reliability: 0.96 },
  { test: /(tourism|tourist|incredibleindia|visit[a-z]+)\./i, type: "official", reliability: 0.9 },
  { test: /\.(edu|ac\.[a-z]{2})(\/|$)/i, type: "publication", reliability: 0.88 },
  // encyclopedic / reference
  { test: /wikipedia\.org/i, type: "publication", reliability: 0.86 },
  { test: /wikivoyage\.org/i, type: "publication", reliability: 0.82 },
  { test: /britannica\.com/i, type: "publication", reliability: 0.88 },
  // airlines
  { test: /(indigo|airindia|vistara|spicejet|akasaair|emirates|lufthansa|airasia)\./i, type: "airline", reliability: 0.92 },
  // booking / review platforms
  { test: /(booking\.com|agoda|makemytrip|goibibo|expedia|hotels\.com|trivago|oyorooms)/i, type: "booking_platform", reliability: 0.84 },
  { test: /(tripadvisor|yelp|google\.com\/maps|holidayiq|zomato)/i, type: "review_platform", reliability: 0.82 },
  // major publications
  { test: /(lonelyplanet|nationalgeographic|nytimes|bbc|cntraveller|condenast|outlooktraveller|thrillophilia|holidify)/i, type: "publication", reliability: 0.8 },
  // social / video
  { test: /(youtube\.com|youtu\.be|vimeo)/i, type: "video", reliability: 0.6 },
  { test: /(reddit\.com|quora\.com|tripoto|forum)/i, type: "forum", reliability: 0.52 },
  { test: /(instagram|facebook|twitter|x\.com|tiktok)/i, type: "social", reliability: 0.45 },
];

export function classifySource(url: string): Classification {
  let host = url;
  try {
    host = new URL(url).host.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  for (const r of RULES) {
    if (r.test.test(url) || r.test.test(host)) {
      return { type: r.type, reliability: r.reliability, label: host };
    }
  }
  // default: an independent blog / unknown site
  return { type: "blog", reliability: 0.56, label: host };
}

/** Recency multiplier: fresh sources count more (0.7–1.15). */
export function recencyWeight(dateISO?: string): number {
  if (!dateISO) return 0.85;
  const t = Date.parse(dateISO);
  if (Number.isNaN(t)) return 0.85;
  const days = (Date.now() - t) / 864e5;
  if (days < 90) return 1.15;
  if (days < 365) return 1.0;
  if (days < 365 * 2) return 0.88;
  return 0.7;
}

/** Combine base reliability, recency and corroboration into a 0–1 confidence. */
export function confidenceScore(opts: {
  reliability: number;
  recency: number;
  corroboration: number; // count of independent agreeing sources
  contradiction: number;
}): number {
  const base = opts.reliability * opts.recency;
  const corrob = Math.min(0.25, opts.corroboration * 0.08);
  const contra = Math.min(0.3, opts.contradiction * 0.12);
  return Math.max(0.15, Math.min(0.98, base + corrob - contra));
}
