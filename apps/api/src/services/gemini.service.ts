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
  private modelName: string;

  constructor(config: GeminiServiceConfig = {}) {
    const key = config.apiKey || process.env.GEMINI_API_KEY;
    this.modelName = config.modelName || process.env.GEMINI_MODEL_NARRATE || "gemini-2.0-flash";

    if (key && key.trim().length > 0) {
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

    try {
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

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) return null;

      const parsedJson = JSON.parse(text);
      const validated = NarrationOutputSchema.parse({
        ...parsedJson,
        source: "llm"
      });

      return validated;
    } catch (err) {
      // In case of rate limits, network issues, or validation errors
      return null;
    }
  }
}
