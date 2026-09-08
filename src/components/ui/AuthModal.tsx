"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/store/authStore";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, loginAsDemo } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setTimeout(() => {
      login(email, tab === "signup" ? name : undefined);
      setLoading(false);
    }, 400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-card p-6 sm:p-8 shadow-lift"
        >
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-line bg-paper text-ink-soft hover:bg-paper-2 hover:text-ink transition"
          >
            ✕
          </button>

          {/* Brand Logo & Header */}
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-xl font-extrabold text-paper shadow-md">
              T
            </div>
            <h2 className="display text-2xl font-bold text-ink">Welcome to Travelism</h2>
            <p className="mt-1 text-xs text-ink-soft">
              MAANG-grade AI travel planning, verified stays, and real-time live discovery.
            </p>
          </div>

          {/* ⚡ ONE-CLICK DEMO MODE (HERO BUTTON) */}
          <div className="mt-6">
            <button
              onClick={loginAsDemo}
              className="group relative w-full overflow-hidden rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-500/15 via-brand/10 to-emerald-500/15 p-4 text-left shadow-md transition-all hover:scale-[1.01] hover:border-emerald-500 hover:shadow-lift"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-xl text-white shadow-sm">
                    ⚡
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-ink">Instant 1-Click Demo Mode</span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        VIP Guest
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      Explore as Aditya Shakya with pre-loaded trips & VIP perks.
                    </p>
                  </div>
                </div>
                <span className="text-emerald-600 font-bold text-lg group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </button>
          </div>

          <div className="relative my-6 flex items-center justify-center">
            <span className="absolute inset-x-0 h-px bg-line" />
            <span className="relative bg-card px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Or continue with email
            </span>
          </div>

          {/* Tabs: Sign In / Create Account */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-paper-2 p-1 border border-line">
            <button
              onClick={() => setTab("signin")}
              className={`rounded-lg py-1.5 text-xs font-bold transition ${
                tab === "signin" ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`rounded-lg py-1.5 text-xs font-bold transition ${
                tab === "signup" ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {tab === "signup" && (
              <div>
                <label className="text-[11px] font-semibold text-ink-soft mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-ink-soft mb-1 block">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-ink-soft mb-1 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3 text-sm font-bold shadow-md hover:brightness-110 mt-2"
            >
              {loading ? "Connecting..." : tab === "signin" ? "Sign In →" : "Create Account →"}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
