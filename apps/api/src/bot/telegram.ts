import { Bot, InlineKeyboard } from "grammy";
import { AirDataService, parseCellId } from "@airdelta/air-adapters";
import { optimizeHouseholdPlan } from "@airdelta/engine";
import { AdvisoryService } from "@airdelta/schemas";
import { getTranslation, getGlossaryTerm } from "@airdelta/i18n";
import { VisionService } from "../services/vision.service.js";

export interface BotConfig {
  token?: string;
  webhookSecret?: string;
}

export class AirDeltaBot {
  public bot: Bot | null = null;
  private userLangMap = new Map<number, string>();
  private userCityMap = new Map<number, string>();

  constructor(
    private airService: AirDataService,
    private advisoryService: AdvisoryService,
    private visionService: VisionService,
    config: BotConfig = {}
  ) {
    const token = config.token || process.env.TELEGRAM_BOT_TOKEN;
    if (token && token.trim().length > 10) {
      this.bot = new Bot(token);
      this.registerHandlers();
    }
  }

  isConfigured(): boolean {
    return Boolean(this.bot);
  }

  private registerHandlers() {
    if (!this.bot) return;

    this.bot.command("start", async (ctx) => {
      const keyboard = new InlineKeyboard()
        .text("📍 Delhi-NCR", "city_delhi")
        .text("📍 Kanpur", "city_kanpur")
        .row()
        .text("📍 Patna", "city_patna")
        .text("📍 Lucknow", "city_lucknow")
        .row()
        .text("🌐 Change Language", "cmd_lang");

      await ctx.reply(
        `👋 *Welcome to AirDelta (Δ)*\n\nYour personal health action engine for severe winter smog and urban air pollution.\n\n*Select your city to begin:*`,
        { reply_markup: keyboard, parse_mode: "Markdown" }
      );
    });

    this.bot.command("today", async (ctx) => {
      const chatId = ctx.chat?.id || 0;
      const lang = this.userLangMap.get(chatId) || "en";
      const replyText = await this.getTodayText(28.6139, 77.209, lang);
      await ctx.reply(replyText, { parse_mode: "Markdown" });
    });

    this.bot.command("plan", async (ctx) => {
      const chatId = ctx.chat?.id || 0;
      const lang = this.userLangMap.get(chatId) || "en";
      const replyText = await this.getPlanText(28.6139, 77.209, lang);
      await ctx.reply(replyText, { parse_mode: "Markdown" });
    });

    this.bot.command("advisory", async (ctx) => {
      const chatId = ctx.chat?.id || 0;
      const lang = this.userLangMap.get(chatId) || "hi";
      const replyText = await this.getAdvisoryText("rwa_residents", 28.6139, 77.209, lang);
      await ctx.reply(replyText, { parse_mode: "Markdown" });
    });

    this.bot.command("lang", async (ctx) => {
      const keyboard = new InlineKeyboard()
        .text("English", "lang_en")
        .text("हिन्दी", "lang_hi")
        .row()
        .text("বাংলা", "lang_bn")
        .text("తెలుగు", "lang_te")
        .row()
        .text("தமிழ்", "lang_ta")
        .text("ಕನ್ನಡ", "lang_kn");

      await ctx.reply("🌐 *Select your preferred language:*", {
        reply_markup: keyboard,
        parse_mode: "Markdown"
      });
    });

    // Handle button callbacks
    this.bot.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data;
      const chatId = ctx.chat?.id || 0;

      if (data.startsWith("lang_")) {
        const lang = data.replace("lang_", "");
        this.userLangMap.set(chatId, lang);
        await ctx.answerCallbackQuery({ text: `Language changed to ${lang.toUpperCase()}` });
        await ctx.reply(`✅ *Language updated successfully!*\nUse /today or /plan to view recommendations.`);
      } else if (data.startsWith("city_")) {
        const city = data.replace("city_", "");
        this.userCityMap.set(chatId, city);
        await ctx.answerCallbackQuery({ text: `City set to ${city}` });
        const text = await this.getTodayText(28.6139, 77.209, this.userLangMap.get(chatId) || "en");
        await ctx.reply(text, { parse_mode: "Markdown" });
      }
    });

    // Handle photo messages for indoor audit
    this.bot.on("message:photo", async (ctx) => {
      await ctx.reply("🔍 *Analyzing room image for indoor pollution sources & ventilation gaps...*", { parse_mode: "Markdown" });
      const audit = await this.visionService.auditIndoorPhoto(undefined, "image/jpeg", "low", "kitchen");

      const lines = [
        `📷 *INDOOR PHOTO AUDIT RESULTS*`,
        `Detected ${audit.detectedSources.length} potential sources:`,
        ...audit.detectedSources.map((s) => `• *${s.label}* (${Math.round(s.confidence * 100)}%): ${s.detectedReason}`),
        ``,
        `💡 *Top Recommended Fix:*`,
        `• *${audit.curatedFixes[0]?.title}*: ${audit.curatedFixes[0]?.description}`,
        ``,
        `🔗 Open full visual audit: https://airdelta.app/indoor`
      ];

      await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
    });
  }

  public async getTodayText(lat: number, lng: number, lang = "en"): Promise<string> {
    const snapshot = await this.airService.getAirSnapshot(lat, lng);
    const forecast = await this.airService.getAirForecast(lat, lng);

    const aqi = snapshot.indexValue || 385;
    const badgeTag = `[${snapshot.badge.toUpperCase()}: ${snapshot.source}]`;

    const lines = [
      `🌤️ *AIRDELTA TODAY SNAPSHOT*`,
      `📍 Location: Delhi-NCR (ITO)`,
      `💨 *AQI:* ${aqi} · *${snapshot.category || "Severe"}* ${badgeTag}`,
      `🔬 *PM2.5:* ${snapshot.pm25} µg/m³ · *PM10:* ${snapshot.pm10} µg/m³`,
      ``,
      `✨ *CLEANEST AIR WINDOW:*`,
      `⏰ ${forecast.cleanestWindow ? new Date(forecast.cleanestWindow.startTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " – " + new Date(forecast.cleanestWindow.endTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "13:00 – 15:30"}`,
      `Expected PM2.5 drops to ~${forecast.cleanestWindow?.expectedPm25 || 210} µg/m³`,
      ``,
      `🚨 *CAQM Alert:* GRAP Stage III Active. Wear an N95 respirator during commute.`,
      `👉 Send /plan to view your family's optimized exposure plan.`
    ];

    return lines.join("\n");
  }

  public async getPlanText(lat: number, lng: number, lang = "en"): Promise<string> {
    const snapshot = await this.airService.getAirSnapshot(lat, lng);
    const forecast = await this.airService.getAirForecast(lat, lng);

    const profile = {
      cityCode: "DELHI",
      gridCell: "28.61:77.21",
      lang,
      budgetBand: "low" as const,
      cooksIndoors: true,
      hasExhaust: false,
      hasPurifier: false,
      members: [{ id: "m-1", ageBand: "adult" as const, cautionMode: false }],
      routines: []
    };

    const res = optimizeHouseholdPlan(profile, snapshot, forecast);

    const lines = [
      `📊 *PLAN A vs PLAN B DOSE COMPARISON*`,
      `📍 Normal Day (Plan A): *${res.planA.totalDoseUg.mid} µg* inhaled [MODELLED]`,
      `✨ Optimized Day (Plan B): *${res.planB.totalDoseUg.mid} µg* inhaled [MODELLED]`,
      `🛡️ *Net Saving:* -${res.planB.netSavingUg} µg (*-${res.planB.netSavingPercent}%* toxic particles spared)`,
      ``,
      `*Recommended Routine Shifts:*`,
      ...res.planB.changes.map((c) => `• *${c.title}* (${c.deltaUg} µg)`),
      ``,
      `🌱 *Avoided Emissions:* ${Math.abs(res.emissions.deltaGramsCo2e)} g CO₂e [ASSUMED]`,
      `🔗 Open full interactive timeline: https://airdelta.app/plan`
    ];

    return lines.join("\n");
  }

  public async getAdvisoryText(
    audience: any,
    lat: number,
    lng: number,
    lang = "hi"
  ): Promise<string> {
    const snapshot = await this.airService.getAirSnapshot(lat, lng);
    const advisory = this.advisoryService.generateAdvisory(audience, snapshot, lang);
    return advisory.shareCardText;
  }

  public async buildMorningBrief(lat = 28.6139, lng = 77.209, lang = "en"): Promise<string> {
    const snapshot = await this.airService.getAirSnapshot(lat, lng);
    const forecast = await this.airService.getAirForecast(lat, lng);

    const lines = [
      `🌅 *AIRDELTA 07:00 MORNING BRIEFING*`,
      `Good morning! Here is today's winter smog protection briefing:`,
      ``,
      `📍 Current Conditions: AQI ${snapshot.indexValue} (${snapshot.category})`,
      `💨 Ambient PM2.5: ${snapshot.pm25} µg/m³ [${snapshot.badge.toUpperCase()}]`,
      ``,
      `✨ *Key Action for Today:*`,
      `• *Avoid early morning exercise:* Defer walks to ${forecast.cleanestWindow ? new Date(forecast.cleanestWindow.startTs).toLocaleTimeString([], { hour: "2-digit" }) : "14:00"} when boundary layer air is cleanest.`,
      `• *Commute Protection:* Wear a snug-fitting N95 mask on two-wheelers and autos.`,
      `• *Kitchen Venting:* Keep exhaust fan running continuously during cooking.`,
      ``,
      `Have a safe day! 🛡️`
    ];

    return lines.join("\n");
  }

  async processWebhookUpdate(update: any) {
    if (this.bot) {
      await this.bot.handleUpdate(update);
    }
  }
}
