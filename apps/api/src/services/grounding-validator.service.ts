import { PlanAOutput, PlanBOutput, AirSnapshot, EmissionsLedger } from "@airdelta/schemas";

export interface GroundingValidationResult {
  isValid: boolean;
  ungroundedNumbers: number[];
  allowedNumbers: number[];
}

export class GroundingValidatorService {
  /**
   * Validates that every numeric claim in the generated text corresponds to an authentic,
   * deterministically computed engine figure or registered constant.
   */
  validateNarration(
    text: string,
    air: AirSnapshot,
    planA: PlanAOutput,
    planB: PlanBOutput,
    emissions?: EmissionsLedger
  ): GroundingValidationResult {
    const allowed = new Set<number>();

    // 1. Air quality metrics
    if (air.pm25 !== null) {
      allowed.add(Math.round(air.pm25));
      allowed.add(Math.round(air.pm25 * 10) / 10);
    }
    if (air.pm10 !== null) {
      allowed.add(Math.round(air.pm10));
      allowed.add(Math.round(air.pm10 * 10) / 10);
    }
    if (air.indexValue !== null) {
      allowed.add(air.indexValue);
    }

    // 2. Plan A figures
    allowed.add(Math.round(planA.totalDoseUg.mid));
    allowed.add(Math.round(planA.totalDoseUg.mid * 10) / 10);
    allowed.add(Math.round(planA.totalDoseUg.low));
    allowed.add(Math.round(planA.totalDoseUg.high));
    for (const s of planA.segments) {
      allowed.add(Math.round(s.doseUg));
      allowed.add(Math.round(s.doseUg * 10) / 10);
    }

    // 3. Plan B figures & savings
    allowed.add(Math.round(planB.totalDoseUg.mid));
    allowed.add(Math.round(planB.totalDoseUg.mid * 10) / 10);
    allowed.add(Math.round(planB.totalDoseUg.low));
    allowed.add(Math.round(planB.totalDoseUg.high));
    allowed.add(Math.round(planB.netSavingUg));
    allowed.add(Math.round(planB.netSavingUg * 10) / 10);
    allowed.add(Math.round(planB.netSavingPercent));
    allowed.add(Math.round(planB.netSavingPercent * 10) / 10);

    for (const c of planB.changes) {
      allowed.add(Math.abs(Math.round(c.deltaUg)));
      allowed.add(Math.abs(Math.round(c.deltaUg * 10) / 10));
    }

    // 4. Emissions
    if (emissions) {
      allowed.add(Math.abs(Math.round(emissions.deltaGramsCo2e)));
      allowed.add(Math.abs(Math.round(emissions.deltaGramsCo2e * 10) / 10));
    }

    // 5. Common times & standard numbers
    // Hours 0-24, minutes 15, 30, 45, 60, WHO guideline 15
    for (let h = 0; h <= 24; h++) allowed.add(h);
    [15, 30, 45, 60, 96, 100].forEach((n) => allowed.add(n));

    // Extract all numeric tokens from text
    const numericRegex = /\b\d+(\.\d+)?\b/g;
    const matches = text.match(numericRegex) || [];
    const ungrounded: number[] = [];

    for (const m of matches) {
      const num = parseFloat(m);
      if (isNaN(num)) continue;

      // Allow small numbers <= 5 as common grammatical counters (e.g. "step 1", "2 changes")
      if (num <= 5) continue;

      // Check if exact, rounded, or within 1 unit of an allowed figure
      const isAllowed =
        allowed.has(num) ||
        allowed.has(Math.round(num)) ||
        allowed.has(Math.floor(num)) ||
        allowed.has(Math.ceil(num));

      if (!isAllowed) {
        ungrounded.push(num);
      }
    }

    return {
      isValid: ungrounded.length === 0,
      ungroundedNumbers: ungrounded,
      allowedNumbers: Array.from(allowed)
    };
  }
}
