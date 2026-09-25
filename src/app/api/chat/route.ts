import { NextRequest } from "next/server";
import { z } from "zod";
import { chat, chatJSON, type ChatMsg } from "@/lib/server/groq";
import { ENV } from "@/lib/server/env";
import type { TravelerMemory } from "@/lib/types";
import { formatTravelerMemoryForPrompt } from "@/lib/memory";
import { arbitrateConciergeFactCheck } from "@/lib/server/middleman";

export const runtime = "nodejs";
export const maxDuration = 60;

const SingleActionObjectSchema = z.object({
  kind: z.string().nullish(),
  action: z.string().nullish(),
  value: z.union([z.number(), z.string()]).nullish(),
  targetHotelId: z.string().nullish(),
  targetHotelName: z.string().nullish(),
  dayNum: z.union([z.number(), z.string()]).nullish(),
  day: z.union([z.number(), z.string()]).nullish(),
  dayTitle: z.string().nullish(),
  stops: z
    .array(
      z.object({
        kind: z.enum(["visit", "meal", "travel", "rest", "hotel", "cafe", "sightseeing", "free"]).catch("visit"),
        label: z.string().catch("Scheduled Stop"),
        start: z.string().catch("10:00"),
        end: z.string().catch("12:00"),
        note: z.string().nullish(),
      })
    )
    .nullish(),
  stop: z
    .object({
      kind: z.enum(["visit", "meal", "travel", "rest", "hotel", "cafe", "sightseeing", "free"]).catch("visit"),
      label: z.string().catch("Scheduled Stop"),
      start: z.string().catch("10:00"),
      end: z.string().catch("12:00"),
      note: z.string().nullish(),
    })
    .nullish(),
  activityData: z
    .object({
      name: z.string().catch("Custom Activity"),
      category: z.string().nullish(),
      price: z.union([z.number(), z.string()]).nullish(),
      blurb: z.string().nullish(),
      durationHours: z.union([z.number(), z.string()]).nullish(),
      day: z.union([z.number(), z.string()]).nullish(),
      startTime: z.string().nullish(),
      endTime: z.string().nullish(),
    })
    .nullish(),
  deltaLabel: z.string().nullish(),
});

const SingleActionSchema = z.union([SingleActionObjectSchema, z.string()]);

const ChatResponseSchema = z.object({
  reply: z.string().nullish(),
  response: z.string().nullish(),
  answer: z.string().nullish(),
  content: z.string().nullish(),
  explanation: z.string().nullish(),
  message: z.string().nullish(),
  text: z.string().nullish(),
  action: SingleActionSchema.nullish(),
  actions: z.array(SingleActionSchema).nullish(),
  memoryDelta: z
    .object({
      learnedFacts: z.array(z.string()).nullish(),
      dietary: z.array(z.string()).nullish(),
      vibes: z.array(z.string()).nullish(),
      interests: z.array(z.string()).nullish(),
      style: z.array(z.string()).nullish(),
      pacing: z.array(z.string()).nullish(),
      budget: z.array(z.string()).nullish(),
      companionship: z.array(z.string()).nullish(),
      pastDecisions: z.array(z.string()).nullish(),
      keyNotes: z.array(z.string()).nullish(),
      preferences: z.any().nullish(),
    })
    .nullish(),
}).passthrough();

