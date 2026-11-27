import { Hono } from "hono";
import { AirDataService } from "@airdelta/air-adapters";
import { parseCoordinates } from "../utils/security.js";

export function createAirRoutes(airService: AirDataService) {
  const router = new Hono();

  router.get("/", async (c) => {
    const coords = parseCoordinates(c.req.query("lat"), c.req.query("lng"));
    if (!coords.ok) {
      return c.json({ error: coords.error }, 400);
    }

    const providerParam = c.req.query("provider");
    const preferredProvider =
      providerParam === "open_meteo" || providerParam === "openaq" || providerParam === "auto"
        ? providerParam
        : undefined;

    const snapshot = await airService.getAirSnapshot(coords.lat, coords.lng, preferredProvider);
    return c.json(snapshot);
  });

  router.get("/forecast", async (c) => {
    const coords = parseCoordinates(c.req.query("lat"), c.req.query("lng"));
    if (!coords.ok) {
      return c.json({ error: coords.error }, 400);
    }

    const forecast = await airService.getAirForecast(coords.lat, coords.lng);
    return c.json(forecast);
  });

  router.get("/health", (c) => {
    return c.json({
      status: "ok",
      adapters: airService.getAdapterStats(),
      cache: airService.getCacheStats()
    });
  });

  return router;
}
