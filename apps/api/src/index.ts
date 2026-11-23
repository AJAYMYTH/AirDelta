import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { AirDataService } from "@airdelta/air-adapters";
import { createAirRoutes } from "./routes/air.route.js";
import { createPlanRoutes } from "./routes/plans.route.js";
import { createIndoorRoutes } from "./routes/indoor.route.js";
import { PlannerService } from "./services/planner.service.js";
import { VisionService } from "./services/vision.service.js";

dotenv.config();

export function createApp(serviceOverride?: AirDataService) {
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

  // Initialize Air Data Service
  const airService = serviceOverride || new AirDataService({
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
    openaqApiKey: process.env.OPENAQ_API_KEY,
    enableGoogle: process.env.GOOGLE_AQ_ENABLED !== "false",
    enableOpenAQ: process.env.OPENAQ_ENABLED !== "false",
    replayMode: process.env.REPLAY_MODE === "true"
  });

  // Initialize Planner & Vision Services
  const plannerService = new PlannerService(airService);
  const visionService = new VisionService({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: process.env.GEMINI_MODEL_VISION
  });

  // Mount versioned routes
  app.route("/v1/air", createAirRoutes(airService));
  app.route("/v1/plans", createPlanRoutes(plannerService));
  app.route("/v1/indoor-audits", createIndoorRoutes(visionService));

  return app;
}

const app = createApp();

if (process.env.NODE_ENV !== "test") {
  const port = parseInt(process.env.PORT || "3000", 10);
  console.log(`AirDelta API listening on port ${port}`);
  serve({ fetch: app.fetch, port });
}

export default app;
