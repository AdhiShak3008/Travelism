import { capabilitySummary } from "@/lib/server/env";

export const runtime = "nodejs";

export async function GET() {
  return new Response(JSON.stringify(capabilitySummary()), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
