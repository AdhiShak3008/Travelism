import { NextRequest } from "next/server";
import { redisGetJson, redisSetJson, redisDel, redisEnabled } from "@/lib/server/redis";
import { ENV, CAP } from "@/lib/server/env";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

function sanitizeUserKey(userId?: string): string {
  if (!userId) return "usr_demo_vip";
  return userId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

let tableEnsured = false;
async function getSql() {
  if (!CAP.db || !ENV.DATABASE_URL) return null;
  const sql = neon(ENV.DATABASE_URL);
  if (!tableEnsured) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS active_trips (
          user_id TEXT PRIMARY KEY,
          session JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      tableEnsured = true;
    } catch {}
  }
  return sql;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      session?: unknown;
      clear?: boolean;
    };

    const userKey = sanitizeUserKey(body.userId);
    const redisKey = `active_trip:${userKey}`;
    let saved = false;

    // 1. Upstash Redis (fast distributed cache)
    if (redisEnabled()) {
      try {
        if (body.clear || !body.session) {
          await redisDel(redisKey);
        } else {
          await redisSetJson(redisKey, body.session, 7 * 86400);
        }
        saved = true;
      } catch (err) {
        console.warn("[active/route] Redis sync error:", err);
      }
    }

    // 2. Neon Postgres (reliable long-term persistence across all Vercel serverless instances)
    const sql = await getSql();
    if (sql) {
      try {
        if (body.clear || !body.session) {
          await sql`DELETE FROM active_trips WHERE user_id = ${userKey}`;
        } else {
          await sql`
            INSERT INTO active_trips (user_id, session, updated_at)
            VALUES (${userKey}, ${body.session as any}, NOW())
            ON CONFLICT (user_id) DO UPDATE SET session = EXCLUDED.session, updated_at = NOW();
          `;
        }
        saved = true;
      } catch (err) {
        console.warn("[active/route] Postgres sync error:", err);
      }
    }

    return json({ saved, userKey, cleared: !!body.clear }, 200);
  } catch (err) {
    return json({ saved: false, error: err instanceof Error ? err.message : "error" }, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || undefined;
    const userKey = sanitizeUserKey(userId);
    const redisKey = `active_trip:${userKey}`;

    // 1. Try Redis first
    if (redisEnabled()) {
      try {
        const session = await redisGetJson(redisKey);
        if (session) {
          return json({ found: true, session, source: "redis" }, 200);
        }
      } catch {}
    }

    // 2. Fall back to Neon Postgres
    const sql = await getSql();
    if (sql) {
      try {
        const rows = await sql`SELECT session FROM active_trips WHERE user_id = ${userKey} LIMIT 1`;
        if (rows && rows.length > 0 && rows[0]?.session) {
          return json({ found: true, session: rows[0].session, source: "postgres" }, 200);
        }
      } catch (err) {
        console.warn("[active/route] Postgres read error:", err);
      }
    }

    return json({ found: false }, 200);
  } catch (err) {
    return json({ found: false, error: err instanceof Error ? err.message : "error" }, 500);
  }
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
