import { z } from "zod";
import { AirSnapshotSchema, BadgeSchema } from "./air.js";
import { HouseholdProfileSchema } from "./household.js";

export const DoseEstimateSchema = z.object({
  mid: z.number(),
  low: z.number(),
  high: z.number(),
  unit: z.literal("ug").default("ug"),
  badge: BadgeSchema.default("modelled")
});
export type DoseEstimate = z.infer<typeof DoseEstimateSchema>;

export const SegmentDoseSchema = z.object({
  segmentId: z.string(),
  kind: z.string(),
  doseUg: z.number(),
  microenvironment: z.string(),
  badge: BadgeSchema.default("modelled")
});
export type SegmentDose = z.infer<typeof SegmentDoseSchema>;

export const PlanAOutputSchema = z.object({
  totalDoseUg: DoseEstimateSchema,
  segments: z.array(SegmentDoseSchema)
});
export type PlanAOutput = z.infer<typeof PlanAOutputSchema>;

export const PlanBChangeSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  originalSegmentId: z.string().optional(),
  deltaUg: z.number(), // Negative represents saving
  whyCode: z.enum([
    "WINDOW_CLEANER",
    "TRANSIT_SHIFT",
    "MASK_PROTECTION",
    "EXHAUST_VENTILATION",
    "SCHEDULE_SHIFT"
  ]),
  badge: BadgeSchema.default("modelled")
});
export type PlanBChange = z.infer<typeof PlanBChangeSchema>;

export const PlanBOutputSchema = z.object({
  totalDoseUg: DoseEstimateSchema,
  changes: z.array(PlanBChangeSchema),
  netSavingUg: z.number(),
  netSavingPercent: z.number(),
  segments: z.array(SegmentDoseSchema)
});
export type PlanBOutput = z.infer<typeof PlanBOutputSchema>;

export const EmissionsLedgerSchema = z.object({
  deltaGramsCo2e: z.number(),
  factorsRef: z.array(z.string()),
  badge: BadgeSchema.default("assumed")
});
export type EmissionsLedger = z.infer<typeof EmissionsLedgerSchema>;

export const NarrationOutputSchema = z.object({
  lang: z.string(),
  headline: z.string(),
  body: z.string(),
  keyActions: z.array(z.string()),
  source: z.enum(["llm", "template"])
});
export type NarrationOutput = z.infer<typeof NarrationOutputSchema>;

export const PlanResponseSchema = z.object({
  planId: z.string().uuid(),
  forDate: z.string(),
  engineVersion: z.string(),
  constantsVersion: z.string(),
  air: AirSnapshotSchema,
  planA: PlanAOutputSchema,
  planB: PlanBOutputSchema,
  emissions: EmissionsLedgerSchema,
  narrative: NarrationOutputSchema,
  assumptions: z.array(z.string())
});
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

export const GeneratePlanRequestSchema = z.object({
  profile: HouseholdProfileSchema,
  forDate: z.string().optional(),
  targetLang: z.string().default("en")
});
export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;
