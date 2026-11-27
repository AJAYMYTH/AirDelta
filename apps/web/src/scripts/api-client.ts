export interface CityPreset {
  code: string;
  label: string;
  lat: number;
  lng: number;
  cell: string;
}

export const CITY_PRESETS: Record<string, CityPreset> = {
  DELHI: { code: "DELHI", label: "Delhi-NCR", lat: 28.6139, lng: 77.2090, cell: "28.61:77.21" },
  MUMBAI: { code: "MUMBAI", label: "Mumbai", lat: 19.0760, lng: 72.8777, cell: "19.08:72.88" },
  BENGALURU: { code: "BENGALURU", label: "Bengaluru", lat: 12.9716, lng: 77.5946, cell: "12.97:77.59" },
  KANPUR: { code: "KANPUR", label: "Kanpur", lat: 26.4499, lng: 80.3319, cell: "26.45:80.33" },
  PATNA: { code: "PATNA", label: "Patna", lat: 25.5941, lng: 85.1376, cell: "25.59:85.14" },
  LUCKNOW: { code: "LUCKNOW", label: "Lucknow", lat: 26.8467, lng: 80.9462, cell: "26.85:80.95" }
};

export function snapToGrid(lat: number, lng: number): { lat: number; lng: number; cell: string } {
  const sLat = Math.round(lat * 100) / 100;
  const sLng = Math.round(lng * 100) / 100;
  return {
    lat: sLat,
    lng: sLng,
    cell: `${sLat.toFixed(2)}:${sLng.toFixed(2)}`
  };
}

export const DEFAULT_API_BASE = "http://localhost:3000";
export const PRODUCTION_API_BASE = "https://airdelta-api.onrender.com";

export function getApiBase(): string {
  try {
    const envBase = (import.meta as any).env?.PUBLIC_API_URL;
    if (envBase && typeof envBase === "string") return envBase.replace(/\/$/, "");
    const stored = localStorage.getItem("airdelta_api_url");
    if (stored) return stored.replace(/\/$/, "");
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host !== "localhost" && host !== "127.0.0.1") {
        return PRODUCTION_API_BASE;
      }
    }
  } catch {
    // ignore storage access issues
  }
  return DEFAULT_API_BASE;
}

export function getSelectedCity(): CityPreset {
  try {
    const code = localStorage.getItem("airdelta_city");
    if (code === "LIVE") {
      const raw = localStorage.getItem("airdelta_custom_location");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number" && typeof parsed?.cell === "string") {
          return {
            code: "LIVE",
            label: parsed.label || `Live (${parsed.lat.toFixed(2)}, ${parsed.lng.toFixed(2)})`,
            lat: parsed.lat,
            lng: parsed.lng,
            cell: parsed.cell
          };
        }
      }
    }
    if (code && CITY_PRESETS[code]) return CITY_PRESETS[code];
  } catch {
    // fallback
  }
  return CITY_PRESETS.DELHI;
}

export function setSelectedCity(code: string): CityPreset {
  if (code === "LIVE") {
    try {
      localStorage.setItem("airdelta_city", "LIVE");
    } catch {}
    const current = getSelectedCity();
    window.dispatchEvent(new CustomEvent("airdelta:citychange", { detail: current }));
    return current;
  }
  const preset = CITY_PRESETS[code] || CITY_PRESETS.DELHI;
  try {
    localStorage.setItem("airdelta_city", preset.code);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("airdelta:citychange", { detail: preset }));
  return preset;
}

export function setCustomLocation(lat: number, lng: number, label?: string): CityPreset {
  const snapped = snapToGrid(lat, lng);
  const preset: CityPreset = {
    code: "LIVE",
    label: label || `My Location (${snapped.lat.toFixed(2)}, ${snapped.lng.toFixed(2)})`,
    lat: snapped.lat,
    lng: snapped.lng,
    cell: snapped.cell
  };
  try {
    localStorage.setItem("airdelta_city", "LIVE");
    localStorage.setItem("airdelta_custom_location", JSON.stringify(preset));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("airdelta:citychange", { detail: preset }));
  return preset;
}

