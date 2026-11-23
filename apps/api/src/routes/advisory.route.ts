import { Hono } from "hono";
import { AdvisoryService } from "../services/advisory.service.js";
import { AirDataService, parseCellId } from "@airdelta/air-adapters";
import { AudienceTypeSchema } from "@airdelta/schemas";

export function createAdvisoryRoutes(
  advisoryService: AdvisoryService,
  airService: AirDataService
) {
  const router = new Hono();

  // POST /v1/advisories
  router.post("/", async (c) => {
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      // Use defaults if empty
    }

    const audienceParse = AudienceTypeSchema.safeParse(body.audience || "rwa_residents");
    const audience = audienceParse.success ? audienceParse.data : "rwa_residents";
    const lang = typeof body.lang === "string" ? body.lang : "hi";
    const gridCell = typeof body.gridCell === "string" ? body.gridCell : "28.61:77.21";

    const coords = parseCellId(gridCell);
    const air = await airService.getAirSnapshot(coords.lat, coords.lng);

    const advisory = advisoryService.generateAdvisory(audience, air, lang);
    return c.json(advisory, 201);
  });

  // GET /v1/groups/:id/impact (enforcing k >= 5 anonymity)
  router.get("/groups/:id/impact", (c) => {
    const groupId = c.req.param("id");
    const countQuery = c.req.query("memberCount");
    const memberCount = countQuery ? parseInt(countQuery, 10) : 8;

    const isSatisfied = memberCount >= 5;

    return c.json({
      groupId,
      groupName: "Delhi Society RWA",
      cityCode: "DELHI",
      isAnonymitySatisfied: isSatisfied,
      activeHouseholds: isSatisfied ? memberCount : null,
      totalActionsTaken: isSatisfied ? memberCount * 4 : null,
      estimatedCommunityPm25PreventedGrams: isSatisfied
        ? Math.round(memberCount * 0.185 * 10) / 10
        : null
    });
  });

  return router;
}
