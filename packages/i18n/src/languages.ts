export interface LanguageMeta {
  code: string;
  name: string;        // English name
  nativeName: string;  // Native script name
  direction: "ltr" | "rtl";
  isTier1: boolean;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageMeta> = {
  en: { code: "en", name: "English", nativeName: "English", direction: "ltr", isTier1: true },
  hi: { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", isTier1: true },
  bn: { code: "bn", name: "Bengali", nativeName: "বাংলা", direction: "ltr", isTier1: true },
  te: { code: "te", name: "Telugu", nativeName: "తెలుగు", direction: "ltr", isTier1: true },
  mr: { code: "mr", name: "Marathi", nativeName: "मराठी", direction: "ltr", isTier1: true },
  ta: { code: "ta", name: "Tamil", nativeName: "தமிழ்", direction: "ltr", isTier1: true },
  ur: { code: "ur", name: "Urdu", nativeName: "اردو", direction: "rtl", isTier1: true },
  gu: { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", direction: "ltr", isTier1: true },
  kn: { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", direction: "ltr", isTier1: true },
  or: { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", direction: "ltr", isTier1: true },
  ml: { code: "ml", name: "Malayalam", nativeName: "മലയാളം", direction: "ltr", isTier1: true },
  pa: { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", direction: "ltr", isTier1: true },
  as: { code: "as", name: "Assamese", nativeName: "অসমীয়া", direction: "ltr", isTier1: true }
};

export const DEFAULT_LANGUAGE = "en";

export function isLanguageSupported(code: string): boolean {
  return code in SUPPORTED_LANGUAGES;
}

export function getLanguageMeta(code: string): LanguageMeta {
  return SUPPORTED_LANGUAGES[code] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
}

export function getAllLanguages(): LanguageMeta[] {
  return Object.values(SUPPORTED_LANGUAGES);
}
