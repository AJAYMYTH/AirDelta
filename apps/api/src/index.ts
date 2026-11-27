import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { AirDataService } from "@airdelta/air-adapters";
import { createAirRoutes } from "./routes/air.route.js";
import { createPlanRoutes } from "./routes/plans.route.js";
import { createIndoorRoutes } from "./routes/indoor.route.js";
import { createAdvisoryRoutes } from "./routes/advisory.route.js";
import { createTelegramRoutes } from "./routes/telegram.route.js";
import { createJobRoutes } from "./routes/jobs.route.js";
import { PlannerService } from "./services/planner.service.js";
import { VisionService } from "./services/vision.service.js";
import { AdvisoryService } from "./services/advisory.service.js";
import { AirDeltaBot } from "./bot/telegram.js";

const localEnv = path.resolve(process.cwd(), ".env");
const rootEnv = path.resolve(process.cwd(), "../../.env");
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

export function createApp(
  serviceOverride?: AirDataService,
  options: { disableLlm?: boolean } = {}
) {
  const app = new Hono();

  // CORS middleware
  app.use("*", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"]
  }));

  // Liveness & Readiness checks
  app.get("/healthz", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));
  app.get("/readyz", (c) => c.json({ status: "ready" }));

  // Initialize Air Data Service with smart OpenAQ + Open-Meteo race & never-fail fallback
  const airService = serviceOverride || new AirDataService({
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
    openaqApiKey: process.env.OPENAQ_API_KEY,
    enableGoogle: process.env.GOOGLE_AQ_ENABLED === "true",
    enableOpenAQ: process.env.OPENAQ_ENABLED !== "false",
    strategy: (process.env.AIR_STRATEGY as any) || "race",
    replayMode: process.env.REPLAY_MODE === "true"
  });

  // Initialize Planner, Vision & Advisory Services
  const plannerService = new PlannerService(airService, undefined, Boolean(options.disableLlm));
  const visionService = new VisionService({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: process.env.GEMINI_MODEL_VISION
  });
  const advisoryService = new AdvisoryService();
  const botService = new AirDeltaBot(airService, advisoryService, visionService, {
    token: process.env.TELEGRAM_BOT_TOKEN,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET
  });

  // Mount versioned routes
  app.route("/v1/air", createAirRoutes(airService));
  app.route("/v1/plans", createPlanRoutes(plannerService));
  app.route("/v1/indoor-audits", createIndoorRoutes(visionService));
  app.route("/v1/advisories", createAdvisoryRoutes(advisoryService, airService));
  app.route("/v1/jobs", createJobRoutes());
  app.route("/webhooks/telegram", createTelegramRoutes(botService));

  // Auto-register Telegram webhook in production when a public HTTPS URL is provided (e.g. Render, Railway, Fly)
  if (process.env.NODE_ENV !== "test") {
    const publicBase =
      process.env.TELEGRAM_WEBHOOK_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "");
    if (publicBase && botService.isConfigured()) {
      botService
        .registerWebhook(publicBase, process.env.TELEGRAM_WEBHOOK_SECRET)
        .then(() => console.log(`Telegram webhook registered at ${publicBase.replace(/\/$/, "")}/webhooks/telegram`))
        .catch((err) => console.warn("Telegram webhook auto-registration failed:", err?.message || err));
    }
  }

  return app;
}

const app = createApp();

if (process.env.NODE_ENV !== "test") {
  const port = parseInt(process.env.PORT || "3000", 10);
  console.log(`AirDelta API listening on port ${port}`);
  serve({ fetch: app.fetch, port });
}

export default app;
