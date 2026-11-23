import { Hono } from "hono";
import { HouseholdProfileSchema } from "@airdelta/schemas";
import { PlannerService } from "../services/planner.service.js";

export function createPlanRoutes(plannerService: PlannerService) {
  const router = new Hono();

  router.post("/", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON request body" }, 400);
    }

    const targetLang = typeof body.targetLang === "string" ? body.targetLang : "en";
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
      const plan = await plannerService.generatePlan(profileParse.data, targetLang);
      return c.json(plan, 201);
    } catch (err: any) {
      return c.json({ error: "Plan generation failed", message: err.message }, 500);
    }
  });

  return router;
}
