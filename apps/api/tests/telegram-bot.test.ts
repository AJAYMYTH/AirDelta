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
});
