import { describe, it, expect } from "vitest";
import {
  CURATED_INDOOR_FIXES,
  getFixesForBudget,
  getFixesForDetectedSources,
  getFixByKey
} from "../src/index.js";

describe("@airdelta/fix-library test suite", () => {
  it("contains curated indoor fixes with action steps and badges", () => {
    expect(CURATED_INDOOR_FIXES.length).toBeGreaterThan(5);
    for (const fix of CURATED_INDOOR_FIXES) {
      expect(fix.id).toBeDefined();
      expect(fix.title.length).toBeGreaterThan(5);
      expect(fix.description.length).toBeGreaterThan(10);
      expect(fix.actionSteps.length).toBeGreaterThan(1);
      expect(fix.badge).toMatch(/^(modelled|assumed)$/);
    }
  });

  it("filters fixes by budget hierarchy", () => {
    const zeroCost = getFixesForBudget("none");
    expect(zeroCost.every((f) => f.budgetBand === "none")).toBe(true);
    expect(zeroCost.length).toBeGreaterThan(2);

    const lowCost = getFixesForBudget("low");
    expect(lowCost.some((f) => f.budgetBand === "low")).toBe(true);
    expect(lowCost.some((f) => f.budgetBand === "none")).toBe(true);
    expect(lowCost.every((f) => f.budgetBand !== "high")).toBe(true);
  });

  it("recommends targeted fixes for detected sources", () => {
    const fixes = getFixesForDetectedSources(["unvented_gas_stove", "incense_dhoop"], "low");
    const fixKeys = fixes.map((f) => f.fixKey);

    expect(fixKeys).toContain("exhaust_during_cooking");
    expect(fixKeys).toContain("eliminate_indoor_incense");
  });

  it("looks up individual fix by key", () => {
    const fix = getFixByKey("diy_corsi_rosenthal_box");
    expect(fix).toBeDefined();
    expect(fix?.estimatedCadr).toBe(250);
  });
});
