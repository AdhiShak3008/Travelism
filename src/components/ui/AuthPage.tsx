"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/authStore";
import { ThemeToggle } from "@/components/ThemeToggle";

const SHOWCASE_DESTINATIONS = [
  {
    id: "kyoto",
    name: "Kyoto & Tokyo, Japan",
    tagline: "Autumn Foliage & Ancient Temples",
    weather: "21°C · Crisp Autumn Air",
    rating: "4.98 ★",
    quote: "“The autonomous food scout found secret noodle spots we would have never discovered alone.”",
    author: "Elena R., Tokyo Explorer",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    badge: "🍁 Peak Foliage Season",
  },
  {
    id: "alps",
    name: "Swiss Alps & Zermatt",
    tagline: "Glacier Express & High Alpine Ridges",
    weather: "14°C · Sunny & Clear",
    rating: "4.99 ★",
    quote: "“Zero stress booking. The mountain hut route and transfer timings were pinpoint accurate.”",
    author: "Marc K., Alpine Trekker",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80",
    badge: "🏔️ Alpine Wonder",
  },
  {
    id: "bali",
    name: "Bali & Nusa Penida",
    tagline: "Ocean Cliffs, Coral Reefs & Beachfront Stays",
    weather: "28°C · Gentle Sea Breeze",
    rating: "4.97 ★",
    quote: "“From surf spots to jungle villas in Ubud, the whole schedule flowed effortlessly.”",
    author: "Chloe & Liam, Bali Honeymoon",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    badge: "🏝️ Tropical Haven",
  },
  {
    id: "ladakh",
    name: "Ladakh & Pangong Tso",
    tagline: "High Mountain Passes & Stargazing",
    weather: "12°C · Crystal Clear Night Skies",
    rating: "4.96 ★",
    quote: "“The altitude acclimation pacing was lifesaver advice for our Nubra Valley road trip.”",
    author: "Vikram S., Roadtripper",
    imageUrl: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1200&q=80",
    badge: "🌌 Stargazing Sanctuary",
  },
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
  { icon: "⚡", title: "17 Autonomous Agents", desc: "Live real-time discovery of hidden gems & secret trails" },
  { icon: "🧬", title: "Travel DNA Engine", desc: "AI learns your exact budget, pace, dietary & stay tastes" },
  { icon: "🗺️", title: "Offline GPS & Day Maps", desc: "Turn-by-turn routes with verified coordinates & stops" },
  { icon: "💎", title: "Zero Agent Markups", desc: "Transparent net pricing directly with vetted operators" },
];

export function AuthPage({ standalone = false }: { standalone?: boolean }) {
  const router = useRouter();
  const { isAuthModalOpen, closeAuthModal, login, loginAsDemo } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [activeSlide, setActiveSlide] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [homeAirport, setHomeAirport] = useState("Hyderabad / Mumbai");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].url);
  const [loading, setLoading] = useState(false);

  // Auto-rotate scenic destination postcards
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SHOWCASE_DESTINATIONS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  if (!standalone && !isAuthModalOpen) return null;

  const currentDestination = SHOWCASE_DESTINATIONS[activeSlide];

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={standalone ? "min-h-screen bg-paper text-ink" : "fixed inset-0 z-50 overflow-y-auto bg-paper text-ink"}
      >
        {/* Top Navbar */}
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
              <span className="display text-lg font-bold tracking-tight text-ink">Travelism Passport</span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Split Grid */}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: Cinematic Tourist Inspiration & Live Destinations */}
            <div className="space-y-6">
              {/* Giant Hero Visual Showcase Card */}
              <div className="relative overflow-hidden rounded-3xl border border-line shadow-lift bg-card min-h-[440px] sm:min-h-[520px] flex flex-col justify-between p-6 sm:p-8 text-white">
                {/* Background Image with Cross-fade */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentDestination.id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={currentDestination.imageUrl}
                      alt={currentDestination.name}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 600px"
                      unoptimized
                    />
                    {/* Gradient overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
                  </motion.div>
                </AnimatePresence>

                {/* Top Badges */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1 text-xs font-extrabold text-white shadow-xs">
                      {currentDestination.badge}
                    </span>
                    <span className="rounded-full bg-emerald-500/80 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                      {currentDestination.weather}
                    </span>
                  </div>
                  <span className="rounded-full bg-amber-400/90 text-black px-2.5 py-0.5 text-xs font-black shadow-xs">
                    {currentDestination.rating}
                  </span>
                </div>

                {/* Bottom Story / Testimonial Box */}
                <div className="relative z-10 space-y-3">
                  <div>
                    <h3 className="display text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                      {currentDestination.name}
                    </h3>
                    <p className="text-white/85 text-xs sm:text-sm font-medium mt-1">
                      {currentDestination.tagline}
                    </p>
                  </div>

                  {/* Quote bubble */}
                  <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-3.5 sm:p-4 text-xs text-white/95 leading-relaxed">
                    <p className="italic font-medium">{currentDestination.quote}</p>
                    <div className="text-[11px] text-emerald-300 font-bold mt-1">— {currentDestination.author}</div>
                  </div>

                  {/* Destination Selector Carousel Dots */}
                  <div className="flex items-center gap-2 pt-2">
                    {SHOWCASE_DESTINATIONS.map((dest, idx) => (
                      <button
                        key={dest.id}
                        onClick={() => setActiveSlide(idx)}
                        className={`h-2 rounded-full transition-all ${
                          activeSlide === idx ? "w-8 bg-brand" : "w-2 bg-white/50 hover:bg-white"
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Tourist Superpowers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TOURIST_PERKS.map((perk, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-line bg-card p-3.5 shadow-2xs hover:border-brand/40 transition-colors"
                  >
                    <span className="text-xl">{perk.icon}</span>
                    <div className="font-bold text-xs text-ink mt-1.5">{perk.title}</div>
                    <p className="text-[11px] text-ink-soft leading-snug mt-0.5">{perk.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: The Vibrant Tourist Passport Login & Registration Center */}
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
