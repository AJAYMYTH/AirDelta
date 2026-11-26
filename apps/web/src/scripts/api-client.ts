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

export const DEFAULT_API_BASE = "http://localhost:3000";

export function getApiBase(): string {
  try {
    const envBase = (import.meta as any).env?.PUBLIC_API_URL;
    if (envBase && typeof envBase === "string") return envBase.replace(/\/$/, "");
    const stored = localStorage.getItem("airdelta_api_url");
    if (stored) return stored.replace(/\/$/, "");
  } catch {
    // ignore storage access issues
  }
  return DEFAULT_API_BASE;
}

export function getSelectedCity(): CityPreset {
  try {
    const code = localStorage.getItem("airdelta_city");
    if (code && CITY_PRESETS[code]) return CITY_PRESETS[code];
  } catch {
    // fallback
  }
  return CITY_PRESETS.DELHI;
}

export function setSelectedCity(code: string): CityPreset {
  const preset = CITY_PRESETS[code] || CITY_PRESETS.DELHI;
  try {
    localStorage.setItem("airdelta_city", preset.code);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("airdelta:citychange", { detail: preset }));
  return preset;
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
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ""}`);
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
