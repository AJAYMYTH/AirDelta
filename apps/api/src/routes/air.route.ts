import { Hono } from "hono";
import { AirDataService } from "@airdelta/air-adapters";

export function createAirRoutes(airService: AirDataService) {
  const router = new Hono();

  router.get("/", async (c) => {
    const latStr = c.req.query("lat");
    const lngStr = c.req.query("lng");
    const providerParam = c.req.query("provider");
    const preferredProvider =
      providerParam === "open_meteo" || providerParam === "openaq" || providerParam === "auto"
        ? providerParam
        : undefined;

    const lat = latStr ? parseFloat(latStr) : 28.6139; // Default Delhi (Connaught Place)
    const lng = lngStr ? parseFloat(lngStr) : 77.2090;

    if (isNaN(lat) || isNaN(lng)) {
      return c.json({ error: "Invalid latitude or longitude parameters" }, 400);
    }

    const snapshot = await airService.getAirSnapshot(lat, lng, preferredProvider);
    return c.json(snapshot);
  });

  router.get("/forecast", async (c) => {
    const latStr = c.req.query("lat");
    const lngStr = c.req.query("lng");

    const lat = latStr ? parseFloat(latStr) : 28.6139;
    const lng = lngStr ? parseFloat(lngStr) : 77.2090;

    if (isNaN(lat) || isNaN(lng)) {
      return c.json({ error: "Invalid latitude or longitude parameters" }, 400);
    }

    const forecast = await airService.getAirForecast(lat, lng);
    return c.json(forecast);
  });

  router.get("/health", (c) => {
    return c.json({
      status: "ok",
      adapters: airService.getAdapterStats()
    });
  });

  return router;
}
