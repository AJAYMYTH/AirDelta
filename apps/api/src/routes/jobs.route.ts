import { Hono } from "hono";
import { SupabaseService, supabaseService } from "../services/supabase.service.js";

export function createJobRoutes(service: SupabaseService = supabaseService) {
  const router = new Hono();

  // POST /v1/jobs/retention-purge?days=30
  router.post("/retention-purge", async (c) => {
    const daysParam = c.req.query("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (isNaN(days) || days < 1) {
      return c.json({ error: "Invalid days parameter. Must be positive integer." }, 400);
    }

    try {
      const result = await service.purgeExpiredPlans(days);
      return c.json({
        status: "success",
        message: `Purged plans older than ${days} days`,
        deletedCount: result.deletedCount,
        executedAt: new Date().toISOString()
      });
    } catch (err: any) {
      return c.json({ error: "Retention purge job failed", message: err.message }, 500);
    }
  });

  return router;
}
