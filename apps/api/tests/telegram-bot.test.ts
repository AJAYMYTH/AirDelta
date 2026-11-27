import { describe, it, expect } from "vitest";
import { createApp } from "../src/index.js";
import { AirDataService } from "@airdelta/air-adapters";
import { AirDeltaBot } from "../src/bot/telegram.js";
import { AdvisoryService } from "@airdelta/schemas";
import { VisionService } from "../src/services/vision.service.js";

describe("Telegram Bot Channel (Option B) test suite", () => {
  const airService = new AirDataService({ replayMode: true });
  const advisoryService = new AdvisoryService();
  const visionService = new VisionService();
  const bot = new AirDeltaBot(airService, advisoryService, visionService);
  const app = createApp(airService);

  it("formats text card for /today with provenance badges and cleanest window", async () => {
    const text = await bot.getTodayText(28.6139, 77.209, "en");

    expect(text).toContain("AIRDELTA TODAY SNAPSHOT");
    expect(text).toContain("*AQI:* 385");
    expect(text).toContain("*PM2.5:* 382.5 µg/m³");
    expect(text).toContain("CLEANEST AIR WINDOW");
    expect(text).toContain("GRAP Stage III");
    expect(text).toContain("[MEASURED");
  });

  it("formats Plan A vs Plan B dose delta for /plan", async () => {
    const text = await bot.getPlanText(28.6139, 77.209, "en");

    expect(text).toContain("PLAN A vs PLAN B DOSE COMPARISON");
    expect(text).toContain("Normal Day (Plan A)");
    expect(text).toContain("Optimized Day (Plan B)");
    expect(text).toContain("Net Saving");
    expect(text).toContain("[MODELLED]");
    expect(text).toContain("[ASSUMED]");
  });

  it("generates automated 07:00 morning brief", async () => {
    const brief = await bot.buildMorningBrief(28.6139, 77.209, "en");

    expect(brief).toContain("07:00 MORNING BRIEFING");
    expect(brief).toContain("AQI 385");
    expect(brief).toContain("Avoid early morning exercise");
    expect(brief).toContain("N95 mask");
  });

  it("POST /webhooks/telegram/jobs/morning-brief returns scheduled morning message", async () => {
    const res = await app.request("/webhooks/telegram/jobs/morning-brief", { method: "POST" });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.job).toBe("morning_brief");
    expect(json.message).toContain("07:00 MORNING BRIEFING");
  });

  it("GET /webhooks/telegram/status reports channel readiness", async () => {
    const res = await app.request("/webhooks/telegram/status");
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.channel).toContain("Telegram Bot API");
    expect(json.proactivePushEnabled).toBe(true);
  });

  it("formats live location AQI and plan for custom GPS coordinates", async () => {
    const today = await bot.getTodayText(19.08, 72.88, "en", "Live Location (19.08, 72.88)");
    const plan = await bot.getPlanText(19.08, 72.88, "en", "Live Location (19.08, 72.88)");

    expect(today).toContain("Live Location (19.08, 72.88)");
    expect(plan).toContain("Live Location (19.08, 72.88)");
    expect(plan).toContain("https://airdelta-web.onrender.com/plan?lat=19.08&lng=72.88");
    expect(plan).not.toContain("airdelta.app");
  });

  it("handles POST /webhooks/telegram updates and enforces webhook secret when configured", async () => {
    const prevSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret-123=";
    try {
      const denied = await app.request("/webhooks/telegram", {
        method: "POST",
        body: JSON.stringify({ update_id: 1 })
      });
      expect(denied.status).toBe(401);

      const accepted = await app.request("/webhooks/telegram", {
        method: "POST",
        headers: { "X-Telegram-Bot-Api-Secret-Token": "test-secret-123" },
        body: JSON.stringify({ update_id: 1 })
      });
      expect(accepted.status).toBe(200);
      const json = await accepted.json();
      expect(json.ok).toBe(true);
    } finally {
      if (prevSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
      else process.env.TELEGRAM_WEBHOOK_SECRET = prevSecret;
    }
  });
});
