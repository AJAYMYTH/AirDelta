# Contributing to AirDelta

Thank you for helping improve **AirDelta**! Please follow the guidelines below so changes stay clean, deterministic, and accessible across all supported languages and devices.

## Development Setup

```bash
git clone https://github.com/AJAYMYTH/AirDelta.git
cd AirDelta
pnpm install
cp .env.example .env
```

Run the API and Web PWA locally:

```bash
pnpm --filter @airdelta/api run dev
pnpm --filter @airdelta/web run dev
```

## Core Engineering Rules

1. **Strict Math Boundary (`LLM Explains, Code Computes`):** Never delegate dose, mass-balance, or emissions calculations to an LLM. Keep all deterministic physics equations in `packages/engine/`.
2. **Evidence Provenance:** Every metric surfaced in the UI must preserve its provenance badge (`measured`, `forecast`, `modelled`, or `assumed`).
3. **13-Language Parity:** Any UI string key added to `packages/i18n/src/page-translations.ts` must be provided across all 13 supported languages (`en`, `hi`, `bn`, `te`, `mr`, `ta`, `ur`, `gu`, `kn`, `or`, `ml`, `pa`, `as`).
4. **No Secrets or PII:** Never commit `.env` files, API tokens, or unredacted user data.

## Before Opening a Pull Request

Ensure all checks pass locally:

```bash
pnpm -r run build
pnpm typecheck
pnpm test
```
