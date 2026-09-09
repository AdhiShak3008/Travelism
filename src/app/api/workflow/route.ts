import { NextRequest, NextResponse } from "next/server";
import { tripGraph, tripCheckpointer } from "@/lib/server/workflow/tripGraph";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * GET /api/workflow?threadId=xyz
 * Returns the current checkpointed state of a trip graph thread
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");

  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId parameter" }, { status: 400 });
  }

  try {
    const checkpoint = await tripCheckpointer.get({ configurable: { thread_id: threadId } });
    if (!checkpoint) {
      return NextResponse.json({ found: false, message: "No state found for this threadId" }, { status: 404 });
    }
    return NextResponse.json({
      found: true,
      threadId,
      state: checkpoint.channel_values,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to retrieve checkpoint" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflow
 * Invokes the LangGraph stateful trip pipeline with self-correction & checkpointing.
 * Payload: { destination: string, request: string, threadId?: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const destination = body.destination || "Miami";
  const userRequest = body.request || "Find top verified spots, bookable activities, and verify transit feasibility";
  const threadId = body.threadId || `trip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const config = { configurable: { thread_id: threadId } };
    
    // Invoke the compiled LangGraph workflow
    const finalState = await tripGraph.invoke(
      {
        threadId,
        destination,
        userRequest,
      },
      config
    );

    return NextResponse.json({
      success: true,
      threadId,
      destination: finalState.destination,
      status: finalState.status,
      iteration: finalState.iteration,
      discoveredPlaces: finalState.discoveredPlaces,
      discoveredExperiences: finalState.discoveredExperiences,
      discoveredHotels: finalState.discoveredHotels,
      auditIssues: finalState.auditIssues,
      logs: finalState.logs,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Workflow execution error",
      },
      { status: 500 }
    );
  }
}
