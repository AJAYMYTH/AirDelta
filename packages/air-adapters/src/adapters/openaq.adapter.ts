import { AirSnapshot } from "@airdelta/schemas";
import { AirQualityAdapter, toCellId } from "../types.js";

export class OpenAQAdapter implements AirQualityAdapter {
  readonly name = "openaq";
  readonly isPrimary = false;

  constructor(private apiKey?: string) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async fetchCurrent(lat: number, lng: number): Promise<AirSnapshot> {
    if (!this.apiKey) {
      throw new Error("OpenAQ API key not configured");
    }

    // OpenAQ v3 locations endpoint around radius
    const radiusMeters = 25000; // 25 km
    const url = `https://api.openaq.org/v3/locations?coordinates=${lat},${lng}&radius=${radiusMeters}&limit=1`;
    const res = await fetch(url, {
      headers: {
        "X-API-Key": this.apiKey,
        "User-Agent": "AirDelta/1.0"
      }
    });

    if (!res.ok) {
      throw new Error(`OpenAQ API error: HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const results = data.results || [];
    if (results.length === 0) {
      throw new Error("No physical ground monitoring stations found within 25 km");
    }

    const station = results[0];
    const sensorUrl = `https://api.openaq.org/v3/locations/${station.id}/sensors`;
    const sensorRes = await fetch(sensorUrl, {
      headers: { "X-API-Key": this.apiKey, "User-Agent": "AirDelta/1.0" }
    });
    if (!sensorRes.ok) {
      throw new Error(`OpenAQ Sensor API error: HTTP ${sensorRes.status}`);
    }
    const sensorData: any = await sensorRes.json();
    const sensors = sensorData.results || [];

    let pm25: number | null = null;
    let pm10: number | null = null;
    let lastUpdated: string | null = null;

    for (const s of sensors) {
      const param = s.parameter?.name?.toLowerCase();
      const val = s.latest?.value;
      if (typeof val === "number") {
        if (param === "pm25") pm25 = val;
        if (param === "pm10") pm10 = val;
        if (s.latest?.datetime) lastUpdated = s.latest.datetime;
      }
    }

    if (pm25 === null && pm10 === null) {
      throw new Error("Station sensors reported no valid particulate measurements");
    }

    // Freshness check: < 3 hours old for "measured" badge
    const recordAgeHours = lastUpdated
      ? (Date.now() - new Date(lastUpdated).getTime()) / 3600000
      : 99;
    const badge = recordAgeHours <= 3 ? "measured" : "modelled";

    return {
      cell: toCellId(lat, lng),
      ts: lastUpdated || new Date().toISOString(),
      pm25,
      pm10,
      indexValue: pm25 ? this.estimateCpcbIndex(pm25) : null,
      indexStandard: "ind_cpcb",
      category: pm25 ? this.classifyCpcb(this.estimateCpcbIndex(pm25)) : "Moderate",
      source: "openaq",
      badge,
      fetchedAt: new Date().toISOString(),
      ttlSec: 1800,
      license: "Open Data Commons / CC BY 4.0",
      attribution: `OpenAQ Station: ${station.name || "Government Monitor"}`,
      stationDistanceKm: station.distance ? Math.round(station.distance / 100) / 10 : undefined
    };
  }

  private estimateCpcbIndex(pm25: number): number {
    // Standard CPCB breakpoint interpolation for PM2.5
    if (pm25 <= 30) return Math.round((pm25 / 30) * 50);
    if (pm25 <= 60) return Math.round(50 + ((pm25 - 30) / 30) * 50);
    if (pm25 <= 90) return Math.round(100 + ((pm25 - 60) / 30) * 100);
    if (pm25 <= 120) return Math.round(200 + ((pm25 - 90) / 30) * 100);
    if (pm25 <= 250) return Math.round(300 + ((pm25 - 120) / 130) * 100);
    return Math.min(500, Math.round(400 + ((pm25 - 250) / 130) * 100));
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
