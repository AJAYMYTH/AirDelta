import {
  HouseholdProfile,
  AirSnapshot,
  AirForecast,
  PlanAOutput,
  PlanBOutput,
  PlanBChange,
  EmissionsLedger,
  RoutineSegment
} from "@airdelta/schemas";
import { calculateSegmentDose, computeTotalDose } from "./dose.js";
import { calculateEmissionsDelta } from "./emissions.js";

export interface PlanOptimizationResult {
  planA: PlanAOutput;
  planB: PlanBOutput;
  emissions: EmissionsLedger;
  assumptions: string[];
}

export function optimizeHouseholdPlan(
  profile: HouseholdProfile,
  air: AirSnapshot,
  forecast?: AirForecast
): PlanOptimizationResult {
  const allAssumptions = new Set<string>();

  // Use primary member or first available
  const primaryMember = profile.members[0] || {
    id: "default-member",
    ageBand: "adult" as const,
    cautionMode: false
  };

  // If no routines provided, provide a sensible default Indian urban day
  const rawRoutines: RoutineSegment[] =
    profile.routines.length > 0
      ? profile.routines
      : [
          {
            id: "seg-walk",
            memberId: primaryMember.id,
            kind: "walk",
            startHour: 7,
            durationMinutes: 45,
            isIndoor: false,
            maskUsed: false
          },
          {
            id: "seg-commute",
            memberId: primaryMember.id,
            kind: "commute",
            mode: "two_wheeler",
            startHour: 9,
            durationMinutes: 45,
            isIndoor: false,
            maskUsed: false
          },
          {
            id: "seg-work",
            memberId: primaryMember.id,
            kind: "rest",
            startHour: 10,
            durationMinutes: 480,
            isIndoor: true,
            maskUsed: false
          },
          {
            id: "seg-cooking",
            memberId: primaryMember.id,
            kind: "cooking",
            startHour: 19,
            durationMinutes: 60,
            isIndoor: true,
            maskUsed: false
          }
        ];

  // 1. Compute Plan A (Normal Day)
  const ambientPm25 = air.pm25 || 250;
  const planASegments = rawRoutines.map((seg) => {
    const res = calculateSegmentDose(seg, primaryMember, ambientPm25, profile.hasPurifier);
    res.assumptionsUsed.forEach((a) => allAssumptions.add(a));
    return res.segmentDose;
  });
  const planATotal = computeTotalDose(planASegments);

  // 2. Enumerate Plan B candidate interventions
  const changes: PlanBChange[] = [];
  let totalEmissionsDelta = 0;
  const emissionsFactors = new Set<string>();

  const planBSegments = rawRoutines.map((seg) => {
    // Clone segment for optimization
    const optSeg: RoutineSegment = { ...seg };

    // Intervention 1: Shift morning walk to cleanest forecast window
    if (seg.kind === "walk" && seg.startHour <= 9) {
      const cleanestHour = forecast?.cleanestWindow
        ? new Date(forecast.cleanestWindow.startTs).getHours()
        : 14;
      const cleanestPm25 = forecast?.cleanestWindow?.expectedPm25 || ambientPm25 * 0.55;

      optSeg.startHour = cleanestHour;
      const origCalc = calculateSegmentDose(seg, primaryMember, ambientPm25, profile.hasPurifier);
      const optCalc = calculateSegmentDose(optSeg, primaryMember, cleanestPm25, profile.hasPurifier);
      const delta = Math.round((optCalc.segmentDose.doseUg - origCalc.segmentDose.doseUg) * 10) / 10;

      changes.push({
        key: "shift_walk",
        title: "Shift Walk to Cleanest Afternoon Window",
        description: `Move morning walk from ${seg.startHour}:00 to ${cleanestHour}:00 when atmospheric dispersion drops PM2.5 to ~${Math.round(cleanestPm25)} µg/m³.`,
        originalSegmentId: seg.id,
        deltaUg: delta,
        whyCode: "WINDOW_CLEANER",
        badge: "modelled"
      });

      optCalc.assumptionsUsed.forEach((a) => allAssumptions.add(a));
      return optCalc.segmentDose;
    }

    // Intervention 2: Switch two-wheeler / car to Metro
    if (seg.kind === "commute" && (seg.mode === "two_wheeler" || seg.mode === "car")) {
      const origMode = seg.mode;
      optSeg.mode = "metro";
      optSeg.maskUsed = true; // Recommend N95 in transit

      const origCalc = calculateSegmentDose(seg, primaryMember, ambientPm25, profile.hasPurifier);
      const optCalc = calculateSegmentDose(optSeg, primaryMember, ambientPm25, profile.hasPurifier);
      const delta = Math.round((optCalc.segmentDose.doseUg - origCalc.segmentDose.doseUg) * 10) / 10;

      const emLedger = calculateEmissionsDelta(origMode, "metro", 12.0);
      totalEmissionsDelta += emLedger.deltaGramsCo2e;
      emLedger.factorsRef.forEach((f) => emissionsFactors.add(f));

      changes.push({
        key: "switch_to_metro",
        title: "Switch Commute to Metro with N95 Mask",
        description: `Switching from ${origMode} to Metro and wearing a fitted mask slashes inhaled dose while eliminating vehicle tailpipe emissions.`,
        originalSegmentId: seg.id,
        deltaUg: delta,
        whyCode: "TRANSIT_SHIFT",
        badge: "modelled"
      });

      optCalc.assumptionsUsed.forEach((a) => allAssumptions.add(a));
      return optCalc.segmentDose;
    }

    // Intervention 3: Kitchen exhaust during cooking
    if (seg.kind === "cooking" && !profile.hasExhaust) {
      // With exhaust active, indoor infiltration / microenvironment drops significantly
      const origCalc = calculateSegmentDose(seg, primaryMember, ambientPm25, false);
      const optCalc = calculateSegmentDose(seg, primaryMember, ambientPm25, true);
      const delta = Math.round((optCalc.segmentDose.doseUg - origCalc.segmentDose.doseUg) * 10) / 10;

      changes.push({
        key: "run_kitchen_exhaust",
        title: "Deploy Kitchen Ventilation & Cross-Exhaust",
        description: "Run exhaust fan continuously while cooking to evacuate unvented combustion particulate.",
        originalSegmentId: seg.id,
        deltaUg: delta,
        whyCode: "EXHAUST_VENTILATION",
        badge: "modelled"
      });

      optCalc.assumptionsUsed.forEach((a) => allAssumptions.add(a));
      return optCalc.segmentDose;
    }

    // Default segment unchanged
    const stdCalc = calculateSegmentDose(seg, primaryMember, ambientPm25, profile.hasPurifier);
    stdCalc.assumptionsUsed.forEach((a) => allAssumptions.add(a));
    return stdCalc.segmentDose;
  });

  const planBTotal = computeTotalDose(planBSegments);
  const netSavingUg = Math.max(0, Math.round((planATotal.mid - planBTotal.mid) * 10) / 10);
  const netSavingPercent =
    planATotal.mid > 0 ? Math.round((netSavingUg / planATotal.mid) * 1000) / 10 : 0;

  return {
    planA: {
      totalDoseUg: planATotal,
      segments: planASegments
    },
    planB: {
      totalDoseUg: planBTotal,
      changes,
      netSavingUg,
      netSavingPercent,
      segments: planBSegments
    },
    emissions: {
      deltaGramsCo2e: Math.round(totalEmissionsDelta * 10) / 10,
      factorsRef: Array.from(emissionsFactors),
      badge: "assumed"
    },
    assumptions: Array.from(allAssumptions)
  };
}
