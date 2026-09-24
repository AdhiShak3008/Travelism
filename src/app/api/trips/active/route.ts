import { NextRequest } from "next/server";
import { redisGetJson, redisSetJson, redisDel, redisEnabled } from "@/lib/server/redis";

export const runtime = "nodejs";

function sanitizeUserKey(userId?: string): string {
  if (!userId) return "demo_user";
  return userId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

export async function POST(req: NextRequest) {
  if (!redisEnabled()) {
    return json({ saved: false, reason: "redis_disabled" }, 200);
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      session?: unknown;
      clear?: boolean;
    };

    const userKey = sanitizeUserKey(body.userId);
    const redisKey = `active_trip:${userKey}`;

    if (body.clear || !body.session) {
      await redisDel(redisKey);
      return json({ saved: true, cleared: true }, 200);
    }

    // Persist active in-flight trip draft in Redis for 7 days (604,800 seconds)
    await redisSetJson(redisKey, body.session, 7 * 86400);
    return json({ saved: true, key: redisKey }, 200);
  } catch (err) {
    return json({ saved: false, error: err instanceof Error ? err.message : "error" }, 500);
  }
}

export async function GET(req: NextRequest) {
  if (!redisEnabled()) {
    return json({ found: false, reason: "redis_disabled" }, 200);
  }
  try {
    const userId = req.nextUrl.searchParams.get("userId") || undefined;
    const userKey = sanitizeUserKey(userId);
    const redisKey = `active_trip:${userKey}`;

    const session = await redisGetJson(redisKey);
    if (!session) {
      return json({ found: false }, 200);
    }
    return json({ found: true, session }, 200);
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
