// src/services/locationService.js
//
// Single place for every location-related operation in the user app.
//
// Why this exists:
//  - GPS: use the OS's last-known fix first (instant) and only wait for a fresh
//    fix when there isn't a usable one. A hard timeout stops the app hanging
//    on "Checking your area..." when the GPS has no signal.
//  - Serviceability: identical coordinates were re-sent to the server on every
//    screen / map drag. Results are now cached (rounded to ~100 m) and
//    concurrent identical calls share one request.
//  - Geocoding: reverse-geocoding is slow (network round trip per call), so
//    results are cached and shared; place search no longer fires 1 + N
//    sequential-ish lookups for every keystroke.
import * as Location from "expo-location";
import axiosClient from "./axiosClient";

// ── tunables ─────────────────────────────────────────────────────────────────
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;   // accept an OS fix up to 5 min old
const LAST_KNOWN_REQUIRED_ACCURACY_M = 1000;   // …if it is accurate to ≤ 1 km
const FRESH_FIX_TIMEOUT_MS = 8000;             // give up waiting for a new fix
const SERVICE_CACHE_TTL_MS = 5 * 60 * 1000;
const GEOCODE_CACHE_MAX = 200;

// ── tiny helpers ─────────────────────────────────────────────────────────────
const withTimeout = (promise, ms) =>
    new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout")), ms);
        promise.then(
            (v) => { clearTimeout(t); resolve(v); },
            (e) => { clearTimeout(t); reject(e); }
        );
    });

const keyOf = (lat, lng, digits) => `${lat.toFixed(digits)},${lng.toFixed(digits)}`;

function lruSet(map, key, value) {
    if (map.has(key)) map.delete(key);
    map.set(key, value);
    if (map.size > GEOCODE_CACHE_MAX) map.delete(map.keys().next().value);
}

/** Great-circle distance in metres (cheap, for "did the user actually move?"). */
export function distanceMeters(a, b) {
    if (!a || !b) return Infinity;
    const R = 6371008.8;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.latitude - a.latitude);
    const dLng = rad(b.longitude - a.longitude);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// ── permission ───────────────────────────────────────────────────────────────
/** Resolves true if foreground location is granted. Only prompts when needed. */
export async function ensureLocationPermission() {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === "granted") return true;
    if (current.canAskAgain === false) return false;
    const req = await Location.requestForegroundPermissionsAsync();
    return req.status === "granted";
}

// ── position ─────────────────────────────────────────────────────────────────
/**
 * Fastest reasonable device position.
 *   1. OS last-known fix (instant)             → { fromCache: true }
 *   2. fresh Balanced fix, with a timeout       → { fromCache: false }
 *   3. fresh Low-accuracy fix / any last-known  (fallback when #2 times out)
 * Throws Error("permission_denied") or Error("position_unavailable").
 */
export async function getFastPosition({ allowCached = true } = {}) {
    if (!(await ensureLocationPermission())) throw new Error("permission_denied");

    if (allowCached) {
        try {
            const last = await Location.getLastKnownPositionAsync({
                maxAge: LAST_KNOWN_MAX_AGE_MS,
                requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M,
            });
            if (last?.coords) {
                const { latitude, longitude, accuracy } = last.coords;
                return { latitude, longitude, accuracy, fromCache: true };
            }
        } catch { /* fall through to a fresh fix */ }
    }

    try {
        const fresh = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            FRESH_FIX_TIMEOUT_MS
        );
        const { latitude, longitude, accuracy } = fresh.coords;
        return { latitude, longitude, accuracy, fromCache: false };
    } catch { /* timeout / provider off – try the cheap fallbacks */ }

    try {
        const low = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
            FRESH_FIX_TIMEOUT_MS
        );
        const { latitude, longitude, accuracy } = low.coords;
        return { latitude, longitude, accuracy, fromCache: false };
    } catch { /* fall through */ }

    const anyLast = await Location.getLastKnownPositionAsync().catch(() => null);
    if (anyLast?.coords) {
        const { latitude, longitude, accuracy } = anyLast.coords;
        return { latitude, longitude, accuracy, fromCache: true };
    }
    throw new Error("position_unavailable");
}

