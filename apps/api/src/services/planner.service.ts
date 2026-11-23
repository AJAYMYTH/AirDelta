import { randomUUID } from "node:crypto";
import {
  HouseholdProfile,
  PlanResponse,
  AirSnapshot,
  AirForecast
} from "@airdelta/schemas";
import { AirDataService, parseCellId } from "@airdelta/air-adapters";
import { optimizeHouseholdPlan, TemplateFallbackService, CONSTANTS_VERSION, ENGINE_VERSION } from "@airdelta/engine";
import { GeminiService } from "./gemini.service.js";
import { GroundingValidatorService } from "./grounding-validator.service.js";

export class PlannerService {
  private geminiService: GeminiService;
  private validatorService: GroundingValidatorService;
  private fallbackService: TemplateFallbackService;

  constructor(
    private airService: AirDataService,
    geminiOverride?: GeminiService
  ) {
    this.geminiService = geminiOverride || new GeminiService();
    this.validatorService = new GroundingValidatorService();
    this.fallbackService = new TemplateFallbackService();
  }

  async generatePlan(
    profile: HouseholdProfile,
    targetLang = "en",
    airOverride?: AirSnapshot,
    forecastOverride?: AirForecast
  ): Promise<PlanResponse> {
    const coords = parseCellId(profile.gridCell);
    const air = airOverride || (await this.airService.getAirSnapshot(coords.lat, coords.lng));
    const forecast = forecastOverride || (await this.airService.getAirForecast(coords.lat, coords.lng));

    // 1. Deterministic pure-TS engine optimization
    const engineResult = optimizeHouseholdPlan(profile, air, forecast);

    // 2. Narration path: Gemini LLM -> Numeric Validator -> Deterministic Template Fallback
    let narrative = null;
    if (this.geminiService.isAvailable()) {
      const generated = await this.geminiService.generatePlanNarration(
        targetLang,
        air,
        engineResult.planA,
        engineResult.planB
      );

      if (generated) {
        const validation = this.validatorService.validateNarration(
          `${generated.headline} ${generated.body} ${generated.keyActions.join(" ")}`,
          air,
          engineResult.planA,
          engineResult.planB,
          engineResult.emissions
        );

        if (validation.isValid) {
          narrative = generated;
        }
      }
    }

    // 3. If Gemini is unavailable, rate-limited, or failed grounding validation
    if (!narrative) {
      narrative = this.fallbackService.generateTemplateNarration(
        targetLang,
        air,
        engineResult.planA,
        engineResult.planB
      );
    }

    return {
      planId: randomUUID(),
      forDate: new Date().toISOString().split("T")[0],
      engineVersion: ENGINE_VERSION,
      constantsVersion: CONSTANTS_VERSION,
      air,
      planA: engineResult.planA,
      planB: engineResult.planB,
      emissions: engineResult.emissions,
      narrative,
      assumptions: engineResult.assumptions
    };
  }
}
