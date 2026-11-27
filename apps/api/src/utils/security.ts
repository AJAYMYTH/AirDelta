import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time secret comparison using fixed-length SHA-256 digests so comparison
 * duration does not leak token length or prefix characters.
 */
export function timingSafeSecretEquals(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedDigest = createHash("sha256").update(provided).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

/**
 * Parses and validates geographic coordinates against WGS84 bounds.
 */
export function parseCoordinates(
  latStr?: string,
  lngStr?: string,
  defaultLat: number = 28.6139,
  defaultLng: number = 77.209
): { ok: true; lat: number; lng: number } | { ok: false; error: string } {
  const lat = latStr !== undefined ? Number(latStr) : defaultLat;
  const lng = lngStr !== undefined ? Number(lngStr) : defaultLng;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: "Invalid latitude or longitude parameters" };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: "Coordinates out of bounds (lat: -90..90, lng: -180..180)" };
  }
  return { ok: true, lat, lng };
}

/**
 * Inserts an entry into a Map while keeping memory strictly bounded via LRU eviction.
 */
export function setBoundedMapEntry<K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  maxEntries: number = 2000
): void {
  if (map.has(key)) {
    map.delete(key);
  } else if (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) {
      map.delete(oldestKey);
    }
  }
  map.set(key, value);
}
