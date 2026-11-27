import { Hono } from "hono";
import { HouseholdProfileSchema } from "@airdelta/schemas";
import { PlannerService } from "../services/planner.service.js";
import { SupabaseService, supabaseService } from "../services/supabase.service.js";

export function createPlanRoutes(
  plannerService: PlannerService,
  dbService: SupabaseService = supabaseService
) {
  const router = new Hono();

  // POST /v1/plans - Generate and persist a personalized Plan A vs Plan B
  router.post("/", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON request body" }, 400);
    }

    const targetLang = typeof body.targetLang === "string" ? body.targetLang : "en";
    const includeLlm = body.includeLlm !== false;
    const preferredProvider =
      body.provider === "open_meteo" || body.provider === "openaq" || body.provider === "auto"
        ? body.provider
        : undefined;
    const profileParse = HouseholdProfileSchema.safeParse(body.profile || body);

    if (!profileParse.success) {
      return c.json(
        {
          error: "Household profile validation failed",
          details: profileParse.error.flatten()
        },
        400
      );
    }

    try {
      const plan = await plannerService.generatePlan(profileParse.data, targetLang, undefined, undefined, includeLlm, preferredProvider);
      const householdId = profileParse.data.id || "demo-household";
      
      // Persist plan in Supabase (or in-memory store)
      await dbService.savePlan(plan, householdId, profileParse.data);

      return c.json(plan, 201);
    } catch (err: any) {
      return c.json({ error: "Plan generation failed", message: err.message }, 500);
    }
  });

  // GET /v1/plans/:id - Retrieve an existing plan by ID
  router.get("/:id", async (c) => {
    const planId = c.req.param("id");
    const record = await dbService.getPlan(planId);
    if (!record) {
      return c.json({ error: "Plan not found" }, 404);
    }
    return c.json(record);
  });

  // POST /v1/plans/:id/actions - Mark an action from Plan B as executed
  router.post("/:id/actions", async (c) => {
    const planId = c.req.param("id");
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON request body" }, 400);
    }

    const actionKey = body.actionKey;
    if (!actionKey || typeof actionKey !== "string") {
      return c.json({ error: "Missing or invalid actionKey" }, 400);
    }

    try {
      const result = await dbService.recordAction(planId, actionKey);
      return c.json({ status: "success", actionId: result.id, planId, actionKey });
    } catch (err: any) {
      return c.json({ error: "Failed to record action", message: err.message }, 500);
    }
  });

  return router;
}
