# MEMORY.md — AirDelta Project Memory & Context

## Project Overview
AirDelta is an AI-assisted and deterministically grounded decision engine designed for severe winter smog and urban air pollution in India (developed for the PromptWars hackathon). Instead of simply displaying raw AQI numbers, AirDelta translates pollution levels into actionable daily routines: comparing a household's **Plan A (normal day)** vs **Plan B (optimised day)** inhaled-PM2.5 exposure and emissions deltas using deterministic physical and biological exposure models (`@airdelta/engine`), with Gemini providing explanations, personalisation, and multilingual translation across **all Indian regional languages**.

The product targets dual delivery channels over a unified API:
1. **Option A:** Web PWA (Astro + Tailwind CSS v4, low JS, accessible, offline-cached).
2. **Option B:** Telegram Bot (zero-install, free proactive morning alerts).

## Technology Stack
- **Monorepo / Package Manager:** `pnpm` workspaces / Node.js LTS (v24.x)
- **Frontend:** Astro + Tailwind CSS v4 (`@tailwindcss/vite`) + TypeScript (Preact/React islands for interactive widgets)
- **Backend API:** Node.js + TypeScript + Hono + Zod (`zod-openapi`)
- **Database & Auth:** Supabase Postgres with Row Level Security (RLS) + Anonymous/Magic link Auth
- **AI / LLM:** Google Gemini API (`@google/genai`) with structured JSON schema outputs & numeric-grounding verification
- **Air Quality Providers:** Google Air Quality API (CPCB index primary) -> OpenAQ v3 (measured station readings) -> Open-Meteo (CAMS modelled fallback) -> Replay fixtures
- **Chat Bot:** Telegram Bot API (`grammY`)
- **Localization:** All major Indian regional languages (Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, Assamese) + English
- **Testing & Evals:** Vitest (unit/engine), fast-check (property tests), Playwright (E2E), Custom LLM grounding eval harness

## Project Architecture
Planned monorepo layout:
```
airdelta/
├── apps/
│   ├── web/            # Astro PWA
│   └── api/            # Hono API, webhooks, jobs
├── packages/
│   ├── engine/         # Pure TS dose & impact engine (zero network/IO)
│   ├── schemas/        # Shared Zod schemas (API, contracts, models)
│   ├── air-adapters/   # Unified air quality adapters (Google, OpenAQ, Open-Meteo, Replay)
│   ├── i18n/           # Regional languages dictionary & dynamic fallback
│   └── fix-library/    # Curated indoor mitigation actions with budget tiers
├── fixtures/           # Replay snapshots (e.g. Nov 2026 Delhi smog episode)
├── evals/              # Grounding & safety validation tests for Gemini outputs
├── supabase/           # Migrations, seed data, RLS security policies
└── docs/               # PRD, TRD, Navigation plan, Methodology, Architecture
```

## Implemented Features
- [x] Initial build specification and master plan compiled (`plan.md`).
- [x] Implementation plan updated with sequential phase gating, full Indian regional languages support, Supabase Postgres, and pnpm monorepo.
- [x] `MEMORY.md` initialized and updated.
- [x] **Phase 0 Completed & Verified:**
  - `pnpm-workspace.yaml`, root `package.json`, `tsconfig.json`, `.gitignore`, `.env.example` created.
  - Complete documentation set created: `docs/PRD.md`, `docs/TRD.md`, `docs/Impact-Methodology.md`, `docs/Navigation-plan.md`.
  - `@airdelta/schemas` package implemented with Zod schemas for `AirSnapshot`, `Badge`, `HouseholdProfile`, `RoutineSegment`, `Plan`, `IndoorAudit`, `Advisory`, and $k \ge 5$ community privacy.
  - `@airdelta/i18n` package implemented with support for all 12 major Indian regional languages + English, terminology glossaries, and UI dictionaries.
  - Test suite passes 100% (7/7 tests passing in `vitest`).
  - Monorepo builds and typechecks cleanly with `tsc`.
