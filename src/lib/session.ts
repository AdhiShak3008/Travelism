export const SESSION_TTL_MINUTES = 400;
export const SESSION_TTL_MS = SESSION_TTL_MINUTES * 60 * 1000; // 24,000,000 ms (400 mins)

export const SESSION_STORAGE_KEY = "travelism_active_session_v1";
export const DEVICE_SIGNATURE_KEY = "travelism_known_device_sig_v1";

export interface StoredSession {
  user: any;
  loggedInAt: number;
  expiresAt: number;
  deviceSignature: string;
  locationTz: string;
}

/**
 * Computes a robust browser/environment signature combining
 * timezone, language, screen resolution, and platform.
 */
export function getDeviceSignature(): string {
  if (typeof window === "undefined") return "server_environment";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const lang = navigator.language || "en";
    const scr = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const ua = navigator.userAgent;
    const raw = `${tz}|${lang}|${scr}|${ua}`;
    
    // Simple hash for consistent signature
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `dev_${Math.abs(hash).toString(36)}_${tz.replace(/[^a-zA-Z0-9]/g, "_")}`;
  } catch {
    return "dev_fallback_signature";
  }
}

/**
 * Saves active session into localStorage with 400-min expiry and device signature.
 */
export function saveActiveSession(user: any): StoredSession {
  const now = Date.now();
  const session: StoredSession = {
    user,
    loggedInAt: now,
    expiresAt: now + SESSION_TTL_MS,
    deviceSignature: getDeviceSignature(),
    locationTz: typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC",
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(DEVICE_SIGNATURE_KEY, session.deviceSignature);
    } catch {
      // Storage unavailable / private mode
    }
  }

  return session;
}

/**
 * Validates and loads stored session. Returns result with status:
 * - 'valid': Active session found & valid
 * - 'expired': Session passed 400 minutes
 * - 'new_device': Session opened on different device/browser/location signature
 * - 'none': No session found (incognito, new browser, or logged out)
 */
export function validateStoredSession(): {
  status: "valid" | "expired" | "new_device" | "none";
  session: StoredSession | null;
  remainingMs?: number;
} {
  if (typeof window === "undefined") return { status: "none", session: null };

  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return { status: "none", session: null };
    }

    const session: StoredSession = JSON.parse(raw);
    const now = Date.now();

    // 1. Check 400-minute session TTL expiration
    if (now >= session.expiresAt) {
      clearActiveSession();
      return { status: "expired", session: null };
    }

    // 2. Check Device & Location signature mismatch (incognito / new browser / new device / new location)
    const currentSignature = getDeviceSignature();
    if (session.deviceSignature && session.deviceSignature !== currentSignature) {
      clearActiveSession();
      return { status: "new_device", session: null };
    }

    const remainingMs = Math.max(0, session.expiresAt - now);
    return { status: "valid", session, remainingMs };
  } catch {
    clearActiveSession();
    return { status: "none", session: null };
  }
}

/**
 * Clears active session from storage.
 */
export function clearActiveSession(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
