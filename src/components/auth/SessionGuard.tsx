"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/store/authStore";

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { restoreSession, checkSessionExpiry, isAuthenticated, hasCheckedInitialSession, logoutReason } = useAuth();
  const initialCheckedRef = useRef(false);

  // 1. Initial session & device validation on load
  useEffect(() => {
    if (initialCheckedRef.current) return;
    initialCheckedRef.current = true;

    const res = restoreSession();

    if (res.status === "expired") {
      if (pathname !== "/login") {
        router.push("/login?reason=expired");
      }
    } else if (res.status === "new_device") {
      if (pathname !== "/login") {
        router.push("/login?reason=new_device");
      }
    } else if (res.status === "none") {
      // New visitor or incognito mode: redirect to login if landing directly
      if (pathname === "/") {
        router.push("/login?reason=welcome");
      }
    }
  }, [restoreSession, pathname, router]);

  // 2. Active Heartbeat: Checks 400-minute session TTL while logged in
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const wasExpired = checkSessionExpiry();
      if (wasExpired && pathname !== "/login") {
        router.push("/login?reason=expired");
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, checkSessionExpiry, pathname, router]);

  // 3. Multi-Tab Session Sync: Listen to localStorage changes
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === "travelism_active_session_v1") {
        if (!e.newValue && isAuthenticated) {
          // Session was cleared in another tab
          useAuth.getState().logout("manual");
          if (pathname !== "/login") {
            router.push("/login");
          }
        }
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isAuthenticated, pathname, router]);

  return null;
}
