'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared Leaflet bootstrap. Loaded from CDN at runtime rather than bundled —
 * keeps the memory-constrained static export light (MIT licensed, attribution
 * preserved). Single-flight across every surface that needs a map.
 */

const LEAFLET_VERSION = '1.9.4';
const CSS_HREF = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const JS_SRC = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;

export const TILE_URLS = {
  map: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
} as const;

export const TILE_ATTR: Record<'map' | 'sat', string> = {
  map: '© OpenStreetMap contributors',
  sat: 'Imagery © Esri, Maxar, Earthstar Geographics',
};

let leafletPromise: Promise<any> | null = null;

export function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_HREF;
      document.head.appendChild(link);
    }
    const s = document.createElement('script');
    s.src = JS_SRC;
    s.async = true;
    s.onload = () => resolve((window as any).L);
    s.onerror = () => { leafletPromise = null; reject(new Error('leaflet-cdn')); };
    document.head.appendChild(s);
  });
  return leafletPromise;
}

/** Map skin shared by every ACTTOLOG Leaflet surface. */
export const LEAFLET_SKIN = `
  .leaflet-container { font: inherit; background: var(--bg); }
  .leaflet-control-attribution { background: color-mix(in srgb, var(--bg, #05060c) 72%, transparent) !important;
    color: var(--dim, #6c7899) !important; font-family: var(--font-mono, monospace); font-size: 9px !important; }
  .leaflet-control-attribution a { color: var(--mut, #93a0c4) !important; }
  .leaflet-control-zoom a { background: var(--panel) !important; color: var(--txt) !important;
    border-color: var(--line) !important; }
  .leaflet-control-zoom a:hover { background: var(--panel2, var(--panel)) !important; }
  /* Stock OSM is a white raster and looks unfinished inside a dark theme.
     Recolour the tile pane only — never the satellite layer, where it would
     destroy real imagery. */
  .np-tiles-doc { filter: invert(.92) hue-rotate(180deg) brightness(.95) contrast(.92) saturate(.82); }
  html[data-theme="light"] .np-tiles-doc, html[data-theme="paper"] .np-tiles-doc { filter: none; }
  .leaflet-tile { background: transparent; }
`;
