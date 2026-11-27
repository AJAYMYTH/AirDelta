import { Hono } from "hono";
import { SupabaseService, supabaseService } from "../services/supabase.service.js";
import { timingSafeSecretEquals } from "../utils/security.js";

export function createJobRoutes(service: SupabaseService = supabaseService) {
  const router = new Hono();

  // POST /v1/jobs/retention-purge?days=30
  router.post("/retention-purge", async (c) => {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret) {
      const bearer = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
      const headerSecret = c.req.header("X-Cron-Secret") || bearer;
      if (!timingSafeSecretEquals(headerSecret, cronSecret)) {
        return c.json({ error: "Unauthorized job invocation" }, 401);
      }
    }

    const daysParam = c.req.query("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return c.json({ error: "Invalid days parameter. Must be an integer between 1 and 3650." }, 400);
    }

    try {
      const result = await service.purgeExpiredPlans(days);
      return c.json({
        status: "success",
        message: `Purged plans older than ${days} days`,
        deletedCount: result.deletedCount,
        executedAt: new Date().toISOString()
      });
    } catch {
      return c.json({ error: "Retention purge job failed" }, 500);
    }
  });

  return router;
}
