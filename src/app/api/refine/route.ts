import { NextRequest } from "next/server";
import { refinePlaces, refineHotels, type ProgressEvent } from "@/lib/server/investigate";
import { CAN_INVESTIGATE_LIVE } from "@/lib/server/env";

export const runtime = "nodejs";
export const maxDuration = 180;

// Targeted re-investigation: a steering request → scoped crawl → NEW places or stays.
export async function POST(req: NextRequest) {
  const { destination, request, existingNames, type } = (await req.json().catch(() => ({}))) as {
    destination?: string;
    request?: string;
    existingNames?: string[];
    type?: "places" | "hotels";
  };
  if (!destination || !request) {
    return new Response(JSON.stringify({ error: "Missing destination or request" }), { status: 400 });
  }
  if (!CAN_INVESTIGATE_LIVE) {
    return new Response(JSON.stringify({ error: "live_unavailable" }), { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const emit = (e: ProgressEvent) => send("progress", e);
      try {
        if (type === "hotels") {
          const result = await refineHotels(destination, request, existingNames ?? [], emit, req.signal);
          send("done", result);
        } else {
          const result = await refinePlaces(destination, request, existingNames ?? [], emit, req.signal);
          send("done", result);
        }
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Refine failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}

