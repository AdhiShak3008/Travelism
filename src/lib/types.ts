// ============================================================================
// TRAVELISM — CORE DOMAIN MODEL
// The Trip Blob is the central persistent, stateful object. Every mutation is
// traceable. Comments are first-class data that flow into structured signals.
// ============================================================================

export type ISO = string; // ISO timestamp
export type Currency = "INR";

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------
export type AgentId =
  | "concierge"
  | "scout"
  | "wingman"
  | "pillow"
  | "toilet_inspector"
  | "roadrunner"
  | "daydreamer"
  | "review_detective"
  | "lens"
  | "reel_scout"
  | "gatekeeper"
  | "foodie"
  | "weather_witch"
  | "packrat"
  | "penny_pincher"
  | "cross_examiner"
  | "bean_counter";

export type AgentPhase = "idle" | "queued" | "working" | "done" | "skipped";

export interface AgentActivity {
  id: AgentId;
  name: string;
  glyph: string;
  role: string;
  phase: AgentPhase;
  /** Human-readable current line, e.g. "Comparing 31 stays" */
  status: string;
  /** Optional numeric result, e.g. reviews analyzed */
  metric?: string;
  /** Priority derived from user steering (0-1) */
  priority: number;
}

// ---------------------------------------------------------------------------
// Evidence & Provenance
// ---------------------------------------------------------------------------
export type SourceType =
  | "official"
  | "government"
  | "airline"
  | "property"
  | "booking_platform"
  | "review_platform"
  | "publication"
  | "blog"
  | "forum"
  | "social"
  | "video";

export interface Source {
  id: string;
  label: string;
  url: string;
  type: SourceType;
  /** 0-1 reliability weight */
  reliability: number;
  checkedAt: ISO;
}

export interface EvidenceItem {
  id: string;
  type: "review" | "image" | "official" | "publication" | "video" | "data";
  sourceId: string;
  date: ISO;
  claim: string;
}

export interface EvidencePacket {
  id: string;
  entityId: string;
  attribute: string;
  finding: string;
  /** 0-10 aspect score */
  score?: number;
  /** 0-1 confidence */
  confidence: number;
  evidence: EvidenceItem[];
  corroboration: number;
  contradiction: number;
}

