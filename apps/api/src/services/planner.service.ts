import { randomUUID } from "node:crypto";
import {
  HouseholdProfile,
  PlanResponse,
  AirSnapshot,
  AirForecast
} from "@airdelta/schemas";
import { AirDataService, parseCellId, type AirProviderPreference } from "@airdelta/air-adapters";
import { optimizeHouseholdPlan, TemplateFallbackService, CONSTANTS_VERSION, ENGINE_VERSION } from "@airdelta/engine";
import { GeminiService } from "./gemini.service.js";
import { GroundingValidatorService } from "./grounding-validator.service.js";

export class PlannerService {
  private geminiService: GeminiService;
  private validatorService: GroundingValidatorService;
  private fallbackService: TemplateFallbackService;
  private narrationCache = new Map<string, { value: any; expiresAt: number }>();

  constructor(
    private airService: AirDataService,
    geminiOverride?: GeminiService,
    private disableLlm = false
  ) {
    this.geminiService = geminiOverride || new GeminiService();
    this.validatorService = new GroundingValidatorService();
    this.fallbackService = new TemplateFallbackService();
  }

  async generatePlan(
    profile: HouseholdProfile,
    targetLang = "en",
    airOverride?: AirSnapshot,
    forecastOverride?: AirForecast,
    includeLlm = true,
    preferredProvider?: AirProviderPreference
  ): Promise<PlanResponse> {
    const coords = parseCellId(profile.gridCell);
    const [air, forecast] = await Promise.all([
      airOverride ? Promise.resolve(airOverride) : this.airService.getAirSnapshot(coords.lat, coords.lng, preferredProvider),
      forecastOverride ? Promise.resolve(forecastOverride) : this.airService.getAirForecast(coords.lat, coords.lng)
    ]);

    // 1. Deterministic pure-TS engine optimization
    const engineResult = optimizeHouseholdPlan(profile, air, forecast);

    // 2. Narration path: Cache -> Gemini LLM -> Numeric Validator -> Deterministic Template Fallback
    let narrative = null;
    const cacheKey = `${profile.gridCell}:${air.indexValue ?? 0}:${targetLang}:${engineResult.planA.totalDoseUg.mid}:${engineResult.planB.totalDoseUg.mid}`;
    const cached = this.narrationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      narrative = cached.value;
    } else if (includeLlm && !this.disableLlm && this.geminiService.isAvailable()) {
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
          this.narrationCache.set(cacheKey, {
            value: generated,
            expiresAt: Date.now() + 15 * 60 * 1000
          });
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
      if (includeLlm && !this.disableLlm) {
        // Cache fallback briefly (60s) during transient upstream spikes so repeat loads stay instant
        this.narrationCache.set(cacheKey, {
          value: narrative,
          expiresAt: Date.now() + 60 * 1000
        });
      }
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
