import { describe, it, expect } from "vitest";
import { createApp } from "../src/index.js";
import { GroundingValidatorService } from "../src/services/grounding-validator.service.js";
import { AirDataService } from "@airdelta/air-adapters";
import { AirSnapshot, PlanAOutput, PlanBOutput } from "@airdelta/schemas";

describe("Planner & Grounding Validator test suite", () => {
  const airService = new AirDataService({ replayMode: true });
  const app = createApp(airService, { disableLlm: true });

  const mockAir: AirSnapshot = {
    cell: "28.61:77.21",
    ts: "2026-11-06T10:00:00Z",
    pm25: 382.5,
    pm10: 512.0,
    indexValue: 385,
    indexStandard: "ind_cpcb",
    category: "Severe",
    source: "replay",
    badge: "measured",
    fetchedAt: "2026-11-06T10:05:00Z",
    ttlSec: 3600,
    license: "Open Data",
    attribution: "CPCB Station ITO"
  };

  const mockPlanA: PlanAOutput = {
    totalDoseUg: { mid: 185.0, low: 148.0, high: 231.0, unit: "ug", badge: "modelled" },
    segments: [{ segmentId: "s1", kind: "walk", doseUg: 65.0, microenvironment: "outdoor", badge: "modelled" }]
  };

  const mockPlanB: PlanBOutput = {
    totalDoseUg: { mid: 112.0, low: 90.0, high: 140.0, unit: "ug", badge: "modelled" },
    netSavingUg: 73.0,
    netSavingPercent: 39.5,
    changes: [
      {
        key: "shift_walk",
        title: "Shift walk",
        description: "Move walk",
        deltaUg: -42.0,
        whyCode: "WINDOW_CLEANER",
        badge: "modelled"
      }
    ],
    segments: [{ segmentId: "s1-opt", kind: "walk", doseUg: 23.0, microenvironment: "outdoor", badge: "modelled" }]
  };

  it("grounding validator rejects text with hallucinated numbers", () => {
    const validator = new GroundingValidatorService();
    // 9999 is hallucinated / ungrounded
    const text = "Your normal day dose is 185 ug, but we can reduce it by 9999 ug!";
    const res = validator.validateNarration(text, mockAir, mockPlanA, mockPlanB);

    expect(res.isValid).toBe(false);
    expect(res.ungroundedNumbers).toContain(9999);
  });

  it("grounding validator approves text containing strictly authorized numbers", () => {
    const validator = new GroundingValidatorService();
    const text = "With AQI 385, your Plan A dose of 185 ug can be reduced to 112 ug, saving 73 ug (40%).";
    const res = validator.validateNarration(text, mockAir, mockPlanA, mockPlanB);

    expect(res.isValid).toBe(true);
    expect(res.ungroundedNumbers).toHaveLength(0);
  });

  it("POST /v1/plans generates an optimized PlanResponse with verified deltas", async () => {
    const payload = {
      profile: {
        cityCode: "DELHI",
        gridCell: "28.61:77.21",
        lang: "hi",
        budgetBand: "low",
        cooksIndoors: true,
        hasExhaust: false,
        hasPurifier: false,
        members: [{ id: "m-1", ageBand: "adult", cautionMode: false, label: "Adult" }],
        routines: [
          {
            id: "r-1",
            memberId: "m-1",
            kind: "walk",
            startHour: 7,
            durationMinutes: 45,
            isIndoor: false,
            maskUsed: false
          }
        ]
      },
      targetLang: "hi"
    };

    const res = await app.request("/v1/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(201);
    const plan = await res.json();

    expect(plan.planId).toBeDefined();
    expect(plan.engineVersion).toBe("1.0.0");
    expect(plan.planA.totalDoseUg.mid).toBeGreaterThan(plan.planB.totalDoseUg.mid);
    expect(plan.planB.netSavingPercent).toBeGreaterThan(0);
    expect(plan.narrative.lang).toBe("hi");
    expect(plan.narrative.headline).toContain("योजना B");
    expect(plan.assumptions.length).toBeGreaterThan(0);
  });

  it("POST /v1/plans succeeds across all ageBands (child, teen, adult, senior) and commute modes", async () => {
    for (const ageBand of ["child", "teen", "adult", "senior"] as const) {
      const res = await app.request("/v1/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLang: "en",
          includeLlm: false,
          profile: {
            cityCode: "DELHI",
            gridCell: "28.61:77.21",
            lang: "en",
            budgetBand: "low",
            cooksIndoors: true,
            hasExhaust: false,
            hasPurifier: false,
            members: [{ id: "m-1", ageBand, cautionMode: false }],
            routines: [
              { id: "r-walk", memberId: "m-1", kind: "walk", startHour: 7, durationMinutes: 45, isIndoor: false, maskUsed: false },
              { id: "r-commute", memberId: "m-1", kind: "commute", mode: "two_wheeler", startHour: 9, durationMinutes: 45, isIndoor: false, maskUsed: false },
              { id: "r-cook", memberId: "m-1", kind: "cooking", startHour: 19, durationMinutes: 60, isIndoor: true, maskUsed: false }
            ]
          }
        })
      });

      expect(res.status).toBe(201);
      const plan: any = await res.json();
      expect(plan.planA.totalDoseUg.mid).toBeGreaterThan(0);
      expect(plan.planB.netSavingPercent).toBeGreaterThan(0);
    }
  });
});
