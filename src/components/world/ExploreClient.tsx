'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
const MapMode = dynamic(() => import('./MapMode').then((m) => ({ default: m.MapMode })), { ssr: false });
const Pano360 = dynamic(() => import('./Pano360').then((m) => ({ default: m.Pano360 })), { ssr: false });
import { PlacePanel, SearchCmd, type Place } from './Panels';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { detectTier, prefersReducedMotion, webglSupported, type QualityTier } from '@/components/three/tier';
import { WORLDS_360, WORLD_360_IDS, CAMERA_PRESETS, DISCOVERY_CARDS, type DiscoveryCategory } from '@/lib/world/config';
import { googleMapsConfigured, googleStatusText, GOOGLE_SETUP_STEPS, streetViewEmbedUrl } from '@/lib/world/google';
import { KTM } from '@/lib/utils';

const EarthScene = dynamic(() => import('@/components/three/EarthScene').then((m) => m.EarthScene), { ssr: false });

type Mode = 'earth' | 'map' | 'sat' | '360';
const MODES: { id: Mode | 'search'; label: string }[] = [
  { id: 'earth', label: 'EARTH' }, { id: 'map', label: 'MAP' }, { id: 'sat', label: 'SAT' },
  { id: '360', label: '360' }, { id: 'search', label: 'SEARCH' },
];

const DISCOVERY_CATS: { id: DiscoveryCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'ALL' }, { id: 'cities', label: 'CITIES' }, { id: 'landmarks', label: 'LANDMARKS' },
  { id: 'nature', label: 'NATURE' }, { id: 'culture', label: 'CULTURE' }, { id: 'education', label: 'EDUCATION' },
  { id: 'science', label: 'SCIENCE' }, { id: 'technology', label: 'TECH' }, { id: 'entertainment', label: 'MEDIA' },
];

