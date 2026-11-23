import { describe, it, expect } from "vitest";
import { createApp } from "../src/index.js";
import { AirDataService } from "@airdelta/air-adapters";

describe("Indoor Photo Audit test suite", () => {
  const airService = new AirDataService({ replayMode: true });
  const app = createApp(airService);

  it("POST /v1/indoor-audits returns candidate sources and curated fixes", async () => {
    const res = await app.request("/v1/indoor-audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomHint: "kitchen",
        budgetBand: "low"
      })
    });

    expect(res.status).toBe(201);
    const json = await res.json();

    expect(json.auditId).toBeDefined();
    expect(json.detectedSources.length).toBeGreaterThan(0);
    expect(json.curatedFixes.length).toBeGreaterThan(0);
    // Verifies kitchen exhaust fix is present in recommendations
    const fixKeys = json.curatedFixes.map((f: any) => f.fixKey);
    expect(fixKeys).toContain("exhaust_during_cooking");
  });

  it("POST /v1/indoor-audits/confirm recalculates indoor mass balance", async () => {
    const res = await app.request("/v1/indoor-audits/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmedSourceIds: ["src-stove"],
        selectedFixKeys: ["exhaust_during_cooking", "diy_corsi_rosenthal_box"],
        roomVolumeM3: 45,
        ambientPm25: 380
      })
    });

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.status).toBe("confirmed");
    expect(json.mitigatedIndoorPm25).toBeLessThan(json.unmitigatedIndoorPm25);
    expect(json.percentageReduction).toBeGreaterThan(30);
    expect(json.badge).toBe("modelled");
  });
});
