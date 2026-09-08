"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/store/authStore";
import Image from "next/image";

const AVATARS = [
  {
    id: "vip",
    label: "👑 VIP Voyager",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    badge: "VIP Pass",
  },
  {
    id: "backpacker",
    label: "🎒 Backpacker",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
    badge: "Nomad",
  },
  {
    id: "alpinist",
    label: "🏔️ Mountaineer",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    badge: "Explorer",
  },
  {
    id: "storyteller",
    label: "📸 Storyteller",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
    badge: "Creator",
  },
  {
    id: "surfer",
    label: "🏄 Coastal Nomad",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    badge: "Wanderer",
  },
];

const TOURIST_PERKS = [
  { icon: "✨", title: "17 Autonomous Agents", desc: "Live real-time discovery of hidden spots & pristine trails" },
  { icon: "🧬", title: "Travel DNA Engine", desc: "AI remembers your dietary, pace, budget & hotel tastes" },
  { icon: "🗺️", title: "Offline Interactive Maps", desc: "Turn-by-turn routes with verified coordinates & stops" },
  { icon: "🎫", title: "VIP Booking Vault", desc: "Instant transparent breakdowns with zero hidden fees" },
];

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, loginAsDemo } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].url);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setTimeout(() => {
      login(email, tab === "signup" ? (name || "Traveler") : undefined);
      setLoading(false);
    }, 400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6 overflow-y-auto">
        {/* Colorful Blurred Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="fixed inset-0 bg-black/75 backdrop-blur-lg"
        />

        {/* Ambient Glows */}
        <div className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-[130px]" />
        <div className="pointer-events-none fixed -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand/25 blur-[140px]" />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-card shadow-2xl z-10 my-auto"
        >
          {/* Vibrant Passport Header Strip */}
          <div className="relative overflow-hidden bg-gradient-to-r from-brand via-emerald-600 to-teal-500 p-6 sm:p-8 text-white">
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            
            {/* Close Button */}
            <button
              onClick={closeAuthModal}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-black/20 text-white hover:bg-black/40 active:scale-95 transition"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-2">
              <span className="rounded-full bg-white/20 border border-white/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white backdrop-blur-md">
                🌴 International Tourist Passport
              </span>
              <span className="hidden sm:inline-block rounded-full bg-amber-400/30 border border-amber-300/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-200">
                ⭐ 4.98 Traveler Rating
              </span>
            </div>

            <h2 className="display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Unlock Your Global Travel Passport
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-white/90 max-w-lg leading-relaxed">
              Step into the future of autonomous travel planning. Save trips across devices, customize your AI Swarm, and access VIP hotel perks.
            </p>
          </div>

          <div className="p-5 sm:p-8 space-y-6">
            {/* ⚡ ONE-CLICK VIP DEMO TOURIST PASS */}
            <div className="rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-500/10 via-brand/10 to-teal-500/10 p-4 sm:p-5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-500 shadow-sm">
                    <Image
                      src={AVATARS[0].url}
                      alt="Demo VIP User"
                      fill
                      sizes="52px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-ink">Aditya Shakya</span>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        👑 VIP Voyager Pass
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft mt-0.5">
                      Includes 3 pre-loaded itineraries (Kyoto, Blue Lagoon, Ladakh) + custom DNA.
                    </p>
                  </div>
                </div>

                <button
                  onClick={loginAsDemo}
                  className="btn-primary !py-2.5 !px-5 text-xs font-extrabold shadow-lift whitespace-nowrap active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  <span>⚡ Instant 1-Click Join</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Tourist Perks Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {TOURIST_PERKS.map((perk, i) => (
                <div key={i} className="rounded-xl border border-line bg-paper-2/60 p-2.5 text-left">
                  <span className="text-base">{perk.icon}</span>
                  <div className="font-bold text-xs text-ink mt-1 truncate">{perk.title}</div>
                  <p className="text-[10px] text-ink-faint leading-tight mt-0.5 line-clamp-2">{perk.desc}</p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <span className="absolute inset-x-0 h-px bg-line" />
              <span className="relative bg-card px-3 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                Or sign in with personal account
              </span>
            </div>

            {/* Sign In / Sign Up Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-paper-2 p-1.5 border border-line">
              <button
                type="button"
                onClick={() => setTab("signin")}
                className={`rounded-xl py-2 text-xs font-bold transition ${
                  tab === "signin" ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                Sign In to Account
              </button>
              <button
                type="button"
                onClick={() => setTab("signup")}
                className={`rounded-xl py-2 text-xs font-bold transition ${
                  tab === "signup" ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                Create New Traveler Pass
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "signup" && (
                <>
                  {/* Traveler Avatar Picker */}
                  <div>
                    <label className="text-[11px] font-bold text-ink-soft mb-2 block uppercase tracking-wider">
                      Choose Your Traveler Avatar
                    </label>
                    <div className="flex items-center gap-3 overflow-x-auto pb-1">
                      {AVATARS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setSelectedAvatar(av.url)}
                          className={`relative shrink-0 rounded-2xl p-1 transition border-2 ${
                            selectedAvatar === av.url
                              ? "border-brand scale-105 shadow-md"
                              : "border-transparent opacity-65 hover:opacity-100"
                          }`}
                        >
                          <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                            <Image src={av.url} alt={av.label} fill sizes="48px" className="object-cover" unoptimized />
                          </div>
                          <span className="block text-[9px] font-bold text-ink mt-1 text-center truncate max-w-[50px]">
                            {av.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-ink-soft mb-1 block">Full Traveler Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand shadow-2xs"
                    />
                  </div>
                </>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold text-ink-soft mb-1 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="traveler@world.com"
                    className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-soft mb-1 block">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand shadow-2xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full !py-3 text-sm font-extrabold shadow-lift hover:brightness-110 active:scale-[0.99] transition mt-2"
              >
                {loading
                  ? "Stamping Passport..."
                  : tab === "signin"
                  ? "Sign In & Enter Dashboard →"
                  : "Stamp Passport & Begin Journey →"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
