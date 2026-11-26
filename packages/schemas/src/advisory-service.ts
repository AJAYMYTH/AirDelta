import { randomUUID } from "node:crypto";
import {
  AdvisoryResponse,
  AudienceType
} from "./advisory.js";
import { AirSnapshot } from "./air.js";
import { getGrapStageForAqi } from "./grap.js";

export class AdvisoryService {
  /**
   * Generates tailored community advisories in the target Indian regional language,
   * with formatted shareable text cards for WhatsApp and Telegram distribution.
   */
  generateAdvisory(
    audience: AudienceType,
    air: AirSnapshot,
    lang = "hi"
  ): AdvisoryResponse {
    const aqi = air.indexValue ?? 385;
    const category = air.category || "Moderate";
    const grapRule = getGrapStageForAqi(aqi);

    let mandates: string[] = [];
    if (audience === "rwa_residents") mandates = grapRule.rwaMandates;
    else if (audience === "school_community") mandates = grapRule.schoolMandates;
    else if (audience === "workplace") mandates = grapRule.workplaceMandates;
    else mandates = grapRule.citizenDos;

    const { headline, body, actionBulletPoints } = this.getLocalizedAdvisoryContent(
      lang,
      aqi,
      category,
      grapRule.stageName,
      mandates
    );

    const shareCardText = this.buildShareCardText(
      headline,
      aqi,
      category,
      grapRule.stageName,
      air.attribution,
      actionBulletPoints
    );

    return {
      advisoryId: randomUUID(),
      createdAt: new Date().toISOString(),
      lang,
      audience,
      grapStage: grapRule.stage,
      headline,
      body,
      actionBulletPoints,
      shareCardText,
      badge: air.badge === "measured" ? "measured" : "forecast"
    };
  }

