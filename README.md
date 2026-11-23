# AirDelta (Δ) — Personalized Winter Smog Action Engine

[![Tests](https://img.shields.io/badge/tests-24%20passed-emerald)](https://github.com/AJAYMYTH/AirDelta)
[![Engine](https://img.shields.io/badge/engine-pure%20TypeScript-blue)](https://github.com/AJAYMYTH/AirDelta)
[![Standard](https://img.shields.io/badge/standard-CPCB%20NAQI-orange)](https://github.com/AJAYMYTH/AirDelta)
[![Languages](https://img.shields.io/badge/languages-12%20Indian%20Regional-purple)](https://github.com/AJAYMYTH/AirDelta)

> **Event:** PromptWars Hackathon · **Focus:** Severe Winter Smog & Urban Air Pollution in India  
> **Thesis:** Everyone displays the AQI. Almost nobody answers *"What should my family actually change today, what does it save our lungs in toxic particles, and how sure are you?"*

AirDelta computes a household's personalized **Plan A (normal day) vs. Plan B (optimized day)** inhaled $\text{PM}_{2.5}$ dose difference and carbon emissions ledger using deterministic physical and biological exposure models (`@airdelta/engine`). Gemini is used exclusively for narrative explanation, contextual advice, indoor vision audits, and multilingual translation across **all major Indian regional languages**, strictly enforced by an automated numeric-grounding validator.

---

## 🏛️ Core Principles

1. **LLM Explains, Code Computes:**  
   No pollution reading, inhaled dose, savings percentage, or emissions metric is ever produced or hallucinated by the LLM. All calculations are executed by pure TypeScript modules (`@airdelta/engine`).
2. **Four Evidence Badges on Every Number:**  
   Every figure displayed to the user carries one of four explicit provenance badges:
   - `Measured`: Ground monitor reading (OpenAQ / CPCB) $\le$ 25 km away and $<$ 3 hours old.
   - `Forecast`: Hourly forecast from Google AQ or atmospheric models.
   - `Modelled`: Calculated via microenvironment penetration, indoor mass-balance, or transport factor equations.
   - `Assumed`: Documented literature constant from the versioned Constants Registry `2026-11-a`.
3. **Degrade, Never Lie:**  
   If upstream APIs, database, or LLM services fail, AirDelta falls back to pre-rendered deterministic templates with explicit `[Template]` or `[Stale]` markers—never invented values or false "safe" advice.
4. **Privacy by Minimization:**  
   No street addresses (only rounded ~1.1 km grid cells), no full names, no personal medical diagnoses (only generic age bands and a conservative "caution mode"). All prompts to Gemini are scrubbed of PII.
5. **Pan-India Multilingual Accessibility:**  
   Comprehensive support for all major Indian regional languages (Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, Assamese) + English.

---

## 📐 Mathematical Formulation

### 1. Inhaled Particulate Matter Dose ($D$)
$$D = \sum_{i=1}^{N} C_{seg, i} \times VE_{seg, i} \times \Delta t_{seg, i}$$
Where:
- $C_{seg, i} = C_{out}(t) \times F_{micro, i} \times (1 - \eta_{mask})$
- $F_{micro, i}$ is the microenvironment penetration factor (e.g. unsealed home: $0.75$, 2-wheeler: $1.15$, Metro: $0.25$, sealed AC car: $0.30$).
- $VE_{seg, i}$ is the age- and exertion-specific minute ventilation rate from US EPA Exposure Factors Handbook ($m^3/h$).
- $\Delta t_{seg, i}$ is duration in hours.

### 2. Indoor Single-Compartment Mass Balance
$$\frac{dC_{in}}{dt} = P \lambda C_{out} - \left( \lambda + k + \frac{\text{CADR}}{V} \right) C_{in} + \frac{S}{V}$$
Models the impact of window ventilation timing, kitchen exhaust fans (removing $75\%$ of cooking emissions), and filtration CADR.

---

## 📦 Monorepo Architecture

```
airdelta/
├── apps/
│   ├── web/               # Astro + Tailwind CSS v4 PWA (Low-JS, mobile-first)
│   └── api/               # Node.js + Hono REST API + Telegram Webhook
├── packages/
│   ├── engine/            # Pure TypeScript dose & mass-balance engine (Zero I/O)
│   ├── schemas/           # Shared Zod schemas, TypeScript types, validation contracts
│   ├── air-adapters/      # Multi-provider air adapters (Google AQ, OpenAQ, Open-Meteo, Replay)
│   └── i18n/              # 12+ Indian regional languages dictionary & localization engine
├── fixtures/              # Nov 6–8, 2026 Delhi severe smog episode dataset (AQI 385, GRAP Stage III)
├── docs/                  # PRD, TRD, Impact-Methodology, Navigation-Plan
├── MEMORY.md              # Living architectural memory & task progress tracking
└── vitest.config.ts       # Unified test runner configuration
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js `v22+` (tested on Node v24 LTS)
- `pnpm` `v11+`

### Installation & Build
```bash
# Clone the repository
git clone https://github.com/AJAYMYTH/AirDelta.git
cd AirDelta

# Install workspace dependencies
pnpm install

# Run all 24 unit & property tests
pnpm test

# Typecheck all packages & apps
pnpm typecheck

# Build all packages & static PWA
pnpm -r run build
```

### Running Locally
```bash
# Copy environment template
cp .env.example .env

# Start API dev server (port 3000)
pnpm --filter @airdelta/api dev

# Start Web PWA dev server (port 4321)
pnpm --filter @airdelta/web dev
```

---

## 🚦 Roadmap & Implementation Status

- [x] **Phase 0: Scaffolding, Documentation & Schemas**
  - PRD, TRD, Methodology, Navigation Plan.
  - `@airdelta/schemas` & `@airdelta/i18n` with 12 Indian regional languages.
- [x] **Phase 1: Multi-Provider Air Adapters & Today Dashboard**
  - Google Air Quality API (CPCB `ind_cpcb` index).
  - OpenAQ v3 ground monitor integration ($< 25\text{ km}$, freshness $< 3\text{h}$).
  - Open-Meteo European CAMS fallback.
  - Replay adapter for deterministic offline demo & testing.
  - Astro PWA Today Dashboard with Evidence Badges and 96h hourly forecast.
- [x] **Phase 2: Exposure & Impact Engine & Planner Orchestrator**
  - Pure TS dose & mass-balance engine verified with fast-check property tests.
  - Planner Orchestrator with Gemini 2.0 structured narration (`@google/genai`).
  - Strict numeric-grounding validator rejecting ungrounded numbers.
  - Pre-rendered multilingual deterministic fallback templates.
  - Interactive `/plan` comparison view with net dose savings ($-39.5\%$) and carbon emissions ledger.
- [ ] **Phase 3: Indoor Photo Audit Engine**
  - Curated `@airdelta/fix-library` categorized by budget tiers.
  - Gemini Vision source detection with EXIF stripping & human confirmation.
- [ ] **Phase 4: Multilingual Community Advisories**
  - RWA / School / Workplace notices generator across Indian languages.
  - CAQM GRAP stage rulebook.
  - $k$-anonymous community impact view ($k \ge 5$).
- [ ] **Phase 5: Telegram Bot Channel**
  - Zero-install chatbot interface via `grammY`.
  - Proactive 07:00 morning briefing notifications.
- [ ] **Phase 6: Supabase Postgres & Hardening**
  - Production Postgres migrations with Row-Level Security (RLS).
  - Plan retention cleaner for free-tier storage defense.
- [ ] **Phase 7: Replay Demonstration Studio & E2E Testing**
  - Playwright browser test suite.
  - Live judge replay studio for November 2026 Delhi smog episode.

---

## ⚖️ Data Attribution & Licenses
- **Google Air Quality API:** Courtesy of Google Maps Platform. Uses the Indian National Air Quality Index (CPCB) standard.
- **OpenAQ:** Government monitoring data aggregated under Open Data Commons Attribution License (ODC-BY).
- **Open-Meteo & CAMS:** Contains Copernicus Atmosphere Monitoring Service information 2026.
- **Central Pollution Control Board (CPCB):** National Ambient Air Quality Standards, Ministry of Environment, Forest and Climate Change, Government of India.
