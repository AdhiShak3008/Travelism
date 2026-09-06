import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  doublePrecision,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================================
// Postgres schema (Neon). Persists investigations, crawl cache, evidence and
// the assembled datasets so the product is stateful and fast on repeat views.
// ============================================================================

// Cache of crawled pages — freshness + change detection via contentHash.
export const crawlCache = pgTable(
  "crawl_cache",
  {
    url: text("url").primaryKey(),
    finalUrl: text("final_url"),
    canonicalUrl: text("canonical_url"),
    title: text("title"),
    siteName: text("site_name"),
    text: text("text"),
    jsonLd: jsonb("json_ld"),
    meta: jsonb("meta"),
    images: jsonb("images"),
    status: integer("status"),
    ok: boolean("ok").default(false),
    blockedReason: text("blocked_reason"),
    contentHash: text("content_hash"),
    publishedAt: text("published_at"),
    modifiedAt: text("modified_at"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({ fetchedIdx: index("crawl_fetched_idx").on(t.fetchedAt) })
);

// One row per investigation of a destination (keyed by normalized destination).
export const investigations = pgTable(
  "investigations",
  {
    id: text("id").primaryKey(),
    destinationKey: text("destination_key").notNull(), // normalized, e.g. "tawang"
    destinationName: text("destination_name").notNull(),
    dream: text("dream"),
    status: text("status").notNull().default("running"), // running|done|error
    dataset: jsonb("dataset"), // the assembled DestinationDataset
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    destIdx: index("inv_dest_idx").on(t.destinationKey),
    freshIdx: index("inv_fresh_idx").on(t.completedAt),
  })
);

// Saved trips (the Trip Blob) — persistence beyond a browser session.
export const trips = pgTable(
  "trips",
  {
    id: text("id").primaryKey(),
    destinationName: text("destination_name"),
    blob: jsonb("blob").notNull(),
    bookingState: text("booking_state").default("planning"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({ updatedIdx: index("trips_updated_idx").on(t.updatedAt) })
);

// Resolved entities (entity graph) with alt names for entity resolution.
export const entities = pgTable(
  "entities",
  {
    id: text("id").primaryKey(),
    destinationKey: text("destination_key").notNull(),
    canonicalName: text("canonical_name").notNull(),
    altNames: jsonb("alt_names"),
    type: text("type").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    confidence: doublePrecision("confidence").default(0.5),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    entDestIdx: index("ent_dest_idx").on(t.destinationKey),
    entNameIdx: uniqueIndex("ent_name_idx").on(t.destinationKey, t.canonicalName),
  })
);
