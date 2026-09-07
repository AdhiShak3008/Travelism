import type {
  Place,
  VideoAsset,
  ReviewIntel,
  HotelOption,
  FlightOption,
  TransportOption,
  Permit,
  FoodPick,
} from "../types";
import { img, imgSet, video } from "./media";
import type { DestinationDataset } from "./provider";

// A curated set of alternate destinations the demo recognizes. For anything
// else we synthesize a plausible dataset so the whole flow always works.
export const GENERIC_DESTINATIONS = [
  { id: "dest_ladakh", name: "Ladakh", region: "Ladakh, India", gateway: "Leh (IXL)", tagline: "High-desert passes, cobalt lakes and ancient gompas." },
  { id: "dest_spiti", name: "Spiti", region: "Himachal Pradesh, India", gateway: "Chandigarh (IXC)", tagline: "A cold desert of monasteries, fossils and dizzying roads." },
  { id: "dest_meghalaya", name: "Meghalaya", region: "Meghalaya, India", gateway: "Guwahati (GAU)", tagline: "Living root bridges, waterfalls and the wettest hills on earth." },
  { id: "dest_coorg", name: "Coorg", region: "Karnataka, India", gateway: "Mangaluru (IXE)", tagline: "Misty coffee country with easy trails and quiet homestays." },
];

const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString();

