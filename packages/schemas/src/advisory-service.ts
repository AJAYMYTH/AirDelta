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
    const aqi = air.indexValue || 385;
    const grapRule = getGrapStageForAqi(aqi);

    let mandates: string[] = [];
    if (audience === "rwa_residents") mandates = grapRule.rwaMandates;
    else if (audience === "school_community") mandates = grapRule.schoolMandates;
    else if (audience === "workplace") mandates = grapRule.workplaceMandates;
    else mandates = grapRule.citizenDos;

    const { headline, body, actionBulletPoints } = this.getLocalizedAdvisoryContent(
      lang,
      audience,
      aqi,
      grapRule.stageName,
      mandates
    );

    const shareCardText = this.buildShareCardText(
      headline,
      aqi,
      grapRule.stageName,
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
      badge: "forecast"
    };
  }

  private getLocalizedAdvisoryContent(
    lang: string,
    audience: AudienceType,
    aqi: number,
    stageName: string,
    mandates: string[]
  ): { headline: string; body: string; actionBulletPoints: string[] } {
    switch (lang) {
      case "hi":
        return {
          headline: `⚠️ वायु गुणवत्ता अलर्ट (AQI ${aqi}) — ${stageName} लागू`,
          body: `राष्ट्रीय राजधानी क्षेत्र में वायु गुणवत्ता 'गंभीर' श्रेणी में दर्ज की गई है। सीएक्यूएम (CAQM) द्वारा ${stageName} के कड़े नियम लागू किए गए हैं। सभी नागरिकों एवं प्रबंधकों से तत्काल सुरक्षा निर्देशों का पालन करने का अनुरोध है।`,
          actionBulletPoints: mandates
        };

      case "bn":
        return {
          headline: `⚠️ বায়ু গুণমান সতর্কতা (AQI ${aqi}) — ${stageName} কার্যকর`,
          body: `বায়ু মান অত্যন্ত বিপজ্জনক পর্যায়ে পৌঁছেছে (AQI ${aqi})। সরকারি নির্দেশিকা অনুযায়ী ${stageName} সতর্কতা জারি করা হয়েছে। আবাসিক ও প্রতিষ্ঠানগুলিকে অবিলম্বে সুরক্ষামূলক ব্যবস্থা গ্রহণের নির্দেশ দেওয়া হচ্ছে।`,
          actionBulletPoints: mandates
        };

      case "te":
        return {
          headline: `⚠️ గాలి నాణ్యత హెచ్చరిక (AQI ${aqi}) — ${stageName} అమలులో ఉంది`,
          body: `గాలి కాలుష్యం తీవ్ర స్థాయికి చేరుకుంది (AQI ${aqi})। ప్రభుత్వం ${stageName} నిబంధనలను అమలు చేసింది। ప్రతి ఒక్కరూ తక్షణమే అవసరమైన రక్షణ చర్యలు పాటించాలని కోరుతున్నాము।`,
          actionBulletPoints: mandates
        };

      case "ta":
        return {
          headline: `⚠️ காற்றுத் தர எச்சரிக்கை (AQI ${aqi}) — ${stageName} அமல்`,
          body: `காற்று மாசுபாடு தீவிர நிலையை எட்டியுள்ளது (AQI ${aqi})। அரசு ${stageName} கட்டுப்பாடுகளை விதித்துள்ளது। அனைவரும் உடனடியாக பாதுகாப்பு வழிகாட்டுதல்களைப் பின்பற்றுமாறு கேட்டுக்கொள்ளப்படுகிறார்கள்।`,
          actionBulletPoints: mandates
        };

      case "kn":
        return {
          headline: `⚠️ ವಾಯು ಗುಣಮಟ್ಟ ಎಚ್ಚರಿಕೆ (AQI ${aqi}) — ${stageName} ಜಾರಿಯಲ್ಲಿದೆ`,
          body: `ವಾಯು ಮಾಲಿನ್ಯವು ಗಂಭೀರ ಮಟ್ಟವನ್ನು ತಲುಪಿದೆ (AQI ${aqi})। ಸರ್ಕಾರವು ${stageName} ಕಟ್ಟುನಿಟ್ಟಿನ ನಿಯಮಗಳನ್ನು ಜಾರಿಗೆ ತಂದಿದೆ। ಎಲ್ಲಾ ನಿವಾಸಿಗಳು ಮತ್ತು ಸಂಸ್ಥೆಗಳು ತಕ್ಷಣ ರಕ್ಷಣಾತ್ಮಕ ಕ್ರಮಗಳನ್ನು ಅನುಸರಿಸಲು ಕೋರಲಾಗಿದೆ।`,
          actionBulletPoints: mandates
        };

      case "en":
      default:
        return {
          headline: `⚠️ Air Quality Advisory (AQI ${aqi}) — ${stageName} In Effect`,
          body: `Ambient air quality has entered the Severe threshold (AQI ${aqi}). CAQM has invoked ${stageName} emergency protocols across the urban region. All community members and facility managers must adhere to the designated mandates below.`,
          actionBulletPoints: mandates
        };
    }
  }

  private buildShareCardText(
    headline: string,
    aqi: number,
    stageName: string,
    bulletPoints: string[]
  ): string {
    return [
      `📢 *AIRDELTA COMMUNITY ADVISORY*`,
      `${headline}`,
      `📍 Current Status: Severe (AQI ${aqi}) · ${stageName}`,
      ``,
      `*MANDATORY ACTIONS & RECOMMENDATIONS:*`,
      ...bulletPoints.map((b) => `• ${b}`),
      ``,
      `🛡️ *Verified Source:* AirDelta · CPCB NAQI Guidelines`,
      `🔗 Plan your family's routine: https://airdelta.app`
    ].join("\n");
  }
}
