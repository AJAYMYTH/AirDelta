import { describe, it, expect } from "vitest";
import { createApp } from "../src/index.js";
import { AirDataService } from "@airdelta/air-adapters";

describe("Community Advisories & k-Anonymity test suite", () => {
  const airService = new AirDataService({ replayMode: true });
  const app = createApp(airService);

  it("POST /v1/advisories generates a localized RWA advisory in Hindi", async () => {
    const res = await app.request("/v1/advisories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "rwa_residents",
        lang: "hi",
        gridCell: "28.61:77.21"
      })
    });

    expect(res.status).toBe(201);
    const json = await res.json();

    expect(json.advisoryId).toBeDefined();
    expect(json.lang).toBe("hi");
    expect(json.grapStage).toBe("STAGE_II");
    expect(json.headline).toContain("अलर्ट");
    expect(json.actionBulletPoints.length).toBeGreaterThan(0);
    expect(json.shareCardText).toContain("AIRDELTA COMMUNITY ADVISORY");
  });

  it("POST /v1/advisories formats school advisory in Telugu", async () => {
    const res = await app.request("/v1/advisories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "school_community",
        lang: "te",
        gridCell: "28.61:77.21"
      })
    });

    expect(res.status).toBe(201);
    const json = await res.json();

    expect(json.lang).toBe("te");
    expect(json.headline).toContain("హెచ్చరిక");
    expect(json.actionBulletPoints.length).toBeGreaterThan(0);
  });

  it("enforces k-anonymity on GET /v1/groups/:id/impact", async () => {
    // Satisfied k = 8
    const resValid = await app.request("/v1/advisories/groups/group-1/impact?memberCount=8");
    expect(resValid.status).toBe(200);
    const jsonValid = await resValid.json();
    expect(jsonValid.isAnonymitySatisfied).toBe(true);
    expect(jsonValid.activeHouseholds).toBe(8);

    // Unsatisfied k = 3 (< 5)
    const resMasked = await app.request("/v1/advisories/groups/group-2/impact?memberCount=3");
    expect(resMasked.status).toBe(200);
    const jsonMasked = await resMasked.json();
    expect(jsonMasked.isAnonymitySatisfied).toBe(false);
    expect(jsonMasked.activeHouseholds).toBeNull();
    expect(jsonMasked.totalActionsTaken).toBeNull();

    // Non-integer / negative memberCount stays k-anonymized
    const resInvalid = await app.request("/v1/advisories/groups/group-3/impact?memberCount=abc");
    expect(resInvalid.status).toBe(200);
    const jsonInvalid = await resInvalid.json();
    expect(jsonInvalid.isAnonymitySatisfied).toBe(false);
    expect(jsonInvalid.activeHouseholds).toBeNull();
  });
});
