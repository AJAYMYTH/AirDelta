import { Hono } from "hono";
import { AirDataService } from "@airdelta/air-adapters";

export function createAirRoutes(airService: AirDataService) {
  const router = new Hono();

  router.get("/", async (c) => {
    const latStr = c.req.query("lat");
    const lngStr = c.req.query("lng");

    const lat = latStr ? parseFloat(latStr) : 28.6139; // Default Delhi (Connaught Place)
    const lng = lngStr ? parseFloat(lngStr) : 77.2090;

    if (isNaN(lat) || isNaN(lng)) {
      return c.json({ error: "Invalid latitude or longitude parameters" }, 400);
    }

    try {
      const snapshot = await airService.getAirSnapshot(lat, lng);
      return c.json(snapshot);
    } catch (err: any) {
      return c.json({ error: "Failed to fetch air snapshot", message: err.message }, 502);
    }
  });

  router.get("/forecast", async (c) => {
    const latStr = c.req.query("lat");
    const lngStr = c.req.query("lng");

    const lat = latStr ? parseFloat(latStr) : 28.6139;
    const lng = lngStr ? parseFloat(lngStr) : 77.2090;

    if (isNaN(lat) || isNaN(lng)) {
      return c.json({ error: "Invalid latitude or longitude parameters" }, 400);
    }

    try {
      const forecast = await airService.getAirForecast(lat, lng);
      return c.json(forecast);
    } catch (err: any) {
      return c.json({ error: "Failed to fetch air forecast", message: err.message }, 502);
    }
  });

  return router;
}
