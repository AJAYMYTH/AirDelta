# AirDelta (Δ) — AI-Assisted Winter Smog Action Engine

[![Tests](https://img.shields.io/badge/tests-66%20passed-emerald?style=flat-square)](https://github.com/AJAYMYTH/AirDelta)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square)](https://github.com/AJAYMYTH/AirDelta/actions)
[![Engine](https://img.shields.io/badge/engine-pure%20TypeScript-blue?style=flat-square)](https://github.com/AJAYMYTH/AirDelta)
[![Standards](https://img.shields.io/badge/standard-CPCB%20NAQI%20%7C%20CAQM%20GRAP-orange?style=flat-square)](https://github.com/AJAYMYTH/AirDelta)
[![Languages](https://img.shields.io/badge/languages-12%20Indian%20Regional-purple?style=flat-square)](https://github.com/AJAYMYTH/AirDelta)
[![Database](https://img.shields.io/badge/database-Supabase%20Postgres%20%2B%20RLS-3ECF8E?style=flat-square)](https://github.com/AJAYMYTH/AirDelta)
[![Channel](https://img.shields.io/badge/channel-Astro%20PWA%20%2B%20Telegram%20Bot-0284c7?style=flat-square)](https://github.com/AJAYMYTH/AirDelta)

> **Event:** PromptWars Hackathon Challenge 6 · **Chosen Vertical:** Public Health & Climate Resilience (Severe Winter Smog & Urban Air Pollution in India) · **Built by:** AJAYMYTH (Javali Ajayakumar)  
> **Thesis:** Everyone displays the raw AQI. Almost nobody answers: *"What should my family actually change today, what does it save our lungs in toxic particles, and how sure are you?"*

AirDelta computes a household's personalized **Plan A (normal day) vs. Plan B (optimized day)** inhaled $\text{PM}_{2.5}$ dose difference and carbon emissions ledger using deterministic physical and biological exposure models (`@airdelta/engine`). Live monitoring runs a **smart dual-adapter race & zero-failure fallback** across **OpenAQ v3 physical ground stations** (CPCB/DPCC/SPCB accuracy) and **Open-Meteo ECMWF CAMS** (low latency + global coverage), degrading safely to stale cache or an offline Nov 2026 Delhi smog replay fixture without ever failing an AQI lookup. Gemini (`gemini-3.6-flash` with fallback chain) is used exclusively for narrative explanation, contextual advice, indoor vision audits, and multilingual translation across **all 12 major Indian regional languages + English**, strictly verified by an automated numeric-grounding validator.

---

## 🎯 Chosen Vertical, Approach & Logic

### 1. Chosen Vertical & Personas
- **Vertical:** Public Health & Climate Action — Urban Air Pollution Decision Engine for Indian Households & Communities.
- **Primary Personas:**
  - **Parents / Caregivers** (Delhi-NCR, Mumbai, Bengaluru, Kanpur, Patna, Lucknow): Need 60-second routine adjustments (morning walk timing, school run, cooking exhaust) quantified in inhaled µg $\text{PM}_{2.5}$.
  - **RWAs / Schools / Workplaces:** Need non-alarmist, GRAP-stage-aligned multilingual WhatsApp/Telegram notices (`hi`, `bn`, `te`, `mr`, `ta`, `ur`, `gu`, `kn`, `or`, `ml`, `pa`, `as`, `en`).
  - **Urban Commuters:** Need exposure-vs-emissions trade-offs (e.g., why cycling in severe smog increases inhaled dose vs. Metro + N95).

### 2. Approach & Logic
1. **Strict Math Boundary (`LLM Explains, Code Computes`):** The LLM never computes or invents pollution numbers, inhaled doses, or savings percentages. Pure TypeScript modules (`@airdelta/engine`) execute all exposure, mass-balance, and emissions equations.
2. **Numeric Grounding Validator:** Every sentence returned by Gemini is scanned for numeric tokens (`GroundingValidatorService`). Any ungrounded number triggers automatic fallback to verified multilingual deterministic templates (`TemplateFallbackService`).
3. **Dual-Adapter Hedged Race & Zero-Error Fallback:** `AirDataService` runs an intelligent hedged race (`race` strategy, `2.2s` accuracy budget) between **OpenAQ v3 physical ground stations** (CPCB/DPCC/SPCB accuracy within 25 km, picking freshest sensor timestamps & computing official CPCB NAQI breakpoints) and **Open-Meteo ECMWF CAMS** (sub-second global coverage & 72h hourly dispersion forecasts). If OpenAQ times out or is unavailable, Open-Meteo answers seamlessly; if both fail, it degrades safely to bounded LRU stale cache or offline replay fixtures (`fixtures/delhi-smog-nov2026.json`) without ever throwing an AQI fetch error.
4. **Human-in-the-Loop Indoor Vision Audit:** Uploaded room photos are downscaled and re-encoded via HTML `<canvas>` on the client to strip EXIF geolocation before Gemini Vision proposes candidate sources, which the user confirms/edits before recalculating single-compartment indoor mass balance.

### 3. How the Solution Works
1. **Air Data Layer (`@airdelta/air-adapters`):** Coalesces concurrent requests per `0.01°` (~1.1 km) grid cell, caps spatial/forecast caches via bounded LRU eviction (`maxCacheEntries: 500`), runs the OpenAQ + Open-Meteo dual-adapter fallback hierarchy, and attaches provenance badges (`[Measured]`, `[Forecast]`, `[Modelled]`, `[Assumed]`).
2. **Optimization Engine (`@airdelta/engine`):** Simulates Plan A segment-by-segment inhaled $\text{PM}_{2.5}$ dose ($D = \sum C_{seg} \times VE_{seg} \times \Delta t_{seg}$) and compares Plan B shifts (moving walks to the cleanest afternoon window, shifting two-wheeler/car commutes to Metro + N95, running kitchen exhaust).
3. **Dual Delivery Channels (`apps/web` + `apps/api` + `grammY`):** Both the 8-page Astro PWA (including a global **Domain-Guarded AI Chat Assistant** `AirChatWidget` across all pages) and the `@airdeltabot` Telegram bot consume the unified Hono REST API (`/v1/air`, `/v1/plans`, `/v1/chat`, `/v1/indoor-audits`, `/v1/advisories`, `/webhooks/telegram`).

### 4. Assumptions Made
- **Versioned Constants Registry (`2026-11-a`):** Minute ventilation rates ($VE$) follow US EPA Exposure Factors Handbook Chapter 6; building envelope penetration ($F_{micro}$) follows EPIC India / Nazaroff indoor aerosol studies; transport emission factors follow CPCB & DMRC data; uncertainty bounds propagate deterministically at $[0.80, 1.25] \times D$ (or $\pm 15\%$ / $\pm 20\%$ as documented in `packages/engine/src/dose.ts`).
- **Spatial & Privacy Minimization:** Coordinates snap to `0.01°` (~1.1 km) grid cells (no street addresses stored); `PiiSanitizerService` strips Indian phone numbers, Aadhaar numbers, emails, addresses, and prompt-injection payloads; community impact views enforce $k \ge 5$ household anonymity; stored plans prune after 30 days.
- **Indoor Steady-State Model:** Single-compartment room volume defaults to $45\text{ m}^3$ (typical urban bedroom/living space) with default air-exchange $\lambda = 1.2\text{ h}^{-1}$ and deposition $k = 0.25\text{ h}^{-1}$ when user room dimensions are omitted.
- **OpenAQ Sensor Freshness:** Ground monitor readings $\le 3\text{ hours}$ old carry the `[Measured]` badge; older readings degrade to `[Modelled]`. Forecast windows use Open-Meteo CAMS dispersion modelling because OpenAQ v3 serves observed historical/current monitor data rather than future forecasts.

---

## 🏛️ Core Architectural Principles

```mermaid
flowchart TD
    User["Household Routine + Budget + Grid Cell"] --> Engine["@airdelta/engine (Pure TypeScript)"]
    AirProviders["OpenAQ v3 (Default Primary) + Open-Meteo CAMS"] --> Adapters["@airdelta/air-adapters (Spatial Grid Cache 0.01°)"]
    Adapters --> Engine
    
    subgraph "Strict Math & Grounding Boundary"
        Engine -->|"Plan A vs Plan B Dose (µg)\n% Savings + gCO2e"| Validator["Numeric Grounding Validator"]
        Engine -->|"Ground-Truth Data"| Gemini["Gemini 3.6 Flash\n(Structured Narration & Vision)"]
        Gemini -->|"Candidate Text"| Validator
        Validator -->|"Passed Grounding"| FinalOutput["Plan Response"]
        Validator -->|"Failed / Hallucinated"| TemplateFallback["Multilingual Deterministic Fallback"]
        TemplateFallback --> FinalOutput
    end

    FinalOutput --> Web["Astro + Tailwind CSS v4 PWA"]
    FinalOutput --> Bot["Telegram Bot Channel (@airdeltabot)"]
    FinalOutput --> Supabase["Supabase Postgres (RLS + k >= 5 Anonymity)"]
```

1. **LLM Explains, Code Computes:**  
   No pollution reading, inhaled dose, savings percentage, or emissions metric is ever produced or hallucinated by the LLM. All calculations are executed deterministically by pure TypeScript modules (`@airdelta/engine`).
2. **Four Evidence Badges on Every Number:**  
   Every figure displayed to the user carries one of four explicit provenance badges:
   - `[Measured]`: Ground monitor reading (CPCB / OpenAQ CAAQMS) $\le$ 25 km away and $<$ 3 hours old.
   - `[Forecast]`: Hourly forecast from Open-Meteo / ECMWF CAMS atmospheric dispersion models (Google Air Quality API disabled by default).
   - `[Modelled]`: Calculated via microenvironment penetration, indoor mass-balance, or transport factor equations.
   - `[Assumed]`: Documented literature constant from the versioned Constants Registry `2026-11-a`.
3. **Degrade, Never Lie:**  
   If upstream APIs, database, or LLM services fail, AirDelta falls back to pre-rendered deterministic templates with explicit `[Template]` or `[Stale]` markers—never invented values or false "safe" advice.
4. **Privacy by Minimization:**  
   No street addresses (only rounded ~1.1 km grid cells), no full names, no personal medical diagnoses (only generic age bands and a conservative "caution mode"). All user inputs are sanitized by `PiiSanitizerService`.
5. **Pan-India Multilingual Accessibility:**  
   Native localization across **12 Indian regional languages** (Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, Assamese) + English.

---

## 📐 Mathematical Formulation

### 1. Inhaled Particulate Matter Dose ($D$)
$$D = \sum_{i=1}^{N} C_{seg, i} \times VE_{seg, i} \times \Delta t_{seg, i}$$
Where:
- $C_{seg, i} = C_{out}(t) \times F_{micro, i} \times (1 - \eta_{mask})$
- $F_{micro, i}$ is the microenvironment penetration factor (e.g., unsealed home: $0.75$, 2-wheeler: $1.15$, Metro: $0.25$, sealed AC car: $0.30$).
- $VE_{seg, i}$ is the age- and exertion-specific minute ventilation rate from US EPA Exposure Factors Handbook ($m^3/h$).
- $\Delta t_{seg, i}$ is duration in hours.
- Uncertainty intervals are propagated at $[0.80, 1.25] \times D$.

### 2. Indoor Single-Compartment Mass Balance
$$\frac{dC_{in}}{dt} = P \lambda C_{out} - \left( \lambda + k + \frac{\text{CADR}}{V} \right) C_{in} + \frac{S}{V}$$
Models the impact of window ventilation timing, kitchen exhaust fans (removing $75\%$ of cooking emissions), and filtration CADR.

### 3. Carbon Co-benefit Ledger
$$E_{\text{CO}_2\text{e}} = \sum_{j} d_{km, j} \times EF_{mode, j}$$
Calculates emissions divergence (e.g. switching private petrol car or 2-wheeler to Delhi Metro or active transport).

---

## 📦 Monorepo Structure

```
airdelta/
├── apps/
│   ├── web/               # Astro + Tailwind CSS v4 PWA (Low-JS, mobile-first, 8 pages)
│   └── api/               # Node.js + Hono REST API + Telegram Bot Webhook (Render-ready)
├── packages/
│   ├── engine/            # Pure TypeScript dose, mass-balance & optimizer engine (Zero I/O)
│   ├── schemas/           # Shared Zod schemas, TypeScript types, validation contracts
│   ├── air-adapters/      # Multi-provider air adapters (OpenAQ, Open-Meteo, Google AQ, Replay)
│   ├── fix-library/       # Curated indoor mitigation database indexed by budget band
│   └── i18n/              # 12+ Indian regional languages dictionary & localization engine
├── evals/                 # End-to-end evaluation suite for numeric grounding & safety
├── fixtures/              # Nov 6–8, 2026 Delhi severe smog episode dataset (AQI 385, GRAP Stage III)
├── supabase/              # PostgreSQL schema, migrations, RLS policies, and seed data
├── .github/workflows/     # GitHub Actions CI (build, typecheck, and Vitest verification)
└── docs/                  # PRD, TRD, Impact-Methodology, Navigation-Plan
```

---

## 🌐 Application Pages (PWA)

| Page | Route | Description |
| :--- | :--- | :--- |
| **Today Dashboard** | `/` | Live GPS or city AQI, pollutant breakdown, OpenAQ/Open-Meteo adapter selector, cleanest window, CAQM GRAP stage, and direct WhatsApp share. |
| **Live AQI Map** | `/map` | Fullscreen-capable interactive Leaflet map (zero-key OpenStreetMap tiles), tap-anywhere inspection, browser geolocation, and per-location plan generation. |
| **Plan A vs Plan B** | `/plan` | Side-by-side comparison of normal vs optimized day: live-location support, inhaled dose reduction, transit carbon trade-offs, and assumptions audit. |
| **Indoor Photo Audit**| `/indoor` | Gemini Vision analysis of room photos (client-side EXIF stripping), detects unsealed cracks, exhaust fans, and calculates CADR targets. |
| **Community Advisories** | `/community` | One-tap WhatsApp share / Telegram notice generator in regional languages + $k \ge 5$ anonymous community impact ledger. |
| **Smog Replay Studio** | `/replay` | Interactive 24-hour timeline scrubber replaying the Nov 6–8, 2026 Delhi severe inversion episode with live dose accumulation dynamics. |
| **Methodology** | `/method` | Transparent exposure science page with interactive versioned Constants Registry `2026-11-a` and academic citations. |
| **Settings & Privacy**| `/settings` | Switch between 12 Indian regional languages + English, view provider attribution, zero-PII data export (JSON), and local storage purge. |

---

## 🤖 Telegram Bot Channel (`@airdeltabot`)

AirDelta provides a free, zero-cost conversational interface via `grammY` on the Telegram Bot API (ready for webhook deployment on Render via `render.yaml` / `Dockerfile`):
- `/start` — 60-second guided onboarding with one-tap **Share My Live Location** and quick city buttons.
- `/location` — One-tap GPS / **Telegram Live Location** streaming (`edited_message:location` auto-updates AQI when moving to a new grid cell).
- `/today` — Instant ambient AQI, dominant pollutant, and cleanest window.
- `/plan` — Generate personalized Plan A vs Plan B and dose savings.
- `/indoor` — Submit a photo of your living room or kitchen for an instant CADR audit.
- `/advisory` — Generate a copy-paste WhatsApp notice for your RWA or apartment society.
- `/lang` — Switch bot language to Indian regional languages (`en`, `hi`, `bn`, `te`, `ta`, `kn`, etc.).
- **07:00 IST Morning Brief** — Proactive push notification triggered daily via scheduler endpoint `POST /webhooks/telegram/jobs/morning-brief`.

---

## 🗄️ Supabase Postgres Schema & Security

The database schema (`supabase/migrations/20261123000000_init_airdelta.sql`) implements:
1. **Row-Level Security (RLS):** Strict tenant isolation (`auth.uid() = owner`) across `households`, `members`, `routine_segments`, `plans`, and `actions`.
2. **$k \ge 5$ Anonymity View:** The `community_group_impact` view returns aggregated community statistics (PM2.5 saved, total actions taken) **only if at least 5 distinct households** have joined the group, preventing micro-targeting or identification of individual neighbors.
3. **Automatic Retention Pruning:** The endpoint `POST /v1/jobs/retention-purge?days=30` purges plans older than 30 days to protect free-tier storage limits.
4. **Seed Data:** Pre-populated with Constants Registry `2026-11-a`, demo groups (`Sector 14 RWA - Gurugram`), and baseline smog snapshots.

---

## 🔌 REST API Endpoints

### 1. Air Quality
```bash
# Get current air quality for a spatial cell
curl "http://localhost:3000/v1/air?lat=28.61&lng=77.21"

# Get hourly forecast and cleanest window
curl "http://localhost:3000/v1/air/forecast?lat=28.61&lng=77.21"
```

### 2. Personalized Plan Generation
```bash
curl -X POST "http://localhost:3000/v1/plans" \
  -H "Content-Type: application/json" \
  -d '{
    "targetLang": "hi",
    "profile": {
      "cityCode": "DELHI",
      "gridCell": "28.61:77.21",
      "lang": "hi",
      "budgetBand": "low",
      "cooksIndoors": true,
      "hasExhaust": false,
      "hasPurifier": false,
      "members": [
        { "id": "m1", "ageBand": "adult", "cautionMode": false },
        { "id": "m2", "ageBand": "child", "cautionMode": true }
      ],
      "routines": [
        { "id": "r1", "memberId": "m1", "kind": "commute", "mode": "two_wheeler", "startHour": 8, "durationMinutes": 45, "isIndoor": false, "maskUsed": false }
      ]
    }
  }'
```

### 3. Indoor Photo Audit
```bash
curl -X POST "http://localhost:3000/v1/indoor-audits" \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "data:image/jpeg;base64,...",
    "roomType": "bedroom",
    "budgetBand": "low"
  }'
```

### 4. Community Advisories
```bash
curl -X POST "http://localhost:3000/v1/advisories" \
  -H "Content-Type: application/json" \
  -d '{
    "groupType": "rwa",
    "lang": "hi",
    "lat": 28.61,
    "lng": 77.21
  }'
```

### 5. Data Retention Cleaner Job
```bash
curl -X POST "http://localhost:3000/v1/jobs/retention-purge?days=30"
```

---

## 🧪 Testing, Security & Verification

AirDelta includes an exhaustive suite of unit, property, security, and end-to-end evaluation tests (automated via GitHub Actions in [.github/workflows/ci.yml](.github/workflows/ci.yml)):

```bash
# Run all 66 tests across 13 test suites
pnpm test

# Typecheck all workspace packages and Astro pages (0 errors, 0 warnings)
pnpm typecheck

# Full monorepo production build
pnpm -r run build
```

### Verification & Hardening Highlights
- **Engine Monotonicity:** Verified across 50 synthetic households and deterministic property invariants.
- **Numeric Grounding Validator:** Proves zero numerical hallucinations escape to user-facing text.
- **API Hardening & Bounds Validation:** Enforces HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), payload size limits (`bodyLimit`), WGS84 coordinate bounds (`lat`/`lng`), Zod request schemas, timing-safe secret comparison (`crypto.timingSafeEqual`) for Telegram webhooks and `CRON_SECRET` jobs, and sanitized error responses.
- **Bounded Resource Usage:** Caps spatial/forecast caches (`maxCacheEntries: 500` LRU eviction) and Telegram chat state maps (`2000` entries) for predictable low-memory execution on free-tier containers.
- **Adversarial & PII Scrubbing:** Verifies stripping of Indian phone numbers, Aadhaar numbers, emails, and prompt-injection jailbreaks.
- **Multilingual Fallback:** Verified non-empty, grammatically grounded fallback narratives across all 12 Indian regional languages + English.

---

## 🛠️ Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/AJAYMYTH/AirDelta.git
cd AirDelta

# 2. Install dependencies with pnpm
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your Google Gemini / Maps API key (optional, offline replay mock enabled by default)

# 4. Start backend API dev server
pnpm --filter @airdelta/api run dev

# 5. Start web PWA dev server
pnpm --filter @airdelta/web run dev
# Open http://localhost:4321
```

---

## 📜 Citations & Research References
- **US EPA Exposure Factors Handbook (Chapter 6):** Physiological breathing ventilation rates ($VE$) by age and activity level.
- **Nazaroff, W. W. (2004):** Indoor particle dynamics and single-compartment mass-balance equations.
- **EPIC India / University of Chicago (2025):** Indoor particulate penetration factors in Indian unsealed residential buildings.
- **CPCB / CAQM:** National Air Quality Index breakpoints and Graded Response Action Plan (GRAP) guidelines.
- **Delhi Metro Rail Corporation (DMRC):** Electrical grid carbon displacement factors for urban mass transit.

---

<p align="center">
  <b>AirDelta</b> · Built by <b>AJAYMYTH (Javali Ajayakumar)</b> for PromptWars Challenge 6 · Public Health &amp; Climate Resilience
</p>