export interface Conflict {
  id: string;
  entityId: string;
  attribute: string;
  claimA: { text: string; sourceId: string };
  claimB: { text: string; sourceId: string };
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
export type ImageCategory =
  | "exterior"
  | "room"
  | "bathroom"
  | "food"
  | "attraction"
  | "road"
  | "landscape"
  | "guest"
  | "official";

export interface MediaImage {
  id: string;
  url: string;
  category: ImageCategory;
  credit: string;
  provenance: "official" | "guest" | "editorial";
  date?: ISO;
}

export interface VideoAsset {
  id: string;
  title: string;
  creator: string;
  thumbnail: string;
  duration: string; // mm:ss
  /** opens a YouTube search for this title — honest "discovery", not a fabricated exact video */
  searchUrl: string;
  /** why it is useful for this entity */
  why: string;
  relatesTo: string; // entity id
  kind: "road" | "walk" | "attraction" | "room_tour" | "review" | "food" | "vlog" | "seasonal";
}

// ---------------------------------------------------------------------------
// Reviews — aspect-level intelligence
// ---------------------------------------------------------------------------
export interface AspectScore {
  aspect: string;
  score: number; // 0-10
  mentions: number;
}

export interface ReviewIntel {
  entityId: string;
  overall: number; // 0-5
  count: number;
  aspects: AspectScore[];
  positives: string[];
  negatives: string[];
  recentConcern?: string;
  trend: "improving" | "stable" | "declining";
}

// ---------------------------------------------------------------------------
// Entities & Places (entity resolution / entity graph)
// ---------------------------------------------------------------------------
export type EntityType =
  | "destination"
  | "place"
  | "hotel"
  | "restaurant"
  | "transport"
  | "attraction";

export type PlaceCategory = "core" | "adventure" | "enroute" | "food" | "stay";
export type Difficulty = "easy" | "moderate" | "hard";

export interface Place {
  id: string;
  canonicalName: string;
  altNames: string[];
  category: PlaceCategory;
  blurb: string;
  description: string;
  images: MediaImage[];
  videoIds: string[];
  durationHours: number; // recommended visit duration
  distanceKm?: number; // from destination hub
  travelTime?: string;
  bestTime?: string;
  difficulty?: Difficulty;
  accessible?: "yes" | "partial" | "no";
  permitRequired?: boolean;
  facts: string[];
  nearby: string[];
  sourceIds: string[];
  confidence: number;
  /** lat/lng-ish ordering hint for the itinerary engine (route position) */
  routeOrder: number;
}

// ---------------------------------------------------------------------------
// Trip components
// ---------------------------------------------------------------------------
export type CostStatus = "confirmed" | "estimated" | "optional" | "variable";

export interface CostLine {
  id: string;
  label: string;
  amount: number;
  currency: Currency;
  status: CostStatus;
  sourceId?: string;
  checkedAt: ISO;
  perPerson?: boolean;
}

export interface FlightOption {
  id: string;
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  layover?: string;
  baggage: string;
  fare: number;
  sourceId: string;
  earlyMorning: boolean;
  // richer detail
  duration?: string; // e.g. "4h 45m"
  stops?: number; // 0 = nonstop
  stopDetail?: string; // e.g. "via Kolkata (55m)"
  cabin?: string; // Economy / Premium Economy
  aircraft?: string;
  refundable?: boolean;
  fareLow?: number; // estimated fare band
  fareHigh?: number;
  estimated?: boolean; // true until a live flight API (Amadeus) is wired
  onTime?: number; // 0-100 on-time %
}

export interface HotelOption {
  id: string;
  name: string;
  location: string;
  room: string;
  pricePerNight: number;
  images: MediaImage[];
  videoIds: string[];
  cleanliness: number; // 0-10
  bathroomScore: number; // 0-10
  reviewIntelId: string;
  policies: string[];
  amenities: string[];
  hasElevator: boolean;
  sourceIds: string[];
  whyReasons: string[];
  confidence: number;
}

export interface TransportOption {
  id: string;
  vehicle: string;
  operator: string;
  fromPlace: string;
  toPlace: string;
  price: number;
  travelTime: string;
  scenic: boolean;
  rating: number; // 0-5
  images: MediaImage[];
  sourceIds: string[];
}

export interface ActivityItem {
  id: string;
  placeId: string;
  name: string;
  durationHours: number;
  cost: number;
  requirements: string[];
  whyRecommended: string;
}

export interface Permit {
  id: string;
  name: string;
  requirement: string;
  status: "required" | "arranged" | "pending" | "not_required";
  estimatedCost: number;
  process: string;
  responsible: string;
  sourceIds: string[];
}

export type ExperienceCategory =
  | "theme_park"
  | "water"
  | "adventure"
  | "wildlife"
  | "tour"
  | "cultural"
  | "wellness"
  | "food_exp"
  | "nightlife";

export interface Experience {
  id: string;
  name: string;
  category: ExperienceCategory;
  blurb: string;
  description?: string;
  price: number; // in INR (per person unless perPerson=false)
  priceNote?: string; // e.g. "ticket only", "incl. gear", "estimated"
  perPerson: boolean;
  durationHours?: number;
  difficulty?: Difficulty;
  familyFriendly?: boolean;
  minAge?: number;
  location?: string;
  images: MediaImage[];
  whyRecommended?: string;
  bookingHint?: string;
  sourceIds: string[];
  estimated: boolean;
  confidence: number;
}

export interface FoodPick {
  id: string;
  name: string;
  cuisine: string;
  priceRange: string;
  location: string;
  images: MediaImage[];
  reviewIntelId?: string;
  whyRecommended: string;
}

export interface ItineraryStop {
  placeId?: string;
  label: string;
  start: string; // HH:mm
  end: string;
  kind: "travel" | "visit" | "meal" | "rest" | "hotel";
  note?: string;
  travelTime?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  baseLocation: string;
  stops: ItineraryStop[];
}

// ---------------------------------------------------------------------------
// Steering: comments → structured signals
// ---------------------------------------------------------------------------
export type SignalCategory =
  | "preference"
  | "constraint"
  | "exclusion"
  | "priority"
  | "budget"
  | "accessibility"
  | "correction"
  | "uncertainty"
  | "investigation"
  | "entity_instruction"
  | "trip_instruction";

export type SignalScope =
  | "trip"
  | "stage"
  | "destination"
  | "place"
  | "hotel"
  | "flight"
  | "transport"
  | "activity"
  | "itinerary"
  | "food";

export interface SteeringSignal {
  id: string;
  category: SignalCategory;
  scope: SignalScope;
  entityId?: string;
  /** raw comment */
  text: string;
  /** system interpretation shown back to user */
  interpretation: string;
  /** affected agents */
  affectedAgents: AgentId[];
  /** downstream structured effects, e.g. { minimizeHotelChanges: true } */
  effects: Record<string, string | number | boolean>;
  createdAt: ISO;
}

// ---------------------------------------------------------------------------
// Mood
// ---------------------------------------------------------------------------
export type MoodKey =
  | "scenic"
  | "photography"
  | "food"
  | "comfort"
  | "adventure"
  | "culture"
  | "nightlife"
  | "rushing";

export type Mood = Record<MoodKey, number>; // 0-10

export interface Preferences {
  budgetTotal?: number;
  budgetTier: "economical" | "balanced" | "premium";
  pace: "comfortable" | "balanced" | "fast";
  minimizeHotelChanges: boolean;
  hotelChangeSavingsThreshold?: number;
  avoidEarlyFlights: boolean;
  travelers: number;
  accessibilityNeeds: string[];
  priorities: string[]; // e.g. ["bathroom_cleanliness","scenery"]
  deprioritized: string[];
}

// ---------------------------------------------------------------------------
// Mutation log — traceability
// ---------------------------------------------------------------------------
export interface Mutation {
  id: string;
  at: ISO;
  summary: string;
  reason?: string; // linked comment text
  deltas: string[]; // human-readable effects, e.g. "Transport comfort ↑"
  costBefore?: number;
  costAfter?: number;
}

// ---------------------------------------------------------------------------
// Stage / flow
// ---------------------------------------------------------------------------
export type Stage =
  | "dream"
  | "reveal"
  | "select"
  | "shape"
  | "mood"
  | "investigate"
  | "package"
  | "refine"
  | "cost"
  | "checkout"
  | "trip";

export type BookingState = "planning" | "checkout" | "booked";

// ---------------------------------------------------------------------------
// THE TRIP BLOB
// ---------------------------------------------------------------------------
export interface TripBlob {
  id: string;
  createdAt: ISO;
  updatedAt: ISO;

  destinationId: string | null;
  destinationName: string;
  dream: string;

  /** where the traveller is flying from (their departure city) */
  origin: string;

  travelers: number;
  dates: { start?: ISO; flexible: boolean };
  durationDays: number;

  mood: Mood;
  preferences: Preferences;

  selectedPlaceIds: string[];
  selectedExperienceIds: string[];
  lockedComponentIds: string[];
  rejectedOptionIds: string[];

  // chosen components (ids reference research layer)
  flight?: FlightOption;
  returnFlight?: FlightOption;
  /** how the flight estimate was derived (shown honestly in the UI) */
  flightNote?: string;
  hotels: HotelOption[]; // may be multiple across the route
  transport: TransportOption[];
  activities: ActivityItem[];
  food: FoodPick[];
  experiences: Experience[];
  permits: Permit[];
  itinerary: ItineraryDay[];

  costs: CostLine[];

  signals: SteeringSignal[];
  mutations: Mutation[];
  conflicts: Conflict[];
  unresolved: string[];

  bookingState: BookingState;
  bookedAt?: ISO;
}
