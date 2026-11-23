import { z } from "zod";
import { BudgetBandSchema } from "./household.js";
import { BadgeSchema } from "./air.js";

export const CandidatePollutionSourceSchema = z.object({
  id: z.string(),
  sourceKey: z.enum([
    "unvented_gas_stove",
    "incense_dhoop",
    "door_window_gaps",
    "lack_of_exhaust",
    "dampness_dust",
    "biomass_fuel"
  ]),
  label: z.string(),
  confidence: z.number().min(0).max(1),
  boundingBox: z
    .object({
      ymin: z.number(),
      xmin: z.number(),
      ymax: z.number(),
      xmax: z.number()
    })
    .optional(),
  detectedReason: z.string()
});
export type CandidatePollutionSource = z.infer<typeof CandidatePollutionSourceSchema>;

export const IndoorFixSchema = z.object({
  id: z.string(),
  fixKey: z.string(),
  title: z.string(),
  description: z.string(),
  budgetBand: BudgetBandSchema,
  estimatedReductionPercent: z.number(),
  estimatedCadr: z.number().optional(),
  actionSteps: z.array(z.string()),
  badge: BadgeSchema.default("modelled")
});
export type IndoorFix = z.infer<typeof IndoorFixSchema>;

export const IndoorAuditResultSchema = z.object({
  auditId: z.string().uuid(),
  createdAt: z.string(),
  detectedSources: z.array(CandidatePollutionSourceSchema),
  curatedFixes: z.array(IndoorFixSchema),
  message: z.string()
});
export type IndoorAuditResult = z.infer<typeof IndoorAuditResultSchema>;

export const ConfirmFixesRequestSchema = z.object({
  auditId: z.string().uuid(),
  confirmedSourceIds: z.array(z.string()),
  selectedFixKeys: z.array(z.string()),
  roomVolumeM3: z.number().default(45)
});
export type ConfirmFixesRequest = z.infer<typeof ConfirmFixesRequestSchema>;
