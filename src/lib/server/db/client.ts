import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { ENV, CAP } from "../env";
import * as schema from "./schema";

// ============================================================================
// Neon Postgres client via drizzle (HTTP driver, ideal for serverless).
// db is null when DATABASE_URL is absent — callers must guard with CAP.db.
// ============================================================================

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!CAP.db || !ENV.DATABASE_URL) return null;
  if (_db) return _db;
  const sql = neon(ENV.DATABASE_URL);
  _db = drizzle(sql, { schema });
  return _db;
}

export { schema };
