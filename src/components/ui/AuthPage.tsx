"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/authStore";
import { useTrip } from "@/store/tripStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cx } from "@/lib/format";
import { WORLD_SPOTS_CATALOG, type DiscoveredSpot } from "@/lib/globalSpots";

export const INITIAL_GLOBAL_SPOTS: DiscoveredSpot[] = [
  WORLD_SPOTS_CATALOG[0], // Bali & Nusa Penida
  WORLD_SPOTS_CATALOG[1], // Kyoto & Arashiyama
  WORLD_SPOTS_CATALOG[11], // Swiss Alps
  WORLD_SPOTS_CATALOG[12], // Amalfi Coast
];

const CATEGORIES = [
  { id: "all", label: "✨ All World Wonders" },
  { id: "mountains", label: "🏔️ Summits" },
  { id: "beaches", label: "🌊 Beaches & Islands" },
  { id: "heritage", label: "🛕 Heritage" },
  { id: "nature", label: "🌿 Wild Nature" },
  { id: "aurora", label: "🌌 Arctic & Aurora" },
];

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
  {
    id: "foodie",
    label: "🥟 Gourmet Scout",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    badge: "Foodie",
  },
];

const TOURIST_PERKS = [
  { icon: "⚡", title: "17 AI Agents", desc: "Live radar discovering authentic spots" },
  { icon: "🧬", title: "Travel DNA", desc: "Learns exact budget & stay pace" },
  { icon: "🗺️", title: "GPS Maps", desc: "Turn-by-turn day route coordinates" },
  { icon: "💎", title: "0% Markup", desc: "Direct net rates with vetted stays" },
];

