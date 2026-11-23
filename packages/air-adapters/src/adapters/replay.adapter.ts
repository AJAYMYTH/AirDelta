import { AirSnapshot, AirForecast, AirSnapshotSchema, AirForecastSchema } from "@airdelta/schemas";
import { AirQualityAdapter, toCellId } from "../types.js";
import fs from "node:fs";
import path from "node:path";

export class ReplayAdapter implements AirQualityAdapter {
  readonly name = "replay";
  readonly isPrimary = false;
  private fixtureData: { snapshot: AirSnapshot; forecast: AirForecast } | null = null;

  constructor(private fixturePath?: string) {}

  private loadFixture(): { snapshot: AirSnapshot; forecast: AirForecast } {
    if (this.fixtureData) return this.fixtureData;

    try {
      const p = this.fixturePath || path.resolve(process.cwd(), "fixtures/delhi-smog-nov2026.json");
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
        this.fixtureData = {
          snapshot: AirSnapshotSchema.parse(raw.snapshot),
          forecast: AirForecastSchema.parse(raw.forecast)
        };
        return this.fixtureData;
      }
    } catch {
      // Fallback to internal default fixture
    }

    // Built-in fallback Nov 6 2026 Delhi smog fixture
    const defaultSnapshot: AirSnapshot = {
      cell: "28.61:77.21",
      ts: new Date().toISOString(),
      pm25: 382.5,
      pm10: 512.0,
      indexValue: 385,
      indexStandard: "ind_cpcb",
      category: "Severe",
      source: "replay",
      badge: "measured",
      fetchedAt: new Date().toISOString(),
      ttlSec: 3600,
      license: "Open Data / CPCB Historical Record",
      attribution: "CPCB Station ITO (Nov 2026 Smog Episode)",
      stationDistanceKm: 2.1
    };

    const defaultForecast: AirForecast = {
      cell: "28.61:77.21",
      fetchedAt: new Date().toISOString(),
      source: "replay",
      badge: "forecast",
      cleanestWindow: {
        startTs: new Date(Date.now() + 3 * 3600000).toISOString(),
        endTs: new Date(Date.now() + 6 * 3600000).toISOString(),
        expectedPm25: 210.0,
        reason: "Afternoon solar radiation and boundary layer ventilation"
      },
      hourly: [
        { ts: new Date().toISOString(), pm25: 382.5, pm10: 512.0, indexValue: 385, category: "Severe", badge: "forecast" },
        { ts: new Date(Date.now() + 3600000).toISOString(), pm25: 360.0, pm10: 480.0, indexValue: 365, category: "Severe", badge: "forecast" },
        { ts: new Date(Date.now() + 7200000).toISOString(), pm25: 290.0, pm10: 410.0, indexValue: 310, category: "Very Poor", badge: "forecast" },
        { ts: new Date(Date.now() + 10800000).toISOString(), pm25: 210.0, pm10: 310.0, indexValue: 240, category: "Poor", badge: "forecast" }
      ]
    };

    this.fixtureData = { snapshot: defaultSnapshot, forecast: defaultForecast };
    return this.fixtureData;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchCurrent(lat: number, lng: number): Promise<AirSnapshot> {
    const fixture = this.loadFixture();
    return {
      ...fixture.snapshot,
      cell: toCellId(lat, lng),
      fetchedAt: new Date().toISOString()
    };
  }

  async fetchForecast(lat: number, lng: number): Promise<AirForecast> {
    const fixture = this.loadFixture();
    return {
      ...fixture.forecast,
      cell: toCellId(lat, lng),
      fetchedAt: new Date().toISOString()
    };
  }
}
