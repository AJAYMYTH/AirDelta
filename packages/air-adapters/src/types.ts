import { AirSnapshot, AirForecast } from "@airdelta/schemas";

export interface AirQualityAdapter {
  readonly name: string;
  readonly isPrimary: boolean;
  fetchCurrent(lat: number, lng: number): Promise<AirSnapshot>;
  fetchForecast?(lat: number, lng: number): Promise<AirForecast>;
  isAvailable(): Promise<boolean>;
}

export function toCellId(lat: number, lng: number): string {
  const roundedLat = (Math.round(lat * 100) / 100).toFixed(2);
  const roundedLng = (Math.round(lng * 100) / 100).toFixed(2);
  return `${roundedLat}:${roundedLng}`;
}

export function parseCellId(cellId: string): { lat: number; lng: number } {
  const [latStr, lngStr] = cellId.split(":");
  return {
    lat: parseFloat(latStr) || 28.61,
    lng: parseFloat(lngStr) || 77.21
  };
}

export interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}
