import type {
  Place,
  VideoAsset,
  ReviewIntel,
  HotelOption,
  FlightOption,
  TransportOption,
  Permit,
  FoodPick,
  Experience,
  Source,
  EvidencePacket,
  Conflict,
} from "../types";
import { SOURCES } from "./sources";
import {
  TAWANG_META,
  TAWANG_PLACES,
  TAWANG_VIDEOS,
  TAWANG_REVIEWS,
  TAWANG_HOTELS,
  TAWANG_FLIGHTS,
  TAWANG_TRANSPORT,
  TAWANG_PERMITS,
  TAWANG_FOOD,
  TAWANG_EXPERIENCES,
} from "./tawang";
import { GENERIC_DESTINATIONS, buildGenericDataset } from "./generic";

export interface DestinationMeta {
  id: string;
  name: string;
  tagline: string;
  region: string;
  gateway: string;
  hero: string;
  bestSeason: string;
  facts: string[];
  destinations?: string[];
}

export interface DestinationDataset {
  meta: DestinationMeta;
  places: Place[];
  videos: VideoAsset[];
  reviews: Record<string, ReviewIntel>;
  hotels: HotelOption[];
  flights: FlightOption[];
  transport: TransportOption[];
  permits: Permit[];
  food: FoodPick[];
  experiences: Experience[];
  evidence: EvidencePacket[];
  conflicts: Conflict[];
  /** Live datasets carry their own dynamically-discovered sources. */
  sources?: Record<string, Source>;
  /** true when produced by the live investigation pipeline. */
  live?: boolean;
}

// ---------------------------------------------------------------------------
// The ResearchProvider is the swappable seam. The mock provider returns rich
// local datasets. A live provider (crawler + entity resolution + evidence
// store) can implement the same interface later without touching the UI.
// ---------------------------------------------------------------------------
export interface ResearchProvider {
  resolveDestination(dream: string): { id: string; name: string } | null;
  getDataset(destinationId: string, destinationName: string): DestinationDataset;
  getSource(id: string): Source | undefined;
}

function buildTawangEvidence(): { evidence: EvidencePacket[]; conflicts: Conflict[] } {
  const evidence: EvidencePacket[] = [
    {
      id: "ev_h1_bath",
      entityId: "hotel_h1",
      attribute: "bathroom_quality",
      finding: "Generally clean; occasional morning water-pressure dips",
      score: 8.6,
      confidence: 0.88,
      corroboration: 3,
      contradiction: 1,
      evidence: [
        { id: "e1", type: "review", sourceId: "review_platform", date: TAWANG_META.daysAgo(9), claim: "Bathroom spotless, good hot water most of the time." },
        { id: "e2", type: "image", sourceId: "booking_platform", date: TAWANG_META.daysAgo(30), claim: "Guest photo shows clean tiled bathroom." },
        { id: "e3", type: "review", sourceId: "review_platform", date: TAWANG_META.daysAgo(4), claim: "Low water pressure at 7am." },
      ],
    },
    {
      id: "ev_h1_clean",
      entityId: "hotel_h1",
      attribute: "cleanliness",
      finding: "Consistently clean rooms",
      score: 9.0,
      confidence: 0.9,
      corroboration: 5,
      contradiction: 0,
      evidence: [
        { id: "e4", type: "review", sourceId: "review_platform", date: TAWANG_META.daysAgo(6), claim: "Room was immaculate." },
        { id: "e5", type: "official", sourceId: "hotel_official", date: TAWANG_META.daysAgo(60), claim: "Daily housekeeping." },
      ],
    },
  ];

  const conflicts: Conflict[] = [
    {
      id: "cf_hotwater",
      entityId: "hotel_h1",
      attribute: "hot_water",
      claimA: { text: "24-hour hot water available", sourceId: "hotel_official" },
      claimB: { text: "Several recent guests report restricted morning hot water", sourceId: "review_platform" },
      recommendation: "Plan for possible morning limits; confirm at check-in.",
    },
    {
      id: "cf_traveltime",
      entityId: "place_bumla",
      attribute: "travel_time",
      claimA: { text: "~2 hours each way", sourceId: "blog" },
      claimB: { text: "2.5–3 hours each way depending on snow", sourceId: "forum" },
      recommendation: "Budget 3 hours each way to be safe.",
    },
  ];

  return { evidence, conflicts };
}

