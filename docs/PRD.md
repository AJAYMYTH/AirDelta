# AirDelta — Product Requirements Document (PRD)

**Project:** AirDelta  
**Hackathon Event:** PromptWars  
**Version:** 1.0.0 · **Date:** 23 Nov 2026 · **Status:** Approved for Implementation

---

## 1. Executive Summary & Thesis
Air pollution in urban India—particularly during severe winter smog episodes in the Indo-Gangetic Plain—reaches hazardous levels with AQI frequently exceeding 350–450. While measurement tools (government portals, weather apps, commercial AQI widgets) are widespread, **actionable behavioral intervention is almost nonexistent**.

Current apps show a number like "380: Severe", which induces anxiety without answering:
> *"What should my family actually change today? What will it save us in inhaled toxic particles? And how confident are you in that calculation?"*

**AirDelta** bridges this gap. It calculates a household's personalized **Plan A (normal day) vs. Plan B (optimized day)** inhaled PM2.5 difference using deterministic physical and biological exposure models, while using Gemini strictly to personalize, contextualize, and translate the guidance across all Indian regional languages.

---

## 2. Problem Statement
1. **The Inaction Gap:** Research indicates that passive pollution readings fail to trigger protective behavior unless coupled with personalized, health-linked, and actionable routines.
2. **The Indoor Blind Spot:** Studies across Delhi-NCR homes reveal indoor PM2.5 levels exceeding WHO standards by up to 20×, even in high-income neighborhoods. Indoor spikes occur during morning and evening cooking and unventilated hours, where outdoor air purifiers alone are insufficient.
3. **Contradictory Policy Signals:** When CAQM invokes GRAP (Graded Response Action Plan) stages (Stage I to IV), citizens face disjointed school circulars, office advisories, and transport restrictions without a unified household plan.
4. **Linguistic Diversity:** India comprises dozens of major linguistic groups; critical smog alerts often fail to reach non-English speakers or multi-lingual household members in understandable terms.

---

## 3. Product Vision & Principles

### Non-Negotiable Core Principles
1. **LLM Explains, Code Computes:**  
   No pollution reading, inhaled dose, savings percentage, or emissions metric is ever produced or hallucinated by the LLM. All calculations are executed by pure TypeScript modules (`@airdelta/engine`).
2. **Evidence Badges on Every Number:**  
   Every figure displayed to the user carries one of four explicit provenance badges:
   - `Measured`: Ground monitor reading (OpenAQ / CPCB) $\le$ 25 km away and $<$ 3 hours old.
   - `Forecast`: Hourly forecast from Google AQ or atmospheric models.
   - `Modelled`: Calculated via microenvironment penetration, indoor mass-balance, or transport factor equations.
   - `Assumed`: Documented literature constant from the versioned Constants Registry.
3. **Degrade, Never Lie:**  
   If upstream APIs, database, or LLM services fail, AirDelta falls back to pre-rendered deterministic templates with explicit `[Template]` or `[Stale]` markers—never invented values or false "safe" advice.
4. **Privacy by Minimization:**  
   No street addresses (only rounded ~1.1 km grid cells), no full names, no personal medical diagnoses (only generic age bands and a conservative "caution mode"). All prompts to Gemini are scrubbed of PII.
5. **Pan-India Multilingual Accessibility:**  
   Comprehensive support for all major Indian regional languages (Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, Assamese) + English.

---

## 4. User Personas

| Persona | Key Pain Points | AirDelta Solution | Delivery Channel |
|---|---|---|---|
| **Parent / Caregiver** (Delhi / Kanpur / Patna) | Worry about child's school run, elderly parent morning walk, indoor cooking smoke. | 60-second routine input $\rightarrow$ Plan A vs Plan B card with exact dose reduction in $\mu g$. | Web PWA + Telegram morning push |
| **RWA / Society Secretary** | Needs official, non-alarmist communication for residents; wants to follow GRAP guidelines. | One-tap bilingual community advisory generator with printable / forwardable card. | Web PWA + Telegram forward |
| **School Administrator** | Needs clear decisions on outdoor sports, ventilation timings, and bus windows. | Campus advisory tailored to school schedules and official circulars. | Web PWA |
| **Commuter / Worker** | Needs to balance transport speed, cost, and physical exposure (e.g., Metro vs. Bike). | Exposure vs. Emissions trade-off card (dual ledgers). | Web PWA + Telegram |

---

## 5. Scope & Delivery Channels

### 5.1 Option A: Web PWA (Full Experience)
- Installable PWA with offline caching of the last active plan.
- Lightweight Astro island architecture for ultra-low JS bundle size on entry-level mobile devices.
- Responsive views:
  - `/` **Today:** AQI snapshot, pollutant breakdown, 96h forecast strip, cleanest window indicator, GRAP banner.
  - `/plan` **Plan A vs B:** Interactive timeline, routine adjustments, dose delta ($\mu g$), emission delta ($gCO_2e$), evidence badge inspection.
  - `/indoor` **Indoor Audit:** Photo upload, Gemini vision source detection, human-in-the-loop confirmation, budget-tiered ranked fixes.
  - `/community` **Advisories:** Multilingual community advisory generator + $k$-anonymous group impact ledger ($k \ge 5$).
  - `/replay` **Replay Studio:** Deterministic replay of November 2026 Delhi smog episode for offline evaluation and live demonstrations.
  - `/method` **Methodology:** Versioned constants registry, mathematical formulas, data licenses, and citations.

### 5.2 Option B: Telegram Bot (Zero-Install, Free Proactive Alerts)
- Accessible via `@AirDeltaBot`.
- Interactive button-driven onboarding in 60 seconds.
- Commands: `/start`, `/today`, `/plan`, `/indoor`, `/advisory`, `/lang`.
- Automated daily **07:00 morning briefing** push notification with that day's cleanest windows and routine recommendation.

---

## 6. Goals & Non-Goals

### Goals
- Deliver personalized Plan A vs Plan B exposure comparisons in $\le 5$ seconds.
- 100% of displayed numeric figures verifiable against engine calculations or registered constants.
- 100% functionality maintained in deterministic mode when LLM is turned off or quota-limited.
- Seamless dual-channel delivery (Web PWA + Telegram Bot) over a single backend API.
- Zero-PII transmission to third-party AI services.

### Non-Goals
- Medical diagnosis, prescription, or clinical treatment advice.
- Native mobile app stores (iOS App Store / Google Play binary submission).
- Proprietary hardware manufacturing or direct affiliate purifier sales.
- Operating as an official meteorological agency or replacing CPCB/IMD.

---

## 7. Success Metrics
- **Verification Pass Rate:** 100% passing rate on numeric-grounding validator in evaluation suites.
- **Engine Reliability:** 100% test coverage on pure TypeScript exposure engine with property tests.
- **Performance:** Lighthouse score $\ge 90$ on mobile for performance, accessibility, best practices, and SEO.
- **Resilience:** Seamless fallback to deterministic templates during simulated upstream API outages.