export function buildGenericDataset(id: string, name: string): DestinationDataset {
  const known = GENERIC_DESTINATIONS.find((d) => d.id === id);
  const region = known?.region ?? "India";
  const gateway = known?.gateway ?? "Nearest airport";
  const tagline = known?.tagline ?? `Discover the landscapes, culture and food of ${name}.`;

  const places: Place[] = [
    {
      id: `${id}_p1`,
      canonicalName: `${name} Old Town`,
      altNames: [`${name} centre`],
      category: "core",
      blurb: `The historic heart of ${name}.`,
      description: `A walkable core with markets, cafes and the main landmarks of ${name}.`,
      images: imgSet("town", "attraction", 2),
      videoIds: [],
      durationHours: 2.5,
      distanceKm: 1,
      travelTime: "5 min",
      bestTime: "Morning",
      difficulty: "easy",
      accessible: "yes",
      permitRequired: false,
      facts: [`Cultural centre of ${name}`],
      nearby: [`${id}_p2`],
      sourceIds: ["ap_tourism", "publication"],
      confidence: 0.82,
      routeOrder: 10,
    },
    {
      id: `${id}_p2`,
      canonicalName: `${name} Viewpoint`,
      altNames: [],
      category: "adventure",
      blurb: `The best panorama over ${name}.`,
      description: `A scenic high point with sweeping views — a favorite for sunrise and photography.`,
      images: [img("himalaya", "landscape"), img("himalaya", "guest", "guest")],
      videoIds: [],
      durationHours: 2,
      distanceKm: 18,
      travelTime: "45 min",
      bestTime: "Sunrise",
      difficulty: "moderate",
      accessible: "partial",
      permitRequired: false,
      facts: ["Popular sunrise spot"],
      nearby: [`${id}_p1`],
      sourceIds: ["ap_tourism", "blog"],
      confidence: 0.78,
      routeOrder: 20,
    },
    {
      id: `${id}_p3`,
      canonicalName: `${name} Falls`,
      altNames: [],
      category: "enroute",
      blurb: `A well-loved waterfall near ${name}.`,
      description: `A refreshing stop on the way in, best after the rains.`,
      images: imgSet("waterfall", "attraction", 2),
      videoIds: [],
      durationHours: 1,
      distanceKm: 25,
      travelTime: "On the route",
      bestTime: "Post-monsoon",
      difficulty: "easy",
      accessible: "partial",
      permitRequired: false,
      facts: ["Seasonal volume"],
      nearby: [`${id}_p2`],
      sourceIds: ["ap_tourism"],
      confidence: 0.75,
      routeOrder: 6,
    },
  ];

  const videos: VideoAsset[] = [
    video(`${id}_p1`, `${name} — a walking tour`, "Slow Nomad", "12:30", `A calm walk through central ${name}.`, "walk"),
    video(`dest_${id}`, `${name} in 5 days`, "Frame & Trail", "18:45", "A realistic pace for the whole area.", "vlog"),
  ];

  const reviews: Record<string, ReviewIntel> = {
    [`ri_${id}_h1`]: {
      entityId: `${id}_h1`,
      overall: 4.2,
      count: 180,
      aspects: [
        { aspect: "Cleanliness", score: 8.6, mentions: 90 },
        { aspect: "Bathroom", score: 8.2, mentions: 55 },
        { aspect: "Hot water", score: 7.8, mentions: 40 },
        { aspect: "Staff", score: 8.9, mentions: 60 },
        { aspect: "Location", score: 8.5, mentions: 50 },
        { aspect: "Value", score: 8.0, mentions: 44 },
      ],
      positives: ["Clean rooms", "Friendly staff", "Good location"],
      negatives: ["Occasional hot water gaps"],
      trend: "stable",
    },
  };

  const hotels: HotelOption[] = [
    {
      id: `${id}_h1`,
      name: `${name} Comfort Stay`,
      location: `Central ${name}`,
      room: "Deluxe double",
      pricePerNight: 2600,
      images: [img("hotelroom", "room", "official"), img("bathroom", "bathroom", "guest")],
      videoIds: [],
      cleanliness: 8.6,
      bathroomScore: 8.2,
      reviewIntelId: `ri_${id}_h1`,
      policies: ["Free cancellation up to 48h", "Breakfast included"],
      amenities: ["Hot water", "Restaurant", "Parking"],
      hasElevator: true,
      sourceIds: ["hotel_official", "booking_platform", "review_platform"],
      whyReasons: ["Fits your budget", "Strong cleanliness evidence", "Central location"],
      confidence: 0.84,
    },
    {
      id: `${id}_h2`,
      name: `${name} Hillside Boutique`,
      location: `Ridge, 2 km out`,
      room: "Premium king",
      pricePerNight: 3800,
      images: [img("hotelroom", "room", "official"), img("bathroom", "bathroom", "official")],
      videoIds: [],
      cleanliness: 9.1,
      bathroomScore: 8.9,
      reviewIntelId: `ri_${id}_h1`,
      policies: ["Free cancellation up to 72h", "Breakfast included"],
      amenities: ["Reliable hot water", "Cafe", "Heating"],
      hasElevator: true,
      sourceIds: ["hotel_official", "booking_platform"],
      whyReasons: ["Best comfort tier", "Quiet", "Great bathrooms"],
      confidence: 0.82,
    },
  ];

  const flights: FlightOption[] = [
    {
      id: `${id}_flight_out`,
      airline: "IndiGo",
      flightNo: "6E-2201",
      from: "Hyderabad (HYD)",
      to: gateway,
      depart: "09:10",
      arrive: "12:20",
      layover: "Direct",
      baggage: "15 kg check-in · 7 kg cabin",
      fare: 6200,
      sourceId: "indigo",
      earlyMorning: false,
    },
    {
      id: `${id}_flight_ret`,
      airline: "IndiGo",
      flightNo: "6E-2208",
      from: gateway,
      to: "Hyderabad (HYD)",
      depart: "13:40",
      arrive: "16:50",
      layover: "Direct",
      baggage: "15 kg check-in · 7 kg cabin",
      fare: 6200,
      sourceId: "indigo",
      earlyMorning: false,
    },
  ];

  const transport: TransportOption[] = [
    {
      id: `${id}_tr1`,
      vehicle: "SUV (private)",
      operator: "Local Cabs",
      fromPlace: gateway.split(" ")[0],
      toPlace: name,
      price: 8000,
      travelTime: "5–6 hrs",
      scenic: true,
      rating: 4.3,
      images: imgSet("road", "road", 1),
      sourceIds: ["transport_op"],
    },
    {
      id: `${id}_tr2`,
      vehicle: "SUV (private)",
      operator: "Local Cabs",
      fromPlace: name,
      toPlace: gateway.split(" ")[0],
      price: 8000,
      travelTime: "5–6 hrs",
      scenic: true,
      rating: 4.3,
      images: imgSet("road", "road", 1),
      sourceIds: ["transport_op"],
    },
  ];

  const permits: Permit[] = [
    {
      id: `${id}_permit`,
      name: "Entry permit",
      requirement: `Check current entry requirements for ${name}`,
      status: "not_required",
      estimatedCost: 0,
      process: "No special permit currently required for most travelers.",
      responsible: "Traveler",
      sourceIds: ["ap_tourism"],
    },
  ];

  const food: FoodPick[] = [
    {
      id: `${id}_f1`,
      name: `${name} Kitchen`,
      cuisine: "Local specialties",
      priceRange: "₹₹",
      location: `Central ${name}`,
      images: imgSet("food", "food", 2),
      whyRecommended: "Well-reviewed local dishes at fair prices.",
    },
  ];

  return {
    meta: {
      id,
      name,
      tagline,
      region,
      gateway,
      hero: img("himalaya", "landscape").url,
      bestSeason: "Shoulder seasons",
      facts: [`Gateway: ${gateway}`, `Region: ${region}`],
    },
    places,
    videos,
    reviews,
    hotels,
    flights,
    transport,
    permits,
    food,
    experiences: [],
    evidence: [],
    conflicts: [],
  };
}
