import "server-only";
import { z } from "zod";
import { chatJSON } from "./groq";

// ============================================================================
// Dream → structured intent. Groq resolves the destination and pulls out
// priorities/constraints that steer the whole investigation.
// ============================================================================

const IntentSchema = z.object({
  destination: z.string(),
  region: z.string().optional(),
  originCity: z.string().optional(),
  durationDays: z.number().min(1).max(60).optional(),
  travelers: z.number().min(1).max(20).optional(),
  budgetTier: z.enum(["economical", "balanced", "premium"]).optional(),
  pace: z.enum(["comfortable", "balanced", "fast"]).optional(),
  priorities: z.array(z.string()).max(8).default([]),
  deprioritized: z.array(z.string()).max(8).default([]),
  accessibilityNeeds: z.array(z.string()).max(5).default([]),
  avoidEarlyFlights: z.boolean().optional(),
});
export type Intent = z.infer<typeof IntentSchema>;

export async function parseIntent(dream: string, signal?: AbortSignal): Promise<Intent> {
  return chatJSON(
    [
      {
        role: "system",
        content: `You interpret a traveler's free-text dream into structured intent for a travel investigation system. Return STRICT JSON only. Infer sensibly but do not fabricate a destination that isn't implied.`,
      },
      {
        role: "user",
        content: `DREAM: "${dream}"

Return JSON:
{
  "destination": the primary place they want to go (city/region/park),
  "region": broader region or country if inferable,
  "originCity": where they're departing from if mentioned,
  "durationDays": number if mentioned/implied,
  "travelers": number if mentioned,
  "budgetTier": "economical" | "balanced" | "premium" (from cues like "cheap flights", "clean but not luxury"),
  "pace": "comfortable" | "balanced" | "fast" (e.g. "don't rush me" => comfortable),
  "priorities": normalized tags they care about e.g. ["scenery","photography","bathroom_cleanliness","food","comfort"],
  "deprioritized": tags they don't care about e.g. ["nightlife","luxury"],
  "accessibilityNeeds": e.g. ["reduced_mobility"] if traveling with elderly/can't walk far,
  "avoidEarlyFlights": true if they dislike early departures
}`,
      },
    ],
    IntentSchema,
    { signal, reasoning: "medium", maxTokens: 900 }
  );
}
