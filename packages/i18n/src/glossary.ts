export interface TermGlossary {
  termKey: string;
  en: string;
  hi: string;
  bn: string;
  te: string;
  mr: string;
  ta: string;
  kn: string;
  gu: string;
  pa: string;
}

export const AIR_GLOSSARY: Record<string, TermGlossary> = {
  aqi: {
    termKey: "aqi",
    en: "Air Quality Index (AQI)",
    hi: "वायु गुणवत्ता सूचकांक (AQI)",
    bn: "বায়ু গুণমান সূচক (AQI)",
    te: "గాలి నాణ్యత సూచిక (AQI)",
    mr: "हवा गुणवत्ता निर्देशांक (AQI)",
    ta: "காற்றுத் தரக் குறியீடு (AQI)",
    kn: "ವಾಯು ಗುಣಮಟ್ಟ ಸೂಚ್ಯಂಕ (AQI)",
    gu: "વાયુ ગુણવત્તા સૂચકાંક (AQI)",
    pa: "ਹਵਾ ਗੁਣਵੱਤਾ ਸੂਚਕਾਂਕ (AQI)"
  },
  pm25: {
    termKey: "pm25",
    en: "Fine Particulate Matter (PM2.5)",
    hi: "सूक्ष्म धूल कण (PM2.5)",
    bn: "সূক্ষ্ম কণা পদার্থ (PM2.5)",
    te: "సూక్ష్మ ధూళి కణాలు (PM2.5)",
    mr: "अतिसूक्ष्म कण (PM2.5)",
    ta: "நுண் துகள்கள் (PM2.5)",
    kn: "ಸೂಕ್ಷ್ಮ ಕಣ ವಸ್ತು (PM2.5)",
    gu: "અતિ સૂક્ષ્મ રજકણો (PM2.5)",
    pa: "ਸੂਖਮ ਧੂੜ ਕਣ (PM2.5)"
  },
  inhaled_dose: {
    termKey: "inhaled_dose",
    en: "Inhaled PM2.5 Dose",
    hi: "सांस में गई PM2.5 की मात्रा",
    bn: "শ্বাসের সাথে গৃহীত PM2.5 এর মাত্রা",
    te: "పీల్చిన PM2.5 మోతాదు",
    mr: "श्वासाद्वारे शरीरात गेलेला PM2.5",
    ta: "சுவாசித்த PM2.5 அளவு",
    kn: "ಉಸಿರಾಡಿದ PM2.5 ಪ್ರಮಾಣ",
    gu: "શ્વાસમાં ગયેલું PM2.5 નું પ્રમાણ",
    pa: "ਸਾਹ ਰਾਹੀਂ ਅੰਦਰ ਗਈ PM2.5 ਦੀ ਮਾਤਰਾ"
  },
  cleanest_window: {
    termKey: "cleanest_window",
    en: "Cleanest Air Window",
    hi: "सबसे साफ हवा का समय",
    bn: "দিনের সবচেয়ে পরিষ্কার বাতাসের সময়",
    te: "అత్యంత స్వచ్ఛమైన గాలి సమయం",
    mr: "सर्वात स्वच्छ हवेची वेळ",
    ta: "சுத்தமான காற்று நேரம்",
    kn: "ಅತ್ಯಂತ ಶುದ್ಧ ಗಾಳಿಯ ಸಮಯ",
    gu: "સૌથી શુદ્ધ હવાનો સમય",
    pa: "ਸਭ ਤੋਂ ਸਾਫ਼ ਹਵਾ ਦਾ ਸਮਾਂ"
  },
  smog: {
    termKey: "smog",
    en: "Severe Smog",
    hi: "गंभीर धुंध (स्मॉग)",
    bn: "মারাত্মক ধোঁয়াশা (স্মগ)",
    te: "తీవ్రమైన పొగమంచు (స్మాగ్)",
    mr: "धुरके (स्मॉग)",
    ta: "கடுமையான பனிப்புகை (ஸ்மாக்)",
    kn: "ತೀವ್ರ ಹೊಗೆಮಂಜು (ಸ್ಮಾಗ್)",
    gu: "ગંભીર ધુમ્મસ (સ્મોગ)",
    pa: "ਗੰਭੀਰ ਧੁੰਦ-ਧੂੰਆਂ (ਸਮੌਗ)"
  },
  badge_measured: {
    termKey: "badge_measured",
    en: "Measured (Ground Monitor)",
    hi: "मापा गया (जमीनी मॉनिटर)",
    bn: "পরিমাপকৃত (গ্রাউন্ড মনিটর)",
    te: "కొలిచినది (భూస్థాయి మానిటర్)",
    mr: "मोजलेले (ग्राउंड मॉनिटर)",
    ta: "அளவிடப்பட்டது (நில கண்காணிப்பு)",
    kn: "ಅಳತೆ ಮಾಡಲಾಗಿದೆ (ನೆಲದ ಮಾನಿಟರ್)",
    gu: "માપેલું (ગ્રાઉન્ડ મોનિટર)",
    pa: "ਮਾਪਿਆ ਗਿਆ (ਜ਼ਮੀਨੀ ਮਾਨੀਟਰ)"
  },
  badge_forecast: {
    termKey: "badge_forecast",
    en: "Forecast",
    hi: "पूर्वानुमान",
    bn: "পূর্বাভাস",
    te: "వాతావరణ అంచనా",
    mr: "अंदाज",
    ta: "முன்னறிவிப்பு",
    kn: "ಮುನ್ಸೂಚನೆ",
    gu: "આગાહી",
    pa: "ਪੂਰਵ ਅਨੁਮਾਨ"
  },
  badge_modelled: {
    termKey: "badge_modelled",
    en: "Modelled (Exposure Physics)",
    hi: "मॉडल आधारित (भौतिक गणना)",
    bn: "মডেল ভিত্তিক (পদার্থবিজ্ঞান গণনা)",
    te: "మోడల్ ఆధారితం (భౌతిక లెక్కలు)",
    mr: "मॉडेल आधारित (भौतिक गणना)",
    ta: "மாதிரி அடிப்படையிலானது (இயற்பியல்)",
    kn: "ಮಾದರಿ ಆಧಾರಿತ (ಭೌತಿಕ ಲೆಕ್ಕಾಚಾರ)",
    gu: "મોડેલ આધારિત (ભૌતિક ગણતરી)",
    pa: "ਮਾਡਲ ਅਧਾਰਿਤ (ਭੌਤਿਕ ਗਣਨਾ)"
  },
  badge_assumed: {
    termKey: "badge_assumed",
    en: "Assumed (Registered Constant)",
    hi: "मानक स्थिरांक (साहित्य आधारित)",
    bn: "ধরে নেওয়া (নিবন্ধিত ধ্রুবক)",
    te: "ప్రామాణిక స్థిరాంకం",
    mr: "प्रमाणित स्थिरांक",
    ta: "நிலையான மாறிலி",
    kn: "ಪ್ರಾಮಾಣಿಕ ಸ್ಥಿರಾಂಕ",
    gu: "પ્રમાણિત અચળાંક",
    pa: "ਪ੍ਰਮਾਣਿਤ ਸਥਿਰਾਂਕ"
  }
};

export function getGlossaryTerm(termKey: string, lang = "en"): string {
  const entry = AIR_GLOSSARY[termKey];
  if (!entry) return termKey;
  const langKey = lang as keyof TermGlossary;
  return entry[langKey] || entry.en || termKey;
}
