'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
const MapMode = dynamic(() => import('./MapMode').then((m) => ({ default: m.MapMode })), { ssr: false });
const Pano360 = dynamic(() => import('./Pano360').then((m) => ({ default: m.Pano360 })), { ssr: false });
import { PlacePanel, SearchCmd, type Place } from './Panels';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { detectTier, prefersReducedMotion, webglSupported, type QualityTier } from '@/components/three/tier';
import { WORLDS_360, CAMERA_PRESETS } from '@/lib/world/config';
import { KTM } from '@/lib/utils';

const EarthScene = dynamic(() => import('@/components/three/EarthScene').then((m) => m.EarthScene), { ssr: false });

type Mode = 'earth' | 'map' | 'sat' | '360';
const MODES: { id: Mode | 'search'; label: string }[] = [
  { id: 'earth', label: 'EARTH' }, { id: 'map', label: 'MAP' }, { id: 'sat', label: 'SAT' },
  { id: '360', label: '360' }, { id: 'search', label: 'SEARCH' },
];

interface Boot { webgl: string; tiles: string; ai: string; pano: string }

/** /explore — the ACTTOLOG Earth command center (EARTH·MAP·SAT·360·SEARCH). */
export function ExploreClient() {
  const { locale } = useI18n();
  const reduced = useMemo(() => typeof window !== 'undefined' && prefersReducedMotion(), []);

  const [mode, setMode] = useState<Mode>('earth');
  const [switching, setSwitching] = useState<Mode | null>(null);
  const [loc, setLoc] = useState<[number, number]>([27.717, 85.324]);
  const [mapZoom, setMapZoom] = useState(6);
  const [place, setPlace] = useState<Place | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [world360, setWorld360] = useState<string>('world');
  const [quality, setQuality] = useState<'auto' | QualityTier>('auto');
  const [help, setHelp] = useState(false);
  const [boot, setBoot] = useState<Boot | null>(null);
  const [booted, setBooted] = useState(false);
  const [hud, setHud] = useState({ fps: 0, lat: null as number | null, lon: null as number | null, dist: 3.15 });
  const [clocks, setClocks] = useState({ zulu: '—', npt: '—' });

  const scrollRef = useRef(0);
  const distTargetRef = useRef(3.15);
  const distRef = useRef(3.15);
  const flyRef = useRef<{ lat: number; lon: number; token: number } | null>(null);
  const dragRef = useRef({ dx: 0, vel: 0, dragging: false });
  const cursorRef = useRef<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
  const fpsRef = useRef(0);

  const tier: QualityTier = quality === 'auto' ? detectTier() : quality;

  /* deep-link init + URL sync (§30) */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const m = sp.get('mode');
    if (m === 'map' || m === 'sat' || m === 'earth' || m === '360') setMode(m);
    const lat = Number(sp.get('lat')), lng = Number(sp.get('lng'));
    if (!isNaN(lat) && !isNaN(lng)) {
      setLoc([lat, lng]);
      flyRef.current = { lat, lon: lng, token: 1 };
      if (m === 'earth' || !m) distTargetRef.current = 1.6;
    }
    const z = Number(sp.get('zoom'));
    if (!isNaN(z)) setMapZoom(Math.max(2, Math.min(18, z)));
    const pl = sp.get('place');
    if (pl && !isNaN(lat)) setPlace({ id: `link-${lat}-${lng}`, name: pl, lat, lon: lng, source: 'NOMINATIM' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncUrl = useCallback((m: Mode, l: [number, number], z: number, pname?: string) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set('mode', m); sp.set('lat', l[0].toFixed(5)); sp.set('lng', l[1].toFixed(5));
    if (m === 'map' || m === 'sat') sp.set('zoom', String(z)); else sp.delete('zoom');
    if (pname) sp.set('place', pname); else sp.delete('place');
    window.history.replaceState(null, '', `/explore?${sp.toString()}`);
  }, []);

  /* boot sequence — real checks only (§82) */
  useEffect(() => {
    const b: Boot = { webgl: 'CHECKING', tiles: 'CHECKING', ai: 'READY', pano: 'CHECKING' };
    setBoot({ ...b });
    b.webgl = webglSupported() ? 'READY' : 'FALLBACK';
    fetch('https://a.tile.openstreetmap.org/3/4/3.png', { method: 'GET', mode: 'no-cors', cache: 'force-cache' })
      .then(() => { b.tiles = 'READY'; setBoot({ ...b }); })
      .catch(() => { b.tiles = 'OFFLINE'; setBoot({ ...b }); });
    import('./Pano360').then(() => { b.pano = 'READY'; setBoot({ ...b }); setTimeout(() => setBooted(true), 500); });
    setBoot({ ...b });
    const t = setTimeout(() => setBooted(true), 3500); // never trap the user
    return () => clearTimeout(t);
  }, []);

  /* clocks */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      let npt = '—';
      try { npt = new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium', timeZone: KTM }).format(now); } catch { /* ignore */ }
      setClocks({ zulu: `${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())}Z`, npt });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* HUD telemetry bridge */
  useEffect(() => {
    const id = setInterval(() => setHud({ fps: fpsRef.current, lat: cursorRef.current.lat, lon: cursorRef.current.lon, dist: distRef.current }), 250);
    return () => clearInterval(id);
  }, []);

  /* animated mode transitions (§9) */
  const changeMode = (next: Mode) => {
    if (next === mode || switching) return;
    track(next === 'map' ? 'map_open' : next === 'sat' ? 'satellite_open' : next === '360' ? '360_open' : 'earth_open', { from: mode });
    if (reduced) { setMode(next); syncUrl(next, loc, mapZoom); return; }
    setSwitching(next);
    setTimeout(() => {
      setMode(next);
      syncUrl(next, loc, mapZoom);
      setTimeout(() => setSwitching(null), 60);
    }, 380);
  };

  /* keyboard (§17) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'm') changeMode('map');
      else if (k === 's') changeMode('sat');
      else if (k === 'e') changeMode('earth');
      else if (k === 'v') changeMode('360');
      else if (k === '?') setHelp((v) => !v);
      else if (k === 'escape') { setPlace(null); setSearchOpen(false); setHelp(false); }
      else if (k === '+' || k === '=') { if (mode === 'earth') distTargetRef.current = Math.max(1.0025, distTargetRef.current * 0.85); else setMapZoom((z) => Math.min(18, z + 1)); }
      else if (k === '-') { if (mode === 'earth') distTargetRef.current = Math.min(3.6, distTargetRef.current * 1.18); else setMapZoom((z) => Math.max(2, z - 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, switching, reduced, loc, mapZoom]);

  const pickPlace = (p: Place) => {
    setPlace(p);
    setLoc([p.lat, p.lon]);
    track('place_open', { place: p.name, source: p.source });
    if (mode === 'earth') {
      flyRef.current = { lat: p.lat, lon: p.lon, token: (flyRef.current?.token ?? 0) + 1 };
      distTargetRef.current = 1.35;
    } else if (mode === 'map' || mode === 'sat') {
      setMapZoom(13);
    }
    syncUrl(mode, [p.lat, p.lon], mode === 'map' || mode === 'sat' ? 13 : mapZoom, p.name);
  };

  const altKm = Math.max(0, (hud.dist - 1.002) * 6371);
  const altTxt = altKm >= 1000 ? `${Math.round(altKm).toLocaleString('en-US')} KM` : altKm >= 1 ? `${altKm.toFixed(1)} KM` : `${Math.round(altKm * 1000)} M`;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - var(--nav))', marginTop: 'var(--nav)' }}>
      {/* boot overlay — honest statuses */}
      {!booted && boot && (
        <div className="absolute inset-0 z-40 grid place-items-center" style={{ background: 'var(--bg)' }}>
          <div className="panel p-8 mono text-[11.4px] tracking-[.18em] leading-relaxed" style={{ minWidth: 300 }}>
            <div className="font-display font-bold text-[15px] tracking-[.3em] mb-4" style={{ color: 'var(--cy)' }}>ACTTOLOG</div>
            <div className="dim mb-3">INITIALIZING WORLD</div>
            <div>EARTH ........ {boot.webgl}</div>
            <div>MAP ........... {boot.tiles}</div>
            <div>AI ............ {boot.ai}</div>
            <div>360° .......... {boot.pano}</div>
            <div className="mt-3" style={{ color: 'var(--cy)' }}>ENTERING WORLD…</div>
          </div>
        </div>
      )}

      {/* mode surfaces (crossfade) */}
      <div className="absolute inset-0" style={{ opacity: switching ? 0 : 1, transform: switching ? 'scale(1.03)' : 'scale(1)', transition: 'opacity .38s, transform .38s' }}>
        {mode === 'earth' && (
          <EarthScene tier={tier} frameloop="always" scrollRef={scrollRef} distTargetRef={distTargetRef}
            distRef={distRef} flyRef={flyRef} dragRef={dragRef} onSelect={() => {}}
            onStats={(f) => { fpsRef.current = f; }}
            onCursor={(lat, lon) => { cursorRef.current = { lat, lon }; }}
            layer="map" tilesEnabled pin={place ? [place.lat, place.lon] : null} />
        )}
        {(mode === 'map' || mode === 'sat') && (
          <MapMode center={loc} zoom={mapZoom} layer={mode}
            onMove={(c, z) => { setLoc(c); setMapZoom(z); syncUrl(mode, c, z, place?.name); }}
            onPick={(lat, lng) => pickPlace({ id: `pin-${lat.toFixed(4)}-${lng.toFixed(4)}`, name: `${lat.toFixed(3)}, ${lng.toFixed(3)}`, lat, lon: lng, category: 'selected point', source: 'NOMINATIM' })}
            marker={place ? [place.lat, place.lon] : null} />
        )}
        {mode === '360' && <Pano360 world={world360} onWorld={(w) => setWorld360(w)} reduced={!!reduced} />}
      </div>

      {/* transition portal flash */}
      {switching && (
        <div className="absolute inset-0 z-30 pointer-events-none grid place-items-center"
          style={{ background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb,var(--cy) 18%,transparent), var(--bg) 70%)', animation: 'fd .38s' }} />
      )}

      {/* HUD top */}
      <div className="absolute top-4 left-4 z-20 hud !static flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2"><span className="dot" /> ACTTOLOG / {mode.toUpperCase()}</div>
        <div>{hud.lat == null ? 'HOVER MAP' : `${Math.abs(hud.lat).toFixed(4)}° ${hud.lat >= 0 ? 'N' : 'S'} · ${Math.abs(hud.lon as number).toFixed(4)}° ${(hud.lon as number) >= 0 ? 'E' : 'W'}`}</div>
        {mode === 'earth' && <div>ALTITUDE · {altTxt}</div>}
        {mode !== 'earth' && <div>ZOOM · {mapZoom}</div>}
        <div>UTC {clocks.zulu} · NPT {clocks.npt}</div>
        <div>MODE · {mode === 'sat' ? 'SATELLITE (IMAGERY © ESRI)' : mode === 'map' ? 'STREET MAP (© OSM)' : mode === '360' ? 'ACTTOLOG 360 WORLD' : '3D EARTH'}</div>
      </div>

      {/* mode switcher */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 panel p-1.5 flex gap-1.5">
        {MODES.map((m) => (
          <button key={m.id} className={`chip !px-4 !py-2 !text-[10.6px]${(m.id === mode || (m.id === 'search' && searchOpen)) ? ' on' : ''}`}
            onClick={() => (m.id === 'search' ? setSearchOpen((v) => !v) : changeMode(m.id as Mode))}>
            {m.label}
          </button>
        ))}
      </div>

      {/* right rail: quality + worlds + help */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-2 items-end">
        <div className="panel p-1.5 flex flex-col gap-1">
          {(['auto', 'high', 'medium', 'low'] as const).map((q) => (
            <button key={q} className={`chip !px-2.5 !py-1 !text-[9.4px]${quality === q ? ' on' : ''}`}
              onClick={() => { setQuality(q); try { localStorage.setItem('act_quality', q); } catch { /* ignore */ } }}>
              {q.toUpperCase()}
            </button>
          ))}
        </div>
        {mode === '360' && (
          <div className="panel p-1.5 flex flex-col gap-1">
            {WORLDS_360.map((w) => (
              <button key={w.id} className={`chip !px-2.5 !py-1 !text-[9.4px]${world360 === w.id ? ' on' : ''}`} onClick={() => setWorld360(w.id)}>
                {w.name.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        <button className="ico" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" onClick={() => setHelp((v) => !v)}>
          <span className="mono text-[11px] font-bold">?</span>
        </button>
      </div>

      {/* search drawer */}
      {searchOpen && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-[min(560px,92vw)]">
          <SearchCmd onPick={(p) => { pickPlace(p); setSearchOpen(false); }} onContent={(q2) => { window.dispatchEvent(new CustomEvent('acttolog:search-open')); void q2; }} />
        </div>
      )}

      {/* place panel */}
      {place && (
        <div className="absolute right-4 bottom-4 z-20 w-[min(380px,94vw)]">
          <PlacePanel place={place} onClose={() => { setPlace(null); syncUrl(mode, loc, mapZoom); }}
            onExplore={(m, lat, lon) => {
              setLoc([lat, lon]);
              if (m === 'earth') { flyRef.current = { lat, lon, token: (flyRef.current?.token ?? 0) + 1 }; distTargetRef.current = 1.2; changeMode('earth'); }
              else if (m === '360') changeMode('360');
              else { changeMode(m); setMapZoom(14); }
            }}
            onAskAi={(q2) => { window.dispatchEvent(new CustomEvent('acttolog:ai-open', { detail: q2 })); }} />
        </div>
      )}

      {/* camera presets strip */}
      <div className="absolute left-4 bottom-4 z-20 flex flex-wrap gap-1.5 max-w-[46vw]">
        {CAMERA_PRESETS.slice(0, 5).map((cp) => (
          <button key={cp.id} className="chip !py-1 !text-[9.4px]" title={cp.id}
            onClick={() => {
              if (cp.lat != null && cp.lon != null) {
                setLoc([cp.lat, cp.lon]);
                flyRef.current = { lat: cp.lat, lon: cp.lon, token: (flyRef.current?.token ?? 0) + 1 };
              }
              if (cp.mode !== '360') changeMode(cp.mode as Mode);
              distTargetRef.current = cp.distance;
              if (cp.mode === 'map' || cp.mode === 'sat') setMapZoom(cp.distance < 1.1 ? 14 : 6);
              track('camera_preset', { preset: cp.id });
            }}>
            {cp.id.replace('CAMERA_', '')}
          </button>
        ))}
      </div>

      {/* shortcuts help */}
      {help && (
        <div className="absolute inset-0 z-30 grid place-items-center" style={{ background: 'color-mix(in srgb,var(--bg) 78%,transparent)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setHelp(false); }}>
          <div className="mcard p-7" role="dialog" aria-modal="true" style={{ position: 'relative', width: 'min(480px,92vw)' }}>
            <div className="eyebrow mb-4">KEYBOARD COMMAND</div>
            <div className="grid grid-cols-2 gap-2.5 mono text-[11.6px] mut">
              {[['E', 'Earth mode'], ['M', 'Map mode'], ['S', 'Satellite'], ['V', '360 worlds'], ['+ / −', 'Zoom'], ['W A S D / arrows', 'Pan (map)'], ['Esc', 'Close panels'], ['?', 'This help']].map(([k, v]) => (
                <div key={k} className="flex items-center gap-2.5"><span className="kbd">{k}</span>{v}</div>
              ))}
            </div>
            <button className="btn btn-g btn-sm mt-5" onClick={() => setHelp(false)}>Close</button>
          </div>
        </div>
      )}

      {/* user controls — never trapped (§80) */}
      <div className="absolute right-4 bottom-4 z-10 flex gap-2" style={{ marginBottom: place ? 0 : 0, ...(place ? { bottom: 'auto', top: '40%' } : {}) }}>
        {!place && (
          <Link className="btn btn-g btn-sm" href="/">{locale === 'ne' ? 'संसारमा फर्कनुहोस्' : 'Return to World'}</Link>
        )}
      </div>
    </div>
  );
}
