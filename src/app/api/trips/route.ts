import { NextRequest } from "next/server";
import { getDb, schema } from "@/lib/server/db/client";
import { CAP } from "@/lib/server/env";
import { eq } from "drizzle-orm";
import type { TripBlob } from "@/lib/types";

export const runtime = "nodejs";

// Save or update a Trip Blob.
export async function POST(req: NextRequest) {
  if (!CAP.db) return json({ saved: false, reason: "no_db" }, 200);
  const db = getDb();
  if (!db) return json({ saved: false, reason: "no_db" }, 200);
  const blob = (await req.json().catch(() => null)) as TripBlob | null;
  if (!blob || !blob.id) return json({ saved: false, reason: "bad_body" }, 400);
  try {
    await db
      .insert(schema.trips)
      .values({
        id: blob.id,
        destinationName: blob.destinationName,
        blob: blob as unknown as object,
        bookingState: blob.bookingState,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.trips.id,
        set: {
          blob: blob as unknown as object,
          bookingState: blob.bookingState,
          destinationName: blob.destinationName,
          updatedAt: new Date(),
        },
      });
    return json({ saved: true, id: blob.id }, 200);
  } catch (e) {
    return json({ saved: false, reason: e instanceof Error ? e.message : "error" }, 500);
  }
}

// Load a Trip Blob by id.
export async function GET(req: NextRequest) {
  if (!CAP.db) return json({ found: false }, 200);
  const db = getDb();
  if (!db) return json({ found: false }, 200);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return json({ found: false }, 400);
  try {
    const rows = await db.select().from(schema.trips).where(eq(schema.trips.id, id)).limit(1);
    const row = rows[0];
    if (!row) return json({ found: false }, 200);
    return json({ found: true, blob: row.blob }, 200);
  } catch {
    return json({ found: false }, 200);
  }
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
