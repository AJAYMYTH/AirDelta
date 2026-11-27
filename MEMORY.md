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
- **AI / LLM:** Google Gemini API (`@google/genai`, `gemini-3.1-flash-lite` fast narration + `gemini-3.6-flash` vision, with `gemini-3.6-flash` / `gemini-3.8-flash` fallback chain) with structured JSON outputs & numeric-grounding verification
- **Air Quality Providers:** OpenAQ v3 (default primary, measured ground station readings) -> Open-Meteo (ECMWF CAMS modelled & forecast fallback) -> Replay fixtures (`GOOGLE_AQ_ENABLED=false` by default)
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
- [x] **Client Interactivity, Lucide Icons, anime.js & Dynamic i18n:**
  - Resolved non-working language switcher and button clicks by introducing a dedicated client runtime in `apps/web/src/scripts/client-runtime.ts`.
  - Installed `lucide-astro` and replaced emoji placeholders with modern Lucide icons (`Sun`, `Scale`, `Home`, `Users`, `History`, `BookOpen`, `Settings`, `Globe`, `ChevronDown`, `Check`, `ExternalLink`, `Wind`, `Play`, `Pause`, `RotateCcw`, `Camera`, `Upload`, `ShieldCheck`, `Copy`, `Download`, `Trash2`, `Send`, `Lock`).
  - Added `animejs` for tactile button click springs (`press-scale`), staggered page card entrances (`stagger-card`), and fluid dropdown menu transitions.
  - Implemented `transitions.dev` inspired floating glass dropdown (`.dropdown-surface`) in the navbar with active checkmark indicators and smooth opening/closing animations.
  - Added `loading.dev` inspired micro-loaders (`.loader-spin`, `.radar-pulse-ring`) for photo scan audits and async clipboard actions.
  - Expanded `@airdelta/i18n` with full UI string keys across all 13 supported languages (12 Indian regional languages + English) and enabled instant dynamic DOM text swapping via `[data-i18n]`.
  - Added interactive features across all pages:
    - Today: interactive action card completion toggles & quick WhatsApp brief copy.
    - Plan: interactive Plan B intervention toggles with dynamic recalculation of net saved dose in real time.
    - Indoor: photo upload simulation with radar pulse and dynamic mass balance calculation on checkbox toggle.
    - Community: instant Hindi/English language toggle & WhatsApp copy feedback.
    - Replay: clickable timeline bars, animated play/pause states, and live telemetry updates.
    - Settings: regional language grid with instant dynamic translation and JSON data export.
  - Verified 0 errors, 0 warnings, 0 hints across monorepo typecheck and Astro static build.
- [x] **Supabase MCP Server & Agent Skills Integration:**
  - Configured Supabase MCP server in `~/.gemini/antigravity/mcp_config.json` and `~/.gemini/antigravity-cli/mcp_config.json` with project reference `cwvsngmwzhytrjzdqvpn` and full management features (`docs, account, database, debugging, development, functions, branching, feedback, notebooks`).
  - Preserved existing local MCP servers (`codebase-memory-mcp` and `devfolio`).
  - Installed official project-level Supabase Agent Skills (`.agents/skills/supabase` and `.agents/skills/supabase-postgres-best-practices`) for schema operations, migration auditing, and RLS optimization.

- [x] **OpenAQ Default Primary, Live Web-to-API Integration & Hardening (Nov 26, 2026):**
  - Switched `AirDataService`, `apps/api`, `polling-runner.ts`, `.env`, `.env.example`, and `verify-env.mjs` so **OpenAQ v3 is the default primary provider** (`GOOGLE_AQ_ENABLED=false` by default; Google Air Quality API is never called unless explicitly opted in).
  - Fixed OpenAQ v3 adapter bugs in `packages/air-adapters/src/adapters/openaq.adapter.ts`: ranked stations within 25 km by freshness & dual-particulate coverage instead of `limit=1` (avoiding retired 2018 stations), handled `{ utc, local }` timestamp objects, deduplicated legacy sensors on the same station by newest reading, normalized `ppb`/`ppm` gas units to `µg/m³` and CO to `mg/m³`, fixed `0` value handling (`!== null`), and computed official CPCB NAQI max sub-index across PM2.5 + PM10.
  - Updated `OpenMeteoAdapter.fetchForecast` to pick the cleanest upcoming 3-hour window rather than past hours.
  - Wired all interactive web pages (`/`, `/plan`, `/indoor`, `/community`) via `apps/web/src/scripts/api-client.ts` to live API endpoints (`/v1/air`, `/v1/air/forecast`, `/v1/plans`, `/v1/indoor-audits`, `/v1/indoor-audits/confirm`, `/v1/advisories`, `/v1/advisories/groups/:id/impact`) with city selector (6 Indian cities), EXIF-stripping `<canvas>` photo upload, 13-language advisory generator, $k \ge 5$ simulator, accessibility landmarks (`skip link`, nav `aria-label`s, RTL `dir` for Urdu), and `public/favicon.svg`.
  - Updated `GeminiService` & `VisionService` fallback chains and timeouts.
  - Added resilient in-memory degradation in `SupabaseService` for non-UUID demo payloads / ungranted DB permissions, fixed `supabase-and-security.test.ts` schema mismatches, and added `supabase/migrations/20261126000000_grant_permissions.sql` (pending remote apply).
  - Updated `README.md` with explicit hackathon sections (Chosen Vertical, Approach & Logic, How It Works, Assumptions Made).
