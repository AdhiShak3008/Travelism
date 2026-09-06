import type {
  Place,
  VideoAsset,
  ReviewIntel,
  HotelOption,
  FlightOption,
  TransportOption,
  Permit,
  FoodPick,
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

class MockResearchProvider implements ResearchProvider {
  resolveDestination(dream: string): { id: string; name: string } | null {
    const t = dream.toLowerCase();
    if (t.includes("tawang")) return { id: "dest_tawang", name: "Tawang" };
    for (const d of GENERIC_DESTINATIONS) {
      if (t.includes(d.name.toLowerCase())) return { id: d.id, name: d.name };
    }
    // If nothing recognized, default to Tawang as the flagship demo dataset,
    // but keep the user's phrasing available upstream.
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