export function AuthPage({ standalone = false }: { standalone?: boolean }) {
  const router = useRouter();
  const { isAuthModalOpen, closeAuthModal, login, loginAsDemo } = useAuth();
  const startDream = useTrip((s) => s.startDream);

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Dynamic Infinite Spots & Screensaver State
  const [spots, setSpots] = useState<DiscoveredSpot[]>(INITIAL_GLOBAL_SPOTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Active Search / Radar Background Scout State
  const [isScouting, setIsScouting] = useState(false);
  const [scoutedNextSpot, setScoutedNextSpot] = useState<DiscoveredSpot | null>(null);
  const [scoutingRadarText, setScoutingRadarText] = useState("📡 World Radar: Active");

  // Form State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [homeAirport, setHomeAirport] = useState("Hyderabad / Mumbai");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].url);
  const [loading, setLoading] = useState(false);

  // Active current spot
  const currentSpot = spots[currentIndex] || spots[0] || INITIAL_GLOBAL_SPOTS[0];

  // Scout next spot asynchronously from API and preload image
  const scoutNextGlobalSpot = useCallback(async (cat: string, existingList: DiscoveredSpot[]) => {
    try {
      setIsScouting(true);
      setScoutingRadarText("📡 Radar: Scouting next global spot...");
      
      const seenIds = existingList.map((s) => s.id).join(",");
      const res = await fetch(`/api/spots/discover?category=${cat}&exclude=${seenIds}`);
      
      if (!res.ok) throw new Error("Failed to scout spot");
      const data = await res.json();
      const discovered: DiscoveredSpot = data.spot;

      if (discovered) {
        if (typeof window !== "undefined") {
          const img = new window.Image();
          img.src = discovered.imageUrl;
        }

        setScoutedNextSpot(discovered);
        setScoutingRadarText(`✨ Next: ${discovered.name}`);
      }
    } catch {
      setScoutingRadarText("📡 World Radar: Active");
    } finally {
      setIsScouting(false);
    }
  }, []);

  // When category changes, reset index and scout fresh spot
  useEffect(() => {
    scoutNextGlobalSpot(selectedCategory, spots);
  }, [selectedCategory, scoutNextGlobalSpot]);

  // While current spot is displayed, auto scout the next one, then advance when timer fires
  useEffect(() => {
    if (!scoutedNextSpot && !isScouting) {
      scoutNextGlobalSpot(selectedCategory, spots);
    }

    if (!autoPlay) return;

    const timer = setTimeout(() => {
      if (scoutedNextSpot) {
        setSpots((prev) => {
          if (prev.some((s) => s.id === scoutedNextSpot.id)) {
            return prev;
          }
          return [...prev, scoutedNextSpot];
        });
        setCurrentIndex((prev) => prev + 1);
        setScoutedNextSpot(null);
      } else {
        setCurrentIndex((prev) => (prev + 1) % spots.length);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentIndex, autoPlay, scoutedNextSpot, isScouting, selectedCategory, spots, scoutNextGlobalSpot]);

  if (!standalone && !isAuthModalOpen) return null;

  const handleNext = () => {
    if (scoutedNextSpot) {
      setSpots((prev) => {
        if (prev.some((s) => s.id === scoutedNextSpot.id)) return prev;
        return [...prev, scoutedNextSpot];
      });
      setCurrentIndex((prev) => prev + 1);
      setScoutedNextSpot(null);
    } else {
      setCurrentIndex((prev) => (prev + 1) % spots.length);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + spots.length) % spots.length);
  };

  const handleTeleport = async () => {
    setIsScouting(true);
    setScoutingRadarText("🎲 Teleporting to new world coordinates...");
    try {
      const seenIds = spots.map((s) => s.id).join(",");
      const res = await fetch(`/api/spots/discover?category=${selectedCategory}&exclude=${seenIds}`);
      const data = await res.json();
      if (data.spot) {
        setSpots((prev) => [data.spot, ...prev]);
        setCurrentIndex(0);
        setScoutedNextSpot(null);
        setScoutingRadarText(`📍 Landed in: ${data.spot.name}`);
      }
    } catch {
      setCurrentIndex((prev) => (prev + 1) % spots.length);
    } finally {
      setIsScouting(false);
    }
  };

  const handleBack = () => {
    if (standalone) {
      router.push("/");
    } else {
      closeAuthModal();
    }
  };

  const handleDemo = () => {
    loginAsDemo();
    if (standalone) {
      router.push("/");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setTimeout(() => {
      login(email, tab === "signup" ? (name || "Traveler") : undefined);
      setLoading(false);
      if (standalone) {
        router.push("/");
      }
    }, 500);
  };

  const handleExploreSpot = (spot: DiscoveredSpot) => {
    closeAuthModal();
    startDream(`${spot.name} for 7 days — exploring highlights, scenic spots, verified stays, and food.`);
    if (standalone) {
      router.push("/");
    }
  };

  // 4 dynamic dots representing the sliding screensaver window
  const dotWindowSize = 4;
  const activeDotPos = currentIndex % dotWindowSize;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={standalone ? "min-h-screen bg-paper text-ink overflow-x-hidden" : "fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-paper text-ink"}
      >
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-xl px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl xl:max-w-7xl items-center justify-between gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-paper-2 px-3 py-1.5 text-xs font-bold text-ink hover:border-brand/40 active:scale-95 transition shadow-2xs shrink-0"
            >
              <span>← Back to Trip Explorer</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-brand to-emerald-400 text-xs font-extrabold text-white shadow-sm">
                T
              </div>
              <span className="display text-base sm:text-lg font-bold tracking-tight text-ink truncate">
                Travelism Global Passport
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Split Content with 50/50 Uniform Symmetrical Columns */}
        <main className="mx-auto max-w-6xl xl:max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            
            {/* LEFT COLUMN: Uniformly Scaled Panoramic World Screensaver */}
            <div className="min-w-0 space-y-4">
              
              {/* Category Filter Pills & Live Radar Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 max-w-full">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cx(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold transition shadow-2xs flex items-center gap-1",
                        selectedCategory === cat.id
                          ? "bg-brand text-white shadow-brand/20"
                          : "border border-line bg-card text-ink-soft hover:text-ink hover:bg-paper-2"
                      )}
                    >
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Live Radar Scouting Pulse */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  <span className={cx("inline-block h-1.5 w-1.5 rounded-full bg-emerald-500", isScouting && "animate-ping")} />
                  <span className="truncate max-w-[170px]">{scoutingRadarText}</span>
                </div>
              </div>

              {/* Main Panoramic Destination Card (Uniform Aspect Ratio) */}
              <div className="relative overflow-hidden rounded-3xl border border-line shadow-2xl bg-zinc-950 min-h-[440px] sm:min-h-[480px] lg:min-h-[500px] flex flex-col justify-between p-5 sm:p-7 text-white">
                
                {/* Background Image with Cross-Fade & Ambient Scale */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSpot.id}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={currentSpot.imageUrl}
                      alt={currentSpot.name}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 600px"
                      unoptimized
                    />
                    {/* Atmospheric Lighting Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/25" />
                  </motion.div>
                </AnimatePresence>

                {/* Top Overlay Strip: Badges & Rating */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/20 backdrop-blur-md border border-white/20 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                      {currentSpot.badge}
                    </span>
                    <span className="rounded-full bg-teal-500/90 backdrop-blur-md px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                      {currentSpot.weather}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleTeleport}
                      className="rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white transition active:scale-95 flex items-center gap-1 shadow-sm"
                      title="Jump to a random spot worldwide"
                    >
                      <span>🎲 Teleport</span>
                    </button>
                    <span className="rounded-full bg-amber-400 text-black px-2.5 py-0.5 text-xs font-black shadow-sm flex items-center gap-1">
                      {currentSpot.rating}
                    </span>
                  </div>
                </div>

                {/* Middle / Bottom Content Area */}
                <div className="relative z-10 space-y-3 pt-6">
                  {/* Spot Title & Subtitle */}
                  <div>
                    <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                      {currentSpot.name}
                    </h3>
                    <p className="text-white/85 text-xs sm:text-sm font-normal mt-1 line-clamp-2">
                      {currentSpot.tagline}
                    </p>
                  </div>

                  {/* Frosted Glass Voyager Quote Card */}
                  <div className="rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 p-3.5 sm:p-4 text-xs sm:text-sm text-white/90 leading-relaxed shadow-lg">
                    <p className="italic font-light leading-relaxed line-clamp-3">{currentSpot.quote}</p>
                    <div className="text-[11px] text-teal-400 font-semibold mt-1.5 truncate">— {currentSpot.author}</div>
                  </div>

                  {/* Bottom Indicator & Controls Bar */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    
                    {/* 4 Dynamic Dots (Matching Screenshot: Active elongated teal pill) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[0, 1, 2, 3].map((dotIdx) => {
                        const isActive = dotIdx === activeDotPos;
                        return (
                          <button
                            key={dotIdx}
                            onClick={() => {
                              const targetIdx = currentIndex - activeDotPos + dotIdx;
                              if (targetIdx >= 0 && targetIdx < spots.length) {
                                setCurrentIndex(targetIdx);
                              }
                            }}
                            className={cx(
                              "transition-all duration-300 rounded-full",
                              isActive
                                ? "w-7 h-2 bg-teal-400 shadow-sm shadow-teal-400/50"
                                : "w-2 h-2 bg-white/40 hover:bg-white/70"
                            )}
                            aria-label={`Go to slide ${dotIdx + 1}`}
                          />
                        );
                      })}
                    </div>

                    {/* Action Buttons: Plan Trip + Next/Prev + AutoPlay */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleExploreSpot(currentSpot)}
                        className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 px-3 py-1 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                      >
                        <span>✨ Plan trip</span>
                        <span>→</span>
                      </button>

                      <button
                        onClick={handlePrev}
                        className="grid h-7 w-7 place-items-center rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md text-xs font-bold text-white transition active:scale-90"
                        aria-label="Previous spot"
                      >
                        ←
                      </button>

                      <button
                        onClick={handleNext}
                        className="grid h-7 w-7 place-items-center rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md text-xs font-bold text-white transition active:scale-90"
                        aria-label="Next spot"
                      >
                        →
                      </button>

                      <button
                        onClick={() => setAutoPlay(!autoPlay)}
                        className={cx(
                          "rounded-full px-2 py-1 text-[10px] font-bold backdrop-blur-md transition",
                          autoPlay ? "bg-teal-500/80 text-white" : "bg-white/20 text-white/80"
                        )}
                        title={autoPlay ? "Auto-screensaver active" : "Auto-screensaver paused"}
                      >
                        {autoPlay ? "▶ Auto" : "⏸ Paused"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infinite World Stream Thumbnails */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1.5 flex items-center justify-between">
                  <span>Discovered Spots ({spots.length})</span>
                  <span>{isScouting ? "📡 Scouting..." : "✓ Auto Radar"}</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {spots.map((spot, idx) => {
                    const isSelected = idx === currentIndex;
                    return (
                      <button
                        key={`${spot.id}-${idx}`}
                        onClick={() => setCurrentIndex(idx)}
                        className={cx(
                          "relative shrink-0 w-24 sm:w-28 h-16 rounded-xl overflow-hidden border-2 transition-all active:scale-95 group text-left",
                          isSelected
                            ? "border-brand scale-105 shadow-md ring-2 ring-brand/30"
                            : "border-line opacity-70 hover:opacity-100"
                        )}
                      >
                        <Image
                          src={spot.imageUrl}
                          alt={spot.name}
                          fill
                          sizes="112px"
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        <div className="absolute bottom-1 inset-x-1.5">
                          <div className="font-bold text-[9px] text-white truncate">{spot.name}</div>
                          <div className="text-[7.5px] text-white/80 truncate">{spot.country}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tourist Superpowers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                {TOURIST_PERKS.map((perk, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-line bg-card p-2.5 shadow-2xs hover:border-brand/40 transition-colors"
                  >
                    <span className="text-lg">{perk.icon}</span>
                    <div className="font-bold text-[11px] text-ink mt-0.5 truncate">{perk.title}</div>
                    <p className="text-[9.5px] text-ink-soft leading-snug mt-0.5 line-clamp-2">{perk.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Uniformly Scaled Tourist Passport Portal */}
            <div className="min-w-0 rounded-3xl border border-line bg-card p-5 sm:p-7 shadow-lift space-y-5">
              
              {/* Header Title */}
              <div>
                <div className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand shadow-2xs mb-2">
                  <span>🌴 International Tourist Passport Portal</span>
                </div>
                <h2 className="display text-xl sm:text-2xl lg:text-3xl font-extrabold text-ink tracking-tight leading-tight">
                  Welcome to Your Travel Passport
                </h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">
                  Sign in or create your free voyager profile to save custom itineraries and synchronize your Travel DNA across devices.
                </p>
              </div>

              {/* ⚡ INSTANT 1-CLICK VIP DEMO TOURIST PASS */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-500/15 via-brand/10 to-teal-500/15 p-4 shadow-sm transition hover:border-emerald-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-500 shadow-sm">
                      <Image
                        src={AVATARS[0].url}
                        alt="Aditya Shakya"
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-ink truncate">Aditya Shakya</span>
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300">
                          👑 VIP Pass
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-soft mt-0.5 line-clamp-1">
                        Pre-loaded with 3 itineraries + custom Travel DNA.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDemo}
                    className="btn-primary !py-2.5 !px-4 text-xs font-black shadow-sm shrink-0 whitespace-nowrap active:scale-95 transition flex items-center justify-center gap-1.5"
                  >
                    <span>⚡ Instant 1-Click Join</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Or divider */}
              <div className="relative flex items-center justify-center">
                <span className="absolute inset-x-0 h-px bg-line" />
                <span className="relative bg-card px-3 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  Or continue with personal account
                </span>
              </div>

              {/* Sign In / Sign Up Tabs */}
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-paper-2 p-1 border border-line">
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

              {/* Interactive Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {tab === "signup" && (
                  <>
                    {/* Traveler Persona Avatar Picker */}
                    <div>
                      <label className="text-[10px] font-bold text-ink-soft mb-1.5 block uppercase tracking-wider">
                        Choose Your Tourist Persona
                      </label>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {AVATARS.map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedAvatar(av.url)}
                            className={`relative shrink-0 rounded-xl p-1 transition border-2 flex flex-col items-center ${
                              selectedAvatar === av.url
                                ? "border-brand bg-brand/10 scale-105 shadow-md"
                                : "border-transparent opacity-65 hover:opacity-100"
                            }`}
                          >
                            <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                              <Image src={av.url} alt={av.label} fill sizes="40px" className="object-cover" unoptimized />
                            </div>
                            <span className="block text-[9px] font-bold text-ink mt-0.5 text-center truncate max-w-[48px]">
                              {av.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10.5px] font-bold text-ink-soft mb-1 block">Full Traveler Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs sm:text-sm text-ink outline-none focus:border-brand shadow-inner"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[10.5px] font-bold text-ink-soft mb-1 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="traveler@world.com"
                    className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs sm:text-sm text-ink outline-none focus:border-brand shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-ink-soft mb-1 block">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs sm:text-sm text-ink outline-none focus:border-brand shadow-inner"
                  />
                </div>

                {tab === "signup" && (
                  <div>
                    <label className="text-[10.5px] font-bold text-ink-soft mb-1 block">Preferred Home Gateway City</label>
                    <input
                      type="text"
                      value={homeAirport}
                      onChange={(e) => setHomeAirport(e.target.value)}
                      placeholder="e.g. Hyderabad, London, New York, Tokyo"
                      className="w-full rounded-xl border border-line bg-paper px-3.5 py-2 text-xs text-ink outline-none focus:border-brand shadow-inner"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full !py-3 text-xs sm:text-sm font-black shadow-lift hover:brightness-110 active:scale-[0.99] transition mt-1 flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Stamping Passport..." : tab === "signin" ? "Sign In to Passport" : "Stamp Passport & Start Traveling"}</span>
                  <span>→</span>
                </button>
              </form>

              {/* Safe Travel Security Badge */}
              <div className="pt-1 text-center text-[10px] text-ink-faint flex items-center justify-center gap-1.5">
                <span>🔒 256-bit AES Encryption</span>
                <span>·</span>
                <span>Zero Spam</span>
                <span>·</span>
                <span>Verified Traveler ID</span>
              </div>
            </div>

          </div>
        </main>
      </motion.div>
    </AnimatePresence>
  );
}
