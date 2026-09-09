import { Annotation } from "@langchain/langgraph";
import type { TripBlob, Place, Experience, HotelOption } from "@/lib/types";
import type { DestinationDataset } from "@/lib/research/provider";

// ============================================================================
// LangGraph State Definition for Travelism
// Tracks the state of the trip across multi-agent refinement and audit loops.
// ============================================================================

export interface AuditIssue {
  type: "budget_exceeded" | "transit_overload" | "altitude_risk" | "permit_missing";
  severity: "critical" | "warning";
  message: string;
  suggestion: string;
}

export const TripWorkflowAnnotation = Annotation.Root({
  threadId: Annotation<string>(),
  destination: Annotation<string>(),
  userRequest: Annotation<string>(),
  blob: Annotation<TripBlob>({
    reducer: (current, update) => update ?? current,
  }),
  dataset: Annotation<DestinationDataset>({
    reducer: (current, update) => update ?? current,
  }),
  discoveredPlaces: Annotation<Place[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  discoveredExperiences: Annotation<Experience[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  discoveredHotels: Annotation<HotelOption[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  auditIssues: Annotation<AuditIssue[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  iteration: Annotation<number>({
    reducer: (current, update) => update ?? current + 1,
    default: () => 0,
  }),
  status: Annotation<"running" | "needs_review" | "completed">({
    reducer: (current, update) => update ?? current,
    default: () => "running",
  }),
  logs: Annotation<string[]>({
    reducer: (current, update) => (update ? [...current, ...update] : current),
    default: () => [],
  }),
});

export type TripWorkflowState = typeof TripWorkflowAnnotation.State;
