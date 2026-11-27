import { Hono } from "hono";
import { z } from "zod";
import { VisionService } from "../services/vision.service.js";
import { calculateIndoorMassBalance } from "@airdelta/engine";
import { getFixByKey } from "@airdelta/fix-library";

const AuditIndoorSchema = z.object({
  imageBase64: z.string().max(6_500_000).optional(),
  image: z.string().max(6_500_000).optional(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
  budgetBand: z.enum(["none", "low", "medium", "high"]).default("low"),
  roomHint: z.string().max(80).default("kitchen")
});

const ConfirmIndoorSchema = z.object({
  confirmedSourceIds: z.array(z.string().max(120)).max(50).default([]),
  selectedFixKeys: z.array(z.string().max(120)).max(50).default([]),
  roomVolumeM3: z.number().finite().min(1).max(10000).default(45),
  ambientPm25: z.number().finite().min(0).max(2000).default(380)
});

export function createIndoorRoutes(visionService: VisionService) {
  const router = new Hono();

  // POST /v1/indoor-audits
  router.post("/", async (c) => {
    let rawBody: unknown = {};
    try {
      const parsedJson = await c.req.json();
      if (parsedJson && typeof parsedJson === "object") {
        rawBody = parsedJson;
      }
    } catch {
      // Body may be empty if testing heuristic fallback
    }

    const parsed = AuditIndoorSchema.safeParse(rawBody);
    const body = parsed.success ? parsed.data : AuditIndoorSchema.parse({});
    const base64Image = body.imageBase64 || body.image;

    try {
      const result = await visionService.auditIndoorPhoto(base64Image, body.mimeType, body.budgetBand, body.roomHint);
      return c.json(result, 201);
    } catch {
      return c.json({ error: "Indoor photo audit failed" }, 500);
    }
  });

  // POST /v1/indoor-audits/confirm
  router.post("/confirm", async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON request body" }, 400);
    }

    const parsed = ConfirmIndoorSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid indoor confirmation parameters", details: parsed.error.flatten() },
        400
      );
    }

    const { confirmedSourceIds, selectedFixKeys, roomVolumeM3, ambientPm25 } = parsed.data;

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