- [x] **Phase 1 Completed & Verified:**
  - `fixtures/delhi-smog-nov2026.json` created capturing the Nov 6–8, 2026 Delhi smog episode (AQI 385, CPCB index, GRAP Stage III).
  - `@airdelta/air-adapters` implemented:
    - `GoogleAirQualityAdapter` (CPCB `ind_cpcb` index + 96h forecast).
    - `OpenAQAdapter` (Physical monitor readings within 25 km, freshness < 3h for `measured` badge).
    - `OpenMeteoAdapter` (European CAMS model fallback, `modelled` badge).
    - `ReplayAdapter` (Deterministic fixture playback for reliable demos and offline tests).
    - `AirDataService` (Spatial grid caching at 0.01° ~ 1.1 km, request coalescing, circuit breaker).
  - `apps/api` implemented on Hono with `/healthz` and `/v1/air` endpoints.
  - `apps/web` implemented on Astro + Tailwind CSS v4 with Today Dashboard, Evidence Badges, pollutant metrics, and 96-hour forecast strip.
  - Full test suite passes 100% (15/15 tests passing across 4 suites in `vitest`).
  - Monorepo typechecks with 0 errors (`pnpm typecheck`).
- [x] **Phase 2 Completed & Verified:**
  - `@airdelta/engine` implemented (pure TypeScript, zero network or DB I/O):
    - `constants.ts` (Constants Registry `2026-11-a` with exact EPA, CPCB, and DMRC citations).
    - `dose.ts` (Inhaled PM2.5 dose $D = \sum C_{seg} \times VE_{seg} \times \Delta t_{seg}$ with uncertainty bounds $D_{low}, D_{mid}, D_{high}$).
    - `mass-balance.ts` (Single-compartment indoor concentration solver with penetration, air exchange, exhaust, and CADR).
    - `emissions.ts` (Transport emissions ledger $gCO_2e/km$).
    - `optimizer.ts` (Deterministic search for top-N Plan B interventions: shift walk, transit shift to Metro, kitchen exhaust, N95 masking).
    - Mathematical property tests using `fast-check` verifying monotonicity and non-negativity over 100 iterations.
  - Planner Orchestration in `apps/api`:
    - `gemini.service.ts` (`@google/genai` structured narration in user-selected Indian language with zero PII).
    - `grounding-validator.service.ts` (Strict numeric-grounding validator rejecting hallucinated numbers).
    - `template-fallback.service.ts` (Pre-rendered multilingual deterministic templates for EN, HI, BN, TE, TA, KN).
    - `POST /v1/plans` endpoint validated and operational.
  - Interactive `/plan` page in `apps/web`:
    - Plan A vs Plan B comparison card with dose savings in $\mu g$ and percentage reduction.
    - Avoided emissions ledger and transit trade-off card (Metro vs Cycling).
    - Assumptions used inspection accordion.
  - All 24 tests passing green across 6 test suites (`vitest`).
  - Monorepo typechecks with 0 errors, 0 warnings, 0 hints (`pnpm typecheck`).
- [x] **Phase 3 Completed & Verified:**
  - `@airdelta/fix-library` implemented:
    - Curated database of indoor mitigation interventions categorized by budget (`none`, `low`, `medium`, `high`) with CADR metrics and literature citations (US EPA / EPIC India).
    - Helper queries for budget filtering and source-matched interventions.
  - Indoor Photo Audit in `apps/api`:
    - `vision.service.ts` (Gemini Multimodal Vision prompt with prompt-injection defense + heuristic rule-based fallback).
    - `POST /v1/indoor-audits` (photo analysis returning detected sources and budget-tiered fixes).
    - `POST /v1/indoor-audits/confirm` (human-in-the-loop confirmation recalculating single-compartment indoor mass balance).
  - Interactive `/indoor` audit page in `apps/web`:
    - Client EXIF metadata stripping dropzone.
    - Step 1: Human-in-the-loop candidate confirmation checkboxes.
    - Step 2: Modelled mass balance physics forecast (e.g. -79% indoor PM2.5 reduction).
    - Step 3: Ranked mitigation library cards with action steps and budget badges.
  - All 30 tests passing green across 8 test suites (`vitest`).
  - Monorepo typechecks with 0 errors, 0 warnings, 0 hints (`pnpm typecheck`).
  - Static site generates `/index.html`, `/plan/index.html`, and `/indoor/index.html`.
