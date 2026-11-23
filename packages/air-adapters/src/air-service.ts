import { AirSnapshot, AirForecast } from "@airdelta/schemas";
import { AirQualityAdapter, toCellId, CachedEntry } from "./types.js";
import { GoogleAirQualityAdapter } from "./adapters/google-aq.adapter.js";
import { OpenAQAdapter } from "./adapters/openaq.adapter.js";
import { OpenMeteoAdapter } from "./adapters/open-meteo.adapter.js";
import { ReplayAdapter } from "./adapters/replay.adapter.js";

export interface AirDataServiceConfig {
  googleApiKey?: string;
  openaqApiKey?: string;
  enableGoogle?: boolean;
  enableOpenAQ?: boolean;
  replayMode?: boolean;
  fixturePath?: string;
}

export class AirDataService {
  private googleAdapter: GoogleAirQualityAdapter;
  private openaqAdapter: OpenAQAdapter;
  private openMeteoAdapter: OpenMeteoAdapter;
  private replayAdapter: ReplayAdapter;

  private currentCache = new Map<string, CachedEntry<AirSnapshot>>();
  private forecastCache = new Map<string, CachedEntry<AirForecast>>();
  private inFlightCurrent = new Map<string, Promise<AirSnapshot>>();
  private inFlightForecast = new Map<string, Promise<AirForecast>>();

  // Circuit breaker state for primary Google AQ
  private primaryFailureCount = 0;
  private circuitOpenUntil = 0;

  constructor(private config: AirDataServiceConfig = {}) {
    this.googleAdapter = new GoogleAirQualityAdapter(config.googleApiKey);
    this.openaqAdapter = new OpenAQAdapter(config.openaqApiKey);
    this.openMeteoAdapter = new OpenMeteoAdapter();
    this.replayAdapter = new ReplayAdapter(config.fixturePath);
  }

  async getAirSnapshot(lat: number, lng: number): Promise<AirSnapshot> {
    const cell = toCellId(lat, lng);
    const now = Date.now();

    // 1. Check fresh cache
    const cached = this.currentCache.get(cell);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // 2. Request coalescing
    if (this.inFlightCurrent.has(cell)) {
      return this.inFlightCurrent.get(cell)!;
    }

    const fetchPromise = this.executeFetchHierarchy(lat, lng, cell);
    this.inFlightCurrent.set(cell, fetchPromise);

    try {
      const result = await fetchPromise;
      this.currentCache.set(cell, {
        data: result,
        expiresAt: now + result.ttlSec * 1000
      });
      return result;
    } finally {
      this.inFlightCurrent.delete(cell);
    }
  }

  async getAirForecast(lat: number, lng: number): Promise<AirForecast> {
    const cell = toCellId(lat, lng);
    const now = Date.now();

    // Check forecast cache
    const cached = this.forecastCache.get(cell);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    if (this.inFlightForecast.has(cell)) {
      return this.inFlightForecast.get(cell)!;
    }

    const fetchPromise = this.executeForecastHierarchy(lat, lng, cell);
    this.inFlightForecast.set(cell, fetchPromise);

    try {
      const result = await fetchPromise;
      this.forecastCache.set(cell, {
        data: result,
        expiresAt: now + 6 * 3600 * 1000 // 6 hour TTL for forecasts
      });
      return result;
    } finally {
      this.inFlightForecast.delete(cell);
    }
  }

  private async executeFetchHierarchy(lat: number, lng: number, cell: string): Promise<AirSnapshot> {
    // If Replay Mode is forced
    if (this.config.replayMode) {
      return this.replayAdapter.fetchCurrent(lat, lng);
    }

    const now = Date.now();
    const isCircuitOpen = now < this.circuitOpenUntil;

    // Step 1: Google Air Quality API (Primary)
    if (!isCircuitOpen && this.config.enableGoogle !== false && (await this.googleAdapter.isAvailable())) {
      try {
        const snapshot = await this.googleAdapter.fetchCurrent(lat, lng);
        this.primaryFailureCount = 0;
        return snapshot;
      } catch (err) {
        this.primaryFailureCount++;
        if (this.primaryFailureCount >= 3) {
          this.circuitOpenUntil = now + 120000; // Trip circuit for 2 minutes
        }
      }
    }

    // Step 2: OpenAQ v3 (Measured Ground Stations)
    if (this.config.enableOpenAQ !== false && (await this.openaqAdapter.isAvailable())) {
      try {
        return await this.openaqAdapter.fetchCurrent(lat, lng);
      } catch {
        // Fallback to next tier
      }
    }

    // Step 3: Open-Meteo European CAMS (Free Fallback)
    try {
      return await this.openMeteoAdapter.fetchCurrent(lat, lng);
    } catch {
      // Fallback to replay
    }

    // Step 4: Stale cache fallback (up to 6 hours)
    const stale = this.currentCache.get(cell);
    if (stale && now - stale.expiresAt < 6 * 3600 * 1000) {
      return {
        ...stale.data,
        badge: "modelled",
        attribution: `${stale.data.attribution} (Stale Cache Fallback)`
      };
    }

    // Step 5: Safe Deterministic Replay / Offline Fixture
    return this.replayAdapter.fetchCurrent(lat, lng);
  }

  private async executeForecastHierarchy(lat: number, lng: number, cell: string): Promise<AirForecast> {
    if (this.config.replayMode) {
      return this.replayAdapter.fetchForecast(lat, lng);
    }

    const now = Date.now();
    const isCircuitOpen = now < this.circuitOpenUntil;

    // Step 1: Google Forecast
    if (!isCircuitOpen && this.config.enableGoogle !== false && (await this.googleAdapter.isAvailable())) {
      try {
        return await this.googleAdapter.fetchForecast(lat, lng);
      } catch {
        // Fallback
      }
    }

    // Step 2: Open-Meteo Forecast
    try {
      return await this.openMeteoAdapter.fetchForecast(lat, lng);
    } catch {
      // Fallback
    }

    // Step 3: Replay Forecast
    return this.replayAdapter.fetchForecast(lat, lng);
  }
}