export type GeolocationResult =
  | { ok: true; lat: number; lng: number; cell: string }
  | { ok: false; reason: "unsupported" | "denied" | "unavailable" | "timeout"; message: string };

export function requestLiveLocationPermission(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({
        ok: false,
        reason: "unsupported",
        message: "Location services are not supported in this browser."
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const snapped = snapToGrid(pos.coords.latitude, pos.coords.longitude);
        resolve({ ok: true, ...snapped });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            ok: false,
            reason: "denied",
            message: "Location permission was denied. Allow location access in browser settings or tap the map."
          });
        } else if (err.code === err.TIMEOUT) {
          resolve({
            ok: false,
            reason: "timeout",
            message: "Location request timed out. Please try again or pick a spot on the map."
          });
        } else {
          resolve({
            ok: false,
            reason: "unavailable",
            message: "Unable to detect location right now. You can pick any point on the map."
          });
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

export function classifyUsAqi(aqi: number | null | undefined): string {
  if (typeof aqi !== "number") return "Moderate";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 150) return "Moderate";
  if (aqi <= 200) return "Poor";
  if (aqi <= 300) return "Very Poor";
  return "Severe";
}

export function getAqiVisualSpec(aqi: number | null | undefined): {
  color: string;
  bg: string;
  border: string;
  text: string;
  category: string;
} {
  const val = typeof aqi === "number" ? aqi : 120;
  if (val <= 50) return { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", category: "Good" };
  if (val <= 100) return { color: "#65a30d", bg: "#f7fee7", border: "#d9f99d", text: "#4d7c0f", category: "Satisfactory" };
  if (val <= 150) return { color: "#d97706", bg: "#fffbeb", border: "#fde68a", text: "#b45309", category: "Moderate" };
  if (val <= 200) return { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", category: "Poor" };
  if (val <= 300) return { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", category: "Very Poor" };
  return { color: "#991b1b", bg: "#fef2f2", border: "#fca5a5", text: "#7f1d1d", category: "Severe" };
}

export async function fetchOpenMeteoSnapshot(lat: number, lng: number): Promise<any> {
  const snapped = snapToGrid(lat, lng);
  const cacheKey = `airdelta_om_curr:${snapped.cell}`;
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.expiresAt > Date.now()) return parsed.data;
    }
  } catch {}

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,us_aqi,european_aqi`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = await res.json();
  const curr = json.current || {};
  const pm25 = typeof curr.pm2_5 === "number" ? Math.round(curr.pm2_5 * 10) / 10 : null;
  const pm10 = typeof curr.pm10 === "number" ? Math.round(curr.pm10 * 10) / 10 : null;
  const hasUs = typeof curr.us_aqi === "number";
  const indexValue = hasUs
    ? Math.round(curr.us_aqi)
    : typeof curr.european_aqi === "number"
    ? Math.round(curr.european_aqi)
    : null;

  const snap = {
    cell: snapped.cell,
    ts: curr.time ? new Date(curr.time).toISOString() : new Date().toISOString(),
    pm25,
    pm10,
    pollutants: {
      pm25,
      pm10,
      no2: typeof curr.nitrogen_dioxide === "number" ? Math.round(curr.nitrogen_dioxide * 10) / 10 : null,
      o3: typeof curr.ozone === "number" ? Math.round(curr.ozone * 10) / 10 : null,
      so2: typeof curr.sulphur_dioxide === "number" ? Math.round(curr.sulphur_dioxide * 10) / 10 : null
    },
    indexValue,
    europeanAqi: typeof curr.european_aqi === "number" ? Math.round(curr.european_aqi) : null,
    indexStandard: hasUs ? "us_epa" : "eu_aqi",
    category: classifyUsAqi(indexValue),
    source: "open_meteo",
    badge: "modelled",
    fetchedAt: new Date().toISOString(),
    ttlSec: 1800,
    attribution: `Open-Meteo Air Quality (${snapped.lat.toFixed(2)}, ${snapped.lng.toFixed(2)})`
  };

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ data: snap, expiresAt: Date.now() + 180000 }));
  } catch {}
  return snap;
}

export async function fetchOpenMeteoForecast(lat: number, lng: number): Promise<any> {
  const snapped = snapToGrid(lat, lng);
  const cacheKey = `airdelta_om_fc:${snapped.cell}`;
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.expiresAt > Date.now()) return parsed.data;
    }
  } catch {}

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm10,pm2_5,us_aqi,european_aqi&forecast_days=3`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo Forecast HTTP ${res.status}`);
  const json = await res.json();
  const hourly = json.hourly || {};
  const times: string[] = hourly.time || [];
  const pm25List: (number | null)[] = hourly.pm2_5 || [];
  const pm10List: (number | null)[] = hourly.pm10 || [];
  const usList: (number | null)[] = hourly.us_aqi || [];

  const items = times.slice(0, 72).map((t, i) => ({
    ts: new Date(t).toISOString(),
    pm25: pm25List[i] ?? null,
    pm10: pm10List[i] ?? null,
    indexValue: usList[i] ?? null,
    category: classifyUsAqi(usList[i]),
    badge: "forecast"
  }));

  const cutoff = Date.now() - 3600000;
  const futureStart = items.findIndex((item) => Date.parse(item.ts) >= cutoff);
  const search = futureStart >= 0 ? items.slice(futureStart) : items;

  let cleanestWindow = null;
  let minAvg = Infinity;
  let bestIdx = -1;
  for (let i = 0; i <= search.length - 3; i++) {
    const a = search[i]?.pm25;
    const b = search[i + 1]?.pm25;
    const c = search[i + 2]?.pm25;
    if (typeof a === "number" && typeof b === "number" && typeof c === "number") {
      const avg = (a + b + c) / 3;
      if (avg < minAvg) {
        minAvg = avg;
        bestIdx = i;
      }
    }
  }
  if (bestIdx >= 0) {
    cleanestWindow = {
      startTs: search[bestIdx].ts,
      endTs: search[bestIdx + 2].ts,
      expectedPm25: Math.round(minAvg * 10) / 10,
      reason: "Lowest dispersion concentration in Open-Meteo forecast"
    };
  }

  const fc = {
    cell: snapped.cell,
    fetchedAt: new Date().toISOString(),
    hourly: items,
    cleanestWindow,
    source: "open_meteo",
    badge: "forecast"
  };

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ data: fc, expiresAt: Date.now() + 300000 }));
  } catch {}
  return fc;
}

export async function apiFetchJson<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const cacheKey = `airdelta_cache:${path}`;

  if (method === "GET") {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.expiresAt > Date.now()) {
          return parsed.data as T;
        }
      }
    } catch {
      // ignore cache errors
    }
  }

  const url = `${getApiBase()}${path}`;
  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });
    if (res.ok || (res.status < 502 && res.status !== 429) || attempt === 1) {
      break;
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  if (!res || !res.ok) {
    const text = res ? await res.text().catch(() => "") : "";
    const status = res?.status ?? 0;
    console.warn(`[AirDelta API] ${method} ${path} failed (${status}): ${text}`);
    throw new Error(`HTTP ${status}${text ? `: ${text}` : ""}`);
  }
  const json = (await res.json()) as T;

  if (method === "GET") {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ data: json, expiresAt: Date.now() + 120000 }));
    } catch {
      // ignore cache write issues
    }
  }
  return json;
}

export function clearApiCache(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("airdelta_cache:")) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}

export function getGrapLabelForAqi(aqi: number | null | undefined): { stage: string; label: string; isSevere: boolean } {
  const val = aqi ?? 0;
  if (val > 450) return { stage: "STAGE_IV", label: "GRAP Stage IV · Severe+", isSevere: true };
  if (val > 400) return { stage: "STAGE_III", label: "GRAP Stage III · Severe", isSevere: true };
  if (val > 300) return { stage: "STAGE_II", label: "GRAP Stage II · Very Poor", isSevere: true };
  if (val > 200) return { stage: "STAGE_I", label: "GRAP Stage I · Poor", isSevere: false };
  return { stage: "NONE", label: "Normal Alert Level", isSevere: false };
}

export function formatLocalTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatHourShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString([], { hour: "2-digit", hour12: false }) + ":00";
}

export interface WaveUpdateOptions {
  size?: number;
  color?: string;
  duration?: number;
  playState?: "running" | "paused";
  origin?: "bottom" | "center";
  className?: string;
}

export function dispatchWaveUpdate(id: string, options: WaveUpdateOptions): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("airdelta:wave-update", { detail: { id, ...options } }));
}

export interface CountUpUpdateOptions {
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  fallbackText?: string;
}

export function dispatchCountUpUpdate(id: string, options: CountUpUpdateOptions): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("airdelta:countup", { detail: { id, ...options } }));
}

/**
 * Build a WhatsApp share/redirect URL that opens WhatsApp (app on mobile, WhatsApp Web on desktop)
 * with the pre-filled report or daily plan message.
 */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Redirect directly to WhatsApp to send a message, falling back to same-tab navigation if popups are blocked.
 */
export function redirectToWhatsApp(message: string): void {
  const url = buildWhatsAppShareUrl(message);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    window.location.href = url;
  }
}

function buildOfflineBaseline(lat: number, lng: number): { snapshot: any; forecast: any } {
  const snapped = snapToGrid(lat, lng);
  const now = Date.now();
  return {
    snapshot: {
      cell: snapped.cell,
      ts: new Date(now).toISOString(),
      pm25: 140,
      pm10: 210,
      pollutants: { pm25: 140, pm10: 210, no2: 48 },
      indexValue: 195,
      indexStandard: "ind_cpcb",
      category: "Poor",
      source: "replay",
      badge: "modelled",
      fetchedAt: new Date(now).toISOString(),
      ttlSec: 600,
      attribution: `Local Baseline Grid (${snapped.lat.toFixed(2)}, ${snapped.lng.toFixed(2)})`
    },
    forecast: {
      cell: snapped.cell,
      fetchedAt: new Date(now).toISOString(),
      source: "replay",
      badge: "forecast",
      cleanestWindow: {
        startTs: new Date(now + 3 * 3600000).toISOString(),
        endTs: new Date(now + 6 * 3600000).toISOString(),
        expectedPm25: 110,
        reason: "Offline fallback dispersion baseline"
      },
      hourly: [0, 1, 2, 3, 4, 5].map((h) => ({
        ts: new Date(now + h * 3600000).toISOString(),
        pm25: Math.max(95, 140 - h * 7),
        pm10: Math.max(140, 210 - h * 10),
        indexValue: Math.max(160, 195 - h * 6),
        category: "Poor",
        badge: "forecast"
      }))
    }
  };
}

/**
 * Dual-adapter resilient AQI fetcher that races/falls back across:
 * 1. Backend Dual-Adapter Race (`OpenAQ` measured accuracy + `Open-Meteo` low latency)
 * 2. Direct browser CORS `Open-Meteo` API
 * 3. Session cache / safe deterministic baseline (guaranteed never to throw)
 */
export async function fetchResilientAir(lat: number, lng: number): Promise<{ snapshot: any; forecast: any }> {
  try {
    const [snapshot, forecast] = await Promise.all([
      apiFetchJson<any>(`/v1/air?lat=${lat}&lng=${lng}&provider=auto`, {}, 4500),
      apiFetchJson<any>(`/v1/air/forecast?lat=${lat}&lng=${lng}`, {}, 4500)
    ]);
    if (snapshot && forecast) return { snapshot, forecast };
  } catch {
    // Fall back to direct Open-Meteo adapter below
  }

  try {
    const [snapshot, forecast] = await Promise.all([
      fetchOpenMeteoSnapshot(lat, lng),
      fetchOpenMeteoForecast(lat, lng)
    ]);
    return { snapshot, forecast };
  } catch {
    // Fall back to cached snapshot or safe baseline — never throw
  }

  try {
    const cached = sessionStorage.getItem("airdelta_last_snapshot");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.snapshot) {
        const baseline = buildOfflineBaseline(lat, lng);
        return { snapshot: parsed.snapshot, forecast: baseline.forecast };
      }
    }
  } catch {}

  return buildOfflineBaseline(lat, lng);
}
