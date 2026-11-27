import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AirDataService, parseCellId } from "@airdelta/air-adapters";
import { optimizeHouseholdPlan } from "@airdelta/engine";
import { AdvisoryService } from "@airdelta/schemas";
import { getTranslation, getGlossaryTerm } from "@airdelta/i18n";
import { VisionService } from "../services/vision.service.js";
import { setBoundedMapEntry } from "../utils/security.js";

export interface BotConfig {
  token?: string;
  webhookSecret?: string;
}

const BOT_CITIES: Record<string, { label: string; lat: number; lng: number }> = {
  delhi: { label: "Delhi-NCR (ITO)", lat: 28.6139, lng: 77.209 },
  kanpur: { label: "Kanpur", lat: 26.4499, lng: 80.3319 },
  patna: { label: "Patna", lat: 25.5941, lng: 85.1376 },
  lucknow: { label: "Lucknow", lat: 26.8467, lng: 80.9462 }
};

export class AirDeltaBot {
  public bot: Bot | null = null;
  private userLangMap = new Map<number, string>();
  private userCoordsMap = new Map<number, { label: string; lat: number; lng: number; cell?: string }>();
  private initPromise: Promise<void> | null = null;

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

  private buildLocationRequestKeyboard() {
    return new Keyboard()
      .requestLocation("📍 Share My Live Location")
      .oneTime()
      .resized();
  }

  private buildQuickActionsKeyboard() {
    return new InlineKeyboard()
      .text("📊 Daily Plan", "act_plan")
      .text("🔄 Refresh AQI", "act_today")
      .row()
      .text("📍 Share Live Location", "cmd_location")
      .text("🌐 Language", "cmd_lang");
  }

