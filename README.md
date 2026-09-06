# Travelism

An agentic travel intelligence and trip-planning platform. Not a generic AI chatbot — it feels like briefing an entire travel intelligence agency and watching them investigate a destination, then assemble a complete, evidence-backed, costed trip.

The central primitive is a living **Trip Blob**: it starts as a vague dream and progressively becomes a modifiable, bookable travel package.

## The journey

Dream → Destination Discovery → Visual Exploration → Place Selection → Trip Shape → Travel Mood → Deep Investigation → Package Assembly → Conversational Refinement → Final Cost → Simulated Checkout → Trip Mode.

## Highlights

- **Living Trip Blob** — a single stateful object; every mutation is targeted and traceable (change duration → recompute nights/itinerary/cost; lock the hotel → optimizer preserves it).
- **Comments as first-class data** — natural language ("the bathroom needs to be genuinely clean", "get it under ₹75k but don't touch the hotel") parses into structured steering signals that re-prioritize agents and drive the optimizer.
- **17 named agents** — Scout, Wingman, Pillow, Toilet Inspector, Roadrunner, Daydreamer, Review Detective, Lens, Reel Scout, Gatekeeper, Foodie, Weather Witch, Packrat, Penny Pincher, Cross Examiner, Bean Counter, Concierge — surfaced as human-readable activity.
- **Evidence & provenance** — source reliability weighting, aspect-level review intelligence, conflict detection, and "Why this?" explanations.
- **Deterministic engines** — cost model (confirmed vs. estimated), route-aware itinerary engine, and a budget optimizer that never silently violates locked components.
- **Swappable research seam** — a mock research backend behind a `ResearchProvider` interface, architected so a live crawler / entity-resolution layer can replace it without touching the UI.
- **Simulated checkout & Trip Mode** — a demo payment flow (no real money) that transitions the Blob into a living trip dashboard.

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Zustand · Framer Motion.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Try: *"I want to explore Tawang for a week. Cheap flights are fine, but I want a clean comfortable hotel, beautiful scenery, good food and no crazy rushed itinerary."*

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — lint

## Project structure

```
src/
  app/                 # Next.js App Router (layout, page, globals)
  components/
    stages/            # one component per journey stage
    ui/                # cards, panels, steering box, provenance, etc.
    Flow.tsx           # stage orchestration + shared transitions
  lib/
    types.ts           # the full domain model (TripBlob, agents, evidence…)
    agents.ts          # agent roster metadata
    parser.ts          # natural language → structured steering signals
    engine.ts          # cost model, itinerary engine, optimizer
    research/          # swappable ResearchProvider + mock datasets
  store/
    tripStore.ts       # Zustand store: targeted, stateful mutations
```

## Notes

Data is currently a high-quality mock backend for development. Images are real editorial photos; no AI-generated image is ever presented as evidence of a real place, and the UI states explicitly when reliable visual evidence is unavailable. The checkout is simulated and processes no real payment.