- [x] **Phase 4 Completed & Verified:**
  - CAQM GRAP Stage Policy Rules database implemented in `@airdelta/schemas`:
    - Official mandates for Stages I, II, III, and IV categorized by audience (RWAs, Schools, Workplaces, Citizens).
  - `AdvisoryService` implemented supporting all 12 major Indian regional languages with WhatsApp and Telegram copy-paste cards.
  - API endpoints verified:
    - `POST /v1/advisories` (generates tailored notices with formatted shareable text cards).
    - `GET /v1/advisories/groups/:id/impact` (enforces $k \ge 5$ community anonymity threshold).
  - Interactive `/community` page in `apps/web`:
    - Audience selector & language switcher.
    - Active GRAP Stage alert card with One-Tap "Copy WhatsApp Notice" button.
    - CAQM GRAP Stages Policy Matrix.
    - $k$-anonymous Community Impact Tally ($k \ge 5$).
  - All 33 tests passing green across 9 test suites (`vitest`).
  - Monorepo typechecks with 0 errors (`pnpm typecheck`).
  - Static site builds `/index.html`, `/plan/index.html`, `/indoor/index.html`, and `/community/index.html`.
- [x] **Phase 5 Completed & Verified:**
  - Telegram Bot Channel (Option B) implemented via `grammY` in `apps/api/src/bot/telegram.ts`:
    - Button-driven 60-second onboarding (`/start` with city & language selectors).
    - `/today` (CPCB AQI, cleanest window, and `[MEASURED]`, `[FORECAST]` provenance tags).
    - `/plan` (Plan A vs Plan B dose comparison with $-39.5\%$ reduction and avoided transport carbon emissions).
    - `/indoor` (Photo upload message handler triggering visual audit).
    - `/advisory` (Society alert text ready to forward).
    - `/lang` (Inline language selector for Indian regional languages).
    - Automated 07:00 morning briefing notification builder (`buildMorningBrief`).
  - Webhook & Scheduler in `apps/api/src/routes/telegram.route.ts`:
    - `POST /webhooks/telegram` with `X-Telegram-Bot-Api-Secret-Token` header validation.
    - `POST /webhooks/telegram/jobs/morning-brief` for scheduled Cloud Scheduler / Cron execution.
    - `GET /webhooks/telegram/status` reporting bot configuration state.
  - All 38 tests passing green across 10 test suites (`vitest`).
  - Monorepo typechecks with 0 errors (`pnpm typecheck`).

## Development Progress
- **Current Status:** Remote GitHub repo connected & synchronized. Phase 0, Phase 1, Phase 2, Phase 3, Phase 4 & Phase 5 Complete. Ready for Phase 6.
- **Remote Origin:** `https://github.com/AJAYMYTH/AirDelta.git` (`main` branch synchronized).
- Sequential phase execution model established:
  - **[DONE] Phase 0:** Monorepo setup, foundational docs, shared Zod schemas.
  - **[DONE] Phase 1:** Air Data Service, adapters (Google AQ, OpenAQ v3, Open-Meteo, Replay), spatial cache, Today air view.
  - **[DONE] Phase 2:** Pure TS engine, planner orchestrator, Gemini narration + validator, Plan A vs B view.
  - **[DONE] Phase 3:** Indoor photo audit engine.
  - **[DONE] Phase 4:** Multilingual community advisories & policy table.
  - **[DONE] Phase 5:** Telegram bot channel & morning brief.
  - **[IN PROGRESS] Phase 6:** Supabase Postgres production migration, RLS & hardening.
  - **Phase 7:** Replay demonstration room, Playwright E2E tests, submission kit.

