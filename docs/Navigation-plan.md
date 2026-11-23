# AirDelta — Navigation Plan & UI States

**Project:** AirDelta  
**Hackathon Event:** PromptWars  
**Channels:** Web PWA (Option A) & Telegram Bot (Option B)  
**Version:** 1.0.0 · **Date:** 23 Nov 2026 · **Status:** Approved for Implementation

---

## 1. Option A: Web PWA Information Architecture

```mermaid
flowchart TD
    HOME["/ (Today Dashboard)"]
    ONBOARD["Modal: 60s Onboarding / Routine Editor"]
    PLAN["/plan (Plan A vs Plan B Optimizer)"]
    INDOOR["/indoor (Indoor Photo Audit)"]
    COMMUNITY["/community (Multilingual Advisories)"]
    METHOD["/method (Data Provenance & Formulas)"]
    REPLAY["/replay (Delhi Smog Replay Studio)"]
    SETTINGS["/settings (Language & Data Privacy)"]

    HOME --> ONBOARD
    HOME --> PLAN
    HOME --> INDOOR
    HOME --> COMMUNITY
    HOME --> REPLAY
    HOME --> METHOD
    HOME --> SETTINGS
```

### 1.1 Web Routes Specification

| Path | Purpose | Key UI Components | Provenance Badges Displayed |
|---|---|---|---|
| `/` | **Today Overview** | - Hero AQI card with CPCB color band<br>- Key pollutant gauges ($PM_{2.5}, PM_{10}, NO_2, O_3$)<br>- 96-hour hourly forecast timeline<br>- Cleanest window banner (e.g. "Cleanest between 13:00 - 15:30")<br>- Active GRAP Stage badge | `[Measured]` or `[Forecast]` with source attribution |
| `/plan` | **Plan A vs Plan B** | - Daily routine timeline editor<br>- Plan A vs Plan B comparison card<br>- Inhaled PM2.5 dose savings ($\mu g$ with low/high range)<br>- Transport emissions delta ($gCO_2e$)<br>- Step-by-step optimization recommendations<br>- "Assumptions Used" accordion | `[Modelled]` on doses, `[Assumed]` on emissions and breathing rates |
| `/indoor` | **Indoor Photo Audit** | - Photo upload dropzone (client-side EXIF removal)<br>- Detected candidate sources checklist with user confirmation checkboxes<br>- Ranked mitigation actions filtered by budget (`Free`, `Low`, `Medium`)<br>- Mass-balance indoor concentration forecast | `[Modelled]` on indoor concentration, `[Assumed]` on CADR |
| `/community` | **Community Advisories** | - Target audience selector (`RWA Residents`, `School`, `Workplace`)<br>- Language selector (All major Indian regional languages)<br>- Generated advisory card with copy / forward button<br>- $k$-anonymous community impact tally ($k \ge 5$) | `[Measured]` / `[Forecast]` on underlying AQI data |
| `/replay` | **Replay Studio** | - Scenario picker: Delhi Smog Episode (Nov 6–8, 2026, AQI 380+)<br>- Timeline scrubber for hourly replay<br>- Visual banner clearly stating "DEMONSTRATION REPLAY MODE" | `[Replay (Measured)]` |
| `/method` | **Methodology & Data** | - Full Constants Registry `2026-11-a` viewer<br>- Inhaled dose and mass-balance equations<br>- Third-party data licenses & attributions | Informational |
| `/settings` | **Settings & Privacy** | - Preferred UI language switcher (12+ Indian languages)<br>- Delete my data (immediate purge)<br>- Plain language privacy guarantee | Informational |

---

## 2. Option B: Telegram Bot Command Hierarchy

The Telegram Bot provides a zero-install conversational interface using inline keyboard buttons.

```mermaid
flowchart TD
    START["/start (Welcome & 60s Onboarding)"]
    CITY["City & Cell Selection (Delhi, Kanpur, Patna, etc.)"]
    ROUTINE["Quick Routine: Commute, Walk, Cooking"]
    MENU["Main Menu"]
    TODAY["/today: Snapshot + Cleanest Window"]
    PLAN_BOT["/plan: Plan A vs B Dose Delta"]
    INDOOR_BOT["/indoor: Send kitchen/room photo"]
    ADVISORY_BOT["/advisory: Generate RWA text in regional language"]
    LANG_BOT["/lang: Select Indian regional language"]
    PUSH["Automated 07:00 Daily Morning Briefing"]

    START --> CITY --> ROUTINE --> MENU
    MENU --> TODAY
    MENU --> PLAN_BOT
    MENU --> INDOOR_BOT
    MENU --> ADVISORY_BOT
    MENU --> LANG_BOT
    PUSH -.-> TODAY
```

### 2.1 Bot Command Responses
- `/today`: Returns formatted card with current AQI, CPCB category, and `[Measured]` or `[Forecast]` tag, along with the cleanest window for outdoor tasks.
- `/plan`: Computes Plan A vs Plan B and replies with a summary card showing:
  - *Normal Day Dose:* $185\text{ }\mu g$ `[Modelled]`
  - *Optimized Plan B Dose:* $112\text{ }\mu g$ `[Modelled]` ($-39\%$ reduction)
  - *Recommended Shifts:* e.g. "Shift walk to 14:00 (+22 $\mu g$ saved); wear N95 on bike (+41 $\mu g$ saved)".
- `/indoor`: Prompts user to send a photo of kitchen or living area $\rightarrow$ returns detected sources and immediate low-cost actions.
- `/advisory`: Prompts for audience and generates an advisory in the chosen Indian language ready to be forwarded to society WhatsApp/Telegram groups.
- `/lang`: Displays inline buttons for Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, Assamese, and English.
