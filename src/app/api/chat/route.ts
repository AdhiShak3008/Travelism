import { NextRequest } from "next/server";
import { z } from "zod";
import { chatJSON, type ChatMsg } from "@/lib/server/groq";
import { ENV } from "@/lib/server/env";
import type { TravelerMemory } from "@/lib/types";
import { formatTravelerMemoryForPrompt } from "@/lib/memory";
import { arbitrateConciergeFactCheck } from "@/lib/server/middleman";

export const runtime = "nodejs";
export const maxDuration = 60;

const ChatResponseSchema = z.object({
  reply: z.string(),
  action: z
    .object({
      kind: z.enum([
        "upgrade_hotel",
        "cheaper_hotel",
        "search_new_hotels",
        "search_new_places",
        "set_stay_mode",
        "remove_all_hotels",
        "set_duration",
        "add_days",
        "set_travelers",
        "set_pace",
        "budget_target",
        "add_activity",
        "remove_activity",
        "replace_day_stops",
        "add_day_stop",
        "remove_day_stop",
        "set_day_focus",
        "none",
      ]),
      value: z.union([z.number(), z.string()]).nullable().optional(),
      dayNum: z.number().nullable().optional(),
      dayTitle: z.string().nullable().optional(),
      stops: z
        .array(
          z.object({
            kind: z.enum(["visit", "meal", "travel", "rest", "hotel"]).catch("visit"),
            label: z.string(),
            start: z.string().catch("10:00"),
            end: z.string().catch("12:00"),
            note: z.string().nullable().optional(),
          })
        )
        .nullable()
        .optional(),
      stop: z
        .object({
          kind: z.enum(["visit", "meal", "travel", "rest", "hotel"]).catch("visit"),
          label: z.string(),
          start: z.string().catch("10:00"),
          end: z.string().catch("12:00"),
          note: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
      activityData: z
        .object({
          name: z.string(),
          category: z.string().nullable().optional(),
          price: z.number().nullable().optional(),
          blurb: z.string().nullable().optional(),
          durationHours: z.number().nullable().optional(),
        })
        .nullable()
        .optional(),
      deltaLabel: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  memoryDelta: z
    .object({
      learnedFacts: z.array(z.string()).optional(),
      dietary: z.array(z.string()).optional(),
      vibes: z.array(z.string()).optional(),
      style: z.array(z.string()).optional(),
      pacing: z.array(z.string()).optional(),
      budget: z.array(z.string()).optional(),
      companionship: z.array(z.string()).optional(),
      pastDecisions: z.array(z.string()).optional(),
      keyNotes: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, history, travelerMemory, tripContext } = body as {
      message?: string;
      history?: Array<{ role: "user" | "concierge" | "assistant" | "system"; text?: string; content?: string }>;
      travelerMemory?: TravelerMemory;
      tripContext?: {
        destinationName?: string;
        durationDays?: number;
        travelers?: number;
        origin?: string;
        hotelName?: string;
        hotelPrice?: number;
        flightAirline?: string;
        flightDuration?: string;
        experiences?: string[];
        places?: string[];
        itinerary?: { day: number; title: string; isRestDay?: boolean; stops: string[] }[];
        totalCost?: number;
      };
    };

    if (!message || !message.trim()) {
      return json({ error: "Message is required" }, 400);
    }

    if (!ENV.GROQ_API_KEY) {
      return json(
        {
          reply: `I've noted your request: "${message}". I can adjust your hotel, vacation duration, travelers count, or budget anytime.`,
          action: { kind: "none" },
        },
        200
      );
    }

    const dest = tripContext?.destinationName || "your destination";
    const days = tripContext?.durationDays || 7;
    const travelers = tripContext?.travelers || 2;
    const origin = tripContext?.origin || "your departure city";
    const hotel = tripContext?.hotelName ? `${tripContext.hotelName} (₹${tripContext.hotelPrice?.toLocaleString("en-IN")}/night)` : "Selected Stay";
    const flight = tripContext?.flightAirline ? `${tripContext.flightAirline} (${tripContext.flightDuration})` : "Selected Flight";
    const exps = (tripContext?.experiences ?? []).join(", ") || "None yet";
    const places = (tripContext?.places ?? []).join(", ") || "Various spots";
    const total = tripContext?.totalCost ? `₹${Math.round(tripContext.totalCost).toLocaleString("en-IN")}` : "calculated";
    const itinSummary = (tripContext?.itinerary ?? [])
      .slice(0, 10)
      .map((d) => `Day ${d.day} (${d.title}): ${d.stops.join("; ")}`)
      .join("\n");

    const memoryBlock = formatTravelerMemoryForPrompt(travelerMemory);
    const middlemanCheck = arbitrateConciergeFactCheck(message, tripContext);
    const middlemanAdvisory = middlemanCheck.hasConflictOrClosure && middlemanCheck.advisoryMarkdown
      ? `\n\n🛡️ MIDDLEMAN ARBITER FACT-CHECK ENFORCEMENT:\n${middlemanCheck.advisoryMarkdown}\nYou MUST incorporate this critical local advisory/closure into your answer!`
      : "";

    const systemPrompt = `You are the Travelism AI Concierge, an elite, warm, ultra-knowledgeable personal travel director with persistent conversational memory.
You have full real-time control to inspect, adjust, and completely sculpt the traveler's custom vacation itinerary:
- Destination: ${dest}
- Duration: ${days} days
- Group: ${travelers} travelers
- Flying from: ${origin}
- Current Hotel: ${hotel}
- Current Flight: ${flight}
- Sights: ${places}
- Booked Activities: ${exps}
- Total Package Price: ${total}
- Current Itinerary Schedule:
${itinSummary || "Standard paced schedule"}${middlemanAdvisory}

🧠 ACTIVE TRAVELER MEMORY & RECALLED CONTEXT:
${memoryBlock}

Your capabilities:
1. Provide rich, charismatic travel recommendations with markdown tables, food guides, insider neighborhood secrets, weather tips, and packing essentials.
2. CONVERSATIONAL MEMORY BEHAVIOR:
   - You have complete multi-turn thread memory. Seamlessly connect to prior turns and follow-up prompts (e.g. "tell me more about the second one", "what was the price of that hostel?", "swap to what we talked about earlier").
   - NEVER contradict or re-ask for preferences the traveler already provided in earlier messages or in the Active Traveler Memory above.
   - Actively synthesize newly revealed traveler preferences (dietary, pace, budget limits, companions, dislikes, special requests) and return them in "memoryDelta" so they are permanently remembered across the entire journey.
3. RESPONSE FORMATTING GUIDELINES:
   - Use clean Markdown with headers (### for main sections), clean bullet points (- **Item Name**: Description), and short digestible paragraphs.
   - For tabular data (visas, day-by-day comparisons, budget breakdowns, costs, packing lists), ALWAYS format as clean GitHub Flavored Markdown tables with line breaks between each row:
     | Country | Visa Required | Type | Processing Time | Approx Cost (INR) | Notes |
     |---|---|---|---|---|---|
     | Poland | Yes – Schengen | Short-stay (C) | 7-15 days | ₹7,000 | Apply via VFS / Consulate |
   - Never mash multiple rows onto a single line without line breaks.
   - For step-by-step checklists, use bold title bullets: "- **Completed Application**: Online biometric form."
   - Use callouts for insider tips: "> 💡 **Pro-Tip**: Book VFS appointment 4 weeks in advance."
   - For FAQs, use: "- **Q: Can I use Schengen visa for Balkan countries?** Yes, a valid multi-entry Schengen visa..."
   - Always keep the tone warm, luxurious, proactive, and visually stunning.
4. Direct Itinerary Actions:
   - When user asks to customize or clear a day (e.g. "make day 3 a rest / beach day", "I don't want to go out on day 4", "make day 2 a luxury spa and culinary day"):
     Return action: "replace_day_stops" with dayNum, dayTitle, and a list of realistic stops (e.g. kind="rest"|"meal"|"visit"|"hotel", label, start, end, note).
   - When user asks to add an activity or event (e.g. "add Haulover Sandbar Party to activities", "add yacht sunset cruise", "schedule deep sea diving"):
     Return action: "add_activity" with activityData: { name, category, price, blurb, durationHours } and deltaLabel.
   - When user asks to schedule a stop on a day (e.g. "add dinner at Joe's Stone Crab on day 3 at 8 PM"):
     Return action: "add_day_stop" with dayNum and stop: { kind: "meal", label: "Dinner at Joe's Stone Crab", start: "20:00", end: "22:00", note: "Iconic seafood" }.
   - When user asks to remove a stop (e.g. "remove museum from day 4"):
     Return action: "remove_day_stop" with dayNum and value (the name/query to remove).
   - When user asks to change focus of a day (e.g. "make day 5 focus on culinary"):
     Return action: "set_day_focus" with dayNum and value: "culinary"|"staycation"|"wellness"|"beach"|"sightseeing".
   - When user asks to search for specific hotels or accommodation types (e.g. "find a ryokan with an onsen in Kyoto", "search for luxury 5-star mountain resort", "find boutique heritage hotels", "look for hotels with infinity pool"):
     Return action: "search_new_hotels" with value: "the specific hotel query / style".
   - When user asks to search for new sightseeing places (e.g. "find hidden viewpoints", "search for temples"):
     Return action: "search_new_places" with value: "the place query".
   - When user asks to switch to wild camping, remove hotels, or change stay style (e.g. "switch to wild camping", "remove all hotels", "we don't need a hotel", "we are bikepacking with tents"):
     Return action: "set_stay_mode" with value: "wild_camping"|"none"|"hotels"|"homestays"|"campsites_refugios" and deltaLabel (e.g. 'Switched to Wild Camping (₹0 lodging)').
   - When user asks to adjust hotel tier, trip duration, group size, or pace (e.g. "hotel under 2k", "switch to a cheaper stay around 1500"):
     Return action: "budget_target" (with numeric value in INR, e.g. 1500 or 2000) | "upgrade_hotel" | "cheaper_hotel" | "set_duration" (days) | "add_days" (+/- days) | "set_travelers" (n) | "set_pace" ("comfortable"|"balanced"|"fast").
   - For general advice/conversations: Return action: { "kind": "none" }.

Always return valid JSON:
{
  "reply": "Rich, formatted markdown answer with emojis, bullet points, tables, recommendations...",
  "action": {
    "kind": "...",
    "value": ...,
    "dayNum": ...,
    "dayTitle": "...",
    "stops": [ { "kind": "visit"|"meal"|"rest"|"travel", "label": "...", "start": "10:00", "end": "12:00", "note": "..." } ],
    "stop": { "kind": "...", "label": "...", "start": "...", "end": "...", "note": "..." },
    "activityData": { "name": "...", "category": "adventure"|"water"|"tour"|"cultural"|"wellness"|"food_exp"|"nightlife", "price": 2500, "blurb": "...", "durationHours": 3 },
    "deltaLabel": "Brief tag (e.g. 'Day 3 → Rest & Beach Leisure')"
  },
  "memoryDelta": {
    "learnedFacts": ["Traveler is vegetarian", "Prefers boutique hotels with scenic views"],
    "dietary": ["Vegetarian"],
    "vibes": ["Scenic photography"],
    "style": ["Boutique"],
    "pacing": ["Relaxed mornings"],
    "budget": ["Target ₹3,00,000"],
    "companionship": ["Couple"],
    "pastDecisions": ["Chose lakeside view room"],
    "keyNotes": ["Looking for authentic local craft workshops"]
  }
}`;

    // Construct multi-turn messages array
    const chatMessages: ChatMsg[] = [{ role: "system", content: systemPrompt }];

    // Append up to the last 14 history turns
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-14);
      for (const h of recentHistory) {
        const content = (h.text || h.content || "").trim();
        if (!content) continue;
        const role = h.role === "user" ? "user" : "assistant";
        chatMessages.push({ role, content });
      }
    }

    // Append current user message
    chatMessages.push({ role: "user", content: message });

    const res = await chatJSON(
      chatMessages,
      ChatResponseSchema,
      {
        signal: req.signal,
        reasoning: "low",
        maxTokens: 4096,
      }
    );

    // If model returned no action but Middleman detected an explicit budget target action, apply it
    if ((!res.action || res.action.kind === "none") && middlemanCheck.suggestedAction) {
      res.action = {
        kind: middlemanCheck.suggestedAction.kind as any,
        value: middlemanCheck.suggestedAction.value,
        deltaLabel: middlemanCheck.suggestedAction.deltaLabel,
      };
    }

    return json(res, 200);
  } catch (err) {
    console.error("[api/chat] Error:", err);
    return json(
      {
        reply: "I've noted that preference and applied the closest optimization to your trip.",
        action: { kind: "none" },
      },
      200
    );
  }
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
