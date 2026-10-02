/**
 * ACTTOLOG Google mapping service layer (spec §10/§53).
 *
 * One honest switch: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
 *  · absent  → every Google path reports NOT CONFIGURED and the world runs
 *              on the key-free stack (OSM tiles · Esri imagery · Nominatim ·
 *              Overpass · ACTTOLOG procedural 360 worlds) — fully functional.
 *  · present → the official Google Maps Platform surfaces activate:
 *              Maps JS (map/satellite/photorealistic 3D with a Map ID),
 *              Places Autocomplete, Street View embed.
 *
 * Only officially supported, documented endpoints are used — never scraped
 * or undocumented ones (master prompt §0.8). The key is a *public* browser
 * key: it must be HTTP-referrer-restricted in Google Cloud Console.
 */

/** Build-time inlined public key (safe to expose; restrict by referrer). */
export function googleMapsKey(): string {
  return (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
}

/** Optional Map ID — enables Photorealistic 3D Tiles / vector styling. */
export function googleMapId(): string {
  return (process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || '').trim();
}

export function googleMapsConfigured(): boolean {
  return googleMapsKey().length > 0;
}

/** Human-facing status for HUD / boot / admin surfaces — never faked. */
export function googleStatusText(): string {
  return googleMapsConfigured() ? 'READY' : 'NOT CONFIGURED · OSM/ESRI ACTIVE';
}

/** Exactly what the owner must do — surfaced in Help + Admin → Integrations. */
export const GOOGLE_SETUP_STEPS: string[] = [
  'Google Cloud Console → create/select a project → enable "Maps JavaScript API", "Places API" and "Street View Static API".',
  'Credentials → Create API key → restrict by HTTP referrer to the ACTTOLOG domains (acttolog.vercel.app, acttolog.github.io, www.acttolog.com.np).',
  'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY on Vercel (and optionally NEXT_PUBLIC_GOOGLE_MAP_ID for Photorealistic 3D), then redeploy.',
  'Billing must be enabled on the Google Cloud project for Maps Platform usage.',
];

/* ── Maps JavaScript API loader (single-flight, callback based) ────── */

// Minimal structural surface — avoids a hard @types/google.maps dependency
// (dependency policy: no casual installs; only used behind the key gate).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GoogleMapsNS = any;

let mapsPromise: Promise<GoogleMapsNS> | null = null;
let cbCounter = 0;

export function loadGoogleMaps(libraries: string = 'maps,places'): Promise<GoogleMapsNS> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  const key = googleMapsKey();
  if (!key) return Promise.reject(new Error('GOOGLE_MAPS_NOT_CONFIGURED'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google.maps);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<GoogleMapsNS>((resolve, reject) => {
    const cbName = `__atlGmapsCb${++cbCounter}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[cbName] = () => {
      resolve(w.google.maps);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[cbName];
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=${encodeURIComponent(libraries)}&callback=${cbName}&loading=async`;
    s.async = true;
    s.onerror = () => { mapsPromise = null; reject(new Error('GOOGLE_MAPS_LOAD_FAILED')); };
    document.head.appendChild(s);
  });
  return mapsPromise;
}

/* ── Street View (official embed, key-gated) ───────────────────────── */

/** Official Maps Embed API Street View URL — only valid with a configured key. */
export function streetViewEmbedUrl(lat: number, lon: number, heading = 0, fov = 90): string | null {
  const key = googleMapsKey();
  if (!key) return null;
  const p = new URLSearchParams({
    key,
    location: `${lat.toFixed(6)},${lon.toFixed(6)}`,
    heading: String(Math.round(heading)),
    fov: String(Math.round(fov)),
    pitch: '0',
  });
  return `https://www.google.com/maps/embed/v1/streetview?${p.toString()}`;
}

/* ── Places Autocomplete (key-gated; Nominatim remains the default) ── */

export interface GooglePlaceSuggestion {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lon: number | null;
}

/**
 * Places AutocompleteService predictions. Returns null when Google is not
 * configured so callers transparently fall back to Nominatim.
 */
export async function googlePlaceSuggestions(query: string): Promise<GooglePlaceSuggestion[] | null> {
  if (!googleMapsConfigured() || query.trim().length < 3) return null;
  try {
    const maps = await loadGoogleMaps('places');
    const svc = new maps.places.AutocompleteService();
    const res = await svc.getPlacePredictions({ input: query });
    return (res.predictions || []).slice(0, 6).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => ({
        id: p.placeId,
        name: p.structuredFormatting?.mainText || p.description,
        address: p.description,
        lat: null,
        lon: null,
      }),
    );
  } catch {
    return null; // honest fallback — never block search on a failed provider
  }
}

/** Resolve a Google placeId to coordinates (PlacesService details). */
export async function googlePlaceLocation(placeId: string): Promise<{ lat: number; lon: number; name: string } | null> {
  if (!googleMapsConfigured()) return null;
  try {
    const maps = await loadGoogleMaps('places');
    const el = document.createElement('div');
    const svc = new maps.places.PlacesService(el);
    return await new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      svc.getDetails({ placeId, fields: ['name', 'geometry'] }, (p: any) => {
        const loc = p?.geometry?.location;
        resolve(loc ? { lat: loc.lat(), lon: loc.lng(), name: p.name } : null);
      });
    });
  } catch {
    return null;
  }
}
