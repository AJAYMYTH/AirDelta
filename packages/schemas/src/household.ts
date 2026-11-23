import { z } from "zod";

export const AgeBandSchema = z.enum(["child", "teen", "adult", "senior"]);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export const ActivityKindSchema = z.enum([
  "commute",
  "school_run",
  "walk",
  "cooking",
  "outdoor_play",
  "work_outdoor",
  "window_open",
  "rest"
]);
export type ActivityKind = z.infer<typeof ActivityKindSchema>;

export const CommuteModeSchema = z.enum([
  "walk",
  "cycle",
  "two_wheeler",
  "bus",
  "metro",
  "car",
  "auto"
]);
export type CommuteMode = z.infer<typeof CommuteModeSchema>;

export const BudgetBandSchema = z.enum(["none", "low", "medium", "high"]);
export type BudgetBand = z.infer<typeof BudgetBandSchema>;

export const RoutineSegmentSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  kind: ActivityKindSchema,
  mode: CommuteModeSchema.optional(),
  startHour: z.number().min(0).max(23),
  durationMinutes: z.number().min(5).max(1440),
  isIndoor: z.boolean().default(true),
  maskUsed: z.boolean().default(false)
});
export type RoutineSegment = z.infer<typeof RoutineSegmentSchema>;

export const MemberProfileSchema = z.object({
  id: z.string(),
  ageBand: AgeBandSchema,
  cautionMode: z.boolean().default(false), // Conservative threshold flag; zero medical diagnostics
  label: z.string().optional()             // e.g. "Child", "Elderly Parent"
});
export type MemberProfile = z.infer<typeof MemberProfileSchema>;

export const HouseholdProfileSchema = z.object({
  id: z.string().uuid().optional(),
  cityCode: z.string().default("DELHI"),
  gridCell: z.string(),                    // e.g. "28.61:77.21" (~1.1 km cell, zero street addresses)
  lang: z.string().default("en"),
  budgetBand: BudgetBandSchema.default("low"),
  cooksIndoors: z.boolean().default(true),
  hasExhaust: z.boolean().default(false),
  hasPurifier: z.boolean().default(false),
  members: z.array(MemberProfileSchema).min(1),
  routines: z.array(RoutineSegmentSchema).default([])
});
export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;
