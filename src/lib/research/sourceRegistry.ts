import type { Source } from "../types";
import { research } from "./provider";

// ============================================================================
// Runtime source registry. Live investigations discover sources dynamically;
// this registry lets UI components (which import a single resolver) resolve
// both static mock sources and live-discovered ones by id.
// ============================================================================

const LIVE: Record<string, Source> = {};

export function registerSources(sources?: Record<string, Source>) {
  if (!sources) return;
  Object.assign(LIVE, sources);
}

export function resolveSource(id: string): Source | undefined {
  return LIVE[id] ?? research.getSource(id);
}
