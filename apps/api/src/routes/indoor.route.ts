import { Hono } from "hono";
import { VisionService } from "../services/vision.service.js";
import { calculateIndoorMassBalance } from "@airdelta/engine";
import { getFixByKey } from "@airdelta/fix-library";

export function createIndoorRoutes(visionService: VisionService) {
  const router = new Hono();

  // POST /v1/indoor-audits
  router.post("/", async (c) => {
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      // Body may be empty if testing heuristic fallback
    }

    const base64Image = body.imageBase64 || body.image;
    const mimeType = body.mimeType || "image/jpeg";
    const budget = body.budgetBand || "low";
    const roomHint = body.roomHint || "kitchen";

    try {
      const result = await visionService.auditIndoorPhoto(base64Image, mimeType, budget, roomHint);
      return c.json(result, 201);
    } catch (err: any) {
      return c.json({ error: "Indoor photo audit failed", message: err.message }, 500);
    }
  });

  // POST /v1/indoor-audits/confirm
  router.post("/confirm", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON request body" }, 400);
    }

    const {
      confirmedSourceIds = [],
      selectedFixKeys = [],
      roomVolumeM3 = 45,
      ambientPm25 = 380
    } = body;

    // Check confirmed interventions
    let hasExhaust = false;
    let hasPurifier = false;
    let purifierCadr = 0;
    let airExchange = 1.2;
    let isCooking = false;
    let isIncense = false;

    for (const key of selectedFixKeys) {
      const fix = getFixByKey(key);
      if (!fix) continue;
      if (fix.fixKey === "exhaust_during_cooking" || fix.fixKey === "exhaust_fan_retro") {
        hasExhaust = true;
      }
      if (fix.fixKey === "hepa_air_purifier" || fix.fixKey === "diy_corsi_rosenthal_box") {
        hasPurifier = true;
        purifierCadr = Math.max(purifierCadr, fix.estimatedCadr || 250);
      }
      if (fix.fixKey === "door_bottom_weatherstrip" || fix.fixKey === "window_gap_foam") {
        airExchange = 0.8; // Reduced infiltration leakage
      }
    }

    // Check if cooking or incense sources are active
    for (const id of confirmedSourceIds) {
      if (id.includes("gas") || id.includes("stove")) isCooking = true;
      if (id.includes("incense") || id.includes("dhoop")) isIncense = true;
    }

    const massBalance = calculateIndoorMassBalance({
      ambientPm25,
      roomVolumeM3,
      airExchangePerHour: airExchange,
      hasExhaust,
      hasPurifier,
      purifierCadrM3PerHour: purifierCadr,
      isCooking,
      isIncenseBurning: isIncense
    });

    return c.json({
      status: "confirmed",
      confirmedSourceIds,
      appliedFixKeys: selectedFixKeys,
      ambientPm25,
      mitigatedIndoorPm25: massBalance.indoorConcentrationUgM3,
      unmitigatedIndoorPm25: massBalance.unmitigatedConcentrationUgM3,
      percentageReduction: massBalance.percentageReduction,
      cleanAirExchangeRate: massBalance.cleanAirExchangeRate,
      badge: "modelled"
    });
  });

  return router;
}