export async function POST(req: NextRequest) {
  let chatMessages: ChatMsg[] = [];
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
        hotelPriceFormatted?: string;
        stayMode?: string;
        budgetTier?: string;
        travelPace?: string;
        currency?: string;
        flightAirline?: string;
        flightDuration?: string;
        experiences?: string[];
        places?: string[];
        candidateHotels?: Array<{ id: string; name: string; pricePerNight: number; priceFormatted?: string; category?: string; cleanliness?: number; location?: string }>;
        candidatePlaces?: string[];
        permits?: Array<{ name: string; requiredFor?: string; requirement?: string; estimatedCost?: number; estimatedCostFormatted?: string; processingTime?: string; process?: string; authority?: string; notes?: string; whyNeeded?: string }>;
        conflicts?: Array<{ type?: string; title?: string; attribute?: string; severity?: string; resolution?: string; recommendation?: string; description?: string }>;
        itinerary?: { day: number; title: string; isRestDay?: boolean; stops: string[] }[];
        totalCost?: number;
        totalCostFormatted?: string;
        dietary?: string[];
      };
    };

    if (!message || !message.trim()) {
      return json({ error: "Message is required" }, 400);
    }

    if (!ENV.GROQ_API_KEY) {
      return json(
        {
          reply: `I've noted your request: "${message}". I can adjust your stays, vacation duration, activities, pace, or budget anytime.`,
          action: { kind: "none" },
        },
        200
      );
    }

    const dest = tripContext?.destinationName || "your destination";
    const days = tripContext?.durationDays || 7;
    const travelers = typeof tripContext?.travelers === "number" ? tripContext.travelers : 0;
    const origin = tripContext?.origin || "your departure city";
    const currency = tripContext?.currency || "EUR";
    const hotel = tripContext?.hotelName
      ? `${tripContext.hotelName} (${tripContext.hotelPriceFormatted || "Selected Stay"})`
      : "Selected Stay";
    const flight = tripContext?.flightAirline
      ? `${tripContext.flightAirline} (${tripContext.flightDuration || "Direct/Transit"})`
      : "Selected Flight";
    const stayMode = tripContext?.stayMode || "hotels";
    const exps = (tripContext?.experiences ?? []).join(", ") || "None yet";
    const places = (tripContext?.places ?? []).join(", ") || "Various highlights";
    const total = (tripContext as any)?.totalCostFormatted || (tripContext?.totalCost ? `${currency} ${Math.round(tripContext.totalCost).toLocaleString()}` : "calculated");

    // Candidate Stays Catalog - strictly formatted in the traveler's active currency
    const staysCatalog = (tripContext?.candidateHotels ?? [])
      .slice(0, 15)
      .map((h) => `- [ID: ${h.id}] **${h.name}** (${h.category || "stay"}): ${(h as any).priceFormatted || `${currency} ${h.pricePerNight}`}/night · Clean ${h.cleanliness || 8.5}/10 · ${h.location || dest}`)
      .join("\n");

    // Permits Registry - formatted in the traveler's active currency
    const permitsCatalog = (tripContext?.permits ?? [])
      .map((p) => `- **${p.name}**: ${(p as any).requirement || p.whyNeeded || p.notes || "Official permit required"} · Fee: ${(p as any).estimatedCostFormatted || `${currency} ${p.estimatedCost || 0}`} · Processing: ${p.processingTime || (p as any).process || "1-3 days"}`)
      .join("\n");

    // Advisories & Conflicts
    const conflictsCatalog = (tripContext?.conflicts ?? [])
      .map((c) => `- ⚠️ **${c.title || c.type || (c as any).attribute}**: ${c.description || c.resolution || (c as any).recommendation || "Advisory flagged"}`)
      .join("\n");

    const itinSummary = (tripContext?.itinerary ?? [])
      .slice(0, 10)
      .map((d) => `Day ${d.day} (${d.title}): ${d.stops.join("; ")}`)
      .join("\n");

    const memoryBlock = formatTravelerMemoryForPrompt(travelerMemory);
    const middlemanCheck = arbitrateConciergeFactCheck(message, tripContext);
    const middlemanAdvisory = middlemanCheck.hasConflictOrClosure && middlemanCheck.advisoryMarkdown
      ? `\n\n🛡️ MIDDLEMAN ARBITER FACT-CHECK ENFORCEMENT:\n${middlemanCheck.advisoryMarkdown}\nYou MUST incorporate this critical local advisory/closure into your answer!`
      : "";

    const recentMutationsText = (tripContext as any)?.recentMutations?.length
      ? ((tripContext as any).recentMutations as string[]).map((m: string) => `- ${m}`).join("\n")
      : "No recent manual overrides yet";

    const travelersPartyDesc = travelers === 0
      ? "0 travelers (Party size not yet confirmed by traveler - feel free to ask or accommodate party size when relevant)"
      : `${travelers} traveler${travelers > 1 ? "s" : ""}`;

    const systemPrompt = `You are the Travelism AI Concierge, an elite, warm, ultra-knowledgeable personal travel director with superpowers to both give deep destination intelligence and directly manipulate any section of the traveler's custom vacation itinerary in real time.

TRIP SITUATIONAL OVERVIEW:
- Destination: ${dest}
- Duration: ${days} days (${days - 1} nights)
- Group Size: ${travelersPartyDesc}
- Departure Origin: ${origin}
- Active Display Currency: ${currency} (STRICT REQUIREMENT: All prices quoted in your conversation MUST use ${currency})
- Active Stay Mode: ${stayMode}
- Current Selected Stay: ${hotel}
- Current Flight: ${flight}
- Booked Sights & Highlights: ${places}
- Booked Experiences: ${exps}
- Total Package Price: ${total}

KNOWN STAYS & HOMESTAYS IN REPERTORY:
${staysCatalog || "Standard boutique collection"}

PERMITS & REGULATORY REQUIREMENTS:
${permitsCatalog || "Standard domestic tourist access"}

KNOWN LOCAL CONFLICTS & ADVISORIES:
${conflictsCatalog || "No active disruptions noted"}

CURRENT ITINERARY SCHEDULE:
${itinSummary || "Standard balanced schedule"}${middlemanAdvisory}

RECENT ITINERARY MUTATIONS & CHANGES:
${recentMutationsText}

🧠 ACTIVE TRAVELER MEMORY & PROFILE CONTEXT:
${memoryBlock}

YOUR CORE RULES & SUPERPOWERS:
1. ALWAYS PROVIDE A RICH, CHARISMATIC, DETAILED EXPLANATION:
   - CRITICAL REQUIREMENT: NEVER return a dry or lazy 1-liner like "I've tailored that for your journey." or "Done!".
   - When the user asks a question, requests a change, or asks for an audit, ALWAYS provide a comprehensive, beautifully structured markdown reply with bold headers, bullet points, timings, and explanations for what you evaluated or changed, in addition to executing the actions.

2. WHEN AUDITING THE ITINERARY ("what am I missing?", "audit my itinerary", "how can I improve?"):
   - Provide an authoritative 4-part audit:
     * 🩺 **Pacing & Health Audit**: Evaluate high-altitude progression, driving fatigue, and rest day buffers.
     * 🏡 **Stay & Lodging Audit**: Review selected stays vs authentic homestays and comfort tiers.
     * 📜 **Permits & Regulatory Readiness**: Checklist of ILP/PAP, checkpoint photocopies, and entry fees.
     * ✨ **Tailored Enhancements**: Explain the exact stops, breaks, or cultural activities you are adding/optimizing.

3. WHEN ASKED "WHAT HAVE YOU CHANGED?" OR "WHAT DID YOU DO FOR DAY X AND Y?":
   - Explicitly consult the CURRENT ITINERARY SCHEDULE and RECENT ITINERARY MUTATIONS above.
   - Provide a clear, organized schedule breakdown for the requested days (e.g. Day 5, Day 6) showing the exact stops, timings, and why they were added.

4. STAY CUSTOMIZATION & REAL SEARCHING:
   - If user asks for cheaper homestays/hotels, set action: "swap_hotel" or "cheaper_hotel" or "search_new_hotels".
   - If user asks for luxury/nicer stays, set action: "upgrade_hotel" or "search_new_hotels".
   - If user asks to switch stay styles, set action: "set_stay_mode" ("wild_camping"|"homestays"|"campsites_refugios"|"hotels"|"none").

5. ITINERARY SURGERY & TIMETABLE MANIPULATION:
   - "make day X a rest day / cafe day" → action: "replace_day_stops" with hourly stops (kind, label, start, end, note).
   - "add stop / break / meal / viewpoint" → action: "add_day_stop" with dayNum and stop.
   - "remove X from day Y" → action: "remove_day_stop" with dayNum and value.
   - "add activity / tour" → action: "add_activity" with activityData: { name, category, price, blurb, durationHours }.
   - "remove activity" → action: "remove_activity" with value.
   - "add 2 days" / "set duration" → action: "add_days" or "set_duration".

6. STRICT DISPLAY CURRENCY ENFORCEMENT:
   - Quote ALL prices, activity costs, and rates in "${currency}".
   - Return new learned traveler facts in "memoryDelta" so they persist.

Always return STRICT JSON in this exact structure:
{
  "reply": "Your rich, formatted markdown answer with bold headers, bullet points, recommendations, food guides, and permit advice...",
  "action": {
    "kind": "replace_day_stops" | "add_activity" | "add_day_stop" | "remove_day_stop" | "set_day_focus" | "set_stay_mode" | "swap_hotel" | "upgrade_hotel" | "cheaper_hotel" | "set_duration" | "none",
    "dayNum": 3,
    "dayTitle": "Relaxed Culinary & Café Day",
    "stops": [
      { "kind": "meal" | "visit" | "rest" | "travel", "label": "Morning Bakery & Butter Tea", "start": "09:00", "end": "10:30", "note": "Fresh khapse and tea" }
    ]
  },
  "memoryDelta": {
    "learnedFacts": ["prefers relaxed culinary and cafe pacing"]
  }
}`;

    chatMessages = [{ role: "system", content: systemPrompt }];

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

    // Extract reply text across all potential schema keys
    let rawReply = (
      res.reply ||
      (res as any).response ||
      (res as any).answer ||
      (res as any).content ||
      (res as any).explanation ||
      res.message ||
      res.text ||
      ""
    ).trim();

    // If reply is wrapped in markdown json, try to extract inside content or strip json markers
    if (rawReply.startsWith("{") || rawReply.startsWith("```json")) {
      try {
        const cleanJsonStr = rawReply.replace(/```(?:json)?\s*/gi, "").replace(/\s*```$/gi, "").trim();
        const parsed = JSON.parse(cleanJsonStr);
        const innerReply = parsed.reply || parsed.response || parsed.answer || parsed.content || parsed.message || parsed.text;
        if (typeof innerReply === "string" && innerReply.trim().length > 0) {
          rawReply = innerReply.trim();
        }
      } catch {
        // Not direct parseable JSON, proceed with string
      }
    }

    rawReply = rawReply
      .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/gi, "")
      .replace(/(?:^|\n)\s*---\s*\n\s*\{[\s\S]*\}\s*$/gi, "")
      .trim();

    // Consolidate actions (support single action object, string action, or array)
    const rawActionList: any[] = [];
    if (Array.isArray(res.actions)) {
      rawActionList.push(...res.actions);
    }
    if (res.action) {
      if (typeof res.action === "string") {
        rawActionList.push({
          kind: res.action,
          dayNum: (res as any).dayNum ?? (res as any).day,
          dayTitle: (res as any).dayTitle,
          stops: (res as any).stops,
          stop: (res as any).stop,
          value: (res as any).value,
        });
      } else {
        rawActionList.push(res.action);
      }
    }
    // Also capture if root object itself contains action / day / stops
    if (typeof (res as any).action === "string" && (res as any).action !== "none" && !rawActionList.length) {
      rawActionList.push({
        kind: (res as any).action,
        dayNum: (res as any).dayNum ?? (res as any).day,
        dayTitle: (res as any).dayTitle,
        stops: (res as any).stops,
        stop: (res as any).stop,
        value: (res as any).value,
      });
    }
    if ((res as any).stops && Array.isArray((res as any).stops) && !rawActionList.some((a) => a.kind === "replace_day_stops")) {
      rawActionList.push({
        kind: "replace_day_stops",
        dayNum: (res as any).dayNum ?? (res as any).day ?? 3,
        dayTitle: (res as any).dayTitle || "Customized Day",
        stops: (res as any).stops,
      });
    }

    const allActions = rawActionList.map((a) => {
      const dayVal = a.dayNum ?? a.day;
      const parsedDay = typeof dayVal === "number" ? dayVal : typeof dayVal === "string" ? parseInt(dayVal, 10) : undefined;
      
      let priceVal: number | undefined = undefined;
      if (typeof a.activityData?.price === "number") {
        priceVal = a.activityData.price;
      } else if (typeof a.activityData?.price === "string") {
        const num = parseFloat(a.activityData.price.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) priceVal = num;
      }

      let durVal: number | undefined = undefined;
      if (typeof a.activityData?.durationHours === "number") {
        durVal = a.activityData.durationHours;
      } else if (typeof a.activityData?.durationHours === "string") {
        const num = parseFloat(a.activityData.durationHours);
        if (!isNaN(num)) durVal = num;
      }

      return {
        kind: a.kind || a.action || "none",
        value: a.value,
        targetHotelId: a.targetHotelId,
        targetHotelName: a.targetHotelName,
        dayNum: typeof parsedDay === "number" && !isNaN(parsedDay) ? parsedDay : undefined,
        dayTitle: a.dayTitle,
        stops: a.stops,
        stop: a.stop,
        activityData: a.activityData
          ? {
              name: a.activityData.name,
              category: a.activityData.category,
              price: priceVal,
              blurb: a.activityData.blurb,
              durationHours: durVal,
            }
          : undefined,
        deltaLabel: a.deltaLabel,
      };
    });

    const primaryAction = allActions[0] || { kind: "none" };

    // If model returned no action but Middleman detected an explicit budget target action, apply it
    if ((!primaryAction.kind || primaryAction.kind === "none") && middlemanCheck.suggestedAction) {
      primaryAction.kind = middlemanCheck.suggestedAction.kind as any;
      primaryAction.value = middlemanCheck.suggestedAction.value;
      primaryAction.deltaLabel = middlemanCheck.suggestedAction.deltaLabel;
    }

    // Only apply synthesized fallback if the reply is completely empty (0 characters)
    if (!rawReply || rawReply.length === 0) {
      if (allActions.length > 0 && allActions[0].kind !== "none") {
        const actionSummaries = allActions.map((act) => {
          if (act.kind === "add_activity" && act.activityData) {
            return `• **Added Activity**: ${act.activityData.name}${act.activityData.price ? ` (${currency} ${act.activityData.price})` : ""}${act.activityData.blurb ? ` — ${act.activityData.blurb}` : ""}`;
          }
          if (act.kind === "add_day_stop" && act.stop) {
            return `• **Day ${act.dayNum || "Schedule"} Stop Added**: ${act.stop.label} (${act.stop.start}–${act.stop.end})`;
          }
          if (act.kind === "replace_day_stops") {
            return `• **Day ${act.dayNum || "Schedule"} Custom Schedule**: Updated timetable with ${act.stops?.length || "balanced"} stops.`;
          }
          if (act.kind === "swap_hotel" || act.kind === "cheaper_hotel") {
            return `• **Stay Swapped**: Selected new stay tailored to your preferences.`;
          }
          return `• **Itinerary Updated**: ${act.deltaLabel || act.kind}`;
        });

        rawReply = `### 🧭 Itinerary Update Applied\n\nI have updated your journey with the following customizations:\n\n${actionSummaries.join("\n")}\n\nLet me know if you would like to adjust the timings, explore dining spots, or tweak any other days!`;
      } else {
        rawReply = `I've analyzed your question regarding ${dest}. What specific spots, timings, or activity preferences would you like to explore next?`;
      }
    }

    return json(
      {
        reply: rawReply,
        action: primaryAction,
        actions: allActions,
        memoryDelta: res.memoryDelta,
      },
      200
    );
  } catch (err) {
    console.error("[api/chat] Error in chatJSON, attempting prose completion fallback:", err);
    try {
      const proseReply = await chat(chatMessages, {
        signal: req.signal,
        temperature: 0.4,
      });
      let cleanProse = (proseReply || "").trim();
      try {
        const parsed = JSON.parse(cleanProse.replace(/```(?:json)?\s*/gi, "").replace(/\s*```$/gi, "").trim());
        const extracted = parsed.reply || parsed.response || parsed.answer || parsed.content || parsed.message || parsed.text;
        if (typeof extracted === "string" && extracted.trim().length > 0) {
          cleanProse = extracted.trim();
        }
      } catch {
        cleanProse = cleanProse
          .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/gi, "")
          .replace(/(?:^|\n)\s*---\s*\n\s*\{[\s\S]*\}\s*$/gi, "")
          .trim();
      }

      return json(
        {
          reply: cleanProse || "I'm here to help you customize your trip! What would you like to explore next?",
          action: { kind: "none" },
          actions: [],
        },
        200
      );
    } catch (fallbackErr) {
      console.error("[api/chat] Prose fallback error:", fallbackErr);
      return json(
        {
          reply: "I'm here to help you explore top local dining, adjust your stays, or tweak your daily timetable. What would you like to ask or change?",
          action: { kind: "none" },
          actions: [],
        },
        200
      );
    }
  }
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
