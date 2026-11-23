import { z } from "zod";
import { BadgeSchema } from "./air.js";

export const AudienceTypeSchema = z.enum([
  "rwa_residents",
  "school_community",
  "workplace",
  "general_public"
]);
export type AudienceType = z.infer<typeof AudienceTypeSchema>;

export const GrapStageSchema = z.enum([
  "STAGE_I",    // Poor (AQI 201-300)
  "STAGE_II",   // Very Poor (AQI 301-400)
  "STAGE_III",  // Severe (AQI 401-450)
  "STAGE_IV",   // Severe + (AQI > 450)
  "NONE"
]);
export type GrapStage = z.infer<typeof GrapStageSchema>;

export const AdvisoryRequestSchema = z.object({
  audience: AudienceTypeSchema,
  lang: z.string().default("hi"),
  cityCode: z.string().default("DELHI"),
  gridCell: z.string(),
  groupId: z.string().uuid().optional()
});
export type AdvisoryRequest = z.infer<typeof AdvisoryRequestSchema>;

export const AdvisoryResponseSchema = z.object({
  advisoryId: z.string().uuid(),
  createdAt: z.string(),
  lang: z.string(),
  audience: AudienceTypeSchema,
  grapStage: GrapStageSchema,
  headline: z.string(),
  body: z.string(),
  actionBulletPoints: z.array(z.string()),
  shareCardText: z.string(),
  badge: BadgeSchema.default("forecast")
});
export type AdvisoryResponse = z.infer<typeof AdvisoryResponseSchema>;

export const CommunityGroupImpactSchema = z.object({
  groupId: z.string().uuid(),
  groupName: z.string(),
  cityCode: z.string(),
  isAnonymitySatisfied: z.boolean(), // True when activeHouseholds >= 5
  activeHouseholds: z.number().nullable(), // Null when < 5 to prevent deanonymization
  totalActionsTaken: z.number().nullable(),
  estimatedCommunityPm25PreventedGrams: z.number().nullable()
});
export type CommunityGroupImpact = z.infer<typeof CommunityGroupImpactSchema>;
