---
title: Travelism - Agentic Travel Intelligence
emoji: ✈️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Travelism ✈️

An agentic travel intelligence and trip-planning platform. Not a generic AI chatbot — it feels like briefing an entire travel intelligence agency and watching them investigate a destination, then assemble a complete, evidence-backed, costed trip.

The central primitive is a living **Trip Blob**: it starts as a vague dream and progressively becomes a modifiable, bookable travel package.

## Deploying to Hugging Face Spaces

1. **Create a new Space on Hugging Face:**
   - Go to [huggingface.co/new-space](https://huggingface.co/new-space)
   - Name your space (e.g. `travelism`)
   - Select **Docker** as the Space SDK (Blank template)
   - Choose your visibility (Public / Private)

2. **Connect & Deploy:**
   - **Option A (Direct Git Push):**
     ```bash
     git remote add space https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
     git push --force space main
     ```
   - **Option B (GitHub Sync):**
     Link your GitHub repository `AdhiShak3008/Travelism` to your Hugging Face Space.

3. **Configure Environment Secrets (in Space Settings):**
   - `GROQ_API_KEY`: *(Optional)* Your Groq API key for high-speed live swarm research and AI Concierge chat.
   - `GOOGLE_SEARCH_API_KEY`: *(Optional)* For live Google custom search crawls.
   - `GOOGLE_CX_ID`: *(Optional)* Your Google Custom Search Engine ID.
   - `DATABASE_URL`: *(Optional)* Neon PostgreSQL connection string if persisting trip records.

---

## The Journey

Dream → Destination Discovery → Visual Exploration → Place Selection → Trip Shape → Travel Mood → Deep Investigation → Package Assembly → Conversational Refinement → Final Cost → Simulated Checkout → Trip Mode.

## Highlights

- **Living Trip Blob** — a single stateful object; every mutation is targeted and traceable (change duration → recompute nights/itinerary/cost; lock the hotel → optimizer preserves it).
- **Dedicated Mobile Frontend** — automatic screen-based routing (`< 768px`) for a native mobile app experience with bottom sheets and gesture controls, while preserving the physical brochure lookbook layout on PC.
- **Self-Supported & Zero-Hotel Modes** — native support for wild camping, bivvies, campsites, and bikepacking expeditions with ₹0 stay calculations.
- **17 Named Agents** — Scout, Wingman, Pillow, Toilet Inspector, Roadrunner, Daydreamer, Review Detective, Lens, Reel Scout, Gatekeeper, Foodie, Weather Witch, Packrat, Penny Pincher, Cross Examiner, Bean Counter, Concierge — surfaced as human-readable activity.
- **Evidence & Provenance** — source reliability weighting, aspect-level review intelligence, conflict detection, and "Why this?" explanations.
- **Deterministic Engines** — cost model (confirmed vs. estimated), route-aware itinerary engine, and a budget optimizer that never silently violates locked components.

## Tech Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Zustand · Framer Motion · Docker.

## Getting Started Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Try: *"7-day self-supported bikepacking loop through Spiti Valley with wild camping by rivers and gravel passes."*

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — lint
