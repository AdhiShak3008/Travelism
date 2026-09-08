"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/authStore";
import { useTrip } from "@/store/tripStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cx } from "@/lib/format";

export interface GlobalSpot {
  id: string;
  name: string;
  country: string;
  region: "Asia" | "Europe" | "Americas" | "Africa" | "Oceania" | "Polar";
  category: "mountains" | "beaches" | "heritage" | "nature" | "aurora" | "culinary";
  tagline: string;
  weather: string;
  rating: string;
  badge: string;
  quote: string;
  author: string;
  imageUrl: string;
  vibeTags: string[];
}

export const INITIAL_GLOBAL_SPOTS: GlobalSpot[] = [
  {
    id: "bali",
    name: "Bali & Nusa Penida",
    country: "Indonesia",
    region: "Asia",
    category: "beaches",
    tagline: "Ocean Cliffs, Coral Reefs & Beachfront Stays",
    weather: "28°C · Gentle Sea Breeze",
    rating: "4.97 ★",
    badge: "🏝️ Tropical Haven",
    quote: "“From surf spots to jungle villas in Ubud, the whole schedule flowed effortlessly.”",
    author: "Chloe & Liam, Bali Honeymoon",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    vibeTags: ["Cliff Sunsets", "Surf Spots", "Jungle Villas"],
  },
  {
    id: "kyoto",
    name: "Kyoto & Arashiyama",
    country: "Japan",
    region: "Asia",
    category: "heritage",
    tagline: "Golden Bamboo Groves, Zen Temples & Geisha Quarters",
    weather: "21°C · Crisp Autumn",
    rating: "4.98 ★",
    badge: "🍁 Zen Sanctuary",
    quote: "“The autonomous food scout found 400-year-old tea houses and quiet bamboo paths away from tourists.”",
    author: "Elena R., Tokyo Explorer",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    vibeTags: ["Zen Gardens", "Matcha Cafes", "Autumn Leaves"],
  },
  {
    id: "alps",
    name: "Swiss Alps & Zermatt",
    country: "Switzerland",
    region: "Europe",
    category: "mountains",
    tagline: "Glacier Express & High Alpine Ridges under Matterhorn",
    weather: "14°C · Crisp Alpine",
    rating: "4.99 ★",
    badge: "🏔️ Alpine Royalty",
    quote: "“The mountain hut routes and train transfers connected with Swiss-watch precision.”",
    author: "Marc K., Alpine Trekker",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80",
    vibeTags: ["Matterhorn", "Fondue Chalets", "Glacier Trails"],
  },
  {
    id: "amalfi",
    name: "Amalfi Coast & Positano",
    country: "Italy",
    region: "Europe",
    category: "beaches",
    tagline: "Pastel Cliffside Villages & Azure Tyrrhenian Sea",
    weather: "26°C · Warm Mediterranean",
    rating: "4.97 ★",
    badge: "🍋 Lemon Groves & Cliffs",
    quote: "“Cruising the coastal roads by vintage Vespa and eating seafood pasta right over the water.”",
    author: "Isabella G., Coastline Lover",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    vibeTags: ["Cliffside Stays", "Limoncello", "Speedboat Charters"],
  },
];

const CATEGORIES = [
  { id: "all", label: "✨ All World Wonders" },
  { id: "mountains", label: "🏔️ High Summits" },
  { id: "beaches", label: "🌊 Beaches & Islands" },
  { id: "heritage", label: "🛕 Ancient Heritage" },
  { id: "nature", label: "🌿 Wild Landscapes" },
  { id: "aurora", label: "🌌 Aurora & Arctic" },
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
    label: "🥟 Culinary Explorer",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    badge: "Gourmet",
  },
];

const TOURIST_PERKS = [
  { icon: "⚡", title: "17 Autonomous Agents", desc: "Live radar searches secret spots worldwide" },
  { icon: "🧬", title: "Travel DNA Engine", desc: "Learns your exact pace, budget & stay style" },
  { icon: "🗺️", title: "Offline GPS Routes", desc: "Turn-by-turn day-by-day maps with coordinates" },
  { icon: "💎", title: "Zero Markup Deals", desc: "Transparent net rates directly with operators" },
];