/**
 * Cheap, silent peek at where the device is NOW (used only to decide whether to
 * offer an "Update location" button). Never prompts for permission, never
 * throws, resolves null when unknown.
 *   1. OS last-known fix, ≤ 2 min old (free – no GPS wake-up)
 *   2. one Low-accuracy fix with a short timeout
 */
export const MOVED_THRESHOLD_M = 300;

export async function peekPosition({ maxAgeMs = 2 * 60 * 1000, timeoutMs = 6000 } = {}) {
    try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== "granted") return null;

        const last = await Location.getLastKnownPositionAsync({
            maxAge: maxAgeMs,
            requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M,
        });
        if (last?.coords) {
            const { latitude, longitude, accuracy } = last.coords;
            return { latitude, longitude, accuracy };
        }

        const fresh = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
            timeoutMs
        );
        const { latitude, longitude, accuracy } = fresh.coords;
        return { latitude, longitude, accuracy };
    } catch {
        return null;
    }
}

// ── serviceability ───────────────────────────────────────────────────────────
const serviceCache = new Map();     // key -> { at, data }
const serviceInflight = new Map();  // key -> Promise

/**
 * POST /api/service-areas/check with caching + in-flight de-duplication.
 * Resolves the backend payload: { success, serviceable, area, distance, radius, message }.
 */
export function checkServiceability(latitude, longitude, { force = false } = {}) {
    const key = keyOf(latitude, longitude, 3); // ≈ 110 m grid
    const now = Date.now();

    if (!force) {
        const hit = serviceCache.get(key);
        if (hit && now - hit.at < SERVICE_CACHE_TTL_MS) return Promise.resolve(hit.data);
        const pending = serviceInflight.get(key);
        if (pending) return pending;
    }

    const p = axiosClient
        .post("/api/service-areas/check", { latitude, longitude })
        .then((res) => {
            if (!res.data?.success) {
                throw new Error(res.data?.message || "Serviceability check failed");
            }
            lruSet(serviceCache, key, { at: Date.now(), data: res.data });
            return res.data;
        })
        .finally(() => serviceInflight.delete(key));

    serviceInflight.set(key, p);
    return p;
}

// ── geocoding ────────────────────────────────────────────────────────────────
const reverseCache = new Map();     // key -> placemark | null
const reverseInflight = new Map();

/** Cached reverse geocode. Resolves the first placemark, or null (never throws). */
export function reverseGeocode(latitude, longitude) {
    const key = keyOf(latitude, longitude, 4); // ≈ 11 m grid
    if (reverseCache.has(key)) return Promise.resolve(reverseCache.get(key));
    if (reverseInflight.has(key)) return reverseInflight.get(key);

    const p = Location.reverseGeocodeAsync({ latitude, longitude })
        .then((geo) => {
            const g = geo?.[0] ?? null;
            if (g) lruSet(reverseCache, key, g); // don't cache failures/empties
            return g;
        })
        .catch(() => null)
        .finally(() => reverseInflight.delete(key));

    reverseInflight.set(key, p);
    return p;
}

export const cityOf = (g) => g?.city || g?.region || "";

/**
 * Build a display string from a placemark.
 *   "full"  → name, street no., street, district, subregion, city, region, postcode
 *   "short" → street, district, city, region
 */
export function formatAddress(g, style = "full") {
    if (!g) return "";
    const parts =
        style === "short"
            ? [g.street, g.district, g.city, g.region]
            : [g.name, g.streetNumber, g.street, g.district, g.subregion, g.city, g.region, g.postalCode];
    return parts.filter(Boolean).join(", ");
}

/**
 * Forward-geocode a text query into labelled results.
 * Lookups for the labels run in parallel and share the reverse-geocode cache.
 * Resolves [{ label, latitude, longitude, city }].
 */
export async function searchPlaces(text, { limit = 4, style = "full" } = {}) {
    const q = (text || "").trim();
    if (!q) return [];
    const found = await Location.geocodeAsync(q);
    return Promise.all(
        found.slice(0, limit).map(async (r) => {
            const g = await reverseGeocode(r.latitude, r.longitude);
            return {
                label: formatAddress(g, style) || q,
                latitude: r.latitude,
                longitude: r.longitude,
                city: cityOf(g) || null,
            };
        })
    );
}