## Technical Decisions
- **Strict Phase Gate Execution:** No phase will be skipped or partially done; every phase will build its designated components and run verification tests to exit before starting the next phase.
- **LLM Explains, Code Computes:** All inhaled PM2.5 doses, emission counts, and savings are computed strictly in deterministic TypeScript (`@airdelta/engine`). Gemini is never asked to calculate or invent numbers.
- **Strict Numeric-Grounding Verification:** Every text or JSON response returned by Gemini is passed through a deterministic post-validator checking that every number in the text exists in the engine output or registered assumptions. If validation fails or model errors occur, fall back immediately to deterministic pre-rendered templates.
- **Evidence Badges on Every Value:** Every figure displayed in the UI carries one of four provenance badges: `Measured`, `Forecast`, `Modelled`, or `Assumed`.
- **Full Indian Regional Language Localization:** Support all Indian regional languages using canonical English schemas, localized glossaries, and Gemini dynamic multilingual translation with caching.
- **Supabase Postgres with RLS:** Production database using Supabase Postgres with strict RLS policies and $k \ge 5$ community aggregation privacy.
- **Package Manager:** `pnpm` workspaces for strict package isolation and reproducible builds.

## Dependencies & Configuration
- Configuration managed in `.env` (template in `.env.example`):
  - `GEMINI_API_KEY`: API key for Gemini SDK
  - `GOOGLE_MAPS_API_KEY`: Google Air Quality API
  - `OPENAQ_API_KEY`: OpenAQ v3 API key
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
  - `GEMINI_MODEL_NARRATE`, `GEMINI_MODEL_VISION`
  - Feature flags: `GOOGLE_AQ_ENABLED`, `LLM_ENABLED`, `REPLAY_MODE`

## Known Issues & Limitations
- Historical smog fixtures from early November 2026 need to be preserved in `fixtures/` for reliable demonstrations.
- Supabase free tier databases pause after 1 week of inactivity (handled via keep-alive scheduled worker).
- Supabase free tier storage limit of 500 MB requires plan retention pruning (30-day window).

## Pending Tasks
- [x] Phase 0: Scaffolding, Documentation & Core Schemas (Verified green).
- [x] Phase 1: Air Data Service & Multi-Provider Adapters (Verified green).
- [x] Phase 2: Exposure & Impact Engine & Planner Orchestrator (Verified green).
- [x] Phase 3: Indoor Photo Audit Engine (Verified green).
- [x] Phase 4: Multilingual Community Advisories & Policy Integration (Verified green).
- [x] Phase 5: Telegram Bot Channel & Morning Brief (Verified green).
- [ ] Phase 6: Supabase Postgres Integration, RLS & Production Hardening:
  - [ ] Implement `supabase/migrations/20261123000000_init_airdelta.sql`:
    - [ ] Tables: `households`, `members`, `routine_segments`, `air_snapshots`, `plans`, `actions`, `groups`, `group_members`, `advisories`, `constants_registry`
    - [ ] Row-Level Security (RLS) policies for tenant isolation
    - [ ] `SECURITY DEFINER` view for $k \ge 5$ community privacy
  - [ ] Implement Supabase client adapter in `apps/api/src/services/supabase.service.ts`
  - [ ] Implement PII Scrubber & Rate Limiter in `apps/api`
  - [ ] Implement 30-day plan retention cleaner to defend 500 MB free-tier storage limit
  - [ ] Verify Phase 6: Supabase migration syntax, RLS security policies, and build check.

## Next Steps
Begin Phase 6 implementation.
