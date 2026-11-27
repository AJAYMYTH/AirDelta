import { AirSnapshot, AirForecast } from "@airdelta/schemas";
import { toCellId, CachedEntry } from "./types.js";
import { GoogleAirQualityAdapter } from "./adapters/google-aq.adapter.js";
import { OpenAQAdapter } from "./adapters/openaq.adapter.js";
import { OpenMeteoAdapter } from "./adapters/open-meteo.adapter.js";
import { ReplayAdapter } from "./adapters/replay.adapter.js";

export interface AirDataServiceConfig {
  googleApiKey?: string;
  openaqApiKey?: string;
  enableGoogle?: boolean;
  enableOpenAQ?: boolean;
  preferOpenMeteo?: boolean;
  strategy?: "openaq_first" | "open_meteo_first" | "race";
  raceTimeoutMs?: number;
  maxCacheEntries?: number;
  replayMode?: boolean;
  fixturePath?: string;
}

export type AirProviderPreference = "open_meteo" | "openaq" | "auto";

export interface AdapterHealthStats {
  successCount: number;
  failureCount: number;
  lastLatencyMs: number | null;
  avgLatencyMs: number | null;
  wins: number;
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

  private stats: Record<"openaq" | "open_meteo", AdapterHealthStats> = {
    openaq: { successCount: 0, failureCount: 0, lastLatencyMs: null, avgLatencyMs: null, wins: 0 },
    open_meteo: { successCount: 0, failureCount: 0, lastLatencyMs: null, avgLatencyMs: null, wins: 0 }
  };

  // Circuit breaker state for primary OpenAQ provider
  private primaryFailureCount = 0;
  private circuitOpenUntil = 0;

  private readonly maxCacheEntries: number;

  constructor(private config: AirDataServiceConfig = {}) {
    this.maxCacheEntries = Math.max(10, config.maxCacheEntries ?? 500);
    this.googleAdapter = new GoogleAirQualityAdapter(config.googleApiKey);
    this.openaqAdapter = new OpenAQAdapter(config.openaqApiKey);
    this.openMeteoAdapter = new OpenMeteoAdapter();
    this.replayAdapter = new ReplayAdapter(config.fixturePath);
  }

  getCacheStats() {
    return {
      currentEntries: this.currentCache.size,
      forecastEntries: this.forecastCache.size,
      maxEntries: this.maxCacheEntries
    };
  }