- [x] **Speed Optimization, Plain-Language UX & Typography Polish (Nov 27, 2026):**
  - Replaced `lucide-astro` barrel imports across all 7 Astro pages, `Layout.astro`, and `ForecastStrip.astro` with direct subpath imports (`lucide-astro/<Icon>`), and replaced SSR `AirDataService` disk/Zod loading in `index.astro`, `plan.astro`, and `community.astro` with static fixture imports (`astro dev` cold route compilation dropped from `7,146ms–11,044ms` to `5ms–236ms`, warm routes `3ms–10ms`; full static build compiles 7 pages in `3.49s`).
  - Added two-phase progressive plan loading on `/plan` (`includeLlm: false` deterministic render in `772ms` live, upgrading via Gemini `gemini-3.1-flash-lite` in `1,625ms` cold / `15ms` cached), parallelized `getAirSnapshot` + `getAirForecast` with `Promise.all` in `PlannerService`, added 15-min LLM + 60s fallback caching, and added a 2-minute `sessionStorage` cache in `apps/web/src/scripts/api-client.ts`.
  - Switched UI typography to **Plus Jakarta Sans** (bold `800` headings in `#171717`, `text-wrap: balance/pretty`, unitless `1.5` line-height) + **JetBrains Mono** (`tabular-nums`) in `apps/web/src/styles/global.css`, added a 0–500 AQI visual range indicator (`index.astro`), fixed `@airdeltabot` link (`settings.astro`), removed emoji bullets (`community.astro`), and simplified copy across all pages and English `packages/i18n` labels.
