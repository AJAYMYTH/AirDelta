import { AirSnapshot, AirForecast, HourlyForecastItem } from "@airdelta/schemas";
import { AirQualityAdapter, toCellId } from "../types.js";

export class OpenMeteoAdapter implements AirQualityAdapter {
  readonly name = "open_meteo";
  readonly isPrimary = false;

  async isAvailable(): Promise<boolean> {
    return true; // No API key required
  }

  async fetchCurrent(lat: number, lng: number): Promise<AirSnapshot> {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,us_aqi,european_aqi`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AirDelta/1.0" },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo API error: HTTP ${res.status}`);
    }
    const data: any = await res.json();
    const curr = data.current || {};

    const pm25 = typeof curr.pm2_5 === "number" ? Math.round(curr.pm2_5 * 10) / 10 : null;
    const pm10 = typeof curr.pm10 === "number" ? Math.round(curr.pm10 * 10) / 10 : null;
    const hasUsAqi = typeof curr.us_aqi === "number";
    const indexValue = hasUsAqi
      ? Math.round(curr.us_aqi)
      : typeof curr.european_aqi === "number"
      ? Math.round(curr.european_aqi)
      : null;

    return {
      cell: toCellId(lat, lng),
      ts: curr.time ? new Date(curr.time).toISOString() : new Date().toISOString(),
      pm25,
      pm10,
      pollutants: {
        pm25,
        pm10,
        no2: curr.nitrogen_dioxide ?? null,
        o3: curr.ozone ?? null,
        so2: curr.sulphur_dioxide ?? null
      },
      indexValue,
      indexStandard: hasUsAqi ? "us_epa" : "eu_aqi",
      category: hasUsAqi ? this.classifyUsAqi(indexValue ?? undefined) : this.classifyEuAqi(curr.european_aqi),
      source: "open_meteo",
      badge: "modelled",
      fetchedAt: new Date().toISOString(),
      ttlSec: 1800,
      license: "Open Data Commons / CC BY 4.0",
      attribution: "Open-Meteo Air Quality (CAMS)"
    };
  }

  async fetchForecast(lat: number, lng: number): Promise<AirForecast> {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm10,pm2_5,us_aqi,european_aqi&forecast_days=3`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AirDelta/1.0" },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo Forecast API error: HTTP ${res.status}`);
    }
    const data: any = await res.json();
    const hourly = data.hourly || {};
    const times: string[] = hourly.time || [];
    const pm25List: (number | null)[] = hourly.pm2_5 || [];
    const pm10List: (number | null)[] = hourly.pm10 || [];
    const usAqiList: (number | null)[] = hourly.us_aqi || [];
    const euAqiList: (number | null)[] = hourly.european_aqi || [];

    const items: HourlyForecastItem[] = times.slice(0, 72).map((t, idx) => {
      const usVal = usAqiList[idx];
      const euVal = euAqiList[idx];
      const hasUs = typeof usVal === "number";
      return {
        ts: new Date(t).toISOString(),
        pm25: pm25List[idx] ?? null,
        pm10: pm10List[idx] ?? null,
        indexValue: hasUs ? usVal : (euVal ?? null),
        category: hasUs ? this.classifyUsAqi(usVal ?? undefined) : this.classifyEuAqi(euVal ?? undefined),
        badge: "forecast"
      };
    });

    // Filter to upcoming/current hours when finding the cleanest 3-hour window
    const cutoffMs = Date.now() - 3600 * 1000;
    const futureStart = items.findIndex((item) => Date.parse(item.ts) >= cutoffMs);
    const searchItems = futureStart >= 0 ? items.slice(futureStart) : items;

    // Find cleanest 3-hour window
    let cleanestWindow = null;
    let minAvgPm25 = Infinity;
    let bestStartIdx = -1;

    for (let i = 0; i <= searchItems.length - 3; i++) {
      const slice = searchItems.slice(i, i + 3);
      const valid = slice.filter((item) => item.pm25 !== null) as { pm25: number }[];
      if (valid.length === 3) {
        const avg = (valid[0].pm25 + valid[1].pm25 + valid[2].pm25) / 3;
        if (avg < minAvgPm25) {
          minAvgPm25 = avg;
          bestStartIdx = i;
        }
      }
    }

    if (bestStartIdx >= 0) {
      cleanestWindow = {
        startTs: searchItems[bestStartIdx].ts,
        endTs: searchItems[bestStartIdx + 2].ts,
        expectedPm25: Math.round(minAvgPm25 * 10) / 10,
        reason: "Modelled minimum pollution period based on meteorological dispersion"
      };
    }

    return {
      cell: toCellId(lat, lng),
      fetchedAt: new Date().toISOString(),
      hourly: items,
      cleanestWindow,
      source: "open_meteo",
      badge: "forecast"
    };
  }

  private classifyUsAqi(aqi?: number): string {
    if (typeof aqi !== "number") return "Moderate";
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Satisfactory";
    if (aqi <= 150) return "Moderate";
    if (aqi <= 200) return "Poor";
    if (aqi <= 300) return "Very Poor";
    return "Severe";
  }

  private classifyEuAqi(aqi?: number): string {
    if (typeof aqi !== "number") return "Moderate";
    if (aqi <= 20) return "Good";
    if (aqi <= 40) return "Fair";
    if (aqi <= 60) return "Moderate";
    if (aqi <= 80) return "Poor";
    return "Very Poor";
  }
}
