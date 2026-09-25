# Travelism — Engineering Submission & Prompt Evolution Package

**Role:** Technical Submission for e-GMAT Forward Deployed Engineer (FDE)  
**Repository:** [Travelism](https://github.com/AdhiShak3008/Travelism)  
**Production Deployment:** [travelism-tia.vercel.app](https://travelism-tia.vercel.app)

---

## 1. System Architecture & Prompt Context

### Travelism Is an Autonomous Agent Swarm, Not a Single Prompt
Travelism is a full-stack, autonomous multi-agent travel planning system built on Next.js 14, TypeScript, TailwindCSS, Groq LLMs (`openai/gpt-oss-120b` reasoning engine with `openai/gpt-oss-20b` fast fallback), LangGraph, Tavily Search, Google APIs, Upstash Redis, and Neon Postgres. 

The system coordinates several specialized director and specialist agents:
* **Scout:** Discovers verified attractions, cultural highlights, and local food.
* **Middleman:** Enforces canonical entity resolution, geofencing, and closure detection.
* **Weather Witch:** Evaluates seasonal weather, monsoons, and packing requirements.
* **Lens:** Discovers authentic, subject-locked, high-resolution photography.
* **Pillow & Review Detective:** Scours boutique stays, homestays, and verifies cleanliness and bathroom ratings.
* **Penny Pincher & Bean Counter:** Calibrates budget tiers, dynamic currency conversion, and cost totals.
* **Concierge:** The conversational travel director that interacts with the traveler, answers destination inquiries, and executes structured mutations against the live itinerary (`TripBlob`).

### What This Submission Represents
The prompt artifacts in this package (`01_prompt/`) represent the **runtime prompt lineage of the conversational Concierge subsystem** (`src/app/api/chat/route.ts`). 

* **`concierge_prompt_v1.ts`** is the initial runtime Concierge system prompt extracted verbatim from Git commit `e038417`.
* **`concierge_prompt_current.ts`** is the active runtime Concierge prompt extracted verbatim from current production HEAD.

Neither prompt constitutes the "entire Travelism system." In an agentic architecture, LLM prompts act as localized decision engines while state management, determinism, pricing math, schema validation, and persistence are enforced by TypeScript code and database boundaries.

---

## 2. Prompt Evolution: From Large Baseline to Focused Iterations

During development, Travelism did **not** repeatedly discard and rewrite the entire system prompt. Instead, once the initial runtime baseline (`concierge_prompt_v1.ts`) proved functional, engineering progress was achieved through **targeted, one-line and short-paragraph instructions** and **code-level safeguards** addressing concrete product failure modes.

### Chronology of Key Iterations Supported by Repository History

| Subsystem / Feature | Concrete Problem Encountered | Engineering & Prompt Evolution |
| :--- | :--- | :--- |
| **1. `stayMode` & Non-Hotel Stays** | Bikepacking, hiking, and budget travelers had standard commercial hotels forced on them, making rural and wilderness itineraries unrealistic and over-budget. | Added `stayMode` (`"hotels"`, `"homestays"`, `"campsites_refugios"`, `"wild_camping"`, `"none"`) to the data model (`lib/types.ts`) and pricing engine (`lib/engine.ts`). Updated the Concierge prompt and schema with the `set_stay_mode` action (e.g. `'Switched to Wild Camping (₹0 lodging)'`). |
| **2. LangGraph State Machine** | Multi-step agent synthesis needed stateful coordination, checkpoint recovery, and self-correcting feedback loops when constraints failed. | Introduced LangGraph (`@langchain/langgraph`) using `StateGraph`, `MemorySaver`, and `Annotation.Root`. The graph runs an `AuditorNode` that checks transit overload and budget violations, looping back to `SynthesizerNode` if retry is required (validated in `test-langgraph.mjs`). |
| **3. Budget & Currency Calibration** | Inconsistent hotel pricing across budget tiers (e.g., Luxury travelers seeing cheap hostels or Value Hunters seeing 5-star resorts); hardcoded INR currency quotes when users selected USD/EUR. | Linked budget tiers (`economical`, `balanced`, `premium`) in `TravelPreferences`. Injected `Active Display Currency: ${currency}` into the Concierge prompt with a strict rule: `"STRICT REQUIREMENT: All prices quoted in your conversation MUST use ${currency}"`. Code handles exchange rate normalization and total package recalibration. |
| **4. Middleman Fact-Check Arbiter** | Hallucinations regarding closed monuments, seasonal weather disruptions, or spots placed 500km outside destination boundaries. | Created the Middleman agent (`lib/server/investigate.ts`) with geofencing and known closures. Built `arbitrateConciergeFactCheck(message, tripContext)` in `api/chat/route.ts` which dynamically injects a `🛡️ MIDDLEMAN ARBITER FACT-CHECK ENFORCEMENT` block directly into the Concierge prompt when closures or conflicts exist. |
| **5. Traveler Memory Persistence** | Multi-turn chat lost traveler context across sessions (e.g. dietary preferences, physical pacing, preferred airlines). | Built `TravelerMemory` module (`src/lib/memory.ts`). The prompt now includes `🧠 ACTIVE TRAVELER MEMORY & PROFILE CONTEXT` and returns a structured `memoryDelta` object in the JSON schema, enabling the system to merge learned facts into the persistent `TripBlob`. |
| **6. Anti-Lazy-Response Constraint** | When asked to audit an itinerary or customize multiple days, the LLM occasionally defaulted to terse, uninformative one-liners like *"I've tailored that for your journey."* | Added Rule 1 to the current prompt: `CRITICAL REQUIREMENT: NEVER return a dry or lazy 1-liner like "I've tailored that for your journey." or "Done!". When the user asks a question, requests a change, or asks for an audit, ALWAYS provide a comprehensive, beautifully structured markdown reply with bold headers, bullet points, timings, and explanations...` |
| **7. Traveler Count Handling** | Initializing trips with `travelers: 0` (unconfirmed party size) previously led to calculation artifacts or unnatural responses. | Added explicit prompt branching for `travelersPartyDesc`: `"0 travelers (Party size not yet confirmed by traveler - feel free to ask or accommodate party size when relevant)"`. Mathematical calculations in `engine.ts` guard against zero-division while prompting the user to declare party size. |
| **8. Multi-Tier Cache & Cloud Sync** | Live LLM and web investigations took 8–15 seconds per destination, causing lag on reloads or multi-device sessions. | Implemented L1 in-memory caching and L2 Upstash Redis caching. Backed in-flight trip sessions with dual persistence in Neon Postgres (`active_trips` table) and Redis (`/api/trips/active`), enabling cross-device and incognito synchronization without data loss. |

---

## 3. Evaluation & Regression Prevention Suite

The `02_evaluation/` folder contains actual, runnable verification scripts sourced directly from the repository's `scripts/` directory. Each test prevents specific classes of regressions that arose during development.

### Test Catalog & Regression Coverage

#### 1. `test-langgraph.mjs`
* **Source:** `scripts/test-langgraph.mjs`
* **What It Tests:**
  * Node environment compilation and state graph initialization using `@langchain/langgraph`.
  * Multi-node lifecycle: `IntentNode` → `DiscoveryNode` → `SynthesizerNode` → `AuditorNode` → `FinalizeNode`.
  * State reducer correctness and thread-level state checkpointing using `MemorySaver`.
  * **Self-Correction Feedback Loop (`routeAfterAudit`):** Simulates an itinerary violation (`transit_overload` where transit time > 5 hours on iteration 1). Verifies that the graph loops back to `SynthesizerNode` (v2) and only proceeds to `FinalizeNode` once the audit passes.
* **Historical Regressions Prevented:** LangGraph runtime crashes in Node/Next.js environments, state leakage across graph iterations, and unbounded retry loops during self-correction.

#### 2. `test-investigate.mjs`
* **Source:** `scripts/test-investigate.mjs`
* **What It Tests:**
  * End-to-end integration of the Server-Sent Events (SSE) investigation stream (`/api/investigate`).
  * Live agent swarm execution (`scout`, `middleman`, `weather_witch`, `lens`, `pillow`, `concierge`).
  * Middleman entity resolution (`canonicalOf`), geofence verification, and closure detection.
  * Extracted sights, verified images with CDN credits, hotel cleanliness/bathroom scores, and flight estimates.
* **Historical Regressions Prevented:**
  * **Flight Hallucination Regression:** Previously, flights from departure cities (e.g., Hyderabad → Miami) produced hallucinated 2-hour non-stop durations. This test verifies that real Amadeus flight connections or verified multi-stop route estimates with authentic layovers are generated.
  * **Vague Dream Regression:** Confirms that inputs lacking a geographic destination trigger the Scout's `needsClarification` branch rather than fabricating fake destinations.

#### 3. `test-profile.mjs`
* **Source:** `scripts/test-profile.mjs`
* **What It Tests:**
  * Verifies that the traveler's **Travel DNA** profile dynamically shapes agent swarm output for the exact same destination ("Jaipur").
  * Compares a **Value Hunter** profile (`economical`, vegetarian/Jain dietary, avoid early flights) against a **Luxury** profile (`premium`, comfortable pace, heritage/wellness).
  * Evaluates differences in average hotel price per night (`dataset.hotels`) and food recommendations (`dataset.food`).
* **Historical Regressions Prevented:**
  * **Budget Drift Regression:** Prevents the investigation engine from ignoring traveler budget tiers and defaulting to generic middle-tier inventory.
  * **Dietary Amnesia Regression:** Ensures vegetarian/Jain travelers receive authentic, filtered culinary recommendations with explicit explanations.

#### 4. `test-images.mjs`
* **Source:** `scripts/test-images.mjs`
* **What It Tests:**
  * Validates subject-lock and image CDN host validity across all discovered places (`/api/investigate`).
  * Checks that every place has high-resolution photography with attribution metadata rather than placeholder cards.
* **Historical Regressions Prevented:**
  * **Image Irrelevance / Web Scraping Spam:** Previously, raw search queries occasionally scraped unrelated blog banners, navigation icons, or stock photos. This test verifies that the Lens agent and Google Custom Search scraper extract authentic, subject-locked destination photography.

---

## 4. Package Manifest & Source Verification

Every file in this package corresponds to verified repository artifacts:

| Package File | Origin in Repository | Integrity Note |
| :--- | :--- | :--- |
| `01_prompt/concierge_prompt_v1.ts` | Git commit `e038417`: `src/app/api/chat/route.ts` (lines 105–154) | Verbatim extract of the initial runtime Concierge prompt. |
| `01_prompt/concierge_prompt_current.ts` | Production HEAD: `src/app/api/chat/route.ts` (lines 183–250) | Verbatim extract of the current active Concierge prompt. |
| `02_evaluation/test-langgraph.mjs` | `scripts/test-langgraph.mjs` | Unmodified copy of the LangGraph state machine test. |
| `02_evaluation/test-investigate.mjs` | `scripts/test-investigate.mjs` | Unmodified copy of the live SSE investigation test. |
| `02_evaluation/test-profile.mjs` | `scripts/test-profile.mjs` | Unmodified copy of the Travel DNA profile differentiation test. |
| `02_evaluation/test-images.mjs` | `scripts/test-images.mjs` | Unmodified copy of the image subject-lock validation test. |
| `README.md` | Newly created submission documentation | Comprehensive architectural, evolutionary, and evaluative overview. |
