"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/store/authStore";

export function UserMenu() {
  const { user, isAuthenticated, openAuthModal, openSavedTrips, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={openAuthModal}
        className="chip !py-1.5 !px-3 font-semibold !bg-brand/10 !text-brand border-brand/30 hover:!bg-brand/20 transition flex items-center gap-1.5 shadow-sm"
      >
        <span>⚡</span>
        <span>Sign In / Demo</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-line bg-paper-2 p-1 pr-3 hover:border-brand/40 transition shadow-sm"
      >
        <div className="relative h-7 w-7 overflow-hidden rounded-full border border-brand">
          <Image src={user.avatar} alt={user.name} fill sizes="28px" className="object-cover" unoptimized />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-ink leading-tight flex items-center gap-1">
            <span>{user.name}</span>
            {user.tier === "vip" && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300">
                VIP
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-ink-faint">▼</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-card p-3 shadow-lift z-40"
          >
            {/* User Profile Overview */}
            <div className="border-b border-line pb-3 mb-2 px-1">
              <div className="font-bold text-sm text-ink">{user.name}</div>
              <div className="text-xs text-ink-faint truncate">{user.email}</div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-full bg-brand/10 border border-brand/20 px-2 py-0.5 text-[10px] font-bold text-brand">
                  {user.tier === "vip" ? "👑 VIP Voyager Pass" : "Explorer Pass"}
                </span>
                {user.isDemo && (
                  <span className="rounded-full bg-paper-3 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                    Demo Mode
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  openSavedTrips();
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-ink hover:bg-paper-2 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2">
                  <span>💼</span> My Saved Trips
                </span>
                <span className="rounded-full bg-paper-3 px-2 py-0.5 text-[10px] text-ink-soft">
                  {user.savedTrips.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-ink hover:bg-paper-2 flex items-center gap-2 transition"
              >
                <span>⚙️</span> Travel Preferences
              </button>

              <div className="border-t border-line/60 pt-1 mt-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-bad hover:bg-bad/10 flex items-center gap-2 transition"
                >
                  <span>🚪</span> Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
