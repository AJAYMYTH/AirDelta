# Security Policy

## Supported Versions

Security fixes are applied to the `main` branch and live deployments.

| Branch / Target | Supported |
| :--- | :--- |
| `main` (Production Web & API) | ✅ Yes |

## Built-In Security & Privacy Guarantees

AirDelta enforces strict privacy and boundary controls by design:
- **Zero-PII Storage:** Coordinates are rounded to `0.01°` (~1.1 km) grid cells; phone numbers, Aadhaar IDs, emails, and street addresses are scrubbed by `PiiSanitizerService`.
- **Client-Side Photo Privacy:** Uploaded indoor/smog images are re-encoded on HTML `<canvas>` to strip EXIF/GPS metadata prior to upload.
- **Guardrails & Grounding:** Pre-LLM guardrails reject prompt injections, coding requests, and off-topic abuse (`evaluateChatGuard`); numerical claims in plan narrations are verified against `@airdelta/engine` outputs (`GroundingValidatorService`).
- **API Hardening:** Route-level `bodyLimit` caps, Zod schema validation, WGS84 coordinate bounds checking, constant-time `crypto.timingSafeEqual` secret comparison, security response headers, and Supabase Row-Level Security (RLS) with $k \ge 5$ community aggregation.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead:
1. Open a **Private Security Advisory** under the **Security → Advisories** tab at https://github.com/AJAYMYTH/AirDelta/security/advisories/new.
2. Include steps to reproduce, affected files/endpoints, and potential impact.
3. We aim to acknowledge reports within **48 hours** and ship a verified fix promptly.
