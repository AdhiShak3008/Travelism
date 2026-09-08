"use client";

import { create } from "zustand";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  tier: "vip" | "explorer" | "guest";
  isDemo: boolean;
  memberSince: string;
  savedTrips: SavedTripSummary[];
  preferences: {
    currency: "INR" | "USD" | "EUR" | "GBP";
    travelPace: "comfortable" | "balanced" | "fast";
    dietary: string[];
    hotelTier: "luxury" | "boutique" | "budget";
  };
}

export interface SavedTripSummary {
  id: string;
  destinationName: string;
  destinationHero?: string;
  durationDays: number;
  travelers: number;
  totalCost: number;
  createdAt: string;
  hotelName?: string;
  sightsCount: number;
}

const DEMO_USER: UserProfile = {
  id: "usr_demo_vip",
  name: "Aditya Shakya",
  email: "aditya.vip@travelism.app",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  tier: "vip",
  isDemo: true,
  memberSince: "March 2024",
  savedTrips: [
    {
      id: "trip_saved_1",
      destinationName: "Kyoto & Tokyo, Japan",
      destinationHero: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80",
      durationDays: 10,
      travelers: 2,
      totalCost: 384000,
      createdAt: "2 days ago",
      hotelName: "Hoshinoya Kyoto & Luxury Ryokan",
      sightsCount: 14,
    },
    {
      id: "trip_saved_2",
      destinationName: "Reykjavik, Iceland",
      destinationHero: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=600&q=80",
      durationDays: 7,
      travelers: 2,
      totalCost: 295000,
      createdAt: "Last week",
      hotelName: "The Retreat at Blue Lagoon",
      sightsCount: 8,
    },
    {
      id: "trip_saved_3",
      destinationName: "Ladakh & Nubra Valley, India",
      destinationHero: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=600&q=80",
      durationDays: 8,
      travelers: 2,
      totalCost: 142000,
      createdAt: "2 weeks ago",
      hotelName: "The Grand Dragon Ladakh",
      sightsCount: 11,
    },
  ],
  preferences: {
    currency: "INR",
    travelPace: "balanced",
    dietary: ["Vegetarian Friendly", "Local Gourmet"],
    hotelTier: "luxury",
  },
};

interface AuthStore {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  isSavedTripsOpen: boolean;

  openAuthModal: () => void;
  closeAuthModal: () => void;
  openSavedTrips: () => void;
  closeSavedTrips: () => void;

  login: (email: string, name?: string) => void;
  loginAsDemo: () => void;
  logout: () => void;
  saveCurrentTrip: (summary: Omit<SavedTripSummary, "id" | "createdAt">) => void;
  removeSavedTrip: (tripId: string) => void;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isAuthModalOpen: false,
  isSavedTripsOpen: false,

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  openSavedTrips: () => set({ isSavedTripsOpen: true }),
  closeSavedTrips: () => set({ isSavedTripsOpen: false }),

  login: (email: string, name = "Traveler") => {
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: name || email.split("@")[0],
      email,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
      tier: "explorer",
      isDemo: false,
      memberSince: "Today",
      savedTrips: [],
      preferences: {
        currency: "INR",
        travelPace: "balanced",
        dietary: [],
        hotelTier: "boutique",
      },
    };
    set({ user: newUser, isAuthenticated: true, isAuthModalOpen: false });
  },

  loginAsDemo: () => {
    set({ user: { ...DEMO_USER }, isAuthenticated: true, isAuthModalOpen: false });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  saveCurrentTrip: (summary) => {
    const { user } = get();
    if (!user) return;
    const newSaved: SavedTripSummary = {
      ...summary,
      id: `trip_saved_${Date.now()}`,
      createdAt: "Just now",
    };
    set({
      user: {
        ...user,
        savedTrips: [newSaved, ...user.savedTrips],
      },
    });
  },

  removeSavedTrip: (tripId: string) => {
    const { user } = get();
    if (!user) return;
    set({
      user: {
        ...user,
        savedTrips: user.savedTrips.filter((t) => t.id !== tripId),
      },
    });
  },
}));