  private getFreshCached<T>(cache: Map<string, CachedEntry<T>>, key: string, now: number): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) return null;
    // Touch entry for LRU recency
    cache.delete(key);
    cache.set(key, entry);
    return entry.data;
  }

  private setBoundedCache<T>(cache: Map<string, CachedEntry<T>>, key: string, entry: CachedEntry<T>): void {
    const now = Date.now();
    if (cache.has(key)) {
      cache.delete(key);
    } else if (cache.size >= this.maxCacheEntries) {
      // First prune expired entries; if still full, evict oldest entry
      for (const [k, v] of cache) {
        if (v.expiresAt <= now) cache.delete(k);
        if (cache.size < this.maxCacheEntries) break;
      }
      if (cache.size >= this.maxCacheEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
      }
    }
    cache.set(key, entry);
  }

  getAdapterStats(): Record<"openaq" | "open_meteo", AdapterHealthStats> {
    return {
      openaq: { ...this.stats.openaq },
      open_meteo: { ...this.stats.open_meteo }
    };
  }

  private recordAdapterResult(adapter: "openaq" | "open_meteo", ok: boolean, latencyMs: number) {
    const entry = this.stats[adapter];
    if (ok) {
      entry.successCount++;
      entry.lastLatencyMs = Math.round(latencyMs);
      entry.avgLatencyMs =
        entry.avgLatencyMs === null
          ? entry.lastLatencyMs
          : Math.round(entry.avgLatencyMs * 0.7 + entry.lastLatencyMs * 0.3);
    } else {
      entry.failureCount++;
    }
  }

  async getAirSnapshot(lat: number, lng: number, preferredProvider?: AirProviderPreference): Promise<AirSnapshot> {
    const effectiveMode: AirProviderPreference =
      preferredProvider ||
      (this.config.strategy === "race"
        ? "auto"
        : this.config.strategy === "open_meteo_first" || this.config.preferOpenMeteo
        ? "open_meteo"
        : "openaq");

    const cell = toCellId(lat, lng);
    const cacheKey = effectiveMode === "open_meteo" ? `open_meteo:${cell}` : effectiveMode === "auto" ? `auto:${cell}` : cell;
    const now = Date.now();

    // 1. Check fresh cache (with LRU touch)
    const cached = this.getFreshCached(this.currentCache, cacheKey, now);
    if (cached) {
      return cached;
    }

    // 2. Request coalescing
    if (this.inFlightCurrent.has(cacheKey)) {
      return this.inFlightCurrent.get(cacheKey)!;
    }

    const fetchPromise = this.executeFetchHierarchy(lat, lng, cell, effectiveMode).catch(() =>
      this.safeReplaySnapshot(lat, lng)
    );
    this.inFlightCurrent.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      this.setBoundedCache(this.currentCache, cacheKey, {
        data: result,
        expiresAt: now + result.ttlSec * 1000
      });
      return result;
    } finally {
      this.inFlightCurrent.delete(cacheKey);
    }
  }

  async getAirForecast(lat: number, lng: number): Promise<AirForecast> {
    const cell = toCellId(lat, lng);
    const now = Date.now();

    // Check forecast cache (with LRU touch)
    const cached = this.getFreshCached(this.forecastCache, cell, now);
    if (cached) {
      return cached;
    }

    if (this.inFlightForecast.has(cell)) {
      return this.inFlightForecast.get(cell)!;
    }

    const fetchPromise = this.executeForecastHierarchy(lat, lng, cell).catch(() =>
      this.replayAdapter.fetchForecast(lat, lng)
    );
    this.inFlightForecast.set(cell, fetchPromise);

    try {
      const result = await fetchPromise;
      this.setBoundedCache(this.forecastCache, cell, {
        data: result,
        expiresAt: now + 6 * 3600 * 1000 // 6 hour TTL for forecasts
      });
      return result;
    } finally {
      this.inFlightForecast.delete(cell);
    }
  }

  private async safeReplaySnapshot(lat: number, lng: number): Promise<AirSnapshot> {
    try {
      return await this.replayAdapter.fetchCurrent(lat, lng);
    } catch {
      return {
        cell: toCellId(lat, lng),
        ts: new Date().toISOString(),
        pm25: 120,
        pm10: 180,
        pollutants: { pm25: 120, pm10: 180, no2: 45 },
        indexValue: 185,
        indexStandard: "ind_cpcb",
        category: "Moderate",
        source: "replay",
        badge: "modelled",
        fetchedAt: new Date().toISOString(),
        ttlSec: 600,
        license: "Open Data",
        attribution: "AirDelta Safe Offline Baseline"
      };
    }
  }

  private async tryOpenAQ(lat: number, lng: number): Promise<AirSnapshot | null> {
    const now = Date.now();
    if (now < this.circuitOpenUntil || this.config.enableOpenAQ === false) return null;
    if (!(await this.openaqAdapter.isAvailable())) return null;

    const t0 = performance.now();
    try {
      const snapshot = await this.openaqAdapter.fetchCurrent(lat, lng);
      this.primaryFailureCount = 0;
      this.recordAdapterResult("openaq", true, performance.now() - t0);
      return snapshot;
    } catch {
      this.primaryFailureCount++;
      this.recordAdapterResult("openaq", false, performance.now() - t0);
      if (this.primaryFailureCount >= 3) {
        this.circuitOpenUntil = now + 120000;
      }
      return null;
    }
  }

  private async tryOpenMeteo(lat: number, lng: number): Promise<AirSnapshot | null> {
    const t0 = performance.now();
    try {
      const snapshot = await this.openMeteoAdapter.fetchCurrent(lat, lng);
      this.recordAdapterResult("open_meteo", true, performance.now() - t0);
      return snapshot;
    } catch {
      this.recordAdapterResult("open_meteo", false, performance.now() - t0);
      return null;
    }
  }

  /**
   * Smart hedged race between OpenAQ (physical ground accuracy) and Open-Meteo (low latency + global coverage).
   * - If OpenAQ returns a fresh `measured` station reading within `raceTimeoutMs`, prefer OpenAQ for accuracy.
   * - Otherwise return low-latency Open-Meteo immediately without waiting; if Open-Meteo fails, fall back to OpenAQ.
   */
  private async raceAccurateAndFast(lat: number, lng: number): Promise<AirSnapshot | null> {
    const budgetMs = this.config.raceTimeoutMs ?? 2200;
    const openaqPromise = this.tryOpenAQ(lat, lng);
    const openMeteoPromise = this.tryOpenMeteo(lat, lng);

    const openaqWithinBudget = await Promise.race([
      openaqPromise,
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), budgetMs))
    ]);

    // Prefer fresh physical ground station if OpenAQ responded quickly with measured data
    if (openaqWithinBudget && openaqWithinBudget !== "timeout" && openaqWithinBudget.badge === "measured") {
      this.stats.openaq.wins++;
      return openaqWithinBudget;
    }

    // Otherwise take fast Open-Meteo if available
    const meteoSnap = await openMeteoPromise;
    if (meteoSnap) {
      this.stats.open_meteo.wins++;
      return meteoSnap;
    }

    // If Open-Meteo failed, wait for OpenAQ (even if modelled or slower)
    const lateOpenaq = openaqWithinBudget === "timeout" ? await openaqPromise : openaqWithinBudget;
    if (lateOpenaq) {
      this.stats.openaq.wins++;
      return lateOpenaq;
    }

    return null;
  }

  private async executeFetchHierarchy(
    lat: number,
    lng: number,
    cell: string,
    mode: AirProviderPreference = "openaq"
  ): Promise<AirSnapshot> {
    // If Replay Mode is forced
    if (this.config.replayMode) {
      return this.safeReplaySnapshot(lat, lng);
    }

    if (mode === "auto") {
      const raced = await this.raceAccurateAndFast(lat, lng);
      if (raced) return raced;
    } else if (mode === "open_meteo") {
      const meteo = await this.tryOpenMeteo(lat, lng);
      if (meteo) {
        this.stats.open_meteo.wins++;
        return meteo;
      }
      const oaq = await this.tryOpenAQ(lat, lng);
      if (oaq) {
        this.stats.openaq.wins++;
        return oaq;
      }
    } else {
      const oaq = await this.tryOpenAQ(lat, lng);
      if (oaq) {
        this.stats.openaq.wins++;
        return oaq;
      }
      const meteo = await this.tryOpenMeteo(lat, lng);
      if (meteo) {
        this.stats.open_meteo.wins++;
        return meteo;
      }
    }

    // Optional Google Air Quality API (disabled unless explicitly enabled via enableGoogle: true)
    if (this.config.enableGoogle === true && (await this.googleAdapter.isAvailable())) {
      try {
        return await this.googleAdapter.fetchCurrent(lat, lng);
      } catch {
        // Fallback to stale cache
      }
    }

    // Stale cache fallback (check both open_meteo and default cell keys, up to 6 hours)
    const now = Date.now();
    const stale =
      this.currentCache.get(cell) ||
      this.currentCache.get(`open_meteo:${cell}`) ||
      this.currentCache.get(`auto:${cell}`);
    if (stale && now - stale.expiresAt < 6 * 3600 * 1000) {
      return {
        ...stale.data,
        badge: "modelled",
        attribution: `${stale.data.attribution} (Stale Cache Fallback)`
      };
    }

    // Guaranteed non-failing Replay / Baseline Fallback
    return this.safeReplaySnapshot(lat, lng);
  }

  private async executeForecastHierarchy(lat: number, lng: number, cell: string): Promise<AirForecast> {
    if (this.config.replayMode) {
      return this.replayAdapter.fetchForecast(lat, lng);
    }

    // Step 1 (Default Forecast): Open-Meteo CAMS Forecast (free, zero Google AQ dependency)
    try {
      return await this.openMeteoAdapter.fetchForecast(lat, lng);
    } catch {
      // Fallback
    }

    // Step 2: Optional Google Forecast (disabled unless explicitly enabled)
    if (this.config.enableGoogle === true && (await this.googleAdapter.isAvailable())) {
      try {
        return await this.googleAdapter.fetchForecast(lat, lng);
      } catch {
        // Fallback
      }
    }

    // Step 3: Replay Forecast
    return this.replayAdapter.fetchForecast(lat, lng);
  }
}