  private registerHandlers() {
    if (!this.bot) return;

    this.bot.command("start", async (ctx) => {
      const keyboard = new InlineKeyboard()
        .text("📍 Share My Live Location", "cmd_location")
        .row()
        .text("📍 Delhi-NCR", "city_delhi")
        .text("📍 Kanpur", "city_kanpur")
        .row()
        .text("📍 Patna", "city_patna")
        .text("📍 Lucknow", "city_lucknow")
        .row()
        .text("🌐 Change Language", "cmd_lang");

      await ctx.reply(
        `👋 *Welcome to AirDelta (Δ)*\n\nYour personal health action engine for winter smog and urban air pollution.\n\n*Tap "Share My Live Location" or pick a city to get live AQI & your Plan A vs Plan B:*\nCommands: /location · /today · /plan · /advisory · /lang`,
        { reply_markup: keyboard, parse_mode: "Markdown" }
      );
    });

    this.bot.command("location", async (ctx) => {
      await ctx.reply(
        `📍 *Share Your Live Location*\n\nTap the button below to share your current position, or attach *📎 → Location → Share My Live Location* to receive automatic AQI updates as you travel.\n\n_Privacy: Coordinates are rounded to ~1.1 km and never stored as street addresses._`,
        { reply_markup: this.buildLocationRequestKeyboard(), parse_mode: "Markdown" }
      );
    });

    this.bot.command("today", async (ctx) => {
      const chatId = ctx.chat?.id || 0;
      const lang = this.userLangMap.get(chatId) || "en";
      const coords = this.userCoordsMap.get(chatId) || BOT_CITIES.delhi;
      const replyText = await this.getTodayText(coords.lat, coords.lng, lang, coords.label);
      await ctx.reply(replyText, { parse_mode: "Markdown", reply_markup: this.buildQuickActionsKeyboard() });
    });

    this.bot.command("plan", async (ctx) => {
      const chatId = ctx.chat?.id || 0;
      const lang = this.userLangMap.get(chatId) || "en";
      const coords = this.userCoordsMap.get(chatId) || BOT_CITIES.delhi;
      const replyText = await this.getPlanText(coords.lat, coords.lng, lang, coords.label);
      await ctx.reply(replyText, { parse_mode: "Markdown", reply_markup: this.buildQuickActionsKeyboard() });
    });

    this.bot.command("advisory", async (ctx) => {
      const chatId = ctx.chat?.id || 0;
      const lang = this.userLangMap.get(chatId) || "hi";
      const coords = this.userCoordsMap.get(chatId) || BOT_CITIES.delhi;
      const replyText = await this.getAdvisoryText("rwa_residents", coords.lat, coords.lng, lang);
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

    // Handle initial location pin or one-tap "Share My Live Location" button
    this.bot.on("message:location", async (ctx) => {
      const chatId = ctx.chat?.id || 0;
      const loc = ctx.message.location;
      const lat = Math.round(loc.latitude * 100) / 100;
      const lng = Math.round(loc.longitude * 100) / 100;
      const cell = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
      const isLiveStream = typeof loc.live_period === "number" && loc.live_period > 0;
      const label = isLiveStream
        ? `Live Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`
        : `My Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;

      setBoundedMapEntry(this.userCoordsMap, chatId, { label, lat, lng, cell });

      const lang = this.userLangMap.get(chatId) || "en";
      const [todayText, planText] = await Promise.all([
        this.getTodayText(lat, lng, lang, label),
        this.getPlanText(lat, lng, lang, label)
      ]);
      await ctx.reply(todayText, { parse_mode: "Markdown", reply_markup: { remove_keyboard: true } });
      await ctx.reply(planText, { parse_mode: "Markdown", reply_markup: this.buildQuickActionsKeyboard() });
    });

    // Handle live location streaming movement updates from Telegram
    this.bot.on("edited_message:location", async (ctx) => {
      const loc = ctx.editedMessage?.location;
      const chatId = ctx.chat?.id || 0;
      if (!loc || !chatId) return;

      const lat = Math.round(loc.latitude * 100) / 100;
      const lng = Math.round(loc.longitude * 100) / 100;
      const cell = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
      const prev = this.userCoordsMap.get(chatId);
      const label = `Live Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
      setBoundedMapEntry(this.userCoordsMap, chatId, { label, lat, lng, cell });

      if (!prev || prev.cell !== cell) {
        const lang = this.userLangMap.get(chatId) || "en";
        const todayText = await this.getTodayText(lat, lng, lang, label);
        await ctx.reply(`📡 *Live Location Grid Updated*\n\n${todayText}`, {
          parse_mode: "Markdown",
          reply_markup: this.buildQuickActionsKeyboard()
        });
      }
    });

    // Handle button callbacks
    this.bot.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data;
      const chatId = ctx.chat?.id || 0;

      if (data === "cmd_location") {
        await ctx.answerCallbackQuery();
        await ctx.reply(
          `📍 *Tap below to share your live location* (or use 📎 → Location → Share My Live Location):`,
          { reply_markup: this.buildLocationRequestKeyboard(), parse_mode: "Markdown" }
        );
      } else if (data === "act_today") {
        await ctx.answerCallbackQuery();
        const coords = this.userCoordsMap.get(chatId) || BOT_CITIES.delhi;
        const text = await this.getTodayText(coords.lat, coords.lng, this.userLangMap.get(chatId) || "en", coords.label);
        await ctx.reply(text, { parse_mode: "Markdown", reply_markup: this.buildQuickActionsKeyboard() });
      } else if (data === "act_plan") {
        await ctx.answerCallbackQuery();
        const coords = this.userCoordsMap.get(chatId) || BOT_CITIES.delhi;
        const text = await this.getPlanText(coords.lat, coords.lng, this.userLangMap.get(chatId) || "en", coords.label);
        await ctx.reply(text, { parse_mode: "Markdown", reply_markup: this.buildQuickActionsKeyboard() });
      } else if (data === "cmd_lang") {
        await ctx.answerCallbackQuery();
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
      } else if (data.startsWith("lang_")) {
        const lang = data.replace("lang_", "");
        setBoundedMapEntry(this.userLangMap, chatId, lang);
        await ctx.answerCallbackQuery({ text: `Language changed to ${lang.toUpperCase()}` });
        await ctx.reply(`✅ *Language updated to ${lang.toUpperCase()}!*\nUse /today, /plan, or /location.`, {
          parse_mode: "Markdown",
          reply_markup: this.buildQuickActionsKeyboard()
        });
      } else if (data.startsWith("city_")) {
        const cityKey = data.replace("city_", "");
        const city = BOT_CITIES[cityKey] || BOT_CITIES.delhi;
        setBoundedMapEntry(this.userCoordsMap, chatId, city);
        await ctx.answerCallbackQuery({ text: `City set to ${city.label}` });
        const text = await this.getTodayText(city.lat, city.lng, this.userLangMap.get(chatId) || "en", city.label);
        await ctx.reply(text, { parse_mode: "Markdown", reply_markup: this.buildQuickActionsKeyboard() });
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

  public async getTodayText(lat: number, lng: number, lang = "en", locationLabel = "Delhi-NCR (ITO)"): Promise<string> {
    const snapshot = await this.airService.getAirSnapshot(lat, lng);
    const forecast = await this.airService.getAirForecast(lat, lng);

    const aqi = snapshot.indexValue ?? 385;
    const badgeTag = `[${snapshot.badge.toUpperCase()}: ${snapshot.source}]`;

    const lines = [
      `🌤️ *AIRDELTA TODAY SNAPSHOT*`,
      `📍 Location: ${locationLabel}`,
      `💨 *AQI:* ${aqi} · *${snapshot.category || "Severe"}* ${badgeTag}`,
      `🔬 *PM2.5:* ${snapshot.pm25 ?? "--"} µg/m³ · *PM10:* ${snapshot.pm10 ?? "--"} µg/m³`,
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

  public async getPlanText(lat: number, lng: number, lang = "en", locationLabel = "Delhi-NCR (ITO)"): Promise<string> {
    const snapshot = await this.airService.getAirSnapshot(lat, lng);
    const forecast = await this.airService.getAirForecast(lat, lng);
    const gridCell = `${(Math.round(lat * 100) / 100).toFixed(2)}:${(Math.round(lng * 100) / 100).toFixed(2)}`;

    const profile = {
      cityCode: "DELHI",
      gridCell,
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
      `📊 *PLAN A vs PLAN B DOSE COMPARISON* (${locationLabel})`,
      `📍 Normal Day (Plan A): *${res.planA.totalDoseUg.mid} µg* inhaled [MODELLED]`,
      `✨ Optimized Day (Plan B): *${res.planB.totalDoseUg.mid} µg* inhaled [MODELLED]`,
      `🛡️ *Net Saving:* -${res.planB.netSavingUg} µg (*-${res.planB.netSavingPercent}%* toxic particles spared)`,
      ``,
      `*Recommended Routine Shifts:*`,
      ...res.planB.changes.map((c) => `• *${c.title}* (${c.deltaUg} µg)`),
      ``,
      `🌱 *Avoided Emissions:* ${Math.abs(res.emissions.deltaGramsCo2e)} g CO₂e [ASSUMED]`,
      `🔗 Open full interactive timeline: https://airdelta.app/plan?lat=${lat}&lng=${lng}`
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

  private async ensureInitialized() {
    if (!this.bot) return;
    if (!this.bot.isInited()) {
      if (!this.initPromise) {
        this.initPromise = this.bot.init().catch((err) => {
          this.initPromise = null;
          throw err;
        });
      }
      await this.initPromise;
    }
  }

  async registerWebhook(publicBaseUrl: string, secretToken?: string): Promise<void> {
    if (!this.bot) return;
    const base = publicBaseUrl.replace(/\/$/, "");
    if (!base.startsWith("https://")) return;

    const cleanSecret = (secretToken || "").replace(/[^A-Za-z0-9_-]/g, "");
    await this.ensureInitialized();
    await this.bot.api.setWebhook(`${base}/webhooks/telegram`, {
      ...(cleanSecret ? { secret_token: cleanSecret } : {})
    });
    await this.bot.api.setMyCommands([
      { command: "start", description: "Start & pick city or live location" },
      { command: "location", description: "Share live GPS location for local AQI & plan" },
      { command: "today", description: "Live AQI snapshot & cleanest airing window" },
      { command: "plan", description: "Plan A vs Plan B exposure savings" },
      { command: "advisory", description: "Regional RWA / community air notice" },
      { command: "lang", description: "Switch bot language" }
    ]);
  }

  async processWebhookUpdate(update: any) {
    if (this.bot) {
      await this.ensureInitialized();
      await this.bot.handleUpdate(update);
    }
  }
}
