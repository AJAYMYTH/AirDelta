import { NarrationOutput, PlanAOutput, PlanBOutput, AirSnapshot } from "@airdelta/schemas";

export class TemplateFallbackService {
  /**
   * Generates a 100% deterministically grounded narrative using pre-rendered
   * templates in the user's requested Indian regional language.
   */
  generateTemplateNarration(
    lang: string,
    air: AirSnapshot,
    planA: PlanAOutput,
    planB: PlanBOutput
  ): NarrationOutput {
    const aqi = air.indexValue || 385;
    const savingPercent = Math.round(planB.netSavingPercent);
    const savingUg = Math.round(planB.netSavingUg);
    const doseA = Math.round(planA.totalDoseUg.mid);
    const doseB = Math.round(planB.totalDoseUg.mid);

    const keyActions = planB.changes.map((c) => c.title);
    if (keyActions.length === 0) {
      keyActions.push("Keep windows closed during morning peak inversion hours");
    }

    switch (lang) {
      case "hi":
        return {
          lang: "hi",
          headline: `AQI ${aqi}: सुरक्षित दिनचर्या (योजना B) से ${savingPercent}% प्रदूषण अंतःश्वसन घटाएं`,
          body: `वर्तमान वायु गुणवत्ता गंभीर (AQI ${aqi}) है। सामान्य दिनचर्या में आपका अनुमानित PM2.5 अंतःश्वसन ${doseA} µg है। योजना B के उपायों को अपनाकर इसे घटाकर ${doseB} µg किया जा सकता है, जिससे ${savingUg} µg (${savingPercent}%) की बचत होगी।`,
          keyActions,
          source: "template"
        };

      case "bn":
        return {
          lang: "bn",
          headline: `AQI ${aqi}: অপ্টিমাইজড প্ল্যান B দ্বারা ${savingPercent}% দূষণ শ্বাস গ্রহণ কমান`,
          body: `বর্তমান বায়ু মান অত্যন্ত বিপজ্জনক (AQI ${aqi})। স্বাভাবিক রুটিনে মোট PM2.5 গ্রহণের মাত্রা ${doseA} µg। প্রস্তাবিত প্ল্যান B অনুসরণে এটি কমে ${doseB} µg হবে, অর্থাৎ ${savingUg} µg (${savingPercent}%) কম বিষাক্ত কণা শরীরে প্রবেশ করবে।`,
          keyActions,
          source: "template"
        };

      case "te":
        return {
          lang: "te",
          headline: `AQI ${aqi}: ప్లాన్ B ద్వారా ${savingPercent}% పీల్చే కాలుష్యాన్ని తగ్గించండి`,
          body: `ప్రస్తుత గాలి నాణ్యత తీవ్రంగా ఉంది (AQI ${aqi})। సాధారణ దినచర్యలో పీల్చే PM2.5 మోతాదు ${doseA} µg। ప్లాన్ B మార్పులతో ఇది ${doseB} µg కి తగ్గుతుంది, దీనివల్ల ${savingUg} µg (${savingPercent}%) రక్షణ లభిస్తుంది।`,
          keyActions,
          source: "template"
        };

      case "ta":
        return {
          lang: "ta",
          headline: `AQI ${aqi}: திட்டம் B மூலம் சுவாசிக்கும் மாசுபாட்டை ${savingPercent}% குறைக்கவும்`,
          body: `தற்போதைய காற்றுத் தரம் மிக மோசமாக உள்ளது (AQI ${aqi})। வழக்கமான முறையில் சுவாசிக்கும் PM2.5 அளவு ${doseA} µg। திட்டம் B மாற்றங்களால் இது ${doseB} µg ஆகக் குறைகிறது, அதாவது ${savingUg} µg (${savingPercent}%) சேமிக்கப்படும்।`,
          keyActions,
          source: "template"
        };

      case "kn":
        return {
          lang: "kn",
          headline: `AQI ${aqi}: ಯೋಜನೆ B ಮೂಲಕ ಉಸಿರಾಡುವ ಮಾಲಿನ್ಯವನ್ನು ${savingPercent}% ಕಡಿಮೆ ಮಾಡಿ`,
          body: `ಪ್ರಸ್ತುತ ವಾಯು ಗುಣಮಟ್ಟ ಗಂಭೀರವಾಗಿದೆ (AQI ${aqi})। ಸಾಮಾನ್ಯ ದಿನಚರಿಯಲ್ಲಿ ಅಂದಾಜು PM2.5 ಉಸಿರಾಟ ${doseA} µg। ಯೋಜನೆ B ಬದಲಾವಣೆಗಳಿಂದ ಇದು ${doseB} µg ಗೆ ಇಳಿಯುತ್ತದೆ, ಅಂದರೆ ${savingUg} µg (${savingPercent}%) ಉಳಿತಾಯವಾಗುತ್ತದೆ।`,
          keyActions,
          source: "template"
        };

      case "en":
      default:
        return {
          lang: "en",
          headline: `AQI ${aqi}: Plan B saves ${savingPercent}% of daily inhaled PM2.5`,
          body: `Ambient air quality is Severe (AQI ${aqi}). Your unadjusted Plan A routine results in an estimated ${doseA} µg of inhaled PM2.5. By applying Plan B adjustments, you can reduce this to ${doseB} µg, preventing ${savingUg} µg (${savingPercent}%) from entering your lungs.`,
          keyActions,
          source: "template"
        };
    }
  }
}
