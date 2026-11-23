import { AirSnapshot, AirForecast, HourlyForecastItem } from "@airdelta/schemas";
import { AirQualityAdapter, toCellId } from "../types.js";

export class GoogleAirQualityAdapter implements AirQualityAdapter {
  readonly name = "google_aq";
  readonly isPrimary = true;

  constructor(private apiKey?: string) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async fetchCurrent(lat: number, lng: number): Promise<AirSnapshot> {
    if (!this.apiKey) {
      throw new Error("Google Air Quality API key not configured");
    }

    const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${this.apiKey}`;
    const body = {
      location: { latitude: lat, longitude: lng },
      extraComputations: [
        "LOCAL_AQI",
        "POLLUTANT_CONCENTRATION",
        "POLLUTANT_ADDITIONAL_INFO"
      ]
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google AQ API error (HTTP ${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    const indexes: any[] = data.indexes || [];
    // Prioritize Indian CPCB index 'ind_cpcb', fallback to first available
    const cpcbIndex = indexes.find((i) => i.code === "ind_cpcb") || indexes[0] || {};
    const pollutants: any[] = data.pollutants || [];

    let pm25: number | null = null;
    let pm10: number | null = null;
    let no2: number | null = null;
    let o3: number | null = null;
    let so2: number | null = null;
    let co: number | null = null;

    for (const p of pollutants) {
      const code = p.code?.toLowerCase();
      const conc = p.concentration?.value;
      if (typeof conc === "number") {
        if (code === "pm25") pm25 = conc;
        if (code === "pm10") pm10 = conc;
        if (code === "no2") no2 = conc;
        if (code === "o3") o3 = conc;
        if (code === "so2") so2 = conc;
        if (code === "co") co = conc;
      }
    }

    return {
      cell: toCellId(lat, lng),
      ts: data.dateTime || new Date().toISOString(),
      pm25,
      pm10,
      pollutants: { pm25, pm10, no2, o3, so2, co },
      indexValue: typeof cpcbIndex.aqi === "number" ? cpcbIndex.aqi : null,
      indexStandard: cpcbIndex.code === "ind_cpcb" ? "ind_cpcb" : "us_epa",
      category: cpcbIndex.category || "Moderate",
      source: "google_aq",
      badge: "forecast", // Google uses hourly predictive models + data assimilation
      fetchedAt: new Date().toISOString(),
      ttlSec: 3600,
      license: "Google Maps Platform Terms of Service",
      attribution: "Google Air Quality API (CPCB Index)"
    };
  }

  async fetchForecast(lat: number, lng: number): Promise<AirForecast> {
    if (!this.apiKey) {
      throw new Error("Google Air Quality API key not configured");
    }

    const url = `https://airquality.googleapis.com/v1/forecast:lookup?key=${this.apiKey}`;
    const body = {
      location: { latitude: lat, longitude: lng },
      extraComputations: ["LOCAL_AQI", "POLLUTANT_CONCENTRATION"],
      period: {
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 96 * 3600000).toISOString()
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Google AQ Forecast API error: HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const hourlyData: any[] = data.hourlyForecasts || [];

    const items: HourlyForecastItem[] = hourlyData.map((hf) => {
      const idxs: any[] = hf.indexes || [];
      const localIdx = idxs.find((i) => i.code === "ind_cpcb") || idxs[0] || {};
      const pols: any[] = hf.pollutants || [];
      const pm25Obj = pols.find((p) => p.code?.toLowerCase() === "pm25");
      const pm10Obj = pols.find((p) => p.code?.toLowerCase() === "pm10");

      return {
        ts: hf.dateTime || new Date().toISOString(),
        pm25: pm25Obj?.concentration?.value ?? null,
        pm10: pm10Obj?.concentration?.value ?? null,
        indexValue: typeof localIdx.aqi === "number" ? localIdx.aqi : null,
        category: localIdx.category || null,
        badge: "forecast"
      };
    });

    return {
      cell: toCellId(lat, lng),
      fetchedAt: new Date().toISOString(),
      hourly: items,
      source: "google_aq",
      badge: "forecast"
    };
  }
}