- [x] **Interactive Air Visualizer, `transitions.dev` Dropdown UI & `loading-dev` Wave Loaders (Nov 27, 2026):**
  - Added `@astrojs/react@^4.4.2` and `loading-dev@0.3.8` (`apps/web/astro.config.mjs`, `apps/web/tsconfig.json`, `apps/web/package.json`) and created `apps/web/src/components/AirWaveLoader.tsx` wrapping `Wave` (`size`, `color`, `duration`, `playState`, `origin`) synced with `dispatchWaveUpdate` across `/`, `/plan`, and `/indoor`.
  - Built reusable top-layer `transitions.dev` dropdown component ([TransitionDropdown.astro](file:///c:/Users/javal/Music/promptWars/apps/web/src/components/TransitionDropdown.astro)) backed by native `popover="manual"` top-layer promotion, dynamic viewport collision flipping, and keyboard navigation (`dropdown.ts`), replacing all 7 remaining `<select>` boxes across `/`, `/plan`, `/indoor`, and `/community` and eliminating parent stacking-context clipping (`stagger-card` transform clear + top-layer positioning).
  - Expanded `@airdelta/i18n` (`packages/i18n/src/page-translations.ts`) with full `206/206` key parity across all 13 languages (`en`, `hi`, `bn`, `te`, `mr`, `ta`, `ur`, `gu`, `kn`, `or`, `ml`, `pa`, `as`) and wired `data-i18n` + live `airdelta:langchange` handlers across all 7 pages, `BadgePill.astro`, `ForecastStrip.astro`, and dynamic client scripts (`219` DOM `data-i18n` attributes, `0` unmapped keys in any of the 13 languages, `0` native `<select>` elements, `15` Top-Layer `.t-dropdown` popovers across the 7 static HTML builds).
  - Built an interactive canvas particle airflow & purifier-ripple visualizer (`#air-particle-canvas`) inside the Hero Air Quality card on `apps/web/src/pages/index.astro`, paired with interactive breathing preview filters (`Outdoor Raw`, `N95 Mask`, `HEPA Room`), pointer vortex/tap ripples, and WCAG 2.2.2 Pause/Play airflow toggle (`#btn-toggle-air-flow`) + `prefers-reduced-motion` support.

- [x] **Responsive Multi-Device Layout & Direct WhatsApp Redirect (Nov 27, 2026):**
  - Updated `apps/web/src/layouts/Layout.astro` and `apps/web/src/styles/global.css` for full responsiveness across phones (`320px+`), foldables, tablets, and desktops: added `viewport-fit=cover`, safe-area padding (`env(safe-area-inset-bottom/left/right)`), `dvh`/`dvw` limits, `scroll-padding-*` for sticky bars, coarse-pointer 44px touch targets, `aria-current="page"`, and a native `popover="auto"` `< lg` header Menu (`#btn-mobile-menu` / `#mobile-nav-menu`) so all 7 pages are reachable on phones and tablets without header overflow.
  - Made all 7 Astro pages and `ForecastStrip.astro` responsive down to 320px: removed `min-w-[265px]` AQI card overflow on `index.astro`, converted `method.astro` Constants Registry table into container-query (`@container (inline-size < 640px)`) stacked cards, placed `replay.astro` 24-hour bars in a keyboard-scrollable region (`tabindex="0"`), and refined padding, grids, and toast clearances above mobile bottom nav.
  - Replaced copy-only share actions with direct WhatsApp redirects (`buildWhatsAppShareUrl` -> `https://wa.me/?text=...`) across Today (`index.astro` AQI report + 3 steps), Daily Plan (`plan.astro` Plan A vs Plan B + live AQI + selected swaps), Room Check (`indoor.astro` indoor PM2.5 report), and Share Alert (`community.astro` multilingual GRAP advisory), while keeping secondary Copy buttons.
  - Added 7 new UI translation keys (`navMenuBtn`, `sendWhatsApp`, `copyTextBtn`, `sharePlanHint`, `sendPlanWhatsApp`, `planCopiedToast`, `sendRoomWhatsApp`) with full 13-language parity in `packages/i18n/src/page-translations.ts`.

- [x] **Full-Size Open-Meteo AQI Map & Live Location Plan Generation (Nov 27, 2026):**
  - Removed redundant hero sensor/source pills (`• Live Sensor`, `OPENAQ`) and wave loaders from `index.astro`; moved data-source attribution into a dedicated **Used Resources & Data Sources** card on `settings.astro` (with 13-language translations).
  - Updated `@airdelta/air-adapters` (`OpenMeteoAdapter`, `AirDataService`) and `apps/api` (`/v1/air?provider=open_meteo`, `/v1/air/stations`, `/v1/plans` `provider`) to support Open-Meteo AQI (`us_aqi` 0–500 + `european_aqi` + PM2.5/PM10/gases) alongside direct client-side CORS Open-Meteo fallback in `apps/web/src/scripts/api-client.ts`.
  - Built `/map` (`apps/web/src/pages/map.astro`) powered by Leaflet + Open-Meteo AQI: full-size interactive India AQI map (12 city hubs, surrounding local grid readings on zoom/click, native Full Screen toggle, 0–500 AQI legend, tap-anywhere inspection, direct WhatsApp report share, and 1-click **"Generate Plan for This Location"**).
  - Added privacy-preserving live geolocation permission (`requestLiveLocationPermission`, snapped to `0.01°` ~1.1 km grid cell) across `/map`, `/`, and `/plan` (with `?lat=&lng=&label=` handoff and pure-TS `@airdelta/engine` fallback in `plan.astro`).

- [x] **Dual-Adapter Hedged Race & Zero-Error Fallback System (Nov 27, 2026):**
  - Implemented `strategy: "race"` (`provider: "auto"`) in `AirDataService` (`packages/air-adapters/src/air-service.ts`), racing `OpenAQAdapter` (physical ground accuracy, preferred when returning fresh `measured` data within `raceTimeoutMs` 2.2s) and `OpenMeteoAdapter` (low-latency global CAMS fallback) in parallel, with live latency EMA & win-count telemetry (`GET /v1/air/health`).
  - Made `getAirSnapshot`, `getAirForecast`, `/v1/air`, `/v1/air/forecast`, and browser-side `fetchResilientAir` (`apps/web/src/scripts/api-client.ts`) strictly non-failing across the full fallback chain: `Dual-Adapter Race` -> `Cross-Adapter Fallback` -> `Direct CORS Open-Meteo` -> `Session/Stale Cache` -> `Replay / Safe Baseline`.

- [x] **Telegram Live Location & Deployment Packaging (Nov 27, 2026):**
  - Added `/location` command, 1-tap `📍 Share My Live Location` `Keyboard().requestLocation(...)` prompt, inline quick-action buttons, and `edited_message:location` streaming updates in `apps/api/src/bot/telegram.ts` and `apps/api/src/bot/polling-runner.ts` (plus `setMyCommands` menu registration).
  - Added production deployment configs: `Dockerfile`, `.dockerignore`, `render.yaml` (Render Blueprint for `@airdelta/api` + `@airdelta/web`), `netlify.toml`, and `scripts/set-telegram-webhook.mjs` (`pnpm bot:webhook`) for Telegram webhook registration.

- [x] **Security Hardening, Bounded Caching & CI Verification (Nov 27, 2026):**
  - Added `apps/api/src/utils/security.ts` with SHA-256 `timingSafeEqual` secret comparison, WGS84 `parseCoordinates` validation, and `setBoundedMapEntry` LRU map bounding.
  - Hardened `apps/api/src/index.ts` and route handlers (`air.route.ts`, `indoor.route.ts`, `jobs.route.ts`, `telegram.route.ts`, `plans.route.ts`): HTTP security headers, `bodyLimit` guards, sanitized `500` error responses, Zod validation on `/v1/indoor-audits*`, coordinate bounds checks, and optional `CRON_SECRET` enforcement.
  - Added bounded LRU cache eviction (`maxCacheEntries: 500`) in `packages/air-adapters/src/air-service.ts` and bounded chat preference maps (`2000` entries) in `apps/api/src/bot/telegram.ts`.
  - Added `.github/workflows/ci.yml` and expanded security/cache unit tests.

## Development Progress
- **Current Status:** Production-hardened across all 8 Astro pages (`/`, `/map`, `/plan`, `/indoor`, `/community`, `/replay`, `/method`, `/settings`), Hono API, and `@airdeltabot` Telegram bot; verified clean build, typecheck, and 58/58 tests passing.
- **Git Remote:** Linked to `origin https://github.com/AJAYMYTH/AirDelta.git` (public visibility verified via GitHub API, ~0.75 MB — well under 10 MB submission cap).
- **Test Suite Status:** 58/58 tests passing across 12 test suites (`pnpm test`).
- **Compilation Status:** 0 errors, 0 warnings across `pnpm -r run build` and `pnpm typecheck` (`apps/web`: 18 files, 0 errors/warnings/hints, 8 static pages built).
- **Pending / Blocked Items:**
  - Record/upload unlisted YouTube or accessible Google Drive demo video and submit on PromptWars before 29/11/2026 11:59 PM IST (at most 3 attempts allowed).

## Technical Decisions
1. **Strict Math Boundary:** LLM is strictly forbidden from performing mathematical calculations. `@airdelta/engine` computes all doses and percentages; Gemini only narrates and translates.
2. **Numeric Grounding Validator:** Any generated sentence containing a numerical token not present in the engine-grounded whitelist triggers immediate replacement with deterministic regional fallback templates.
3. **Spatial Grid Caching:** Air requests are coalesced and cached at `0.01°` lat/lng (~1.1 km cells), protecting free-tier rate limits and avoiding storage of exact street addresses.
4. **$k \ge 5$ Anonymity Standard:** Community impact views only aggregate and display data when $\ge 5$ households have joined the group, preventing identification of individual households.
5. **30-Day Storage Pruning:** Household plan histories older than 30 days are pruned by retention jobs to ensure compliance with free-tier Postgres storage limits (500 MB).

## Next Steps
- Apply `supabase/migrations/20261126000000_grant_permissions.sql` in Supabase SQL Editor.
- Verify interactive UI flows manually in browser (`http://localhost:4321/` + API on `:3000`), record demo video, commit & push to `origin/main`, and submit on PromptWars before 29/11/2026 11:59 PM IST.