export function AuthPage({ standalone = false }: { standalone?: boolean }) {
  const router = useRouter();
  const { isAuthModalOpen, closeAuthModal, login, loginAsDemo } = useAuth();
  const startDream = useTrip((s) => s.startDream);

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Dynamic Infinite Spots & Screensaver State
  const [spots, setSpots] = useState<GlobalSpot[]>(INITIAL_GLOBAL_SPOTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Active Search / Radar Background Scout State
  const [isScouting, setIsScouting] = useState(false);
  const [scoutedNextSpot, setScoutedNextSpot] = useState<GlobalSpot | null>(null);
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

  // Scout next spot asynchronously from API/Catalog and preload image
  const scoutNextGlobalSpot = useCallback(async (cat: string, existingList: GlobalSpot[]) => {
    try {
      setIsScouting(true);
      setScoutingRadarText("📡 Radar: Scouting next global spot...");
      
      const seenIds = existingList.map((s) => s.id).join(",");
      const res = await fetch(`/api/spots/discover?category=${cat}&exclude=${seenIds}`);
      
      if (!res.ok) throw new Error("Failed to scout spot");
      const data = await res.json();
      const discovered: GlobalSpot = data.spot;

      if (discovered) {
        // Preload image in browser memory so slide transition is 100% instantaneous
        if (typeof window !== "undefined") {
          const img = new window.Image();
          img.src = discovered.imageUrl;
        }

        setScoutedNextSpot(discovered);
        setScoutingRadarText(`✨ Discovered: ${discovered.name}, ${discovered.country}`);
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
    // Scout the next spot if we don't have one queued up
    if (!scoutedNextSpot && !isScouting) {
      scoutNextGlobalSpot(selectedCategory, spots);
    }

    if (!autoPlay) return;

    const timer = setTimeout(() => {
      if (scoutedNextSpot) {
        // Append scouted spot to playlist if not already there, and advance
        setSpots((prev) => {
          if (prev.some((s) => s.id === scoutedNextSpot.id)) {
            return prev;
          }
          return [...prev, scoutedNextSpot];
        });
        setCurrentIndex((prev) => prev + 1);
        setScoutedNextSpot(null); // Will trigger next scout immediately!
      } else {
        // Fallback: loop through existing
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

  const handleExploreSpot = (spot: GlobalSpot) => {
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
        className={standalone ? "min-h-screen bg-paper text-ink" : "fixed inset-0 z-50 overflow-y-auto bg-paper text-ink"}
      >
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-xl px-4 py-3 sm:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-xl border border-line bg-paper-2 px-3 py-1.5 text-xs font-bold text-ink hover:border-brand/40 active:scale-95 transition shadow-2xs"
            >
              <span>← Back to Trip Explorer</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-brand to-emerald-400 text-sm font-extrabold text-white shadow-sm">
                T
              </div>
              <span className="display text-lg font-bold tracking-tight text-ink">Travelism Global Passport</span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Split Content */}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: The Autonomous World Screensaver & Spot Explorer */}
            <div className="space-y-4">
              {/* Category Filter Pills & Live Radar Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cx(
                        "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs flex items-center gap-1.5",
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
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className={cx("inline-block h-2 w-2 rounded-full bg-emerald-500", isScouting && "animate-ping")} />
                  <span className="truncate max-w-[220px]">{scoutingRadarText}</span>
                </div>
              </div>

              {/* Main Panoramic Destination Card (Screensaver UI Matching Screenshot) */}
              <div className="relative overflow-hidden rounded-3xl border border-line shadow-2xl bg-zinc-950 min-h-[490px] sm:min-h-[550px] flex flex-col justify-between p-6 sm:p-8 text-white">
                
                {/* Background Image with Cross-Fade & Ambient Motion */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSpot.id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={currentSpot.imageUrl}
                      alt={currentSpot.name}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 700px"
                      unoptimized
                    />
                    {/* Atmospheric Lighting Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/25" />
                  </motion.div>
                </AnimatePresence>

                {/* Top Overlay Strip: Badges & Rating */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/20 backdrop-blur-md border border-white/20 px-3.5 py-1 text-xs font-semibold text-white shadow-sm">
                      {currentSpot.badge}
                    </span>
                    <span className="rounded-full bg-teal-500/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm">
                      {currentSpot.weather}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTeleport}
                      className="rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1 text-[11px] font-bold text-white transition active:scale-95 flex items-center gap-1 shadow-sm"
                      title="Jump to a random spot worldwide"
                    >
                      <span>🎲 Teleport</span>
                    </button>
                    <span className="rounded-full bg-amber-400 text-black px-3 py-0.5 text-xs font-black shadow-sm flex items-center gap-1">
                      {currentSpot.rating}
                    </span>
                  </div>
                </div>

                {/* Middle / Bottom Content Area */}
                <div className="relative z-10 space-y-4">
                  {/* Spot Title & Subtitle */}
                  <div>
                    <h3 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                      {currentSpot.name}
                    </h3>
                    <p className="text-white/85 text-xs sm:text-sm font-normal mt-1.5">
                      {currentSpot.tagline}
                    </p>
                  </div>

                  {/* Frosted Glass Voyager Quote Card */}
                  <div className="rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 p-4 sm:p-5 text-xs sm:text-sm text-white/90 leading-relaxed shadow-lg">
                    <p className="italic font-light leading-relaxed">{currentSpot.quote}</p>
                    <div className="text-xs text-teal-400 font-semibold mt-2">— {currentSpot.author}</div>
                  </div>

                  {/* Bottom Indicator & Controls Bar */}
                  <div className="flex items-center justify-between pt-1">
                    
                    {/* 4 Dynamic Dots (Matching Screenshot: Active elongated teal pill) */}
                    <div className="flex items-center gap-2">
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
                                ? "w-8 h-2 bg-teal-400 shadow-sm shadow-teal-400/50"
                                : "w-2 h-2 bg-white/40 hover:bg-white/70"
                            )}
                            aria-label={`Go to slide ${dotIdx + 1}`}
                          />
                        );
                      })}
                    </div>

                    {/* Action Buttons: Plan Trip + Next/Prev + AutoPlay */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExploreSpot(currentSpot)}
                        className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 px-3.5 py-1 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                      >
                        <span>✨ Plan trip here</span>
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
                          "rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-md transition",
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
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-2 flex items-center justify-between">
                  <span>Discovered Spots Stream ({spots.length})</span>
                  <span>{isScouting ? "📡 Searching next..." : "✓ Auto-expanding radar"}</span>
                </div>
                <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                  {spots.map((spot, idx) => {
                    const isSelected = idx === currentIndex;
                    return (
                      <button
                        key={`${spot.id}-${idx}`}
                        onClick={() => setCurrentIndex(idx)}
                        className={cx(
                          "relative shrink-0 w-28 sm:w-32 h-20 rounded-2xl overflow-hidden border-2 transition-all active:scale-95 group text-left",
                          isSelected
                            ? "border-brand scale-105 shadow-md ring-2 ring-brand/30"
                            : "border-line opacity-70 hover:opacity-100"
                        )}
                      >
                        <Image
                          src={spot.imageUrl}
                          alt={spot.name}
                          fill
                          sizes="128px"
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        <div className="absolute bottom-1.5 inset-x-2">
                          <div className="font-bold text-[10px] text-white truncate">{spot.name}</div>
                          <div className="text-[8px] text-white/80 truncate">{spot.country}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tourist Superpowers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {TOURIST_PERKS.map((perk, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-line bg-card p-3 shadow-2xs hover:border-brand/40 transition-colors"
                  >
                    <span className="text-xl">{perk.icon}</span>
                    <div className="font-bold text-xs text-ink mt-1 truncate">{perk.title}</div>
                    <p className="text-[10px] text-ink-soft leading-snug mt-0.5">{perk.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: The Tourist Passport Login & Registration Center */}
            <div className="rounded-3xl border border-line bg-card p-6 sm:p-8 shadow-lift space-y-6">
              {/* Header Title */}
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-bold text-brand shadow-2xs mb-2">
                  <span>🌴 International Tourist Passport Portal</span>
                </div>
                <h2 className="display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                  Welcome to Your Travel Passport
                </h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">
                  Sign in or create your free voyager profile to save custom itineraries, synchronize your Travel DNA across devices, and unlock VIP hotel benefits.
                </p>
              </div>

              {/* ⚡ INSTANT 1-CLICK VIP DEMO TOURIST PASS */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-500/15 via-brand/10 to-teal-500/15 p-5 sm:p-6 shadow-md transition hover:border-emerald-500 hover:shadow-lift">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-500 shadow-md">
                      <Image
                        src={AVATARS[0].url}
                        alt="Aditya Shakya"
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-ink">Aditya Shakya</span>
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                          👑 VIP Voyager Pass
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft mt-0.5">
                        Pre-loaded with 3 itineraries (Kyoto, Blue Lagoon, Ladakh) + custom DNA.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDemo}
                    className="btn-primary !py-3 !px-6 text-xs font-black shadow-lift whitespace-nowrap active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <span>⚡ Instant 1-Click Join</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Or divider */}
              <div className="relative flex items-center justify-center">
                <span className="absolute inset-x-0 h-px bg-line" />
                <span className="relative bg-card px-4 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  Or continue with personal account
                </span>
              </div>

              {/* Sign In / Sign Up Tabs */}
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-paper-2 p-1.5 border border-line">
                <button
                  type="button"
                  onClick={() => setTab("signin")}
                  className={`rounded-xl py-2.5 text-xs font-bold transition ${
                    tab === "signin" ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Sign In to Account
                </button>
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className={`rounded-xl py-2.5 text-xs font-bold transition ${
                    tab === "signup" ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Create New Traveler Pass
                </button>
              </div>

              {/* Interactive Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === "signup" && (
                  <>
                    {/* Traveler Persona Avatar Picker */}
                    <div>
                      <label className="text-[11px] font-bold text-ink-soft mb-2 block uppercase tracking-wider">
                        Choose Your Tourist Traveler Persona
                      </label>
                      <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
                        {AVATARS.map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedAvatar(av.url)}
                            className={`relative shrink-0 rounded-2xl p-1.5 transition border-2 flex flex-col items-center ${
                              selectedAvatar === av.url
                                ? "border-brand bg-brand/10 scale-105 shadow-md"
                                : "border-transparent opacity-65 hover:opacity-100"
                            }`}
                          >
                            <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                              <Image src={av.url} alt={av.label} fill sizes="48px" className="object-cover" unoptimized />
                            </div>
                            <span className="block text-[10px] font-bold text-ink mt-1 text-center truncate max-w-[56px]">
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
                        placeholder="e.g. Alex Morgan"
                        className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-brand shadow-inner"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[11px] font-bold text-ink-soft mb-1 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="traveler@world.com"
                    className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-brand shadow-inner"
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
                    className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-brand shadow-inner"
                  />
                </div>

                {tab === "signup" && (
                  <div>
                    <label className="text-[11px] font-bold text-ink-soft mb-1 block">Preferred Home Gateway City</label>
                    <input
                      type="text"
                      value={homeAirport}
                      onChange={(e) => setHomeAirport(e.target.value)}
                      placeholder="e.g. Hyderabad, London, New York, Tokyo"
                      className="w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-xs text-ink outline-none focus:border-brand shadow-inner"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full !py-3.5 text-sm font-black shadow-lift hover:brightness-110 active:scale-[0.99] transition mt-2 flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Stamping Passport..." : tab === "signin" ? "Sign In to Passport" : "Stamp Passport & Start Traveling"}</span>
                  <span>→</span>
                </button>
              </form>

              {/* Safe Travel Security Badge */}
              <div className="pt-2 text-center text-[11px] text-ink-faint flex items-center justify-center gap-1.5">
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
