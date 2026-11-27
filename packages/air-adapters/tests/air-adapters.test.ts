import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toCellId,
  parseCellId,
  ReplayAdapter,
  AirDataService,
  OpenAQAdapter
} from "../src/index.js";

describe("@airdelta/air-adapters test suite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    const promises = [
      service.getAirSnapshot(28.61, 77.21),
      service.getAirSnapshot(28.614, 77.209),
      service.getAirSnapshot(28.612, 77.211),
      service.getAirSnapshot(28.61, 77.21),
      service.getAirSnapshot(28.611, 77.212)
    ];

    const results = await Promise.all(promises);
    expect(results).toHaveLength(5);
    for (const r of results) {
      expect(r.cell).toBe("28.61:77.21");
      expect(r.indexValue).toBe(385);
    }
  });

  it("uses OpenAQ as default primary provider and ignores Google AQ unless explicitly enabled", async () => {
    const nowIso = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const stale2018Iso = "2018-02-21T21:15:00Z";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("airquality.googleapis.com")) {
        throw new Error("Google AQ API must not be called by default");
      }
      if (url.includes("/v3/locations?coordinates=")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 13,
                name: "Stale 2018 Station",
                distance: 1000,
                datetimeLast: { utc: stale2018Iso },
                sensors: [{ parameter: { name: "pm25" } }]
              },
              {
                id: 17,
                name: "R K Puram, Delhi - DPCC",
                distance: 6013,
                datetimeLast: { utc: nowIso },
                sensors: [{ parameter: { name: "pm25" } }, { parameter: { name: "pm10" } }]
              }
            ]
          }),
          { status: 200 }
        );
      }
      if (url.includes("/v3/locations/17/sensors")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                parameter: { name: "pm25", units: "µg/m³" },
                latest: { value: 149, datetime: { utc: nowIso, local: nowIso } }
              },
              {
                // Older duplicate sensor appearing later in the array must not overwrite fresh reading
                parameter: { name: "pm25", units: "µg/m³" },
                latest: { value: 201, datetime: { utc: stale2018Iso } }
              },
              {
                parameter: { name: "pm10", units: "µg/m³" },
                latest: { value: 226, datetime: { utc: nowIso } }
              },
              {
                parameter: { name: "no2", units: "ppb" },
                latest: { value: 50, datetime: { utc: nowIso } }
              }
            ]
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const service = new AirDataService({
      googleApiKey: "fake-google-key",
      openaqApiKey: "fake-openaq-key"
    });

    const snapshot = await service.getAirSnapshot(28.61, 77.21);
    expect(snapshot.source).toBe("openaq");
    expect(snapshot.badge).toBe("measured");
    expect(snapshot.pm25).toBe(149);
    expect(snapshot.pm10).toBe(226);
    expect(snapshot.pollutants?.no2).toBeCloseTo(94.1, 0);
    expect(snapshot.indexStandard).toBe("ind_cpcb");
    expect(snapshot.indexValue).toBe(322);
    expect(snapshot.attribution).toContain("R K Puram");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("handles zero PM2.5 readings cleanly in OpenAQAdapter", async () => {
    const nowIso = new Date().toISOString();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/v3/locations?")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 99,
                name: "Clean Monitor",
                distance: 1500,
                datetimeLast: { utc: nowIso },
                sensors: [{ parameter: { name: "pm25" } }]
              }
            ]
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          results: [
            {
              parameter: { name: "pm25", units: "µg/m³" },
              latest: { value: 0, datetime: { utc: nowIso } }
            }
          ]
        }),
        { status: 200 }
      );
    });

    const adapter = new OpenAQAdapter("test-key");
    const snap = await adapter.fetchCurrent(12.97, 77.59);
    expect(snap.pm25).toBe(0);
    expect(snap.indexValue).toBe(0);
    expect(snap.category).toBe("Good");
  });

  it("gracefully falls back when primary credentials are not provided", async () => {
    const service = new AirDataService({
      enableGoogle: false,
      enableOpenAQ: true
    });

    const snapshot = await service.getAirSnapshot(28.61, 77.21);
    expect(snapshot).toBeDefined();
    expect(snapshot.cell).toBe("28.61:77.21");
    expect(snapshot.badge).toMatch(/^(measured|forecast|modelled)$/);
  }, 12000);

  it("races OpenAQ and Open-Meteo for accuracy vs latency and never throws if both fail", async () => {
    const nowIso = new Date().toISOString();

    // Case 1: OpenAQ fails -> automatically falls back to low-latency Open-Meteo
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("api.openaq.org")) {
        return new Response("Upstream down", { status: 503 });
      }
      if (url.includes("air-quality-api.open-meteo.com")) {
        return new Response(
          JSON.stringify({
            current: {
              time: nowIso,
              pm2_5: 42.3,
              pm10: 78.1,
              nitrogen_dioxide: 31.2,
              us_aqi: 118,
              european_aqi: 52
            }
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const raceService = new AirDataService({
      openaqApiKey: "fake-openaq-key",
      strategy: "race",
      raceTimeoutMs: 1200
    });

    const meteoFallback = await raceService.getAirSnapshot(26.45, 80.33);
    expect(meteoFallback.source).toBe("open_meteo");
    expect(meteoFallback.indexValue).toBe(118);

    // Case 2: BOTH OpenAQ and Open-Meteo fail -> never throws, returns replay baseline
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network offline"));

    const failSafe = await raceService.getAirSnapshot(19.08, 72.88);
    expect(failSafe).toBeDefined();
    expect(failSafe.cell).toBe("19.08:72.88");
    expect(failSafe.indexValue).toBeGreaterThan(0);
    expect(failSafe.source).toBe("replay");
  });
});
