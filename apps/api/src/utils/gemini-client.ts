import { GoogleGenAI } from "@google/genai";

/**
 * Creates a GoogleGenAI client when a valid non-placeholder API key is present
 * and LLM usage is not explicitly disabled via `LLM_ENABLED=false`.
 */
export function createGeminiClient(apiKey?: string): GoogleGenAI | null {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key || key.trim().length === 0 || key.includes("your_gemini") || process.env.LLM_ENABLED === "false") {
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Executes a Gemini `generateContent` request across fallback candidate models with per-model timeouts.
 */
export async function generateWithModelFallback(
  ai: GoogleGenAI | null,
  models: string[],
  contents: any,
  options: {
    responseMimeType?: string;
    firstTimeoutMs?: number;
    fallbackTimeoutMs?: number;
  } = {}
): Promise<string | null> {
  if (!ai) return null;
  const firstMs = options.firstTimeoutMs ?? 6000;
  const fallbackMs = options.fallbackTimeoutMs ?? 4500;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const timeoutMs = i === 0 ? firstMs : fallbackMs;
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents,
          ...(options.responseMimeType ? { config: { responseMimeType: options.responseMimeType } } : {})
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini timeout (${model})`)), timeoutMs)
        )
      ]);
      const text = response.text?.trim();
      if (text) return text;
    } catch {
      // Fall through to next candidate model
    }
  }

  return null;
}
