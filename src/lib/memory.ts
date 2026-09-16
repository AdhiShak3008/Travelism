import type { TravelerMemory } from "./types";

/**
 * Creates an empty default traveler memory record.
 */
export function createDefaultTravelerMemory(): TravelerMemory {
  return {
    dietaryRequirements: [],
    interestsAndVibes: [],
    travelStyle: [],
    pacingAndRhythm: [],
    budgetConstraints: [],
    companionship: [],
    pastDecisions: [],
    keyNotes: [],
  };
}

/**
 * Clean and merge unique items into a string array.
 */
function mergeUnique(existing: string[] = [], incoming: string[] = []): string[] {
  const set = new Set(existing.map((s) => s.trim().toLowerCase()));
  const result = [...existing];

  for (const item of incoming) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!set.has(lower)) {
      set.add(lower);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Merges memory deltas into the persistent traveler memory.
 */
export function mergeTravelerMemory(
  current: TravelerMemory | undefined,
  delta: {
    dietary?: string[];
    vibes?: string[];
    style?: string[];
    pacing?: string[];
    budget?: string[];
    companionship?: string[];
    pastDecisions?: string[];
    keyNotes?: string[];
    learnedFacts?: string[];
  }
): TravelerMemory {
  const base = current ? { ...current } : createDefaultTravelerMemory();

  return {
    dietaryRequirements: mergeUnique(base.dietaryRequirements, delta.dietary),
    interestsAndVibes: mergeUnique(base.interestsAndVibes, delta.vibes),
    travelStyle: mergeUnique(base.travelStyle, delta.style),
    pacingAndRhythm: mergeUnique(base.pacingAndRhythm, delta.pacing),
    budgetConstraints: mergeUnique(base.budgetConstraints, delta.budget),
    companionship: mergeUnique(base.companionship, delta.companionship),
    pastDecisions: mergeUnique(base.pastDecisions, delta.pastDecisions),
    keyNotes: mergeUnique(
      base.keyNotes,
      [...(delta.keyNotes || []), ...(delta.learnedFacts || [])]
    ),
  };
}

/**
 * Summarizes the memory count (total unique facts known about this traveler).
 */
export function countTravelerMemoryFacts(memory?: TravelerMemory): number {
  if (!memory) return 0;
  return (
    (memory.dietaryRequirements?.length || 0) +
    (memory.interestsAndVibes?.length || 0) +
    (memory.travelStyle?.length || 0) +
    (memory.pacingAndRhythm?.length || 0) +
    (memory.budgetConstraints?.length || 0) +
    (memory.companionship?.length || 0) +
    (memory.pastDecisions?.length || 0) +
    (memory.keyNotes?.length || 0)
  );
}

/**
 * Formats active memory into a markdown-styled system prompt block.
 */
export function formatTravelerMemoryForPrompt(memory?: TravelerMemory): string {
  if (!memory || countTravelerMemoryFacts(memory) === 0) {
    return "No prior traveler constraints recorded yet. Actively learn and remember preferences as the traveler speaks.";
  }

  const lines: string[] = [];
  if (memory.dietaryRequirements?.length) {
    lines.push(`- Dietary: ${memory.dietaryRequirements.join(", ")}`);
  }
  if (memory.interestsAndVibes?.length) {
    lines.push(`- Interests & Vibes: ${memory.interestsAndVibes.join(", ")}`);
  }
  if (memory.travelStyle?.length) {
    lines.push(`- Travel Style: ${memory.travelStyle.join(", ")}`);
  }
  if (memory.pacingAndRhythm?.length) {
    lines.push(`- Pacing & Rhythm: ${memory.pacingAndRhythm.join(", ")}`);
  }
  if (memory.budgetConstraints?.length) {
    lines.push(`- Budget Sensitivities: ${memory.budgetConstraints.join(", ")}`);
  }
  if (memory.companionship?.length) {
    lines.push(`- Group & Companionship: ${memory.companionship.join(", ")}`);
  }
  if (memory.pastDecisions?.length) {
    lines.push(`- Past Decisions / Preferences: ${memory.pastDecisions.join("; ")}`);
  }
  if (memory.keyNotes?.length) {
    lines.push(`- Key Notes: ${memory.keyNotes.join("; ")}`);
  }

  return lines.join("\n");
}