const POPULAR_DESTINATIONS = [
  "Miami", "New York", "Los Angeles", "San Francisco", "Las Vegas", "Chicago", "Hawaii", "Orlando", "Seattle", "Austin", "Boston",
  "Paris", "London", "Rome", "Barcelona", "Amsterdam", "Berlin", "Venice", "Florence", "Madrid", "Prague", "Vienna", "Lisbon", "Athens", "Santorini", "Swiss Alps", "Switzerland", "Iceland", "Norway",
  "Tokyo", "Kyoto", "Osaka", "Seoul", "Bangkok", "Phuket", "Bali", "Singapore", "Dubai", "Abu Dhabi", "Vietnam", "Hanoi", "Da Nang", "Hong Kong", "Maldives",
  "Goa", "Tawang", "Ladakh", "Leh", "Spiti", "Manali", "Shimla", "Dharamshala", "Rishikesh", "Varanasi", "Jaipur", "Udaipur", "Jodhpur", "Kerala", "Munnar", "Meghalaya", "Shillong", "Coorg", "Ooty", "Hampi", "Andaman", "Kashmir", "Srinagar", "Gulmarg"
];

class MockResearchProvider implements ResearchProvider {
  resolveDestination(dream: string): { id: string; name: string } | null {
    const t = dream.toLowerCase();

    // 1. Direct match against known destinations
    for (const dest of POPULAR_DESTINATIONS) {
      const regex = new RegExp(`\\b${dest.toLowerCase()}\\b`, "i");
      if (regex.test(t)) {
        const slug = dest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return { id: `dest_${slug}`, name: dest };
      }
    }

    for (const d of GENERIC_DESTINATIONS) {
      if (t.includes(d.name.toLowerCase())) return { id: d.id, name: d.name };
    }

    // 2. Strip common filler phrases before matching
    const cleaned = dream
      .replace(/as many (?:places|sights|spots|locations) as possible/gi, "")
      .replace(/as much as possible/gi, "")
      .replace(/cheap (?:flights|hotels|stays)/gi, "")
      .replace(/clean (?:bathrooms|rooms|hotels)/gi, "")
      .replace(/no (?:crazy|rushed|hurried) itinerary/gi, "")
      .replace(/good food|local food|great scenery|beautiful views/gi, "")
      .replace(/for (?:a week|\d+ days|\d+ weeks)/gi, "")
      .replace(/with (?:my friends|family|wife|husband|kids|\d+ people)/gi, "")
      .trim();

    // 3. Match preposition patterns (e.g. "trip to Miami", "explore Miami", "visit Miami")
    const prepMatch = cleaned.match(/(?:trip to|travel to|going to|head to|fly to|flight to|explore|visit|in|to)\s+([A-Za-z\s]+?)(?:\s+(?:and|with|for|during|on|without|including|,|\.|$))/i);
    if (prepMatch?.[1]) {
      const candidate = prepMatch[1].trim();
      const nonFillers = candidate.split(/\s+/).filter(w => !["a", "the", "some", "and", "or", "my", "our"].includes(w.toLowerCase()));
      if (nonFillers.length > 0 && nonFillers.join(" ").length >= 2) {
        const formattedName = nonFillers.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        const slug = formattedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return { id: `dest_${slug}`, name: formattedName };
      }
    }

    // 4. Token filtering fallback
    const words = cleaned.split(/\s+/).filter(w => {
      const lw = w.toLowerCase().replace(/[^a-z]/g, "");
      return lw.length >= 2 && !["want", "need", "like", "love", "plan", "trip", "vacation", "holiday", "tour", "loop", "days", "week", "month", "hotel", "hotels", "place", "places", "travel", "explore", "visit", "see", "find", "going", "head"].includes(lw);
    });

    if (words.length > 0) {
      const candidate = words.slice(0, 2).join(" ").replace(/[^a-zA-Z\s]/g, "").trim();
      if (candidate.length >= 2) {
        const formattedName = candidate.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        const slug = formattedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return { id: `dest_${slug}`, name: formattedName };
      }
    }

    return { id: "dest_tawang", name: "Tawang" };
  }

  getDataset(destinationId: string, destinationName: string): DestinationDataset {
    if (destinationId === "dest_tawang") {
      const { evidence, conflicts } = buildTawangEvidence();
      return {
        meta: {
          id: TAWANG_META.id,
          name: TAWANG_META.name,
          tagline: TAWANG_META.tagline,
          region: TAWANG_META.region,
          gateway: TAWANG_META.gateway,
          hero: TAWANG_META.hero,
          bestSeason: TAWANG_META.bestSeason,
          facts: TAWANG_META.facts,
        },
        places: TAWANG_PLACES,
        videos: TAWANG_VIDEOS,
        reviews: TAWANG_REVIEWS,
        hotels: TAWANG_HOTELS,
        flights: TAWANG_FLIGHTS,
        transport: TAWANG_TRANSPORT,
        permits: TAWANG_PERMITS,
        food: TAWANG_FOOD,
        experiences: TAWANG_EXPERIENCES,
        evidence,
        conflicts,
      };
    }
    return buildGenericDataset(destinationId, destinationName);
  }

  getSource(id: string): Source | undefined {
    return SOURCES[id];
  }
}

export const research: ResearchProvider = new MockResearchProvider();
