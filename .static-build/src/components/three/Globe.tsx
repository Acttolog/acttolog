'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { detectTier, webglSupported, type QualityTier } from './tier';
import { DIVISION_NODES } from './EarthScene';
import { KTM } from '@/lib/utils';
import { nf } from '@/lib/utils';

const EarthScene = dynamic(() => import('./EarthScene').then((m) => m.EarthScene), { ssr: false });

/** Hero HUD (prototype h1): NPT clock · quality · render fps · nodes/links. */
function Hud({ tier, fps, visible }: { tier: QualityTier; fps: number; visible: boolean }) {
  const [npt, setNpt] = useState('—');
  useEffect(() => {
    const tick = () => {
      try {
        setNpt('NPT ' + new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium', timeZone: KTM }).format(new Date()));
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, 900);
    return () => clearInterval(id);
  }, []);
  const arcs = 8;
  return (
    <>
      <div className="hud hudtl">
        <div className="flex items-center gap-2"><span className="dot" /> ACTTOLOG NETWORK · LIVE</div>
        <div>NODE: EARTH-01 · ORBIT STABLE</div>
        <div>{npt}</div>
      </div>
      <div className="hud hudbr">
        <div>QUALITY · {visible ? tier.toUpperCase() : 'PAUSED'}</div>
        <div>RENDER · {visible && fps > 0 ? `${fps} FPS` : '—'}</div>
        <div>NODES · {nf(DIVISION_NODES.length)} · LINKS · {nf(arcs)}</div>
        <div>DRAG TO ROTATE · CLICK A NODE</div>
      </div>
    </>
  );
}

/** Poster fallback when WebGL is unavailable (spec §24). */
function Poster() {
  return (
    <div aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `radial-gradient(circle at 64% 48%, rgba(53,224,255,.16), transparent 42%),
                     radial-gradient(circle at 66% 50%, rgba(124,92,255,.22), transparent 30%),
                     radial-gradient(circle at 65% 49%, #0a1120 0 17.5%, transparent 17.6%),
                     radial-gradient(1200px 700px at 20% 10%, rgba(255,78,205,.07), transparent 60%)`,
      }}>
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,.5) 1px, transparent 1px)',
        backgroundSize: '90px 90px', opacity: 0.14,
      }} />
    </div>
  );
}

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const dragRef = useRef({ dx: 0, vel: 0, dragging: false });
  const [visible, setVisible] = useState(true);
  const [tier, setTier] = useState<QualityTier>('medium');
  const [fps, setFps] = useState(0);
  const [supported, setSupported] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    setTier(detectTier());
    setSupported(webglSupported());
  }, []);

  // pause rendering when hero is off-screen (spec §24)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // scroll-linked motion
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

  // drag-to-rotate (pointer + touch)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lastX = 0;
    const down = (x: number) => { dragRef.current.dragging = true; lastX = x; };
    const move = (x: number) => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dx += x - lastX;
      lastX = x;
    };
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

  const onStats = useMemo(() => (f: number) => setFps(f), []);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ touchAction: 'pan-y' }}>
      {supported === false && <Poster />}
      {supported !== false && (
        <EarthScene
          tier={tier}
          frameloop={visible ? 'always' : 'never'}
          scrollRef={scrollRef}
          dragRef={dragRef}
          onSelect={(route) => router.push(route)}
          onStats={onStats}
        />
      )}
      <Hud tier={tier} fps={fps} visible={visible} />
    </div>
  );
}
