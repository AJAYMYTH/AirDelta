import { AirSnapshot, AirPollutants } from "@airdelta/schemas";
import { AirQualityAdapter, toCellId } from "../types.js";

interface OpenAQLocation {
  id: number;
  name?: string;
  distance?: number;
  datetimeLast?: string | { utc?: string; local?: string } | null;
  sensors?: Array<{
    id?: number;
    parameter?: { name?: string; units?: string };
  }>;
}

interface OpenAQSensor {
  parameter?: { name?: string; units?: string };
  latest?: {
    value?: number;
    datetime?: string | { utc?: string; local?: string } | null;
  } | null;
}

export class OpenAQAdapter implements AirQualityAdapter {
  readonly name = "openaq";
  readonly isPrimary = true;

  constructor(private apiKey?: string) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes("your_openaq"));
  }

  async fetchCurrent(lat: number, lng: number): Promise<AirSnapshot> {
    if (!this.apiKey) {
      throw new Error("OpenAQ API key not configured");
    }

    const radiusMeters = 25000; // 25 km
    const url = `https://api.openaq.org/v3/locations?coordinates=${lat},${lng}&radius=${radiusMeters}&limit=50`;
    const res = await fetch(url, {
      headers: {
        "X-API-Key": this.apiKey,
        "User-Agent": "AirDelta/1.0"
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      throw new Error(`OpenAQ API error: HTTP ${res.status}`);
    }

    const data = (await res.json()) as { results?: OpenAQLocation[] };
    const results = data.results || [];
    if (results.length === 0) {
      throw new Error("No physical ground monitoring stations found within 25 km");
    }

    const candidates = this.rankStations(results);
    if (candidates.length === 0) {
      throw new Error("No active particulate stations found within 25 km");
    }

    let lastError: Error | null = null;
    for (const station of candidates.slice(0, 3)) {
      try {
        return await this.fetchStationSnapshot(station, lat, lng);
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error("Station sensors reported no valid particulate measurements");
  }

  private rankStations(locations: OpenAQLocation[]): OpenAQLocation[] {
    const now = Date.now();

    return locations
      .map((loc) => {
        const params = new Set((loc.sensors || []).map((s) => s.parameter?.name?.toLowerCase() || ""));
        const hasPm25 = params.has("pm25");
        const hasPm10 = params.has("pm10");
        const lastIso = this.extractIsoTimestamp(loc.datetimeLast);
        const lastMs = lastIso ? Date.parse(lastIso) : NaN;
        const ageHours = Number.isFinite(lastMs) ? (now - lastMs) / 3600000 : 99999;

        // Tier 0: <= 3h ("measured"), Tier 1: <= 24h, Tier 2: <= 7d, Tier 3: older
        const freshnessTier = ageHours <= 3 ? 0 : ageHours <= 24 ? 1 : ageHours <= 168 ? 2 : 3;
        const distMeters = typeof loc.distance === "number" ? loc.distance : 25000;

        return {
          loc,
          hasPm: hasPm25 || hasPm10,
          hasPm25,
          hasDualPm: hasPm25 && hasPm10,
          freshnessTier,
          lastMs: Number.isFinite(lastMs) ? lastMs : 0,
          distMeters
        };
      })
      .filter((item) => item.hasPm)
      .sort((a, b) => {
        if (a.freshnessTier !== b.freshnessTier) return a.freshnessTier - b.freshnessTier;
        if (a.hasPm25 !== b.hasPm25) return a.hasPm25 ? -1 : 1;
        if (a.hasDualPm !== b.hasDualPm) return a.hasDualPm ? -1 : 1;
        if (a.freshnessTier <= 1) return a.distMeters - b.distMeters;
        return b.lastMs - a.lastMs;
      })
      .map((item) => item.loc);
  }

  private async fetchStationSnapshot(
    station: OpenAQLocation,
    lat: number,
    lng: number
  ): Promise<AirSnapshot> {
    const sensorUrl = `https://api.openaq.org/v3/locations/${station.id}/sensors`;
    const sensorRes = await fetch(sensorUrl, {
      headers: { "X-API-Key": this.apiKey!, "User-Agent": "AirDelta/1.0" },
      signal: AbortSignal.timeout(8000)
    });
    if (!sensorRes.ok) {
      throw new Error(`OpenAQ Sensor API error: HTTP ${sensorRes.status}`);
    }

    const sensorData = (await sensorRes.json()) as { results?: OpenAQSensor[] };
    const sensors = sensorData.results || [];

    // Station may hold multiple sensors for the same parameter (including retired 2018 sensors).
    // Always keep only the newest reading per parameter.
    const latestByParam = new Map<string, { value: number; units: string; tsMs: number; iso: string }>();
    let newestStationMs = 0;

    for (const s of sensors) {
      const param = s.parameter?.name?.toLowerCase();
      const val = s.latest?.value;
      const iso = this.extractIsoTimestamp(s.latest?.datetime);
      if (!param || typeof val !== "number" || !Number.isFinite(val) || val < 0 || !iso) {
        continue;
      }

      const tsMs = Date.parse(iso);
      if (!Number.isFinite(tsMs)) continue;

      if (tsMs > newestStationMs) {
        newestStationMs = tsMs;
      }

      const prev = latestByParam.get(param);
      if (!prev || tsMs > prev.tsMs) {
        latestByParam.set(param, {
          value: val,
          units: s.parameter?.units || "µg/m³",
          tsMs,
          iso
        });
      }
    }

    // Discard legacy sensor values older than 6h relative to station's newest reading
    const maxSkewMs = 6 * 3600 * 1000;
    const pick = (key: string): { value: number; units: string; iso: string } | null => {
      const entry = latestByParam.get(key);
      if (!entry) return null;
      if (newestStationMs > 0 && newestStationMs - entry.tsMs > maxSkewMs) return null;
      return entry;
    };

    const pm25Entry = pick("pm25");
    const pm10Entry = pick("pm10");
    if (!pm25Entry && !pm10Entry) {
      throw new Error("Station sensors reported no valid particulate measurements");
    }

    const pm25 = pm25Entry ? this.round1(pm25Entry.value) : null;
    const pm10 = pm10Entry ? this.round1(pm10Entry.value) : null;
    const no2 = this.normalizeGas(pick("no2"), 46.0055);
    const o3 = this.normalizeGas(pick("o3"), 48.0);
    const so2 = this.normalizeGas(pick("so2"), 64.066);
    const co = this.normalizeCo(pick("co"));

    const pollutants: AirPollutants = {
      pm25,
      pm10,
      no2,
      o3,
      so2,
      co
    };

    const lastUpdated =
      pm25Entry?.iso || pm10Entry?.iso || this.extractIsoTimestamp(station.datetimeLast) || new Date().toISOString();

    const recordAgeHours = (Date.now() - Date.parse(lastUpdated)) / 3600000;
    const badge = Number.isFinite(recordAgeHours) && recordAgeHours <= 3 ? "measured" : "modelled";

    const indexValue = this.computeCpcbNaqi(pm25, pm10);
    const category = indexValue !== null ? this.classifyCpcb(indexValue) : "Moderate";

    return {
      cell: toCellId(lat, lng),
      ts: lastUpdated,
      pm25,
      pm10,
      pollutants,
      indexValue,
      indexStandard: "ind_cpcb",
      category,
      source: "openaq",
      badge,
      fetchedAt: new Date().toISOString(),
      ttlSec: 1800,
      license: "Open Data Commons / CC BY 4.0",
      attribution: `OpenAQ Station: ${station.name || "Ground Monitor"}`,
      stationDistanceKm:
        typeof station.distance === "number" ? Math.round(station.distance / 100) / 10 : undefined
    };
  }

  private extractIsoTimestamp(dt: string | { utc?: string; local?: string } | null | undefined): string | null {
    if (!dt) return null;
    if (typeof dt === "string") return dt;
    if (typeof dt === "object" && typeof dt.utc === "string") return dt.utc;
    if (typeof dt === "object" && typeof dt.local === "string") return dt.local;
    return null;
  }

  private normalizeGas(
    entry: { value: number; units: string } | null,
    molarMass: number
  ): number | null {
    if (!entry) return null;
    const u = entry.units.toLowerCase();
    if (u === "ppb") {
      return this.round1((entry.value * molarMass) / 24.45);
    }
    if (u === "ppm") {
      return this.round1((entry.value * 1000 * molarMass) / 24.45);
    }
    return this.round1(entry.value);
  }

  private normalizeCo(entry: { value: number; units: string } | null): number | null {
    if (!entry) return null;
    const u = entry.units.toLowerCase();
    // Return CO in mg/m³ to match CPCB / fixture conventions
    if (u === "µg/m³" || u === "ug/m3") {
      return Math.round((entry.value / 1000) * 100) / 100;
    }
    if (u === "ppb") {
      const mgM3 = (entry.value * 28.01) / 24450;
      return Math.round(mgM3 * 100) / 100;
    }
    if (u === "ppm") {
      const mgM3 = (entry.value * 28.01) / 24.45;
      return Math.round(mgM3 * 100) / 100;
    }
    return Math.round(entry.value * 100) / 100;
  }

  private round1(val: number): number {
    return Math.round(val * 10) / 10;
  }

  private computeCpcbNaqi(pm25: number | null, pm10: number | null): number | null {
    const sub25 = pm25 !== null ? this.estimateCpcbPm25SubIndex(pm25) : null;
    const sub10 = pm10 !== null ? this.estimateCpcbPm10SubIndex(pm10) : null;
    if (sub25 === null && sub10 === null) return null;
    return Math.max(sub25 ?? 0, sub10 ?? 0);
  }

  private estimateCpcbPm25SubIndex(pm25: number): number {
    if (pm25 <= 30) return Math.round((pm25 / 30) * 50);
    if (pm25 <= 60) return Math.round(50 + ((pm25 - 30) / 30) * 50);
    if (pm25 <= 90) return Math.round(100 + ((pm25 - 60) / 30) * 100);
    if (pm25 <= 120) return Math.round(200 + ((pm25 - 90) / 30) * 100);
    if (pm25 <= 250) return Math.round(300 + ((pm25 - 120) / 130) * 100);
    return Math.min(500, Math.round(400 + ((pm25 - 250) / 130) * 100));
  }

  private estimateCpcbPm10SubIndex(pm10: number): number {
    if (pm10 <= 50) return Math.round((pm10 / 50) * 50);
    if (pm10 <= 100) return Math.round(50 + ((pm10 - 50) / 50) * 50);
    if (pm10 <= 250) return Math.round(100 + ((pm10 - 100) / 150) * 100);
    if (pm10 <= 350) return Math.round(200 + ((pm10 - 250) / 100) * 100);
    if (pm10 <= 430) return Math.round(300 + ((pm10 - 350) / 80) * 100);
    return Math.min(500, Math.round(400 + ((pm10 - 430) / 80) * 100));
  }

  private classifyCpcb(aqi: number): string {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Satisfactory";
    if (aqi <= 200) return "Moderate";
    if (aqi <= 300) return "Poor";
    if (aqi <= 400) return "Very Poor";
    return "Severe";
  }
}
