import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateSegmentDose,
  computeTotalDose,
  calculateIndoorMassBalance,
  optimizeHouseholdPlan
} from "../src/index.js";
import { RoutineSegment, MemberProfile, AirSnapshot } from "@airdelta/schemas";

describe("@airdelta/engine mathematical verification", () => {
  const defaultMember: MemberProfile = {
    id: "m-1",
    ageBand: "adult",
    cautionMode: false
  };

  const defaultSegment: RoutineSegment = {
    id: "s-1",
    memberId: "m-1",
    kind: "walk",
    startHour: 7,
    durationMinutes: 60,
    isIndoor: false,
    maskUsed: false
  };

  it("calculates golden case inhaled dose accurately", () => {
    // 380 ug/m3 ambient PM2.5, adult walking 1h (VE = 1.25 m3/h, F_micro = 1.0)
    // D = 380 * 1.0 * 1.25 * 1.0 = 475.0 ug
    const res = calculateSegmentDose(defaultSegment, defaultMember, 380);
    expect(res.segmentDose.doseUg).toBe(475.0);
    expect(res.assumptionsUsed).toContain("VE.light_exercise.adult@2026-11-a");
    expect(res.assumptionsUsed).toContain("F_micro.transit.walking@2026-11-a");
  });

  it("verifies N95 mask protection cuts inhaled transit dose by 85%", () => {
    const unmasked = calculateSegmentDose(defaultSegment, defaultMember, 300);
    const masked = calculateSegmentDose({ ...defaultSegment, maskUsed: true }, defaultMember, 300);

    expect(masked.segmentDose.doseUg).toBeCloseTo(unmasked.segmentDose.doseUg * 0.15, 1);
  });

  it("property test: dose is monotonic with respect to ambient PM2.5 concentration", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 10, max: 800, noNaN: true }),
        fc.float({ min: 1, max: 200, noNaN: true }),
        (c1, delta) => {
          const c2 = c1 + delta;
          const r1 = calculateSegmentDose(defaultSegment, defaultMember, c1);
          const r2 = calculateSegmentDose(defaultSegment, defaultMember, c2);
          // Monotonicity: higher ambient PM2.5 must never yield a lower inhaled dose
          expect(r2.segmentDose.doseUg).toBeGreaterThanOrEqual(r1.segmentDose.doseUg);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("property test: dose is strictly non-negative for all valid inputs", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000, noNaN: true }),
        fc.integer({ min: 5, max: 720 }),
        (pm25, duration) => {
          const seg: RoutineSegment = { ...defaultSegment, durationMinutes: duration };
          const res = calculateSegmentDose(seg, defaultMember, pm25);
          expect(res.segmentDose.doseUg).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("solves indoor single-compartment mass balance with exhaust and filtration", () => {
    const baseline = calculateIndoorMassBalance({
      ambientPm25: 350,
      isCooking: true,
      hasExhaust: false,
      hasPurifier: false
    });

    const mitigated = calculateIndoorMassBalance({
      ambientPm25: 350,
      isCooking: true,
      hasExhaust: true,
      hasPurifier: true
    });

    expect(mitigated.indoorConcentrationUgM3).toBeLessThan(baseline.indoorConcentrationUgM3);
    expect(mitigated.percentageReduction).toBeGreaterThan(40);
  });

  it("optimizes household routine and returns verified Plan A vs Plan B deltas", () => {
    const air: AirSnapshot = {
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

    const profile = {
      cityCode: "DELHI",
      gridCell: "28.61:77.21",
      lang: "en",
      budgetBand: "low" as const,
      cooksIndoors: true,
      hasExhaust: false,
      hasPurifier: false,
      members: [defaultMember],
      routines: []
    };

    const result = optimizeHouseholdPlan(profile, air);

    expect(result.planA.totalDoseUg.mid).toBeGreaterThan(result.planB.totalDoseUg.mid);
    expect(result.planB.netSavingUg).toBeGreaterThan(0);
    expect(result.planB.netSavingPercent).toBeGreaterThan(20);
    expect(result.planB.changes.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });
});
