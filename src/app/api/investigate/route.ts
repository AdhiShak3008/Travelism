import { NextRequest } from "next/server";
import { investigate, destinationKey, type ProgressEvent } from "@/lib/server/investigate";
import { CAN_INVESTIGATE_LIVE, CAP } from "@/lib/server/env";
import { getDb, schema } from "@/lib/server/db/client";
import { eq, desc } from "drizzle-orm";
import type { DestinationDataset } from "@/lib/research/provider";
import { readDatasetCache, writeDatasetCache, cacheMetrics } from "@/lib/server/datasetCache";

export const runtime = "nodejs";
export const maxDuration = 300; // allow long crawls where the platform permits

// Server-Sent Events: streams live agent progress, then the final dataset.
export async function POST(req: NextRequest) {
  const { dream, profileHints } = (await req.json().catch(() => ({}))) as {
    dream?: string;
    profileHints?: import("@/lib/server/investigate").ProfileHints;
  };
  if (!dream || !dream.trim()) {
    return new Response(JSON.stringify({ error: "Missing dream" }), { status: 400 });
  }

  if (!CAN_INVESTIGATE_LIVE) {
    // Honest: tell the client to use the built-in fallback dataset.
    return new Response(
      JSON.stringify({ error: "live_unavailable", reason: "GROQ_API_KEY and TAVILY_API_KEY are required for live investigation." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const emit = (e: ProgressEvent) => send("progress", e);

      // Background stale-while-revalidate: refresh a stale entry after the
      // response has been sent. Fire-and-forget, never blocks the client.
      const revalidate = () => {
        void (async () => {
          try {
            const fresh = await investigate(dream, () => {}, undefined, profileHints);
            await writeDatasetCache(dream, fresh);
            await writeCache(dream, fresh);
          } catch {
            /* revalidation is best-effort */
          }
        })();
      };

      try {
        // Shared cache applies only to anonymous (no-profile) runs — a personal
        // Travel-DNA profile changes the research lens, so profiled runs always
        // investigate fresh (and are never written to the shared cache).
        const hasProfile = !!profileHints && Object.keys(profileHints).length > 0;

        if (!hasProfile) {
          // ---- Cache-aside read: L1 (memory) → L2 (Redis) → miss ----
          const cached = await readDatasetCache(dream, req.signal);
          if (cached.dataset) {
            send("cache", { hit: true, source: cached.source, stale: cached.stale, metrics: cacheMetrics() });
            send("done", cached.dataset);
            safeClose();
            // stale hit → refresh in the background so the next visitor is fresh
            if (cached.stale) revalidate();
            return;
          }
          send("cache", { hit: false, source: "miss", metrics: cacheMetrics() });
        }

        const dataset = await investigate(dream, emit, req.signal, profileHints);
        if (!hasProfile) {
          await writeDatasetCache(dream, dataset); // fill L1 + L2
          await writeCache(dream, dataset); // durable per-destination store
        }
        send("done", dataset);
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Investigation failed" });
      } finally {
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Durable per-destination store (Postgres): keeps a queryable history of
// completed investigations. Complements the fast L1/L2 semantic cache above.
async function writeCache(dream: string, dataset: DestinationDataset) {
  if (!CAP.db) return;
  const db = getDb();
  if (!db) return;
  try {
    const key = destinationKey(dataset.meta.name);
    const id = `inv_${key}_${Date.now()}`;
    await db.insert(schema.investigations).values({
      id,
      destinationKey: key,
      destinationName: dataset.meta.name,
      dream,
      status: "done",
      dataset: dataset as unknown as object,
      completedAt: new Date(),
    });
  } catch {
    /* non-fatal */
  }
}

// Fast path: fetch the most recent cached investigation for a destination.
export async function GET(req: NextRequest) {
  const dest = req.nextUrl.searchParams.get("destination");
  if (!dest || !CAP.db) return new Response(JSON.stringify({ hit: false }), { status: 200 });
  const db = getDb();
  if (!db) return new Response(JSON.stringify({ hit: false }), { status: 200 });
  try {
    const key = destinationKey(dest);
    const rows = await db
      .select()
      .from(schema.investigations)
      .where(eq(schema.investigations.destinationKey, key))
      .orderBy(desc(schema.investigations.completedAt))
      .limit(1);
    const row = rows[0];
    if (!row || !row.dataset) return new Response(JSON.stringify({ hit: false }), { status: 200 });
    const ageMs = row.completedAt ? Date.now() - new Date(row.completedAt).getTime() : Infinity;
    if (ageMs > 1000 * 60 * 60 * 24) return new Response(JSON.stringify({ hit: false }), { status: 200 });
    return new Response(JSON.stringify({ hit: true, dataset: row.dataset }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ hit: false }), { status: 200 });
  }
}
