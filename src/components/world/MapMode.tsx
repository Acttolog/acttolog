'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

/**
 * MAP / SAT modes — Leaflet loaded at runtime from CDN (keeps the memory-
 * constrained static build light; MIT licensed, attribution preserved §121).
 * MAP: OSM standard · SAT: Esri World Imagery.
 */

const LEAFLET_VERSION = '1.9.4';
const CSS_HREF = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const JS_SRC = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;

let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = CSS_HREF;
      document.head.appendChild(link);
    }
    const s = document.createElement('script');
    s.src = JS_SRC; s.async = true;
    s.onload = () => resolve((window as any).L);
    s.onerror = () => { leafletPromise = null; reject(new Error('leaflet-cdn')); };
    document.head.appendChild(s);
  });
  return leafletPromise;
}

export function MapMode({ center, zoom, layer, onMove, onPick, marker }: {
  center: [number, number];
  zoom: number;
  layer: 'map' | 'sat';
  onMove: (c: [number, number], z: number) => void;
  onPick: (lat: number, lng: number) => void;
  marker: [number, number] | null;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const markRef = useRef<any>(null);
  const cbRef = useRef({ onMove, onPick });
  cbRef.current = { onMove, onPick };
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !divRef.current || mapRef.current) return;
      const c = center, z = zoom;
      const map = L.map(divRef.current, {
        center: c, zoom: z, zoomControl: false, attributionControl: true,
        worldCopyJump: true, preferCanvas: true,
      });
      mapRef.current = map;
      map.on('moveend', () => {
        const cc = map.getCenter();
        cbRef.current.onMove([cc.lat, cc.lng], map.getZoom());
      });
      map.on('click', (e: any) => cbRef.current.onPick(e.latlng.lat, e.latlng.lng));
      const url = layer === 'sat'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const attrib = layer === 'sat' ? 'Imagery © Esri, Maxar, Earthstar Geographics' : '© OpenStreetMap contributors';
      tileRef.current = L.tileLayer(url, { attribution: attrib, maxZoom: 19, crossOrigin: true }).addTo(map);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch { /* ignore */ } mapRef.current = null; tileRef.current = null; markRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // layer switch with crossfade
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = (window as any).L;
    if (!L) return;
    const url = layer === 'sat'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attrib = layer === 'sat' ? 'Imagery © Esri, Maxar, Earthstar Geographics' : '© OpenStreetMap contributors';
    if (tileRef.current) map.removeLayer(tileRef.current);
    const el = divRef.current;
    if (el) el.style.opacity = '0.25';
    const t = L.tileLayer(url, { attribution: attrib, maxZoom: 19, crossOrigin: true });
    t.on('load', () => { if (el) el.style.opacity = '1'; });
    t.addTo(map);
    tileRef.current = t;
    setTimeout(() => { if (el) el.style.opacity = '1'; }, 900);
  }, [layer]);

  // external center/zoom sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const cur = map.getCenter();
    if (Math.abs(cur.lat - center[0]) > 1e-6 || Math.abs(cur.lng - center[1]) > 1e-6 || map.getZoom() !== zoom) {
      map.flyTo(center, zoom, { duration: 1.4 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);

  // marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = (window as any).L;
    if (!L) return;
    if (!marker) { if (markRef.current) { map.removeLayer(markRef.current); markRef.current = null; } return; }
    const icon = L.divIcon({
      className: 'atl-pin',
      html: `<span class="atl-pin-dot"></span><span class="atl-pin-ring"></span>`,
      iconSize: [26, 26], iconAnchor: [13, 13],
    });
    if (markRef.current) markRef.current.setLatLng(marker);
    else markRef.current = L.marker(marker, { icon }).addTo(map);
  }, [marker]);

  return (
    <div className="absolute inset-0" style={{ transition: 'opacity .45s' }}>
      {failed ? (
        <div className="w-full h-full grid place-items-center p-8">
          <div className="panel p-8 max-w-md text-center">
            <div className="font-display font-bold text-[17px] mb-2">MAP UNAVAILABLE</div>
            <p className="mut text-[13px] leading-relaxed mb-4">The map library could not be loaded from its CDN (offline or blocked). EARTH (3D) and SAT modes remain available; place data still works via search.</p>
            <button className="btn btn-g btn-sm" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      ) : (
        <div ref={divRef} className="w-full h-full" style={{ background: 'var(--bg)', zIndex: 0 }} />
      )}
      <style>{`
        .atl-pin { position: relative; }
        .atl-pin-dot { position:absolute; left:9px; top:9px; width:8px; height:8px; border-radius:50%;
          background: var(--mg, #ff4ecd); box-shadow: 0 0 12px var(--mg, #ff4ecd); }
        .atl-pin-ring { position:absolute; left:3px; top:3px; width:20px; height:20px; border-radius:50%;
          border:1px solid color-mix(in srgb, var(--mg, #ff4ecd) 70%, transparent); animation: atlpin 1.8s ease-out infinite; }
        @keyframes atlpin { 0% { transform: scale(.6); opacity:.9 } 100% { transform: scale(1.9); opacity:0 } }
        .leaflet-container { font: inherit; }
        .leaflet-control-attribution { background: color-mix(in srgb, var(--bg, #05060c) 72%, transparent) !important;
          color: var(--dim, #6c7899) !important; font-family: var(--font-mono, monospace); font-size: 9px !important; }
        .leaflet-control-attribution a { color: var(--mut, #93a0c4) !important; }
      `}</style>
    </div>
  );
}

