import {
  RoutineSegment,
  MemberProfile,
  DoseEstimate,
  SegmentDose
} from "@airdelta/schemas";
import { getConstant, formatAssumptionRef } from "./constants.js";

export interface SegmentDoseCalculation {
  segmentDose: SegmentDose;
  assumptionsUsed: string[];
}

export function calculateSegmentDose(
  segment: RoutineSegment,
  member: MemberProfile,
  ambientPm25: number,
  hasPurifier = false
): SegmentDoseCalculation {
  const assumptionsUsed: string[] = [];
  const durationHours = Math.max(0.01, segment.durationMinutes / 60);

  // 1. Determine minute ventilation rate (VE) based on age and activity
  let veKey = `VE.rest.${member.ageBand}`;
  if (segment.kind === "walk" || segment.kind === "school_run") {
    veKey = `VE.light_exercise.${member.ageBand}`;
  } else if (segment.kind === "outdoor_play" || segment.mode === "cycle") {
    veKey = `VE.moderate_exercise.${member.ageBand}`;
  } else if (segment.kind === "rest") {
    veKey = `VE.sleep.${member.ageBand}`;
  }

  // Fallback to light_exercise or adult baseline if a specialized constant is absent
  let veValue: number;
  try {
    veValue = getConstant(veKey);
    assumptionsUsed.push(formatAssumptionRef(veKey));
  } catch {
    try {
      veKey = `VE.light_exercise.${member.ageBand}`;
      veValue = getConstant(veKey);
      assumptionsUsed.push(formatAssumptionRef(veKey));
    } catch {
      veKey = "VE.light_exercise.adult";
      veValue = getConstant(veKey);
      assumptionsUsed.push(formatAssumptionRef(veKey));
    }
  }

  // Caution mode multiplier (makes thresholds 20% more conservative for sensitive members)
  if (member.cautionMode) {
    veValue *= 1.15;
  }

  // 2. Determine microenvironment infiltration factor (F_micro)
  let fMicroKey = "F_micro.indoor.unsealed";
  let microenvName = "indoor_home";

  if (!segment.isIndoor) {
    if (segment.mode === "two_wheeler") {
      fMicroKey = "F_micro.transit.two_wheeler";
      microenvName = "transit_two_wheeler";
    } else if (segment.mode === "bus") {
      fMicroKey = "F_micro.transit.bus_non_ac";
      microenvName = "transit_bus";
    } else if (segment.mode === "metro") {
      fMicroKey = "F_micro.transit.metro";
      microenvName = "transit_metro";
    } else if (segment.mode === "car") {
      fMicroKey = "F_micro.transit.car_ac_recirc";
      microenvName = "transit_car_ac";
    } else if (segment.mode === "auto") {
      fMicroKey = "F_micro.transit.auto";
      microenvName = "transit_auto";
    } else if (segment.mode === "cycle") {
      fMicroKey = "F_micro.transit.cycle";
      microenvName = "transit_cycle";
    } else {
      fMicroKey = "F_micro.transit.walking";
      microenvName = "outdoor_roadside";
    }
  } else if (hasPurifier) {
    fMicroKey = "F_micro.indoor.purifier_active";
    microenvName = "indoor_purified";
  }

  const fMicroValue = getConstant(fMicroKey);
  assumptionsUsed.push(formatAssumptionRef(fMicroKey));

  // 3. Mask protection factor
  let maskEfficiency = 0.0;
  if (segment.maskUsed) {
    const maskKey = "mask.n95.effective";
    maskEfficiency = getConstant(maskKey);
    assumptionsUsed.push(formatAssumptionRef(maskKey));
  }

  // Effective concentration: C_seg = C_out * F_micro * (1 - mask)
  const effectiveConc = ambientPm25 * fMicroValue * (1.0 - maskEfficiency);

  // Inhaled Dose: D = C_seg * VE * duration
  const dose = effectiveConc * veValue * durationHours;
  const roundedDose = Math.round(dose * 10) / 10;

  return {
    segmentDose: {
      segmentId: segment.id,
      kind: segment.kind,
      doseUg: roundedDose,
      microenvironment: microenvName,
      badge: "modelled"
    },
    assumptionsUsed
  };
}

export function computeTotalDose(segmentDoses: SegmentDose[]): DoseEstimate {
  const sumMid = segmentDoses.reduce((acc, curr) => acc + curr.doseUg, 0);
  const mid = Math.round(sumMid * 10) / 10;
  // Parameter uncertainty bounds: ±20%
  const low = Math.round(mid * 0.80 * 10) / 10;
  const high = Math.round(mid * 1.25 * 10) / 10;

  return {
    mid,
    low,
    high,
    unit: "ug",
    badge: "modelled"
  };
}
