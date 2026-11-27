#!/usr/bin/env node

/**
 * AirDelta Backend Keep-Warm Ping Script
 *
 * Keeps the production Render backend warm by polling `/healthz` every 10 minutes
 * (or once via `--once` in CI/cron schedulers such as GitHub Actions).
 *
 * Usage:
 *   node ./scripts/keep-warm.mjs [url] [--once] [--interval=10] [--warm-air]
 *
 * Examples:
 *   pnpm api:keepwarm
 *   pnpm api:keepwarm:once
 *   node ./scripts/keep-warm.mjs https://airdelta-api.onrender.com --interval=10 --warm-air
 */

const DEFAULT_API_URL = "https://airdelta-api.onrender.com";
const DEFAULT_INTERVAL_MIN = 10;
const REQUEST_TIMEOUT_MS = 45000;
const MAX_ATTEMPTS = 3;

function parseArgs(argv) {
  let targetUrl = process.env.AIRDELTA_API_URL || process.env.PUBLIC_API_URL || DEFAULT_API_URL;
  let once = false;
  let warmAir = false;
  let intervalMin = DEFAULT_INTERVAL_MIN;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--once") {
      once = true;
    } else if (arg === "--warm-air") {
      warmAir = true;
    } else if (arg.startsWith("--interval=")) {
      const parsed = Number(arg.slice("--interval=".length));
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 60) {
        intervalMin = parsed;
      }
    } else if (arg === "--interval" && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 60) {
        intervalMin = parsed;
      }
    } else if (arg.startsWith("http://") || arg.startsWith("https://")) {
      targetUrl = arg;
    }
  }

  return {
    baseUrl: targetUrl.replace(/\/$/, ""),
    once,
    warmAir,
    intervalMin
  };
}

function isValidTargetUrl(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol === "https:") return true;
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

async function pingEndpoint(url) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "AirDelta-KeepWarm/1.0" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      const elapsed = Date.now() - t0;
      if (res.ok) {
        return { ok: true, status: res.status, elapsed };
      }
      if (attempt < MAX_ATTEMPTS && res.status >= 500) {
        await new Promise((r) => setTimeout(r, 3000 * attempt));
        continue;
      }
      return { ok: false, status: res.status, elapsed };
    } catch (err) {
      const elapsed = Date.now() - t0;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 3000 * attempt));
        continue;
      }
      return { ok: false, status: 0, elapsed, error: err?.message || String(err) };
    }
  }
  return { ok: false, status: 0, elapsed: 0, error: "Exhausted attempts" };
}

async function runCycle(baseUrl, warmAir) {
  const ts = new Date().toISOString();
  const health = await pingEndpoint(`${baseUrl}/healthz`);

  if (!health.ok) {
    console.error(
      `[KeepWarm ${ts}] FAIL ${baseUrl}/healthz -> status=${health.status} (${health.elapsed}ms) ${health.error || ""}`.trim()
    );
    return false;
  }

  console.log(`[KeepWarm ${ts}] OK ${baseUrl}/healthz -> ${health.status} (${health.elapsed}ms)`);

  if (warmAir) {
    const air = await pingEndpoint(`${baseUrl}/v1/air?lat=28.6139&lng=77.209&provider=auto`);
    console.log(
      `[KeepWarm ${ts}] ${air.ok ? "OK" : "WARN"} ${baseUrl}/v1/air -> ${air.status} (${air.elapsed}ms)`
    );
  }

  return true;
}

async function main() {
  const { baseUrl, once, warmAir, intervalMin } = parseArgs(process.argv.slice(2));

  if (!isValidTargetUrl(baseUrl)) {
    console.error(`Invalid target URL: "${baseUrl}". Must be https://... or http://localhost:...`);
    process.exit(1);
  }

  const ok = await runCycle(baseUrl, warmAir);
  if (once) {
    process.exit(ok ? 0 : 1);
  }

  const intervalMs = intervalMin * 60 * 1000;
  console.log(`[KeepWarm] Running every ${intervalMin} minute(s) against ${baseUrl}. Press Ctrl+C to stop.`);

  const timer = setInterval(() => {
    runCycle(baseUrl, warmAir).catch((err) => {
      console.error("[KeepWarm] Cycle error:", err);
    });
  }, intervalMs);

  const shutdown = () => {
    clearInterval(timer);
    console.log("[KeepWarm] Stopped.");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[KeepWarm] Fatal error:", err);
  process.exit(1);
});
