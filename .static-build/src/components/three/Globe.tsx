'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { detectTier, webglSupported, type QualityTier } from './tier';
import { DIVISION_NODES, ENTITY_COUNT } from './EarthScene';
import { TILE_ATTRIBUTION, type TileLayer } from './TileGlobe';
import { LiveCamsPanel } from '@/components/content/Extensions';
import { Icon } from '@/components/ui/Icon';
import { KTM, nf } from '@/lib/utils';

const EarthScene = dynamic(() => import('./EarthScene').then((m) => m.EarthScene), { ssr: false });

interface HudState { fps: number; lat: number | null; lon: number | null; zoom: number }

const fmtCoord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? pos : neg}`;

function Hud({ tier, hud, visible, layer }: { tier: QualityTier; hud: HudState; visible: boolean; layer: 'blue' | TileLayer }) {
  const [clocks, setClocks] = useState({ zulu: '—', npt: '—' });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      setClocks({
        zulu: `${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())}Z`,
        npt: (() => { try { return new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium', timeZone: KTM }).format(now); } catch { return '—'; } })(),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div className="hud hudtl">
        <div className="flex items-center gap-2"><span className="dot" /> ACTTOLOG NETWORK · LIVE</div>
        <div>NODE: EARTH-01 · ORBIT STABLE · LAYER {layer.toUpperCase()}</div>
        <div>ZULU {clocks.zulu} · NPT {clocks.npt}</div>
      </div>
      <div className="hud hudbr">
        <div>QUALITY · {visible ? tier.toUpperCase() : 'PAUSED'}</div>
        <div>RENDER · {visible && hud.fps > 0 ? `${hud.fps} FPS` : '—'}</div>
        <div>NODES · {nf(DIVISION_NODES.length)} · LINKS · 8 · ENTITIES · {nf(ENTITY_COUNT)}</div>
        <div>DRAG ROTATE · SCROLL ZOOM TO STREET · CLICK A NODE</div>
      </div>
      <div className="hud hudbl">
        <div>LOCATION · {hud.lat == null ? 'HOVER MAP' : `${fmtCoord(hud.lat, 'N', 'S')} ${fmtCoord(hud.lon as number, 'E', 'W')}`}</div>
        <div>ZOOM · {hud.zoom.toFixed(2)}×</div>
      </div>
    </>
  );
}

function Poster() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(circle at 64% 48%, rgba(53,224,255,.16), transparent 42%), radial-gradient(circle at 65% 49%, #0a1120 0 17.5%, transparent 17.6%)' }}>
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '90px 90px', opacity: 0.14 }} />
    </div>
  );
}

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const distTargetRef = useRef(3.15);
  const distRef = useRef(3.15);
  const flyRef = useRef<{ lat: number; lon: number; token: number } | null>(null);
  const dragRef = useRef({ dx: 0, vel: 0, dragging: false });
  const cursorRef = useRef<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
  const [visible, setVisible] = useState(true);
  const [tier, setTier] = useState<QualityTier>('medium');
  const [hud, setHud] = useState<HudState>({ fps: 0, lat: null, lon: null, zoom: 1 });
  const [supported, setSupported] = useState<boolean | null>(null);
  const [layer, setLayer] = useState<'blue' | TileLayer>('blue');
  const [camsOpen, setCamsOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQ, setFindQ] = useState('');
  const [findBusy, setFindBusy] = useState(false);
  const [findErr, setFindErr] = useState('');
  const [pin, setPin] = useState<[number, number] | null>(null);
  const router = useRouter();

  useEffect(() => { setTier(detectTier()); setSupported(webglSupported()); }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      scrollRef.current = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hudFps = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      setHud({ fps: hudFps.current, lat: cursorRef.current.lat, lon: cursorRef.current.lon, zoom: 3.15 / Math.max(0.001, distRef.current) });
    }, 200);
    return () => clearInterval(id);
  }, []);
  const onStats = useMemo(() => (f: number) => { hudFps.current = f; }, []);
  const onCursor = useMemo(() => (lat: number | null, lon: number | null) => { cursorRef.current = { lat, lon }; }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lastX = 0;
    const down = (x: number) => { dragRef.current.dragging = true; lastX = x; };
    const move = (x: number) => { if (!dragRef.current.dragging) return; dragRef.current.dx += x - lastX; lastX = x; };
    const up = () => { dragRef.current.dragging = false; };
    const onPointerDown = (e: PointerEvent) => down(e.clientX);
    const onPointerMove = (e: PointerEvent) => move(e.clientX);
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', up);
    const onTouchStart = (e: TouchEvent) => down(e.touches[0].clientX);
    const onTouchMove = (e: TouchEvent) => move(e.touches[0].clientX);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', up);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', up);
    };
  }, []);

  /** Find your home — OSM Nominatim geocode → fly the globe to street approach. */
  const findHome = async () => {
    const q = findQ.trim();
    if (!q || findBusy) return;
    setFindBusy(true); setFindErr('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) { setFindErr('Location not found — try “Kathmandu, Nepal” or your town name.'); return; }
      const lat = Number(data[0].lat), lon = Number(data[0].lon);
      setPin([lat, lon]);
      flyRef.current = { lat, lon, token: (flyRef.current?.token ?? 0) + 1 };
      distTargetRef.current = 1.03; // town-to-street approach
      if (layer === 'blue') setLayer('map');
      setFindOpen(false);
    } catch {
      setFindErr('Geocoder unreachable — try again in a moment.');
    } finally {
      setFindBusy(false);
    }
  };

  const tileLayer: TileLayer = layer === 'blue' ? 'map' : layer;

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ touchAction: 'pan-y' }}>
      {supported === false && <Poster />}
      {supported !== false && (
        <EarthScene
          tier={tier}
          frameloop={visible ? 'always' : 'never'}
          scrollRef={scrollRef}
          distTargetRef={distTargetRef}
          distRef={distRef}
          flyRef={flyRef}
          dragRef={dragRef}
          onSelect={(route) => router.push(route)}
          onStats={onStats}
          onCursor={onCursor}
          layer={tileLayer}
          tilesEnabled={layer !== 'blue'}
          pin={pin}
        />
      )}
      <Hud tier={tier} hud={hud} visible={visible} layer={layer} />

      {/* Explorer control deck */}
      <div className="absolute right-4 top-[calc(var(--nav)+16px)] z-[5] flex flex-col gap-2 items-end">
        <div className="panel p-1.5 flex flex-col gap-1.5">
          {([['blue', 'EARTH'], ['map', 'MAP'], ['sat', 'SAT']] as ['blue' | TileLayer, string][]).map(([k, label]) => (
            <button key={k} className="chip !px-3 !py-1.5 !text-[10px]" style={layer === k ? { color: 'var(--txt)', borderColor: 'color-mix(in srgb,var(--cy) 55%,transparent)', background: 'color-mix(in srgb,var(--cy) 14%,transparent)' } : undefined}
              onClick={() => setLayer(k)} title={`Layer: ${label}`}>
              {label}
            </button>
          ))}
          <div className="hr w-full" />
          <button className="ico !w-9 !h-9" title="Find your home" aria-label="Find your home" onClick={() => setFindOpen((v) => !v)}>
            <Icon name="home" size={16} />
          </button>
          <button className="ico !w-9 !h-9" title="Live cam networks" aria-label="Live cam networks" onClick={() => setCamsOpen(true)}>
            <span className="dot" />
          </button>
          <button className="ico !w-9 !h-9" title="Reset view" aria-label="Reset view"
            onClick={() => { distTargetRef.current = 3.15; setPin(null); }}>
            <Icon name="refresh" size={15} />
          </button>
        </div>
        {findOpen && (
          <div className="panel p-4 w-[min(320px,86vw)]">
            <div className="mono text-[9.6px] tracking-[.2em] dim mb-2.5">FIND YOUR HOME · ROADS · 3D VIEW</div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); findHome(); }}>
              <input className="inp !py-2 !text-[13px]" value={findQ} onChange={(e) => setFindQ(e.target.value)}
                placeholder="Kathmandu, Nepal…" aria-label="Search a place" />
              <button className="btn btn-p btn-sm" type="submit" disabled={findBusy}>
                {findBusy ? '…' : <Icon name="arrow" size={14} />}
              </button>
            </form>
            {findErr && <p className="mut text-[11.6px] mt-2">{findErr}</p>}
            <p className="dim text-[10.4px] mt-2 leading-relaxed">
              Geocoding © OpenStreetMap contributors. The globe flies to your place — keep scrolling the wheel to street level.
            </p>
          </div>
        )}
      </div>

      {/* attribution */}
      {layer !== 'blue' && (
        <div className="absolute left-3 bottom-[40px] z-[5] mono text-[9px] tracking-[.1em] dim" style={{ background: 'color-mix(in srgb,var(--bg) 66%,transparent)', padding: '3px 8px', borderRadius: 8 }}>
          {TILE_ATTRIBUTION[tileLayer]}
        </div>
      )}

      {camsOpen && (
        <div className="mbd" onMouseDown={(e) => { if (e.target === e.currentTarget) setCamsOpen(false); }}>
          <div className="mcard" role="dialog" aria-modal="true" aria-label="Live cam networks">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="eyebrow">FREE LIVE CAM NETWORKS</div>
                <button className="btn btn-g btn-sm" onClick={() => setCamsOpen(false)}>Close</button>
              </div>
              <LiveCamsPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
