import { NextRequest } from "next/server";
import { investigate, destinationKey, type ProgressEvent } from "@/lib/server/investigate";
import { CAN_INVESTIGATE_LIVE, CAP } from "@/lib/server/env";
import { getDb, schema } from "@/lib/server/db/client";
import { eq, desc } from "drizzle-orm";
import type { DestinationDataset } from "@/lib/research/provider";

export const runtime = "nodejs";
export const maxDuration = 300; // allow long crawls where the platform permits

// Server-Sent Events: streams live agent progress, then the final dataset.
export async function POST(req: NextRequest) {
  const { dream } = (await req.json().catch(() => ({}))) as { dream?: string };
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
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const emit = (e: ProgressEvent) => send("progress", e);

      try {
        // Serve fresh cache if present (< 24h) to be fast + polite.
        const cached = await readCache(dream);
        if (cached) {
          send("cache", { hit: true });
          send("done", cached);
          controller.close();
          return;
        }

        const dataset = await investigate(dream, emit, req.signal);
        await writeCache(dream, dataset);
        send("done", dataset);
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Investigation failed" });
      } finally {
        controller.close();
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

async function readCache(dream: string): Promise<DestinationDataset | null> {
  if (!CAP.db) return null;
  const db = getDb();
  if (!db) return null;
  try {
    // Cache key by resolved destination is ideal, but we cache by dream-derived
    // destination after parse; here we look up recent completed investigations
    // whose destinationKey matches a naive extraction of the dream. Since we
    // don't know the destination until parse, we skip pre-parse cache and rely
    // on per-destination cache written post-investigation.
    void dream;
    return null;
  } catch {
    return null;
  }
}

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