interface Boot { webgl: string; tiles: string; ai: string; pano: string; google: string }

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
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoveryCat, setDiscoveryCat] = useState<DiscoveryCategory | 'all'>('all');
  const [world360, setWorld360] = useState<string>('world');
  const [streetView, setStreetView] = useState(false);
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
  const locRef = useRef<[number, number]>(loc);
  const modeRef = useRef<Mode>(mode);
  const zoomRef = useRef(mapZoom);
  useEffect(() => { locRef.current = loc; }, [loc]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { zoomRef.current = mapZoom; }, [mapZoom]);

  const tier: QualityTier = quality === 'auto' ? detectTier() : quality;
  const googleOn = useMemo(() => googleMapsConfigured(), []);

  /* deep-link init + live re-application on in-app navigation (§22/§30).
     Runs on mount AND whenever search params change (e.g. a ⌘K place link
     clicked while already on /explore). NOTE: Number(null) === 0 — parse
     strictly so absent params never become "Null Island" (0,0) or zoom 2. */
  const params = useSearchParams();
  const appliedRef = useRef<string | null>(null);
  useEffect(() => {
    const key = params.toString();
    if (appliedRef.current === key) return;
    appliedRef.current = key;
    const sp = params;
    const m = sp.get('mode');
    if (m === 'map' || m === 'sat' || m === 'earth' || m === '360') setMode(m);
    const w = sp.get('world');
    if (w && WORLD_360_IDS.includes(w)) { setWorld360(w); if (!m) setMode('360'); }
    const num = (v: string | null) => (v == null || v.trim() === '' ? NaN : Number(v));
    const lat = num(sp.get('lat')), lng = num(sp.get('lng'));
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      setLoc([lat, lng]);
      flyRef.current = { lat, lon: lng, token: (flyRef.current?.token ?? 0) + 1 };
      if (m === 'earth' || !m) distTargetRef.current = 1.6;
      if (m === 'map' || m === 'sat') {
        const z = num(sp.get('zoom'));
        setMapZoom(!isNaN(z) ? Math.max(2, Math.min(18, z)) : 13);
      }
    } else {
      const z = num(sp.get('zoom'));
      if (!isNaN(z)) setMapZoom(Math.max(2, Math.min(18, z)));
    }
    const pl = sp.get('place');
    if (pl && !isNaN(lat) && !isNaN(lng)) setPlace({ id: `link-${lat}-${lng}`, name: pl, lat, lon: lng, source: 'NOMINATIM' });
  }, [params]);

  /* restore remembered quality preference once (§29) */
  useEffect(() => {
    try {
      const q = localStorage.getItem('act_quality');
      if (q === 'high' || q === 'medium' || q === 'low' || q === 'auto') setQuality(q);
    } catch { /* ignore */ }
  }, []);

  const syncUrl = useCallback((m: Mode, l: [number, number], z: number, pname?: string, w?: string) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set('mode', m); sp.set('lat', l[0].toFixed(5)); sp.set('lng', l[1].toFixed(5));
    if (m === 'map' || m === 'sat') sp.set('zoom', String(z)); else sp.delete('zoom');
    if (pname) sp.set('place', pname); else sp.delete('place');
    if (m === '360' && w) sp.set('world', w); else sp.delete('world');
    window.history.replaceState(null, '', `/explore?${sp.toString()}`);
  }, []);

  /* boot sequence — real checks only (§36/§82); Google row is honest (§53) */
  useEffect(() => {
    const b: Boot = { webgl: 'CHECKING', tiles: 'CHECKING', ai: 'READY', pano: 'CHECKING', google: googleMapsConfigured() ? 'READY' : 'NOT CONFIGURED · OSM/ESRI ACTIVE' };
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

  /* animated mode transitions (§5/§34) */
  const switchingRef = useRef(false);
  const switchTo = useCallback((next: Mode) => {
    if (switchingRef.current || modeRef.current === next) return;
    track(next === 'map' ? 'map_open' : next === 'sat' ? 'satellite_open' : next === '360' ? '360_open' : 'earth_open', { from: modeRef.current });
    if (reduced) {
      setMode(next);
      syncUrl(next, locRef.current, zoomRef.current, undefined, next === '360' ? world360 : undefined);
      return;
    }
    switchingRef.current = true;
    setSwitching(next);
    setTimeout(() => {
      setMode(next);
      syncUrl(next, locRef.current, zoomRef.current, undefined, next === '360' ? world360 : undefined);
      setTimeout(() => { setSwitching(null); switchingRef.current = false; }, 60);
    }, 380);
  }, [reduced, syncUrl, world360]);

  /* keyboard — WASD/arrows move, 1-4 modes, / search, Space recenter (§14) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      const k = e.key.toLowerCase();
      const m = modeRef.current;

      if (k === '1') { switchTo('earth'); return; }
      if (k === '2') { switchTo('map'); return; }
      if (k === '3') { switchTo('sat'); return; }
      if (k === '4') { switchTo('360'); return; }
      if (k === '/') { e.preventDefault(); setSearchOpen((v) => !v); return; }
      if (k === '?') { setHelp((v) => !v); return; }
      if (k === 'escape') { setPlace(null); setSearchOpen(false); setHelp(false); setDiscoverOpen(false); setStreetView(false); return; }
      if (k === '+' || k === '=' || k === '-') {
        const dir = k === '-' ? 1 : -1;
        if (m === 'earth') distTargetRef.current = Math.max(1.0025, Math.min(3.6, distTargetRef.current * (dir > 0 ? 1.18 : 0.85)));
        else if (m === 'map' || m === 'sat') setMapZoom((z) => Math.max(2, Math.min(18, z + dir)));
        return;
      }
      if (k === ' ') {
        e.preventDefault();
        // recenter on current location
        if (m === 'earth') flyRef.current = { lat: locRef.current[0], lon: locRef.current[1], token: (flyRef.current?.token ?? 0) + 1 };
        return;
      }
      const move: Record<string, [number, number]> = {
        w: [1, 0], arrowup: [1, 0], s: [-1, 0], arrowdown: [-1, 0],
        a: [0, -1], arrowleft: [0, -1], d: [0, 1], arrowright: [0, 1],
      };
      const mv = move[k];
      if (!mv) return;
      e.preventDefault();
      if (m === 'map' || m === 'sat') {
        const span = 90 / Math.pow(2, zoomRef.current); // degrees per nudge
        const next: [number, number] = [
          Math.max(-85, Math.min(85, locRef.current[0] + mv[0] * span)),
          ((locRef.current[1] + mv[1] * span + 540) % 360) - 180,
        ];
        setLoc(next);
        syncUrl(m, next, zoomRef.current);
      } else if (m === 'earth') {
        const cur = flyRef.current ?? { lat: locRef.current[0], lon: locRef.current[1], token: 0 };
        const next = {
          lat: Math.max(-85, Math.min(85, cur.lat + mv[0] * 3)),
          lon: ((cur.lon + mv[1] * 3 + 540) % 360) - 180,
          token: cur.token + 1,
        };
        flyRef.current = next;
        setLoc([next.lat, next.lon]);
        syncUrl(m, [next.lat, next.lon], zoomRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [switchTo, syncUrl]);

  const pickPlace = (p: Place, zoom = 13) => {
    setPlace(p);
    setLoc([p.lat, p.lon]);
    track('place_open', { place: p.name, source: p.source });
    if (mode === 'earth') {
      flyRef.current = { lat: p.lat, lon: p.lon, token: (flyRef.current?.token ?? 0) + 1 };
      distTargetRef.current = 1.35;
    } else if (mode === 'map' || mode === 'sat') {
      setMapZoom(zoom);
    }
    syncUrl(mode, [p.lat, p.lon], mode === 'map' || mode === 'sat' ? zoom : mapZoom, p.name, mode === '360' ? world360 : undefined);
  };

  const openDiscovery = (c: typeof DISCOVERY_CARDS[number]) => {
    pickPlace({ id: `disc-${c.id}`, name: c.name, lat: c.lat, lon: c.lon, category: c.category, address: c.country, source: 'ACTTOLOG' }, c.zoom);
    if (mode === '360') switchTo(c.mode);
    else if (mode === 'earth') { flyRef.current = { lat: c.lat, lon: c.lon, token: (flyRef.current?.token ?? 0) + 1 }; distTargetRef.current = c.mode === 'sat' ? 1.2 : 1.35; }
    if (window.innerWidth < 640) setDiscoverOpen(false);
  };

  const altKm = Math.max(0, (hud.dist - 1.002) * 6371);
  const altTxt = altKm >= 1000 ? `${Math.round(altKm).toLocaleString('en-US')} KM` : altKm >= 1 ? `${altKm.toFixed(1)} KM` : `${Math.round(altKm * 1000)} M`;
  const svUrl = place && googleOn ? streetViewEmbedUrl(place.lat, place.lon) : null;
  const filteredDiscovery = discoveryCat === 'all' ? DISCOVERY_CARDS : DISCOVERY_CARDS.filter((c) => c.category === discoveryCat);
  const ne = locale === 'ne';

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - var(--nav))', marginTop: 'var(--nav)' }}>
      {/* boot overlay — honest statuses */}
      {!booted && boot && (
        <div className="absolute inset-0 z-40 grid place-items-center" style={{ background: 'var(--bg)' }}>
          <div className="panel p-8 mono text-[11.4px] tracking-[.18em] leading-relaxed" style={{ minWidth: 300 }}>
            <div className="font-display font-bold text-[15px] tracking-[.3em] mb-4" style={{ color: 'var(--cy)' }}>ACTTOLOG</div>
            <div className="dim mb-3">{ne ? 'संसार सुरु हुँदैछ' : 'ENTERING WORLD…'}</div>
            <div>EARTH ........ {boot.webgl}</div>
            <div>MAP ........... {boot.tiles}</div>
            <div>AI ............ {boot.ai}</div>
            <div>360° .......... {boot.pano}</div>
            <div className="mt-1" style={{ color: boot.google === 'READY' ? 'var(--ok)' : 'var(--gold)' }}>GOOGLE ...... {boot.google}</div>
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
        {(mode === 'map' || mode === 'sat') && !streetView && (
          <MapMode center={loc} zoom={mapZoom} layer={mode}
            onMove={(c, z) => { setLoc(c); setMapZoom(z); syncUrl(mode, c, z, place?.name); }}
            onPick={(lat, lng) => pickPlace({ id: `pin-${lat.toFixed(4)}-${lng.toFixed(4)}`, name: `${lat.toFixed(3)}, ${lng.toFixed(3)}`, lat, lon: lng, category: 'selected point', source: 'NOMINATIM' })}
            marker={place ? [place.lat, place.lon] : null} />
        )}
        {(mode === 'map' || mode === 'sat') && streetView && (
          svUrl ? (
            <iframe title="Google Street View" src={svUrl} className="absolute inset-0 w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="panel p-7 max-w-md text-center">
                <div className="eyebrow mb-2">GOOGLE STREET VIEW</div>
                <div className="font-display font-bold text-[16px] mb-2">CONFIGURATION REQUIRED</div>
                <p className="mut text-[12.8px] leading-relaxed mb-4">Street View needs a Google Maps Platform key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY). Until then ACTTOLOG 360 worlds and satellite imagery cover this location.</p>
                <div className="flex justify-center gap-2">
                  <button className="btn btn-g btn-sm" onClick={() => setStreetView(false)}>Back to map</button>
                  <button className="btn btn-p btn-sm" onClick={() => switchTo('360')}>Open 360 worlds</button>
                </div>
              </div>
            </div>
          )
        )}
        {mode === '360' && !streetView && <Pano360 world={world360} onWorld={(w) => { setWorld360(w); syncUrl('360', loc, mapZoom, place?.name, w); }} reduced={!!reduced} />}
        {mode === '360' && streetView && (
          svUrl ? (
            <iframe title="Google Street View" src={svUrl} className="absolute inset-0 w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="panel p-7 max-w-md text-center">
                <div className="eyebrow mb-2">GOOGLE STREET VIEW</div>
                <div className="font-display font-bold text-[16px] mb-2">CONFIGURATION REQUIRED</div>
                <p className="mut text-[12.8px] leading-relaxed mb-4">
                  {place ? `Street-level panoramas for ${place.name} need a Google Maps Platform key.` : 'Select a place first, then Street View needs a Google Maps Platform key.'} Neither is invented here — the ACTTOLOG 360 worlds below are always available.
                </p>
                <button className="btn btn-g btn-sm" onClick={() => setStreetView(false)}>Return to ACTTOLOG 360</button>
              </div>
            </div>
          )
        )}
      </div>

      {/* transition portal flash */}
      {switching && (
        <div className="absolute inset-0 z-30 pointer-events-none grid place-items-center"
          style={{ background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb,var(--cy) 18%,transparent), var(--bg) 70%)', animation: 'fd .38s' }} />
      )}

      {/* HUD top */}
      <div className="hud flex flex-col gap-1.5" style={{
        top: 16, left: 16, zIndex: 20, padding: '8px 12px', borderRadius: 12,
        background: 'color-mix(in srgb, var(--bg) 68%, transparent)', backdropFilter: 'blur(6px)',
      }}>
        <div className="flex items-center gap-2"><span className="dot" /> ACTTOLOG / {mode.toUpperCase()}</div>
        <div>{hud.lat == null ? (ne ? 'नक्सा होभर गर्नुहोस्' : 'HOVER MAP') : `${Math.abs(hud.lat).toFixed(4)}° ${hud.lat >= 0 ? 'N' : 'S'} · ${Math.abs(hud.lon as number).toFixed(4)}° ${(hud.lon as number) >= 0 ? 'E' : 'W'}`}</div>
        {mode === 'earth' && <div>{ne ? 'उचाइ' : 'ALTITUDE'} · {altTxt}</div>}
        {mode !== 'earth' && <div>ZOOM · {mapZoom}</div>}
        <div>UTC {clocks.zulu} · NPT {clocks.npt}</div>
        <div className="hidden sm:block">MODE · {mode === 'sat' ? 'SATELLITE (IMAGERY © ESRI)' : mode === 'map' ? 'STREET MAP (© OSM)' : mode === '360' ? 'ACTTOLOG 360 WORLD' : '3D EARTH'}</div>
      </div>

      {/* mode switcher — desktop (mobile uses the bottom command bar) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 hidden sm:block">
        <div className="panel p-1.5 flex gap-1.5">
          {MODES.map((m) => (
            <button key={m.id} className={`chip !px-4 !py-2 !text-[10.6px]${(m.id === mode || (m.id === 'search' && searchOpen)) ? ' on' : ''}`}
              onClick={() => (m.id === 'search' ? setSearchOpen((v) => !v) : switchTo(m.id as Mode))}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* right rail: quality + worlds + street view + help */}
      <div className="absolute right-2 sm:right-4 top-4 z-20 flex flex-col gap-2 items-end" style={{ zIndex: 22 }}>
        <div className="panel p-1.5 flex sm:flex-col gap-1">
          {(['auto', 'high', 'medium', 'low'] as const).map((q) => (
            <button key={q} className={`chip !px-2 sm:!px-2.5 !py-1 !text-[9px] sm:!text-[9.4px]${quality === q ? ' on' : ''}`}
              onClick={() => { setQuality(q); try { localStorage.setItem('act_quality', q); } catch { /* ignore */ } }}>
              {q === 'auto' ? 'AUTO' : q[0].toUpperCase()}
            </button>
          ))}
        </div>
        {mode === '360' && !streetView && (
          <div className="panel p-1.5 hidden sm:flex flex-col gap-1 max-h-[38vh] overflow-auto">
            {WORLDS_360.map((w) => (
              <button key={w.id} className={`chip !px-2.5 !py-1 !text-[9.4px]${world360 === w.id ? ' on' : ''}`} onClick={() => { setWorld360(w.id); syncUrl('360', loc, mapZoom, place?.name, w.id); }}>
                {w.name.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        {(mode === 'map' || mode === 'sat' || mode === '360') && place && (
          <button className={`chip !px-2.5 !py-1.5 !text-[9.4px]${streetView ? ' on' : ''}`} title={googleOn ? 'Google Street View' : 'Google Street View — NOT CONFIGURED'}
            onClick={() => setStreetView((v) => !v)}>
            <Icon name="compass" size={11} />STREET VIEW{googleOn ? '' : ' · N/C'}
          </button>
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

      {/* place panel — right card on desktop, bottom sheet on mobile (§27) */}
      {place && (
        <div className="absolute z-20 inset-x-2 bottom-16 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[min(380px,94vw)]">
          <PlacePanel place={place} onClose={() => { setPlace(null); syncUrl(mode, loc, mapZoom, undefined, mode === '360' ? world360 : undefined); }}
            onExplore={(m, lat, lon) => {
              setLoc([lat, lon]);
              setStreetView(false);
              if (m === 'earth') { flyRef.current = { lat, lon, token: (flyRef.current?.token ?? 0) + 1 }; distTargetRef.current = 1.2; switchTo('earth'); }
              else if (m === '360') switchTo('360');
              else { switchTo(m); setMapZoom(14); }
            }}
            onAskAi={(q2) => { window.dispatchEvent(new CustomEvent('acttolog:ai-open', { detail: q2 })); }} />
        </div>
      )}

      {/* DISCOVER drawer (§25) */}
      {discoverOpen && (
        <div className="absolute z-20 inset-x-2 bottom-16 sm:inset-x-auto sm:left-4 sm:bottom-16 sm:w-[min(560px,52vw)]">
          <div className="panel p-4 sm:p-5 overflow-auto" style={{ maxHeight: 'min(56vh, 480px)' }} role="dialog" aria-label="World exploration">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="eyebrow">WORLD EXPLORATION</div>
                <div className="font-display font-bold text-[15px] mt-0.5">{ne ? 'संसार अन्वेषण गर्नुहोस्' : 'Discover the world'}</div>
              </div>
              <button className="ico !w-8 !h-8" aria-label="Close discover" onClick={() => setDiscoverOpen(false)}>✕</button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DISCOVERY_CATS.map((c) => (
                <button key={c.id} className={`chip !py-1 !text-[9.6px]${discoveryCat === c.id ? ' on' : ''}`} onClick={() => setDiscoveryCat(c.id)}>{c.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredDiscovery.map((c) => (
                <button key={c.id} className="text-left rounded-xl border p-3.5 transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
                  onClick={() => openDiscovery(c)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13.2px] font-semibold truncate">{ne && c.nameNe ? c.nameNe : c.name}</div>
                    <span className="mono text-[8.6px] tracking-[.16em] dim flex-none">{c.mode.toUpperCase()} · {c.category.toUpperCase()}</span>
                  </div>
                  <div className="dim text-[11px] mt-0.5">{c.country}</div>
                  <div className="mut text-[11.6px] mt-1.5 leading-snug">{c.blurb}</div>
                </button>
              ))}
            </div>
            <div className="dim text-[10.4px] mt-3">Real coordinates · imagery © OSM/Esri when opened · {ne ? 'कुनै पनि कुरा बनाइएको छैन' : 'nothing invented'}</div>
          </div>
        </div>
      )}

      {/* camera presets + discover — desktop bottom-left (§15) */}
      <div className="absolute left-4 bottom-4 z-20 hidden md:flex flex-col gap-2 items-start max-w-[52vw]">
        <div className="flex gap-1.5">
          <button className={`chip !py-1.5 !text-[9.6px]${discoverOpen ? ' on' : ''}`} onClick={() => { setDiscoverOpen((v) => !v); track('cta_interaction', { cta: 'discover_toggle' }); }}>
            <Icon name="compass" size={11} />{ne ? 'अन्वेषण' : 'DISCOVER'}
          </button>
          <Link className="chip !py-1.5 !text-[9.6px]" href="/">{ne ? 'संसारमा फर्कनुहोस्' : 'RETURN TO WORLD'}</Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CAMERA_PRESETS.map((cp) => (
            <button key={cp.id} className="chip !py-1 !text-[9px]" title={`Camera preset ${cp.id}`}
              onClick={() => {
                if (cp.lat != null && cp.lon != null) {
                  setLoc([cp.lat, cp.lon]);
                  flyRef.current = { lat: cp.lat, lon: cp.lon, token: (flyRef.current?.token ?? 0) + 1 };
                }
                switchTo(cp.mode);
                distTargetRef.current = cp.distance;
                if (cp.mode === 'map' || cp.mode === 'sat') setMapZoom(cp.distance < 1.1 ? 14 : 6);
                track('camera_preset', { preset: cp.id });
              }}>
              {cp.id.replace('CAMERA_', '')}
            </button>
          ))}
        </div>
      </div>

      {/* mobile bottom command bar (§27) */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex w-full panel !rounded-none border-x-0 border-b-0 p-1.5 gap-1 justify-between">
          {MODES.map((m) => (
            <button key={m.id} className={`chip !px-2 !py-2 !text-[9.4px] flex-1${(m.id === mode || (m.id === 'search' && searchOpen)) ? ' on' : ''}`}
              onClick={() => (m.id === 'search' ? setSearchOpen((v) => !v) : switchTo(m.id as Mode))}>
              {m.label}
            </button>
          ))}
          <button className={`chip !px-2 !py-2 !text-[9.4px] flex-1${discoverOpen ? ' on' : ''}`} onClick={() => setDiscoverOpen((v) => !v)}>
            {ne ? 'खोज' : 'FIND'}
          </button>
        </div>
      </div>

      {/* shortcuts help + honest Google configuration state (§26/§53) */}
      {help && (
        <div className="absolute inset-0 z-30 grid place-items-center p-4" style={{ background: 'color-mix(in srgb,var(--bg) 78%,transparent)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setHelp(false); }}>
          <div className="mcard p-7 overflow-auto" role="dialog" aria-modal="true" style={{ position: 'relative', width: 'min(520px,94vw)', maxHeight: '86vh' }}>
            <div className="eyebrow mb-4">KEYBOARD COMMAND</div>
            <div className="grid grid-cols-2 gap-2.5 mono text-[11.6px] mut">
              {[['1 2 3 4', 'Earth · Map · Sat · 360'], ['/', 'Search'], ['W A S D / arrows', 'Move / pan'], ['Space', 'Recenter'], ['+ / −', 'Zoom'], ['Esc', 'Close panels'], ['?', 'This help']].map(([k, v]) => (
                <div key={k} className="flex items-center gap-2.5"><span className="kbd">{k}</span>{v}</div>
              ))}
            </div>
            <div className="eyebrow mt-6 mb-3">GOOGLE MAPS PLATFORM · {googleStatusText()}</div>
            {googleOn ? (
              <p className="mut text-[12.4px] leading-relaxed">Google surfaces are active: Street View button (map/360 modes with a selected place), Places Autocomplete in search, Photorealistic 3D where a Map ID is set.</p>
            ) : (
              <ol className="mut text-[12.2px] leading-relaxed list-decimal pl-5 space-y-1.5">
                {GOOGLE_SETUP_STEPS.map((s) => <li key={s}>{s}</li>)}
              </ol>
            )}
            <p className="dim text-[11.4px] mt-3">Until configured, everything runs on the key-free stack — OSM tiles, Esri satellite imagery, Nominatim search, Overpass nearby, ACTTOLOG procedural 360 worlds — with sources labelled on every surface.</p>
            <button className="btn btn-g btn-sm mt-5" onClick={() => setHelp(false)}>{ne ? 'बन्द गर्नुहोस्' : 'Close'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
