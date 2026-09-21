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

export const PREFERENCES_STORAGE_KEY = "travelism_user_preferences_v1";

export function loadSavedPreferences(): TravelPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFERENCES };
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_PREFERENCES };
}

export function savePreferencesToStorage(prefs: TravelPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function getUserVaultKey(userIdentifier?: string): string {
  if (!userIdentifier) return "travelism_user_vault_default";
  const clean = userIdentifier.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return `travelism_user_vault_${clean}`;
}

export function loadUserSavedTrips(userIdentifier?: string): SavedTripSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getUserVaultKey(userIdentifier);
    const raw = localStorage.getItem(key);
    if (raw) {
      const storedTrips: SavedTripSummary[] = JSON.parse(raw);
      if (Array.isArray(storedTrips)) {
        return storedTrips;
      }
    }
  } catch {}
  return [];
}

export function saveUserTripsToVault(trips: SavedTripSummary[], userIdentifier?: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = getUserVaultKey(userIdentifier);
    localStorage.setItem(key, JSON.stringify(trips));
  } catch {}
}

const DEMO_USER: UserProfile = {
  id: "usr_demo_vip",
  name: "Aditya Shakya",
  email: "aditya.vip@travelism.app",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  tier: "vip",
  isDemo: true,
  memberSince: "March 2024",
  savedTrips: [],
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
    const savedPrefs = loadSavedPreferences();
    const userTrips = loadUserSavedTrips(email);
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: name || email.split("@")[0],
      email,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
      tier: "explorer",
      isDemo: false,
      memberSince: "Today",
      savedTrips: userTrips,
      preferences: savedPrefs,
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
    const savedPrefs = loadSavedPreferences();
    const userTrips = loadUserSavedTrips(DEMO_USER.email);
    const demoUser: UserProfile = {
      ...DEMO_USER,
      savedTrips: userTrips,
      preferences: savedPrefs,
    };
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
      const savedPrefs = loadSavedPreferences();
      const accountKey = res.session.user.email || res.session.user.id;
      const userTrips = loadUserSavedTrips(accountKey);
      
      const restoredUser: UserProfile = {
        ...res.session.user,
        savedTrips: userTrips,
        preferences: {
          ...DEFAULT_PREFERENCES,
          ...res.session.user.preferences,
          ...savedPrefs,
        },
      };
      console.log("[AuthStore] Restored session for user:", restoredUser.name, "with", restoredUser.savedTrips.length, "trips");
      set({
        user: restoredUser,
        isAuthenticated: true,
        sessionExpiresAt: res.session.expiresAt,
        logoutReason: null,
        hasCheckedInitialSession: true,
      });
      return { status: "valid" };
    } else if (res.status === "expired") {
      console.log("[AuthStore] Session expired");
      set({
        user: null,
        isAuthenticated: false,
        sessionExpiresAt: null,
        logoutReason: "expired",
        hasCheckedInitialSession: true,
      });
      return { status: "expired" };
    } else if (res.status === "new_device") {
      console.log("[AuthStore] New device detected");
      set({
        user: null,
        isAuthenticated: false,
        sessionExpiresAt: null,
        logoutReason: "new_device",
        hasCheckedInitialSession: true,
      });
      return { status: "new_device" };
    } else {
      console.log("[AuthStore] No session found");
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
    const accountKey = user?.email || user?.id || "default";
    const currentTrips = user ? user.savedTrips : loadUserSavedTrips(accountKey);
    
    // Check if trip already exists by destination name
    const cleanDest = (summary.destinationName || "").toLowerCase().trim();
    const existingIndex = currentTrips.findIndex(
      (t) => t.destinationName.toLowerCase().trim() === cleanDest
    );

    let updatedTrips: SavedTripSummary[];
    if (existingIndex >= 0) {
      const existing = currentTrips[existingIndex];
      const updated: SavedTripSummary = {
        ...existing,
        ...summary,
        createdAt: "Updated just now",
      };
      updatedTrips = [updated, ...currentTrips.filter((_, idx) => idx !== existingIndex)];
    } else {
      const newSaved: SavedTripSummary = {
        ...summary,
        id: `trip_saved_${Date.now()}`,
        createdAt: "Just now",
      };
      updatedTrips = [newSaved, ...currentTrips];
    }

    saveUserTripsToVault(updatedTrips, accountKey);

    if (user) {
      const updatedUser = {
        ...user,
        savedTrips: updatedTrips,
      };
      saveActiveSession(updatedUser);
      set({ user: updatedUser });
    }
  },

  removeSavedTrip: (tripId: string) => {
    const { user } = get();
    const accountKey = user?.email || user?.id || "default";
    const currentTrips = user ? user.savedTrips : loadUserSavedTrips(accountKey);
    const updatedTrips = currentTrips.filter((t) => t.id !== tripId);
    saveUserTripsToVault(updatedTrips, accountKey);
    if (user) {
      const updatedUser = {
        ...user,
        savedTrips: updatedTrips,
      };
      saveActiveSession(updatedUser);
      set({ user: updatedUser });
    }
  },

  updatePreferences: (prefs) => {
    const { user } = get();
    if (!user) {
      console.warn("[AuthStore] Updating fallback preferences without active user");
      const current = loadSavedPreferences();
      const updated = { ...current, ...prefs };
      savePreferencesToStorage(updated);
      return;
    }
    const updatedUser = {
      ...user,
      preferences: {
        ...user.preferences,
        ...prefs,
      },
    };
    console.log("[AuthStore] Saving preferences to storage & session:", updatedUser.preferences);
    savePreferencesToStorage(updatedUser.preferences);
    saveActiveSession(updatedUser);
    set({ user: updatedUser });
  },
}));
