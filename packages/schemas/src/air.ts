import { z } from "zod";

export const BadgeSchema = z.enum(["measured", "forecast", "modelled", "assumed"]);
export type Badge = z.infer<typeof BadgeSchema>;

export const IndexStandardSchema = z.enum(["ind_cpcb", "us_epa", "eu_aqi", "none"]);
export type IndexStandard = z.infer<typeof IndexStandardSchema>;

export const AirPollutantsSchema = z.object({
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  no2: z.number().nullable().optional(),
  so2: z.number().nullable().optional(),
  co: z.number().nullable().optional(),
  o3: z.number().nullable().optional()
});
export type AirPollutants = z.infer<typeof AirPollutantsSchema>;

export const AirSnapshotSchema = z.object({
  cell: z.string(), // e.g. "28.61:77.21"
  ts: z.string(),   // ISO 8601 UTC
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  pollutants: AirPollutantsSchema.optional(),
  indexValue: z.number().nullable(),
  indexStandard: IndexStandardSchema,
  category: z.string().nullable(),
  source: z.enum(["google_aq", "openaq", "open_meteo", "ogd", "replay"]),
  badge: BadgeSchema,
  fetchedAt: z.string(),
  ttlSec: z.number(),
  license: z.string(),
  attribution: z.string(),
  stationDistanceKm: z.number().optional()
});
export type AirSnapshot = z.infer<typeof AirSnapshotSchema>;

export const HourlyForecastItemSchema = z.object({
  ts: z.string(),
  pm25: numberOrNull(),
  pm10: numberOrNull(),
  indexValue: numberOrNull(),
  category: z.string().nullable().optional(),
  badge: BadgeSchema.default("forecast")
});
export type HourlyForecastItem = z.infer<typeof HourlyForecastItemSchema>;

function numberOrNull() {
  return z.number().nullable();
}

export const CleanestWindowSchema = z.object({
  startTs: z.string(),
  endTs: z.string(),
  expectedPm25: z.number(),
  reason: z.string()
});
export type CleanestWindow = z.infer<typeof CleanestWindowSchema>;

export const AirForecastSchema = z.object({
  cell: z.string(),
  fetchedAt: z.string(),
  hourly: z.array(HourlyForecastItemSchema),
  cleanestWindow: CleanestWindowSchema.nullable().optional(),
  source: z.enum(["google_aq", "open_meteo", "replay"]),
  badge: BadgeSchema.default("forecast")
});
export type AirForecast = z.infer<typeof AirForecastSchema>;
