"use client";

import { create } from "zustand";
import type { StayMode } from "@/lib/types";
import {
  saveActiveSession,
  validateStoredSession,
  clearActiveSession,
  SESSION_TTL_MS,
  SESSION_TTL_MINUTES,
} from "@/lib/session";

export interface TravelPreferences {
  currency: "INR" | "USD" | "EUR" | "GBP" | "JPY" | "AED";
  budgetTier: "economical" | "balanced" | "premium";
  travelPace: "comfortable" | "balanced" | "fast";
  stayMode: StayMode;
  dietary: string[];
  vibePriorities: string[];
  flightPreferences: string[];
  accessibilityNeeds: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  tier: "vip" | "explorer" | "guest";
  isDemo: boolean;
  memberSince: string;
  savedTrips: SavedTripSummary[];
  preferences: TravelPreferences;
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

const DEFAULT_PREFERENCES: TravelPreferences = {
  currency: "INR",
  budgetTier: "balanced",
  travelPace: "balanced",
  stayMode: "hotels",
  dietary: ["Vegetarian Friendly", "Local Gourmet"],
  vibePriorities: ["Mountain Views", "Photography & Golden Hour", "Historic Streets", "Local Cuisine"],
  flightPreferences: ["Avoid early mornings (<8 AM)", "Window Seat"],
  accessibilityNeeds: [],
};

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
  preferences: { ...DEFAULT_PREFERENCES },
};

export type LogoutReason = "expired" | "new_device" | "manual" | null;

interface AuthStore {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  isSavedTripsOpen: boolean;
  isPreferencesOpen: boolean;
  sessionExpiresAt: number | null;
  logoutReason: LogoutReason;
  hasCheckedInitialSession: boolean;

  openAuthModal: () => void;
  closeAuthModal: () => void;
  openSavedTrips: () => void;
  closeSavedTrips: () => void;
  openPreferences: () => void;
  closePreferences: () => void;

  login: (email: string, name?: string) => void;
  loginAsDemo: () => void;
  logout: (reason?: LogoutReason) => void;
  restoreSession: () => { status: "valid" | "expired" | "new_device" | "none" };
  checkSessionExpiry: () => boolean;

  saveCurrentTrip: (summary: Omit<SavedTripSummary, "id" | "createdAt">) => void;
  removeSavedTrip: (tripId: string) => void;
  updatePreferences: (prefs: Partial<TravelPreferences>) => void;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isAuthModalOpen: false,
  isSavedTripsOpen: false,
  isPreferencesOpen: false,
  sessionExpiresAt: null,
  logoutReason: null,
  hasCheckedInitialSession: false,

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  openSavedTrips: () => set({ isSavedTripsOpen: true }),
  closeSavedTrips: () => set({ isSavedTripsOpen: false }),
  openPreferences: () => set({ isPreferencesOpen: true }),
  closePreferences: () => set({ isPreferencesOpen: false }),

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
      preferences: { ...DEFAULT_PREFERENCES },
    };
    
    // Save active session for 400 minutes
    const session = saveActiveSession(newUser);
    set({
      user: newUser,
      isAuthenticated: true,
      isAuthModalOpen: false,
      sessionExpiresAt: session.expiresAt,
      logoutReason: null,
    });
  },

  loginAsDemo: () => {
    const demoUser = { ...DEMO_USER };
    const session = saveActiveSession(demoUser);
    set({
      user: demoUser,
      isAuthenticated: true,
      isAuthModalOpen: false,
      sessionExpiresAt: session.expiresAt,
      logoutReason: null,
    });
  },

  logout: (reason: LogoutReason = "manual") => {
    clearActiveSession();
    set({
      user: null,
      isAuthenticated: false,
      isAuthModalOpen: false,
      sessionExpiresAt: null,
      logoutReason: reason,
    });
  },

  restoreSession: () => {
    const res = validateStoredSession();
    if (res.status === "valid" && res.session?.user) {
      set({
        user: res.session.user,
        isAuthenticated: true,
        sessionExpiresAt: res.session.expiresAt,
        logoutReason: null,
        hasCheckedInitialSession: true,
      });
      return { status: "valid" };
    } else if (res.status === "expired") {
      set({
        user: null,
        isAuthenticated: false,
        sessionExpiresAt: null,
        logoutReason: "expired",
        hasCheckedInitialSession: true,
      });
      return { status: "expired" };
    } else if (res.status === "new_device") {
      set({
        user: null,
        isAuthenticated: false,
        sessionExpiresAt: null,
        logoutReason: "new_device",
        hasCheckedInitialSession: true,
      });
      return { status: "new_device" };
    } else {
      set({
        user: null,
        isAuthenticated: false,
        sessionExpiresAt: null,
        logoutReason: null,
        hasCheckedInitialSession: true,
      });
      return { status: "none" };
    }
  },

  checkSessionExpiry: () => {
    const { sessionExpiresAt, isAuthenticated, logout } = get();
    if (!isAuthenticated || !sessionExpiresAt) return false;

    if (Date.now() >= sessionExpiresAt) {
      logout("expired");
      return true; // was expired
    }
    return false;
  },

  saveCurrentTrip: (summary) => {
    const { user } = get();
    if (!user) return;
    const newSaved: SavedTripSummary = {
      ...summary,
      id: `trip_saved_${Date.now()}`,
      createdAt: "Just now",
    };
    const updatedUser = {
      ...user,
      savedTrips: [newSaved, ...user.savedTrips],
    };
    saveActiveSession(updatedUser);
    set({ user: updatedUser });
  },

  removeSavedTrip: (tripId: string) => {
    const { user } = get();
    if (!user) return;
    const updatedUser = {
      ...user,
      savedTrips: user.savedTrips.filter((t) => t.id !== tripId),
    };
    saveActiveSession(updatedUser);
    set({ user: updatedUser });
  },

  updatePreferences: (prefs) => {
    const { user } = get();
    if (!user) return;
    const updatedUser = {
      ...user,
      preferences: {
        ...user.preferences,
        ...prefs,
      },
    };
    saveActiveSession(updatedUser);
    set({ user: updatedUser });
  },
}));
