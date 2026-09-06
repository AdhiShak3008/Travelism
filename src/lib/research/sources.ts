import type { Source } from "../types";

const now = () => new Date().toISOString();

// Source reliability is modeled — not every website is equally authoritative.
export const SOURCES: Record<string, Source> = {
  ap_tourism: {
    id: "ap_tourism",
    label: "Arunachal Tourism (official)",
    url: "https://arunachaltourism.example/official",
    type: "government",
    reliability: 0.96,
    checkedAt: now(),
  },
  ilp_portal: {
    id: "ilp_portal",
    label: "Inner Line Permit Portal (govt)",
    url: "https://ilp.arunachal.example",
    type: "government",
    reliability: 0.97,
    checkedAt: now(),
  },
  indigo: {
    id: "indigo",
    label: "IndiGo (airline)",
    url: "https://airline.example/indigo",
    type: "airline",
    reliability: 0.94,
    checkedAt: now(),
  },
  airasia: {
    id: "airasia",
    label: "Air carrier schedule",
    url: "https://airline.example/schedule",
    type: "airline",
    reliability: 0.9,
    checkedAt: now(),
  },
  hotel_official: {
    id: "hotel_official",
    label: "Property official site",
    url: "https://property.example/official",
    type: "property",
    reliability: 0.72,
    checkedAt: now(),
  },
  booking_platform: {
    id: "booking_platform",
    label: "Booking platform",
    url: "https://stays.example/listing",
    type: "booking_platform",
    reliability: 0.85,
    checkedAt: now(),
  },
  review_platform: {
    id: "review_platform",
    label: "Review platform",
    url: "https://reviews.example/place",
    type: "review_platform",
    reliability: 0.82,
    checkedAt: now(),
  },
  publication: {
    id: "publication",
    label: "Travel publication",
    url: "https://travelmag.example/tawang",
    type: "publication",
    reliability: 0.8,
    checkedAt: now(),
  },
  blog: {
    id: "blog",
    label: "Independent travel blog",
    url: "https://wanderblog.example/tawang-diary",
    type: "blog",
    reliability: 0.58,
    checkedAt: now(),
  },
  forum: {
    id: "forum",
    label: "Traveler forum",
    url: "https://forum.example/thread",
    type: "forum",
    reliability: 0.5,
    checkedAt: now(),
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    url: "https://youtube.com",
    type: "video",
    reliability: 0.6,
    checkedAt: now(),
  },
  transport_op: {
    id: "transport_op",
    label: "Local transport operator",
    url: "https://operator.example/tawang",
    type: "booking_platform",
    reliability: 0.7,
    checkedAt: now(),
  },
};

export function sourceReliabilityLabel(type: Source["type"]): string {
  switch (type) {
    case "official":
    case "government":
      return "Official";
    case "airline":
    case "property":
      return "First-party";
    case "booking_platform":
    case "review_platform":
      return "Established platform";
    case "publication":
      return "Publication";
    case "blog":
      return "Blog";
    case "forum":
      return "Forum";
    case "social":
      return "Social";
    case "video":
      return "Video";
  }
}
