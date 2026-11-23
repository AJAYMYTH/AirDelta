import { describe, it, expect } from "vitest";
import {
  AirSnapshotSchema,
  HouseholdProfileSchema,
  PlanResponseSchema,
  IndoorAuditResultSchema,
  CommunityGroupImpactSchema
} from "../src/index.js";

describe("@airdelta/schemas test suite", () => {
  it("validates a canonical AirSnapshot with provenance badge", () => {
    const raw = {
      cell: "28.61:77.21",
      ts: "2026-11-06T10:00:00Z",
      pm25: 382.5,
      pm10: 512.0,
      indexValue: 385,
      indexStandard: "ind_cpcb",
      category: "Severe",
      source: "google_aq",
      badge: "forecast",
      fetchedAt: "2026-11-06T10:05:00Z",
      ttlSec: 3600,
      license: "Google Maps Platform Terms",
      attribution: "Google Air Quality API (CPCB Index)"
    };

    const parsed = AirSnapshotSchema.parse(raw);
    expect(parsed.badge).toBe("forecast");
    expect(parsed.indexStandard).toBe("ind_cpcb");
    expect(parsed.pm25).toBe(382.5);
  });

  it("validates HouseholdProfile with caution mode flag", () => {
    const raw = {
      cityCode: "DELHI",
      gridCell: "28.61:77.21",
      lang: "hi",
      budgetBand: "low",
      cooksIndoors: true,
      hasExhaust: true,
      hasPurifier: false,
      members: [
        { id: "m-1", ageBand: "child", cautionMode: true, label: "6yo Son" },
        { id: "m-2", ageBand: "adult", cautionMode: false }
      ],
      routines: [
        {
          id: "r-1",
          memberId: "m-1",
          kind: "school_run",
          mode: "bus",
          startHour: 7,
          durationMinutes: 45,
          isIndoor: false,
          maskUsed: true
        }
      ]
    };

    const parsed = HouseholdProfileSchema.parse(raw);
    expect(parsed.members).toHaveLength(2);
    expect(parsed.members[0].cautionMode).toBe(true);
    expect(parsed.routines[0].maskUsed).toBe(true);
  });

  it("validates PlanResponse with Plan A vs Plan B exposure deltas", () => {
    const raw = {
      planId: "4fa85f64-5717-4562-b3fc-2c963f66afa6",
      forDate: "2026-11-06",
      engineVersion: "1.0.0",
      constantsVersion: "2026-11-a",
      air: {
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
        attribution: "Replay Fixture CPCB"
      },
      planA: {
        totalDoseUg: { mid: 185.4, low: 148.3, high: 231.7, unit: "ug", badge: "modelled" },
        segments: [
          { segmentId: "s-1", kind: "walk", doseUg: 65.2, microenvironment: "outdoor_ambient", badge: "modelled" }
        ]
      },
      planB: {
        totalDoseUg: { mid: 112.8, low: 90.2, high: 141.0, unit: "ug", badge: "modelled" },
        netSavingUg: 72.6,
        netSavingPercent: 39.1,
        changes: [
          {
            key: "shift_walk",
            title: "Shift Walk to Cleanest Window",
            description: "Shift morning walk from 07:00 to 14:00.",
            deltaUg: -42.1,
            whyCode: "WINDOW_CLEANER",
            badge: "modelled"
          }
        ],
        segments: [
          { segmentId: "s-1-opt", kind: "walk", doseUg: 23.1, microenvironment: "outdoor_ambient", badge: "modelled" }
        ]
      },
      emissions: {
        deltaGramsCo2e: -240.0,
        factorsRef: ["EF.CO2e.bus_urban", "EF.CO2e.two_wheeler"],
        badge: "assumed"
      },
      narrative: {
        lang: "hi",
        headline: "आज सुबह की सैर दोपहर में करें",
        body: "दोपहर 2 बजे हवा साफ रहेगी। इससे आपका पीएम2.5 अंतःश्वसन 39% कम होगा।",
        keyActions: ["सुबह की सैर 14:00 बजे करें", "खाना बनाते समय एग्जॉस्ट चालू रखें"],
        source: "llm"
      },
      assumptions: ["VE.light_exercise.adult@2026-11-a", "F_micro.indoor.unsealed@2026-11-a"]
    };

    const parsed = PlanResponseSchema.parse(raw);
    expect(parsed.planB.netSavingPercent).toBe(39.1);
    expect(parsed.planA.totalDoseUg.badge).toBe("modelled");
  });

  it("enforces k-anonymity privacy contract on community impact", () => {
    // Satisfied k >= 5
    const validGroup = CommunityGroupImpactSchema.parse({
      groupId: "00000000-0000-0000-0000-000000000001",
      groupName: "Sector 14 RWA",
      cityCode: "DELHI",
      isAnonymitySatisfied: true,
      activeHouseholds: 8,
      totalActionsTaken: 34,
      estimatedCommunityPm25PreventedGrams: 12.4
    });
    expect(validGroup.activeHouseholds).toBe(8);

    // Unsatisfied k < 5
    const maskedGroup = CommunityGroupImpactSchema.parse({
      groupId: "00000000-0000-0000-0000-000000000002",
      groupName: "Tiny Cul-de-sac",
      cityCode: "DELHI",
      isAnonymitySatisfied: false,
      activeHouseholds: null,
      totalActionsTaken: null,
      estimatedCommunityPm25PreventedGrams: null
    });
    expect(maskedGroup.activeHouseholds).toBeNull();
    expect(maskedGroup.isAnonymitySatisfied).toBe(false);
  });
});
