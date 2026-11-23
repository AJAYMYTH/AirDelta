import { describe, it, expect } from "vitest";
import {
  toCellId,
  parseCellId,
  ReplayAdapter,
  AirDataService
} from "../src/index.js";

describe("@airdelta/air-adapters test suite", () => {
  it("normalizes coordinates into a spatial grid cell", () => {
    const cell = toCellId(28.613939, 77.209021);
    expect(cell).toBe("28.61:77.21");

    const parsed = parseCellId("28.61:77.21");
    expect(parsed.lat).toBeCloseTo(28.61);
    expect(parsed.lng).toBeCloseTo(77.21);
  });

  it("fetches historical smog fixture using ReplayAdapter", async () => {
    const adapter = new ReplayAdapter();
    const snapshot = await adapter.fetchCurrent(28.61, 77.21);

    expect(snapshot.cell).toBe("28.61:77.21");
    expect(snapshot.pm25).toBeGreaterThan(300);
    expect(snapshot.indexStandard).toBe("ind_cpcb");
    expect(snapshot.category).toBe("Severe");
    expect(snapshot.badge).toBe("measured");

    const forecast = await adapter.fetchForecast(28.61, 77.21);
    expect(forecast.hourly.length).toBeGreaterThan(0);
    expect(forecast.cleanestWindow).toBeDefined();
    expect(forecast.cleanestWindow?.expectedPm25).toBeLessThan(snapshot.pm25!);
  });

  it("executes request coalescing for concurrent spatial requests", async () => {
    const service = new AirDataService({ replayMode: true });

    // Launch 5 concurrent calls to the same cell
    const promises = [
      service.getAirSnapshot(28.61, 77.21),
      service.getAirSnapshot(28.614, 77.209),
      service.getAirSnapshot(28.612, 77.211),
      service.getAirSnapshot(28.61, 77.21),
      service.getAirSnapshot(28.611, 77.212)
    ];

    const results = await Promise.all(promises);
    expect(results).toHaveLength(5);
    // All should resolve with the same grid cell
    for (const r of results) {
      expect(r.cell).toBe("28.61:77.21");
      expect(r.indexValue).toBe(385);
    }
  });

  it("gracefully falls back when primary credentials are not provided", async () => {
    // Neither Google nor OpenAQ keys provided -> falls back gracefully without unhandled exception
    const service = new AirDataService({
      enableGoogle: true,
      enableOpenAQ: true
    });

    const snapshot = await service.getAirSnapshot(28.61, 77.21);
    expect(snapshot).toBeDefined();
    expect(snapshot.cell).toBe("28.61:77.21");
    expect(snapshot.badge).toMatch(/^(measured|forecast|modelled)$/);
  });
});
