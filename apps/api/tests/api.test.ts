import { describe, it, expect } from "vitest";
import { createApp } from "../src/index.js";
import { AirDataService } from "@airdelta/air-adapters";

describe("AirDelta API test suite", () => {
  const airService = new AirDataService({ replayMode: true });
  const app = createApp(airService);

  it("responds to /healthz with status: ok", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.timestamp).toBeDefined();
  });

  it("fetches current conditions on GET /v1/air with provenance badges", async () => {
    const res = await app.request("/v1/air?lat=28.61&lng=77.21");
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.cell).toBe("28.61:77.21");
    expect(json.indexValue).toBe(385);
    expect(json.indexStandard).toBe("ind_cpcb");
    expect(json.badge).toBe("measured");
    expect(json.attribution).toBeDefined();
  });

  it("fetches 96-hour hourly forecast on GET /v1/air/forecast", async () => {
    const res = await app.request("/v1/air/forecast?lat=28.61&lng=77.21");
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.cell).toBe("28.61:77.21");
    expect(json.hourly.length).toBeGreaterThan(0);
    expect(json.cleanestWindow).toBeDefined();
    expect(json.cleanestWindow.expectedPm25).toBeLessThan(400);
  });

  it("rejects non-numeric latitude or longitude parameters", async () => {
    const res = await app.request("/v1/air?lat=invalid&lng=77.21");
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid");
  });
});
