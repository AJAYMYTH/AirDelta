# MEMORY.md — AirDelta Project Memory & Context

## Project Overview
AirDelta is an AI-assisted and deterministically grounded decision engine designed for severe winter smog and urban air pollution in India (developed for the PromptWars hackathon). Instead of simply displaying raw AQI numbers, AirDelta translates pollution levels into actionable daily routines: comparing a household's **Plan A (normal day)** vs **Plan B (optimised day)** inhaled-PM2.5 exposure and emissions deltas using deterministic physical and biological exposure models (`@airdelta/engine`), with Gemini providing explanations, personalisation, and multilingual translation across **all 12 major Indian regional languages**.

The product targets dual delivery channels over a unified API:
1. **Option A:** Web PWA (Astro + Tailwind CSS v4, low JS, accessible, offline-cached, 7 static pages).
2. **Option B:** Telegram Bot (zero-install, free proactive 07:00 IST morning alerts via `grammY`).

## Technology Stack
- **Monorepo / Package Manager:** `pnpm` workspaces / Node.js LTS (v24.x)
- **Frontend:** Astro 5 + Tailwind CSS v4 (`@tailwindcss/vite`) + TypeScript
- **Backend API:** Node.js + TypeScript + Hono + Zod (`@hono/node-server`)
- **Database & Auth:** Supabase Postgres (`@supabase/supabase-js`) with Row Level Security (RLS) + $k \ge 5$ Anonymity View
- **AI / LLM:** Google Gemini API (`@google/genai`) with structured JSON outputs & numeric-grounding verification
- **Air Quality Providers:** Google Air Quality API (CPCB index primary) -> OpenAQ v3 (measured station readings) -> Open-Meteo (CAMS modelled fallback) -> Replay fixtures
- **Chat Bot:** Telegram Bot API (`grammY`) with 07:00 IST morning brief webhook
- **Design System & Styling:** Astryx Design System (`@astryxdesign/core`, `@stylexjs/stylex`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli`) + Astryx Tailwind CSS v4 Bridge
- **Localization:** All 12 major Indian regional languages (Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, Assamese) + English
- **Testing & Evals:** Vitest (unit/engine/property/security), E2E evaluation suite (`evals/grounding.eval.test.ts`)

## Project Architecture
```
airdelta/
├── apps/
│   ├── web/               # Astro PWA (7 pages: Today, Plan, Indoor, Community, Replay, Method, Settings)
│   └── api/               # Hono API, Telegram webhook, and retention purge jobs
├── packages/
│   ├── engine/            # Pure TS dose, mass-balance, emissions & optimizer engine (Zero I/O)
│   ├── schemas/           # Shared Zod schemas (API, contracts, models, GRAP policy)
│   ├── air-adapters/      # Unified air quality adapters (Google, OpenAQ, Open-Meteo, Replay)
│   ├── i18n/              # 12+ Indian regional languages dictionary & fallback templates
│   └── fix-library/       # Curated indoor mitigation actions with budget tiers
├── fixtures/              # Replay snapshots (Nov 6–8, 2026 Delhi smog episode, AQI 385, GRAP III)
├── evals/                 # End-to-end grounding, safety & monotonicity test suite
├── supabase/              # PostgreSQL schema, migrations, RLS policies, seed data
└── docs/                  # PRD, TRD, Navigation plan, Methodology, Master Plan
```

## Implemented Features (All Phases 0 Through 7 Complete)
- [x] Initial build specification and master plan compiled (`plan.md`).
- [x] Implementation plan updated with sequential phase gating, full Indian regional languages support, Supabase Postgres, and pnpm monorepo.
- [x] **Phase 0 Completed & Verified:**
  - `pnpm-workspace.yaml`, root `package.json`, `tsconfig.json`, `.gitignore`, `.env.example` created.
  - Comprehensive documentation set created: `docs/PRD.md`, `docs/TRD.md`, `docs/Impact-Methodology.md`, `docs/Navigation-plan.md`.
  - `@airdelta/schemas` package implemented with Zod schemas for `AirSnapshot`, `Badge`, `HouseholdProfile`, `RoutineSegment`, `Plan`, `IndoorAudit`, `Advisory`, and $k \ge 5$ community privacy.
  - `@airdelta/i18n` package implemented with support for all 12 major Indian regional languages + English, terminology glossaries, and UI dictionaries.
- [x] **Phase 1 Completed & Verified:**
  - `fixtures/delhi-smog-nov2026.json` created capturing the Nov 6–8, 2026 Delhi smog episode (AQI 385, CPCB index, GRAP Stage III).
  - `@airdelta/air-adapters` implemented: `GoogleAirQualityAdapter`, `OpenAQAdapter`, `OpenMeteoAdapter`, `ReplayAdapter`, `AirDataService` (spatial grid caching at 0.01° ~ 1.1 km, request coalescing, circuit breaker).
  - `apps/api` implemented on Hono with `/healthz` and `/v1/air` endpoints.
  - `apps/web` implemented on Astro + Tailwind CSS v4 with Today Dashboard, Evidence Badges, pollutant metrics, and 96-hour forecast strip.
- [x] **Phase 2 Completed & Verified:**
  - `@airdelta/engine` implemented: `constants.ts` (Registry `2026-11-a`), `dose.ts` ($D = \sum C_{seg} \times VE_{seg} \times \Delta t_{seg}$ with uncertainty bounds), `mass-balance.ts` (indoor concentration equilibrium), `emissions.ts` ($gCO_2e/km$), and `optimizer.ts` (Plan B optimization).
  - Fast-check property tests for monotonicity and non-negativity.
  - `apps/api` Planner Orchestrator with Gemini narration, `GroundingValidatorService`, and pre-rendered multilingual fallback.
  - `apps/web` Plan A vs Plan B comparison page (`/plan`) with $-39.5\%$ dose reduction, emissions ledger, transit trade-off card, and assumptions accordion.
- [x] **Phase 3 Completed & Verified:**
  - `@airdelta/fix-library` implemented with solutions categorized by budget (`none`, `low`, `medium`, `high`) and CADR metrics.
  - `apps/api` Vision Service with Gemini Vision prompt, prompt-injection defense, heuristic fallback, and endpoints `POST /v1/indoor-audits` & `POST /v1/indoor-audits/confirm`.
  - `apps/web` Indoor Audit page (`/indoor`) with client-side EXIF stripping dropzone, confirmation checklist, mass-balance forecast (-79% PM2.5 reduction), and ranked fixes.
- [x] **Phase 4 Completed & Verified:**
  - CAQM GRAP Stage Policy database in `@airdelta/schemas/src/grap.ts`.
  - `AdvisoryService` supporting all 12 Indian regional languages with WhatsApp/Telegram copy-paste cards.
  - API routes: `POST /v1/advisories` and `GET /v1/advisories/groups/:id/impact` (enforcing $k \ge 5$ anonymity).
  - `apps/web` Community page (`/community`) with One-Tap "Copy WhatsApp Notice" button, GRAP matrix, and $k$-anonymous impact ledger.
- [x] **Phase 5 Completed & Verified:**
  - Telegram Bot implementation via `grammY` in `apps/api/src/bot/telegram.ts`: `/start` 60s onboarding, `/today`, `/plan`, `/indoor`, `/advisory`, `/lang`, and 07:00 morning brief builder.
  - Webhook & scheduler routes: `POST /webhooks/telegram`, `POST /webhooks/telegram/jobs/morning-brief`, `GET /webhooks/telegram/status`.
- [x] **Phase 6 Completed & Verified:**
  - Supabase PostgreSQL schema with 10 tables and Row-Level Security (RLS) in `supabase/migrations/20261123000000_init_airdelta.sql`.
  - $k \ge 5$ Community Privacy View (`community_group_impact`).
  - Seed file `supabase/seed.sql` populating Constants Registry `2026-11-a`, demo groups (`Sector 14 RWA`), and baseline air snapshots.
  - `@supabase/supabase-js` integrated into `apps/api/src/services/supabase.service.ts` with transparent in-memory fallback.
  - `PiiSanitizerService` scrubbing Indian mobile phone numbers, Aadhaar numbers, emails, addresses, and prompt injection attacks.
  - 30-day retention pruning job endpoint: `POST /v1/jobs/retention-purge?days=30`.
- [x] **Phase 7 Completed & Verified:**
  - Smog Replay Studio page (`/replay`) with interactive 24-hour timeline scrubber, play/pause controls, and live dose accumulation dynamics.
  - Transparent Methodology page (`/method`) rendering the 3 core physics equations and the complete searchable versioned Constants Registry `2026-11-a`.
  - Settings & Privacy page (`/settings`) with instant 12-language switcher, zero-PII data export (JSON), and local storage purge.
  - E2E evaluation suite (`evals/grounding.eval.test.ts`) testing 50 synthetic households for monotonicity, numeric grounding validation, prompt injection defense, and multilingual fallback completeness.
  - 50/50 tests passing across 12 test suites.
  - 0 errors, 0 warnings across monorepo typecheck and Astro static build (7 pages).
  - `README.md` completely updated with architecture diagrams, REST API reference, and setup guide.
- [x] **Astryx Design System & Simplified UX Transformation:**
  - Installed `@astryxdesign/core`, `@stylexjs/stylex`, `@astryxdesign/theme-neutral`, and `@astryxdesign/cli`.
  - Initialized Astryx agent documentation conventions in `AGENTS.md` and `GEMINI.md`.
  - Added neutral theme (`astryx-themes.ts`) and configured the Astryx Tailwind CSS v4 bridge in `apps/web/src/styles/global.css`.
  - Re-architected user-facing UX across Today Dashboard, Community Advisories, and Layout to make smog actions immediately glanceable and simple to understand for non-technical Indian families.
  - Added "3 Simple Actions for Today" directive banner (Outdoor Activity, Airing Window, Commute Protection).
  - Implemented mobile bottom navigation bar for quick one-thumb accessibility.

- [x] **DESIGN.md Showroom UI Redesign & Brand Theme Integration:**
  - Fully adopted the DJI-inspired engineering showroom design philosophy from `DESIGN.md`: pure white canvas (`#ffffff`), soft panel fills (`#f7f9fa`), near-black ink text (`#262626`, stepped to `#595959` and `#8c8c8c`), subtle dividers (`#e8e8e8`), and rounded pill buttons (`rounded-full`).
  - Integrated the official brand colors across the entire web application: **Primary: White (`#ffffff`)** and **Secondary: Orange (`#ea580c` / `#f97316` / `#fff7ed` / `#fed7aa`)**.
  - Redesigned `apps/web/src/styles/global.css` with tokens for `--color-canvas`, `--color-canvas-soft`, `--color-orange-primary`, `--color-orange-secondary`, and Astryx layered bridge.
  - Redesigned `apps/web/src/components/BadgePill.astro` (crisp white/tinted pills with distinct colored status dots) and `apps/web/src/components/ForecastStrip.astro` (white card, orange peak highlight, soft gray bars).
  - Redesigned `apps/web/src/layouts/Layout.astro` with a 64px white navbar, orange active indicator dot and pill, orange emergency alert bar, charcoal `#272727` footer, and showroom mobile bottom navigation.
  - Fully transformed all 7 web pages:
    - `index.astro` (Today Dashboard): 3 Action Option Cards, 64px hero spec card for AQI 385, dense pollutant rows, and prominent orange pill CTA.
    - `plan.astro` (Exposure Optimizer): Plan A neutral showroom card vs Plan B flagship card with 2px orange border ring, orange percentage badge, emissions ledger, and trade-off card.
    - `indoor.astro` (Photo Audit): Soft gray dashed dropzone, candidate detection cards with orange confidence badges, single-compartment mass balance forecast in orange tint card, and budget-ranked mitigation library.
    - `community.astro` (Advisories): White advisory preview card, orange WhatsApp copy button, interactive Hindi/English pill toggles, $k \ge 5$ collective action ledger, and CAQM GRAP matrix.
    - `replay.astro` (Smog Replay Studio): White timeline scrubber frame, orange slider accent, live telemetry grid with Plan B orange highlight card, and active orange bar animation.
    - `method.astro` (Methodology): White physics formulation cards with orange equation syntax boxes, versioned Constants Registry `2026-11-a` showroom table, and data provenance cards.
    - `settings.astro` (Settings & Privacy): Regional language selection grid with active orange border ring, Telegram bot card, and rounded data export/purge action buttons.
  - Verified 100% clean builds across monorepo: `pnpm test` (50/50 passing), `pnpm typecheck` (0 errors, 0 warnings), `pnpm -r run build` (all 7 static pages built in 2.27s).

## Development Progress
- **Current Status:** 100% Complete & Verified across all 8 phases + Astryx & DESIGN.md Showroom UI Redesign.
- **Git Remote:** Linked to `origin https://github.com/AJAYMYTH/AirDelta.git` (`main` branch).
- **Test Suite Status:** 50/50 tests passing across 12 test suites (`pnpm test`).
- **Compilation Status:** 0 errors, 0 warnings (`pnpm typecheck` & `pnpm -r run build`).

## Technical Decisions
1. **Strict Math Boundary:** LLM is strictly forbidden from performing mathematical calculations. `@airdelta/engine` computes all doses and percentages; Gemini only narrates and translates.
2. **Numeric Grounding Validator:** Any generated sentence containing a numerical token not present in the engine-grounded whitelist triggers immediate replacement with deterministic regional fallback templates.
3. **Spatial Grid Caching:** Air requests are coalesced and cached at `0.01°` lat/lng (~1.1 km cells), protecting free-tier rate limits and avoiding storage of exact street addresses.
4. **$k \ge 5$ Anonymity Standard:** Community impact views only aggregate and display data when $\ge 5$ households have joined the group, preventing identification of individual households.
5. **30-Day Storage Pruning:** Household plan histories older than 30 days are pruned by retention jobs to ensure compliance with free-tier Postgres storage limits (500 MB).

## Next Steps
- Deliver final hackathon presentation walkthrough and repository summary to user.