  private getLocalizedAdvisoryContent(
    lang: string,
    aqi: number,
    category: string,
    stageName: string,
    mandates: string[]
  ): { headline: string; body: string; actionBulletPoints: string[] } {
    switch (lang) {
      case "hi":
        return {
          headline: `⚠️ वायु गुणवत्ता अलर्ट (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `वर्तमान वायु गुणवत्ता श्रेणी '${category}' (AQI ${aqi}) दर्ज की गई है। ${stageName} के अंतर्गत निर्धारित सुरक्षा निर्देशों का पालन करने का अनुरोध है।`,
          actionBulletPoints: mandates
        };

      case "bn":
        return {
          headline: `⚠️ বায়ু গুণমান সতর্কতা (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `বর্তমান বায়ু মান '${category}' পর্যায়ে রয়েছে (AQI ${aqi})। ${stageName} নির্দেশিকা অনুযায়ী সুরক্ষামূলক ব্যবস্থা গ্রহণের অনুরোধ করা হচ্ছে।`,
          actionBulletPoints: mandates
        };

      case "te":
        return {
          headline: `⚠️ గాలి నాణ్యత హెచ్చరిక (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `ప్రస్తుత గాలి నాణ్యత '${category}' స్థాయిలో ఉంది (AQI ${aqi}). ${stageName} ప్రకారం తగిన రక్షణ చర్యలు పాటించాలని కోరుతున్నాము.`,
          actionBulletPoints: mandates
        };

      case "mr":
        return {
          headline: `⚠️ हवा गुणवत्ता सूचना (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `सध्याची हवेची गुणवत्ता '${category}' श्रेणीत आहे (AQI ${aqi}). ${stageName} अंतर्गत खालील सुरक्षा नियमांचे पालन करावे.`,
          actionBulletPoints: mandates
        };

      case "ta":
        return {
          headline: `⚠️ காற்றுத் தர எச்சரிக்கை (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `தற்போதைய காற்றுத் தரம் '${category}' நிலையில் உள்ளது (AQI ${aqi}). ${stageName} வழிகாட்டுதல்களின்படி பாதுகாப்பு நடவடிக்கைகளை பின்பற்றவும்.`,
          actionBulletPoints: mandates
        };

      case "ur":
        return {
          headline: `⚠️ فضائی معیار کی ہدایت (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `موجودہ فضائی معیار '${category}' درجے میں ہے (AQI ${aqi})۔ ${stageName} کے تحت درج ذیل حفاظتی اقدامات پر عمل کریں۔`,
          actionBulletPoints: mandates
        };

      case "gu":
        return {
          headline: `⚠️ હવા ગુણવત્તા સલાહ (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `હાલની હવાની ગુણવત્તા '${category}' શ્રેણીમાં છે (AQI ${aqi}). ${stageName} હેઠળ આપેલા સુરક્ષા પગલાંનું પાલન કરવા વિનંતી છે.`,
          actionBulletPoints: mandates
        };

      case "kn":
        return {
          headline: `⚠️ ವಾಯು ಗುಣಮಟ್ಟ ಎಚ್ಚರಿಕೆ (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `ಪ್ರಸ್ತುತ ವಾಯು ಗುಣಮಟ್ಟ '${category}' ಮಟ್ಟದಲ್ಲಿದೆ (AQI ${aqi}). ${stageName} ಮಾರ್ಗಸೂಚಿಗಳ ಪ್ರಕಾರ ರಕ್ಷಣಾ ಕ್ರಮಗಳನ್ನು ಅನುಸರಿಸಿ.`,
          actionBulletPoints: mandates
        };

      case "or":
        return {
          headline: `⚠️ ବାୟୁ ମାନ ସୂଚନା (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `ବର୍ତ୍ତମାନର ବାୟୁ ମାନ '${category}' ସ୍ତରରେ ଅଛି (AQI ${aqi})। ${stageName} ଅନୁଯାୟୀ ନିମ୍ନଲିଖିତ ସୁରକ୍ଷା ପଦକ୍ଷେପ ଅନୁସରଣ କରନ୍ତୁ।`,
          actionBulletPoints: mandates
        };

      case "ml":
        return {
          headline: `⚠️ വായു ഗുണനിലവാര നിർദ്ദേശം (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `നിലവിലെ വായു ഗുണനിലവാരം '${category}' വിഭാഗത്തിലാണ് (AQI ${aqi}). ${stageName} പ്രകാരമുള്ള സുരക്ഷാ നിർദ്ദേശങ്ങൾ പാലിക്കുക.`,
          actionBulletPoints: mandates
        };

      case "pa":
        return {
          headline: `⚠️ ਹਵਾ ਗੁਣਵੱਤਾ ਸਲਾਹ (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `ਮੌਜੂਦਾ ਹਵਾ ਦੀ ਗੁਣਵੱਤਾ '${category}' ਸ਼੍ਰੇਣੀ ਵਿੱਚ ਹੈ (AQI ${aqi})। ${stageName} ਅਧੀਨ ਦਿੱਤੇ ਸੁਰੱਖਿਆ ਨਿਯਮਾਂ ਦੀ ਪਾਲਣਾ ਕਰੋ।`,
          actionBulletPoints: mandates
        };

      case "as":
        return {
          headline: `⚠️ বায়ু গুণমান পৰামৰ্শ (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `বৰ্তমান বায়ুৰ মান '${category}' স্তৰত আছে (AQI ${aqi})। ${stageName} অনুসৰি তলৰ সুৰক্ষা নিৰ্দেশনাসমূহ মানি চলক।`,
          actionBulletPoints: mandates
        };

      case "en":
      default:
        return {
          headline: `⚠️ Air Quality Advisory (AQI ${aqi} · ${category}) — ${stageName}`,
          body: `Ambient air quality is currently '${category}' (CPCB NAQI ${aqi}). Under ${stageName} guidance, community members and facility managers should follow the protective measures below.`,
          actionBulletPoints: mandates
        };
    }
  }

  private buildShareCardText(
    headline: string,
    aqi: number,
    category: string,
    stageName: string,
    attribution: string,
    bulletPoints: string[]
  ): string {
    return [
      `📢 *AIRDELTA COMMUNITY ADVISORY*`,
      `${headline}`,
      `📍 Current Status: ${category} (AQI ${aqi}) · ${stageName}`,
      `🔬 Data Source: ${attribution}`,
      ``,
      `*RECOMMENDED ACTIONS:*`,
      ...bulletPoints.map((b) => `• ${b}`),
      ``,
      `🛡️ *Verified Source:* AirDelta · CPCB NAQI & OpenAQ Guidelines`,
      `🔗 Plan your family's routine: https://airdelta.app`
    ].join("\n");
  }
}
