import { GoogleGenAI } from "@google/genai";
import {
  AirSnapshot,
  PlanAOutput,
  PlanBOutput,
  NarrationOutput,
  NarrationOutputSchema
} from "@airdelta/schemas";

export interface GeminiServiceConfig {
  apiKey?: string;
  modelName?: string;
}

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private modelCandidates: string[];

  constructor(config: GeminiServiceConfig = {}) {
    const key = config.apiKey ?? process.env.GEMINI_API_KEY;
    const primaryModel = config.modelName || process.env.GEMINI_MODEL_NARRATE || "gemini-3.1-flash-lite";
    this.modelCandidates = Array.from(
      new Set([primaryModel, "gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash"])
    );

    if (key && key.trim().length > 0 && !key.includes("your_gemini") && process.env.LLM_ENABLED !== "false") {
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  isAvailable(): boolean {
    return Boolean(this.ai);
  }

  async generatePlanNarration(
    targetLang: string,
    air: AirSnapshot,
    planA: PlanAOutput,
    planB: PlanBOutput
  ): Promise<NarrationOutput | null> {
    if (!this.ai) return null;

    const prompt = `
You are AirDelta's public health science narrator. 
Explain the personalized air pollution exposure differences between Plan A (normal routine) and Plan B (optimized plan) in the requested language.

CRITICAL INSTRUCTIONS:
1. Respond STRICTLY with structured JSON matching the schema.
2. DO NOT hallucinate or compute any numbers. Every single number you write MUST be taken directly from the provided data:
   - Ambient AQI: ${air.indexValue}
   - Ambient PM2.5: ${air.pm25} µg/m³
   - Plan A Total Inhaled Dose: ${planA.totalDoseUg.mid} µg
   - Plan B Total Inhaled Dose: ${planB.totalDoseUg.mid} µg
   - Net PM2.5 Dose Saving: ${planB.netSavingUg} µg (${planB.netSavingPercent}%)
   - Recommended Changes: ${JSON.stringify(planB.changes.map((c) => ({ title: c.title, deltaUg: c.deltaUg })))}
3. Never invent medical diagnoses, prescriptions, or clinical treatments.
4. Output in language code: "${targetLang}".

JSON Schema:
{
  "lang": "${targetLang}",
  "headline": "Short compelling summary header",
  "body": "Clear 2-3 sentence explanation with exact numbers from above",
  "keyActions": ["Action 1", "Action 2"],
  "source": "llm"
}
`;

    for (let i = 0; i < this.modelCandidates.length; i++) {
      const model = this.modelCandidates[i];
      const timeoutMs = i === 0 ? 6000 : 4500;
      try {
        const response = await Promise.race([
          this.ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Gemini narration timeout")), timeoutMs)
          )
        ]);

        const text = response.text;
        if (!text) continue;

        const parsedJson = JSON.parse(text);
        return NarrationOutputSchema.parse({
          ...parsedJson,
          source: "llm"
        });
      } catch {
        // Try next Flash fallback candidate
      }
    }

    return null;
  }
}
