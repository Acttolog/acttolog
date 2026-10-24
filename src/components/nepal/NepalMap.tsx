'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadLeaflet, TILE_URLS, TILE_ATTR, LEAFLET_SKIN } from '@/lib/leaflet';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import type { NepalPlace, NepalRegion } from '@/lib/content/nepal';

/**
 * NepalMap — the interactive zone explorer for the tourism guide.
 * Leaflet arrives from CDN on mount (shared single-flight loader), so this
 * component costs nothing until the map scrolls into view. Region hotspots
 * drive a detail panel; selecting a region drops its place pins.
 */

const NEPAL_CENTER: [number, number] = [28.35, 84.35];
const NEPAL_ZOOM = 7;

/** Leaflet exposes no HTML escaper and these strings go into innerHTML. */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export function NepalMap({ regions, placesByRegion }: {
  regions: NepalRegion[];
  placesByRegion: Record<string, NepalPlace[]>;
}) {
  const { locale, L } = useI18n();
  const ne = locale === 'ne';
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hotspotsFailed, setHotspotsFailed] = useState(false);
  const [layer, setLayer] = useState<'map' | 'sat'>('map');
  const [active, setActive] = useState<string | null>(regions[0]?.id ?? null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !divRef.current || mapRef.current) return;
      try {
        const map = L.map(divRef.current, {
          center: NEPAL_CENTER, zoom: NEPAL_ZOOM, zoomControl: true,
          attributionControl: true, worldCopyJump: false, preferCanvas: true,
          minZoom: 6, maxZoom: 17, scrollWheelZoom: false,
        });
        mapRef.current = map;
        map.on('zoomend', () => { map.scrollWheelZoom.disable(); });
        map.on('mouseover', () => { map.scrollWheelZoom.enable(); });
        map.on('mouseout', () => { map.scrollWheelZoom.disable(); });
        tileRef.current = L.tileLayer(TILE_URLS.map, {
          attribution: TILE_ATTR.map, maxZoom: 19, crossOrigin: true,
        }).addTo(map);
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* ignore */ }
        mapRef.current = null; tileRef.current = null;
      }
    };
  }, []);

  // tile layer switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).L) return;
    const L = (window as any).L;
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(TILE_URLS[layer], {
      attribution: TILE_ATTR[layer], maxZoom: 19, crossOrigin: true,
    }).addTo(map);
  }, [layer, ready]);

  // dark-theme recolour applies to the OSM layer only, never satellite
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const pane = map.getPane('tilePane');
    if (pane) pane.classList.toggle('np-tiles-doc', layer === 'map');
  }, [layer, ready]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of regions) c[r.id] = (placesByRegion[r.id] || []).length;
    return c;
  }, [regions, placesByRegion]);

  // region hotspots
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !(window as any).L) return;
    const L = (window as any).L;
    let group: any = null;
    // A marker-build failure must degrade to "no hotspots", never take down
    // the whole guide — an API drift or blocked CDN used to render ERROR 500.
    try {
      group = L.layerGroup().addTo(map);
      setHotspotsFailed(false);
      for (const r of regions) {
        const on = r.id === active;
        // Resolve the label BEFORE touching Leaflet: the local `L` below is
        // the Leaflet namespace, which shadows the i18n `L` inside this scope.
        const nm = (locale === 'ne' && r.name.ne) ? r.name.ne : r.name.en;
        const icon = L.divIcon({
          className: 'np-zone',
          html: `<i style="--a:${r.accent}" class="np-zone-in${on ? ' on' : ''}">
                 <b>${String(regions.indexOf(r) + 1).padStart(2, '0')}</b>
               </i><s>${esc(nm)}</s>`,
          iconSize: [34, 34], iconAnchor: [17, 17],
        });
        const m = L.marker(r.center, { icon, title: r.name.en });
        m.on('click', () => { setActive(r.id); track('nepal_zone', { zone: r.id }); });
        group.addLayer(m);
      }
    } catch {
      if (group) { try { map.removeLayer(group); } catch { /* ignore */ } }
      setHotspotsFailed(true);
    }
    return () => { if (group) { try { map.removeLayer(group); } catch { /* ignore */ } } };
  }, [ready, active, regions, locale]);

  // place pins for the active region
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !(window as any).L || !active) return;
    const L = (window as any).L;
    let group: any = null;
    try {
      group = L.layerGroup().addTo(map);
      for (const p of placesByRegion[active] || []) {
        const icon = L.divIcon({ className: 'np-place', html: '<i></i>', iconSize: [12, 12], iconAnchor: [6, 6] });
        const mk = L.marker(p.coords, { icon });
        mk.bindTooltip(`<b>${esc(p.name.en)}</b>${p.unesco ? ' · UNESCO' : ''}`, {
          direction: 'top', offset: [0, -6], className: 'np-tip',
        });
        group.addLayer(mk);
      }
    } catch {
      if (group) { try { map.removeLayer(group); } catch { /* ignore */ } }
    }
    return () => { if (group) { try { map.removeLayer(group); } catch { /* ignore */ } } };
  }, [ready, active, placesByRegion]);

  // glide to the active region (skipped for reduced motion)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !active) return;
    const r = regions.find((x) => x.id === active);
    if (!r) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo(r.center, r.zoom, reduced ? { duration: 0 } : { duration: 1.1 });
  }, [active, ready, regions]);

  const activeRegion = regions.find((r) => r.id === active);
  const activePlaces = active ? placesByRegion[active] || [] : [];

  return (
    <div className="np-map-shell">
      <div className="np-map-wrap">
        {failed ? (
          <div className="np-map-fail panel">
            <div className="eyebrow">MAP OFFLINE</div>
            <p className="mut">
              The map library could not be loaded from its CDN — you are likely offline, or the request was blocked.
              Every region, place and guideline on this page is still readable below.
            </p>
            <button className="btn btn-g btn-sm" onClick={() => location.reload()}>Retry</button>
          </div>
        ) : (
          <>
            <div ref={divRef} className="np-map" aria-label="Interactive map of Nepal tourism regions" />
            {!ready && <div className="np-map-loading mono">BOOTING MAP…</div>}
            <div className="np-map-tools">
              <button className={`chip${layer === 'map' ? ' on' : ''}`} onClick={() => setLayer('map')} aria-pressed={layer === 'map'}>
                {locale === 'ne' ? 'नक्सा' : 'MAP'}
              </button>
              <button className={`chip${layer === 'sat' ? ' on' : ''}`} onClick={() => setLayer('sat')} aria-pressed={layer === 'sat'}>
                {locale === 'ne' ? 'स्याटेलाइट' : 'SAT'}
              </button>
            </div>
          </>
        )}
      </div>

      <aside className="np-map-panel panel" aria-live="polite">
        <div className="np-zone-list" role="group" aria-label="Nepal tourism regions">
          {regions.map((r, i) => (
            <button
              key={r.id}
              aria-pressed={r.id === active}
              className={`np-zone-btn${r.id === active ? ' on' : ''}`}
              onClick={() => { setActive(r.id); track('nepal_zone_pick', { zone: r.id }); }}
              style={{ '--a': r.accent } as React.CSSProperties}
            >
              <span className="mono np-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="np-zname">{L(r.name)}</span>
              <span className="mono np-zcount">{counts[r.id] || 0}</span>
            </button>
          ))}
        </div>

        {hotspotsFailed && (
          <p className="mono np-map-degraded">
            {ne ? 'हटस्पट लोड भएन — नक्सा र सूची काम गरिरहेका छन्।' : 'HOTSPOTS UNAVAILABLE — map and list still work'}
          </p>
        )}

        {activeRegion && (
          <div className="np-zone-detail">
            <div className="eyebrow" style={{ color: activeRegion.accent }}>{L(activeRegion.name)}</div>
            <p className="mut np-blurb">{L(activeRegion.blurb)}</p>
            <hr className="hr" />
            <div className="np-place-chips">
              {activePlaces.map((p) => (
                <a
                  key={p.id}
                  className="tag np-place-tag"
                  href={`#place-${p.id}`}
                  title={`${p.type}${p.unesco ? ' · UNESCO World Heritage' : ''}`}
                >
                  {L(p.name)}{p.unesco ? ' ★' : ''}
                </a>
              ))}
              {!activePlaces.length && <span className="dim">No catalogued sites in this region yet.</span>}
            </div>
            <div className="np-coord mono dim">
              {activeRegion.center[0].toFixed(4)}, {activeRegion.center[1].toFixed(4)} · z{activeRegion.zoom}
            </div>
            <a className="btn btn-g btn-sm" href={`/explore?mode=earth&lat=${activeRegion.center[0]}&lng=${activeRegion.center[1]}`}>
              {locale === 'ne' ? 'पृथ्वीमा हेर्नुहोस्' : 'VIEW ON EARTH'}
            </a>
          </div>
        )}
      </aside>

      <style>{`
        .np-map-shell { display: grid; gap: 16px; grid-template-columns: minmax(0,1.55fr) minmax(0,1fr); align-items: stretch; }
        @media (max-width: 900px) { .np-map-shell { grid-template-columns: 1fr; } }
        .np-map-wrap { position: relative; border-radius: 18px; overflow: hidden; border: 1px solid var(--line); min-height: 420px; }
        @media (max-width: 900px) { .np-map-wrap { min-height: 340px; } }
        .np-map { position: absolute; inset: 0; background: var(--bg); }
        .np-map-loading { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; letter-spacing: .2em; color: var(--dim); }
        .np-map-fail { position: absolute; inset: 0; padding: 26px; display: flex; flex-direction: column; gap: 12px; justify-content: center; align-items: flex-start; }
        .np-map-tools { position: absolute; top: 12px; right: 12px; z-index: 500; display: flex; gap: 8px; }
        .np-map-tools .chip { background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(8px); }
        .np-zone { background: transparent; border: 0; }
        .np-zone-in { position: absolute; left: 0; top: 0; width: 34px; height: 34px; border-radius: 50%;
          display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--a) 60%, transparent);
          background: color-mix(in srgb, var(--a) 18%, var(--bg)); transition: .35s; }
        .np-zone-in b { font: 600 10px/1 var(--font-mono, monospace); color: var(--txt); letter-spacing: .04em; }
        .np-zone-in.on { background: color-mix(in srgb, var(--a) 55%, var(--bg)); transform: scale(1.14);
          box-shadow: 0 0 0 5px color-mix(in srgb, var(--a) 18%, transparent); }
        .np-zone s { position: absolute; left: 40px; top: 9px; text-decoration: none; white-space: nowrap;
          font: 500 10.5px/1 var(--font-mono, monospace); letter-spacing: .08em; text-transform: uppercase;
          color: var(--mut); background: color-mix(in srgb, var(--bg) 78%, transparent); padding: 3px 7px; border-radius: 6px; }
        .np-place i { display: block; width: 10px; height: 10px; border-radius: 50%; background: var(--cy);
          box-shadow: 0 0 10px var(--cy); border: 1px solid color-mix(in srgb, var(--bg) 70%, transparent); }
        .np-place { background: transparent; border: 0; }
        .np-tip { background: var(--panel); color: var(--txt); border: 1px solid var(--line); border-radius: 8px;
          font: 500 11px/1.4 var(--font-sans, sans-serif); padding: 5px 8px; box-shadow: var(--shadow); }
        .np-tip::before { display: none; }
        .np-map-panel { padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow: hidden; }
        .np-map-degraded { font-size: 9px; letter-spacing: .14em; color: var(--gold); margin: 0; }
        .np-zone-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; max-height: 240px; overflow-y: auto; }
        @media (max-width: 900px) { .np-zone-list { grid-template-columns: 1fr 1fr; max-height: 168px; } }
        .np-zone-btn { text-align: left; display: flex; align-items: center; gap: 8px; padding: 8px 9px;
          border-radius: 10px; border: 1px solid transparent; background: transparent; cursor: pointer; color: var(--mut);
          font: 500 11.5px/1.25 var(--font-sans, sans-serif); transition: .25s; }
        .np-zone-btn:hover { color: var(--txt); background: color-mix(in srgb, var(--a) 8%, transparent); }
        .np-zone-btn.on { color: var(--txt); border-color: color-mix(in srgb, var(--a) 45%, transparent);
          background: color-mix(in srgb, var(--a) 13%, transparent); }
        .np-num { font-size: 9.5px; color: var(--a); letter-spacing: .1em; }
        .np-zname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .np-zcount { font-size: 9.5px; color: var(--dim); }
        .np-zone-detail { display: flex; flex-direction: column; gap: 10px; }
        .np-blurb { font-size: 13px; line-height: 1.65; }
        .np-place-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .np-place-tag { text-decoration: none; transition: .25s; }
        .np-place-tag:hover { color: var(--txt); border-color: var(--line2); }
        .np-coord { font-size: 10px; letter-spacing: .12em; }
        ${LEAFLET_SKIN}
        @media (prefers-reduced-motion: reduce) { .np-zone-in { transition: none; } }
      `}</style>
    </div>
  );
}
