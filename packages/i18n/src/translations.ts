export interface UIStrings {
  appName: string;
  tagline: string;
  todayTitle: string;
  planTitle: string;
  indoorTitle: string;
  communityTitle: string;
  replayTitle: string;
  methodTitle: string;
  planA: string;
  planB: string;
  netDoseSaved: string;
  co2eAvoided: string;
  cautionModeActive: string;
  cleanestWindowLabel: string;
  assumptionsUsed: string;
  markDone: string;
  shareAdvisory: string;
}

export const UI_TRANSLATIONS: Record<string, Partial<UIStrings>> = {
  en: {
    appName: "AirDelta",
    tagline: "Personalized Air Pollution Action Engine",
    todayTitle: "Today's Air",
    planTitle: "Plan A vs Plan B",
    indoorTitle: "Indoor Photo Audit",
    communityTitle: "Community Advisory",
    replayTitle: "Smog Replay Studio",
    methodTitle: "Data & Methodology",
    planA: "Plan A (Normal Routine)",
    planB: "Plan B (Optimized Day)",
    netDoseSaved: "Net Inhaled PM2.5 Saved",
    co2eAvoided: "Avoided Emissions",
    cautionModeActive: "Caution Mode: Conservative Thresholds Active",
    cleanestWindowLabel: "Cleanest Air Window",
    assumptionsUsed: "Assumptions & Evidence Used",
    markDone: "Mark Action Done",
    shareAdvisory: "Share Advisory Card"
  },
  hi: {
    appName: "AirDelta",
    tagline: "वायु प्रदूषण से बचाव की व्यक्तिगत कार्ययोजना",
    todayTitle: "आज की हवा",
    planTitle: "योजना A बनाम योजना B",
    indoorTitle: "कमरे की फोटो से जांच",
    communityTitle: "सामुदायिक सलाह",
    replayTitle: "स्मॉग रीप्ले स्टूडियो",
    methodTitle: "डेटा एवं वैज्ञानिक पद्धति",
    planA: "योजना A (सामान्य दिनचर्या)",
    planB: "योजना B (सुरक्षित दिनचर्या)",
    netDoseSaved: "सांस में जाने से बचा PM2.5",
    co2eAvoided: "उत्सर्जन में कमी",
    cautionModeActive: "सतर्कता मोड: अतिरिक्त सुरक्षा लागू",
    cleanestWindowLabel: "सबसे साफ हवा का समय",
    assumptionsUsed: "उपयोग किए गए मानक और स्रोत",
    markDone: "कार्य पूरा हुआ चिह्नित करें",
    shareAdvisory: "सलाह कार्ड साझा करें"
  },
  bn: {
    appName: "AirDelta",
    tagline: "বায়ু দূষণ মোকাবিলার ব্যক্তিগত পরিকল্পনা",
    todayTitle: "আজকের বাতাস",
    planTitle: "পরিকল্পনা A বনাম পরিকল্পনা B",
    indoorTitle: "ঘরের ছবি থেকে অডিট",
    communityTitle: "কমিউনিটি পরামর্শ",
    replayTitle: "ধোঁয়াশা রিপ্লে স্টুডিও",
    methodTitle: "উপাত্ত ও পদ্ধতি",
    planA: "পরিকল্পনা A (স্বাভাবিক রুটিন)",
    planB: "পরিকল্পনা B (অপ্টিমাইজড রুটিন)",
    netDoseSaved: "শ্বাস থেকে সংরক্ষিত PM2.5",
    co2eAvoided: "নির্গমন হ্রাস",
    cautionModeActive: "সতর্কতা মোড সক্রিয়",
    cleanestWindowLabel: "সবচেয়ে পরিষ্কার বাতাসের সময়",
    assumptionsUsed: "ব্যবহৃত ধ্রুবক ও প্রমাণ",
    markDone: "সম্পন্ন চিহ্নিত করুন",
    shareAdvisory: "পরামর্শ কার্ড শেয়ার করুন"
  },
  te: {
    appName: "AirDelta",
    tagline: "గాలి కాలుష్య కార్యాచరణ ఇంజిన్",
    todayTitle: "నేటి గాలి",
    planTitle: "ప్లాన్ A vs ప్లాన్ B",
    indoorTitle: "ఇంటి ఫోటో ఆడిట్",
    communityTitle: "కమ్యూనిటీ సూచనలు",
    replayTitle: "స్మాగ్ రీప్లే స్టూడియో",
    methodTitle: "డేటా మరియు పద్ధతులు",
    planA: "ప్లాన్ A (సాధారణ దినచర్య)",
    planB: "ప్లాన్ B (ఆప్టిమైజ్ చేసిన రోజు)",
    netDoseSaved: "పీల్చకుండా కాపాడిన PM2.5",
    co2eAvoided: "తగ్గిన ఉద్గారాలు",
    cautionModeActive: "జాగ్రత్త మోడ్ సక్రియంగా ఉంది",
    cleanestWindowLabel: "స్వచ్ఛమైన గాలి సమయం",
    assumptionsUsed: "ఉపయోగించిన ప్రమాణాలు",
    markDone: "పూర్తయినట్లు గుర్తించండి",
    shareAdvisory: "కార్డ్ భాగస్వామ్యం చేయండి"
  },
  ta: {
    appName: "AirDelta",
    tagline: "காற்று மாசுபாடு தடுப்பு திட்டம்",
    todayTitle: "இன்றைய காற்று",
    planTitle: "திட்டம் A vs திட்டம் B",
    indoorTitle: "வீட்டுப் புகைப்படம் தணிக்கை",
    communityTitle: "சமூக ஆலோசனை",
    replayTitle: "ஸ்மாக் ரீப்ளே ஸ்டுடியோ",
    methodTitle: "தரவு & அறிவியல் முறை",
    planA: "திட்டம் A (வழக்கமான முறை)",
    planB: "திட்டம் B (பாதுகாப்பான முறை)",
    netDoseSaved: "சுவாசிப்பதில் இருந்து தடுத்த PM2.5",
    co2eAvoided: "குறைக்கப்பட்ட உமிழ்வு",
    cautionModeActive: "எச்சரிக்கை நிலை இயக்கப்பட்டது",
    cleanestWindowLabel: "சுத்தமான காற்று நேரம்",
    assumptionsUsed: "பயன்படுத்தப்பட்ட ஆதாரங்கள்",
    markDone: "முடிந்தது என குறிக்கவும்",
    shareAdvisory: "பகிர்ந்து கொள்ளுங்கள்"
  },
  kn: {
    appName: "AirDelta",
    tagline: "ವಾಯು ಮಾಲಿನ್ಯ ರಕ್ಷಣಾ ಕಾರ್ಯಯೋಜನೆ",
    todayTitle: "ಇಂದಿನ ಗಾಳಿ",
    planTitle: "ಯೋಜನೆ A vs ಯೋಜನೆ B",
    indoorTitle: "ಒಳಾಂಗಣ ಫೋಟೋ ತಪಾಸಣೆ",
    communityTitle: "ಸಮುದಾಯ ಸಲಹೆ",
    replayTitle: "ಹೊಗೆಮಂಜು ಮರುಪ್ರದರ್ಶನ ಸ್ಟುಡಿಯೋ",
    methodTitle: "ದತ್ತಾಂಶ ಮತ್ತು ವಿಧಾನ",
    planA: "ಯೋಜನೆ A (ಸಾಮಾನ್ಯ ದಿನಚರಿ)",
    planB: "ಯೋಜನೆ B (ಸುರಕ್ಷಿತ ದಿನಚರಿ)",
    netDoseSaved: "ಉಸಿರಾಟದಿಂದ ತಡೆದ PM2.5 ಪ್ರಮಾಣ",
    co2eAvoided: "ಉದ್ಗಾರ ಕಡಿತ",
    cautionModeActive: "ಎಚ್ಚರಿಕೆ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ",
    cleanestWindowLabel: "ಅತ್ಯಂತ ಶುದ್ಧ ಗಾಳಿಯ ಸಮಯ",
    assumptionsUsed: "ಬಳಸಿದ ಮಾನದಂಡಗಳು",
    markDone: "ಮುಗಿದಿದೆ ಎಂದು ಗುರುತಿಸಿ",
    shareAdvisory: "ಕಾರ್ಡ್ ಹಂಚಿಕೊಳ್ಳಿ"
  }
};

export function getTranslation(key: keyof UIStrings, lang = "en"): string {
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.en;
  return dict[key] || UI_TRANSLATIONS.en[key] || String(key);
}
