import { Hono } from "hono";
import { AirDeltaBot } from "../bot/telegram.js";
import { isAuthorizedCronRequest, timingSafeSecretEquals } from "../utils/security.js";

function normalizeWebhookSecret(raw?: string): string {
  return (raw || "").replace(/[^A-Za-z0-9_-]/g, "");
}

export function createTelegramRoutes(botService: AirDeltaBot) {
  const router = new Hono();

  // POST /webhooks/telegram
  router.post("/", async (c) => {
    const secret = normalizeWebhookSecret(process.env.TELEGRAM_WEBHOOK_SECRET);
    if (secret) {
      const headerToken = c.req.header("X-Telegram-Bot-Api-Secret-Token");
      if (!timingSafeSecretEquals(headerToken, secret)) {
        return c.json({ error: "Unauthorized webhook request" }, 401);
      }
    }

    try {
      const update = await c.req.json();
      await botService.processWebhookUpdate(update);
      return c.json({ ok: true });
    } catch {
      return c.json({ error: "Failed to process update" }, 500);
    }
  });

  // POST /internal/jobs/morning-brief (for scheduled Cloud Scheduler / Cron)
  router.post("/jobs/morning-brief", async (c) => {
    if (!isAuthorizedCronRequest(c.req.header("X-Cron-Secret"), c.req.header("Authorization"))) {
      return c.json({ error: "Unauthorized scheduled job trigger" }, 401);
    }

    const brief = await botService.buildMorningBrief();
    return c.json({
      job: "morning_brief",
      executedAt: new Date().toISOString(),
      message: brief
    });
  });

  // GET /v1/bot/status
  router.get("/status", (c) => {
    return c.json({
      configured: botService.isConfigured(),
      channel: "Telegram Bot API (Option B)",
      proactivePushEnabled: true
    });
  });

  return router;
}
