"use client";

import type { DestinationDataset } from "@/lib/research/provider";
import type { AgentId } from "@/lib/types";

export interface LiveProgress {
  agent: AgentId | "concierge";
  phase: "working" | "done";
  status: string;
  metric?: string;
}

export interface CapabilitySummary {
  live: boolean;
  llm: boolean;
  search: boolean;
  db: boolean;
  youtube: boolean;
  places: boolean;
  flights: boolean;
}

export async function fetchCapabilities(): Promise<CapabilitySummary> {
  try {
    const res = await fetch("/api/capabilities", { cache: "no-store" });
    if (!res.ok) throw new Error();
    return (await res.json()) as CapabilitySummary;
  } catch {
    return { live: false, llm: false, search: false, db: false, youtube: false, places: false, flights: false };
  }
}

/**
 * Runs a live investigation via SSE. Calls onProgress for each agent event and
 * resolves with the final dataset. Throws on error/unavailable so the caller
 * can fall back to the built-in dataset honestly.
 */
export async function runLiveInvestigation(
  dream: string,
  onProgress: (p: LiveProgress) => void,
  signal?: AbortSignal
): Promise<DestinationDataset> {
  const res = await fetch("/api/investigate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dream }),
    signal,
  });

  if (!res.ok || !res.body) {
    const reason = res.status === 503 ? "live_unavailable" : `http_${res.status}`;
    throw new Error(reason);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let dataset: DestinationDataset | null = null;
  let errorMsg: string | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // parse complete SSE frames (delimited by blank line)
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const { event, data } = parseFrame(frame);
      if (!event) continue;
      if (event === "progress") onProgress(data as LiveProgress);
      else if (event === "done") dataset = data as DestinationDataset;
      else if (event === "error") errorMsg = (data as { message?: string }).message ?? "error";
    }
  }

  if (errorMsg) throw new Error(errorMsg);
  if (!dataset) throw new Error("no_dataset");
  return dataset;
}

export interface RefineResult {
  places: import("@/lib/types").Place[];
  sources: Record<string, import("@/lib/types").Source>;
  query: string;
  found: number;
}

/** Targeted re-investigation: streams progress, resolves with new places. */
export async function runRefine(
  destination: string,
  request: string,
  existingNames: string[],
  onProgress: (p: LiveProgress) => void,
  signal?: AbortSignal
): Promise<RefineResult> {
  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination, request, existingNames }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(res.status === 503 ? "live_unavailable" : `http_${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: RefineResult | null = null;
  let errorMsg: string | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const { event, data } = parseFrame(frame);
      if (event === "progress") onProgress(data as LiveProgress);
      else if (event === "done") result = data as RefineResult;
      else if (event === "error") errorMsg = (data as { message?: string }).message ?? "error";
    }
  }
  if (errorMsg) throw new Error(errorMsg);
  if (!result) throw new Error("no_result");
  return result;
}

function parseFrame(frame: string): { event?: string; data?: unknown } {
  let event: string | undefined;
  let dataStr = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
  }
  if (!dataStr) return { event };
  try {
    return { event, data: JSON.parse(dataStr) };
  } catch {
    return { event };
  }
}
