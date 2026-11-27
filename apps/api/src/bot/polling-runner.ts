import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Load from current dir or monorepo root .env
const localEnv = path.resolve(process.cwd(), ".env");
const rootEnv = path.resolve(process.cwd(), "../../.env");

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

import { AirDataService } from "@airdelta/air-adapters";
import { AdvisoryService } from "@airdelta/schemas";
import { VisionService } from "../services/vision.service.js";
import { AirDeltaBot } from "./telegram.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || token.includes("your_telegram") || token.length < 15) {
  console.error("\n❌ TELEGRAM_BOT_TOKEN is not configured in .env");
  console.log("👉 Get a bot token from https://t.me/BotFather");
  console.log("   Then add it to your .env file.\n");
  process.exit(1);
}

const airService = new AirDataService({
  googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
  openaqApiKey: process.env.OPENAQ_API_KEY,
  enableGoogle: process.env.GOOGLE_AQ_ENABLED === "true",
  enableOpenAQ: process.env.OPENAQ_ENABLED !== "false",
  strategy: (process.env.AIR_STRATEGY as any) || "race",
  replayMode: process.env.REPLAY_MODE === "true"
});

const advisoryService = new AdvisoryService();
const visionService = new VisionService({
  apiKey: process.env.GEMINI_API_KEY,
  modelName: process.env.GEMINI_MODEL_VISION
});

const botService = new AirDeltaBot(airService, advisoryService, visionService, { token });

if (!botService.bot) {
  console.error("Failed to initialize Bot instance.");
  process.exit(1);
}

console.log("\n==========================================");
console.log("  AirDelta Telegram Bot - Polling Mode    ");
console.log("==========================================");
console.log("🤖 Starting long-polling for local testing...");
console.log("👉 Open Telegram and send /start to your bot!\n");

botService.bot.api
  .setMyCommands([
    { command: "start", description: "Start & pick city or live location" },
    { command: "location", description: "Share live GPS location for local AQI & plan" },
    { command: "today", description: "Live AQI snapshot & cleanest airing window" },
    { command: "plan", description: "Plan A vs Plan B exposure savings" },
    { command: "advisory", description: "Regional RWA / community air notice" },
    { command: "lang", description: "Switch bot language" }
  ])
  .catch(() => {});

botService.bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot @${botInfo.username} (${botInfo.first_name}) is online and listening!`);
  }
});
