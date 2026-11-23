import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LANGUAGES,
  isLanguageSupported,
  getLanguageMeta,
  getGlossaryTerm,
  getTranslation,
  UI_TRANSLATIONS
} from "../src/index.js";

describe("@airdelta/i18n test suite", () => {
  it("supports all major Indian regional languages and English", () => {
    const requiredLangs = [
      "en", "hi", "bn", "te", "mr", "ta", "ur", "gu", "kn", "or", "ml", "pa", "as"
    ];
    for (const code of requiredLangs) {
      expect(isLanguageSupported(code)).toBe(true);
      const meta = getLanguageMeta(code);
      expect(meta.nativeName.length).toBeGreaterThan(0);
      expect(meta.direction).toMatch(/^(ltr|rtl)$/);
    }
  });

  it("retrieves glossary terms in regional languages with fallback", () => {
    const hindiAqi = getGlossaryTerm("aqi", "hi");
    expect(hindiAqi).toContain("वायु गुणवत्ता सूचकांक");

    const kannadaCleanWindow = getGlossaryTerm("cleanest_window", "kn");
    expect(kannadaCleanWindow).toContain("ಶುದ್ಧ ಗಾಳಿಯ ಸಮಯ");

    const tamilDose = getGlossaryTerm("inhaled_dose", "ta");
    expect(tamilDose).toContain("சுவாசித்த");

    // Fallback to English for unlisted term or language
    const fallback = getGlossaryTerm("non_existent_term", "hi");
    expect(fallback).toBe("non_existent_term");
  });

  it("resolves UI translations across regional languages with fallback", () => {
    expect(getTranslation("appName", "en")).toBe("AirDelta");
    expect(getTranslation("planA", "hi")).toBe("योजना A (सामान्य दिनचर्या)");
    expect(getTranslation("planB", "bn")).toBe("পরিকল্পনা B (অপ্টিমাইজড রুটিন)");
    expect(getTranslation("netDoseSaved", "te")).toBe("పీల్చకుండా కాపాడిన PM2.5");
    expect(getTranslation("todayTitle", "as")).toBe("আজিৰ বায়ু আৰু সুৰক্ষা কাৰ্যসূচী");

    // Fallback to English for unknown language
    expect(getTranslation("todayTitle", "unsupported" as any)).toBe(UI_TRANSLATIONS.en.todayTitle);
  });
});
