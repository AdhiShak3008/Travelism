import "server-only";
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { TripWorkflowAnnotation, type TripWorkflowState } from "./state";
import { intentNode, discoveryNode, synthesizeNode, auditNode, finalizeNode } from "./nodes";

// ============================================================================
// LangGraph Stateful Orchestration Graph for Travelism
// Implements self-correcting audit loops & state checkpointing.
// ============================================================================

/**
 * Conditional Edge: Decides whether to finalize or loop back for self-correction.
 */
function routeAfterAudit(state: TripWorkflowState): "synthesize" | "finalize" {
  const { auditIssues, iteration } = state;
  const hasCritical = auditIssues.some((i) => i.severity === "critical");

  // Allow up to 1 self-correction retry loop
  if (hasCritical && iteration < 2) {
    return "synthesize";
  }
  return "finalize";
}

export function buildTripGraph(checkpointer?: MemorySaver) {
  const workflow = new StateGraph(TripWorkflowAnnotation)
    .addNode("intent", intentNode)
    .addNode("discovery", discoveryNode)
    .addNode("synthesize", synthesizeNode)
    .addNode("audit", auditNode)
    .addNode("finalize", finalizeNode)

    // Edges
    .addEdge(START, "intent")
    .addEdge("intent", "discovery")
    .addEdge("discovery", "synthesize")
    .addEdge("synthesize", "audit")
    .addConditionalEdges("audit", routeAfterAudit, {
      synthesize: "synthesize",
      finalize: "finalize",
    })
    .addEdge("finalize", END);

  return workflow.compile({ checkpointer });
}

// In-memory checkpointer instance for local/session state recovery
export const tripCheckpointer = new MemorySaver();

// Pre-compiled graph instance with checkpointing
export const tripGraph = buildTripGraph(tripCheckpointer);
