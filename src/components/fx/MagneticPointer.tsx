'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { usePrefs } from '@/lib/prefs';
import type { PointerSettings } from '@/lib/pointer';

/**
 * Magnetic pointer overlay — one rAF loop, refs only (zero React state per frame).
 * Renders only on mounted fine-pointer devices; touch/coarse keeps the native cursor.
 */

/** Lint-clean media query hook: server snapshot is false, client syncs after hydration. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const SELECTOR = 'a, button, [role="button"], input, select, textarea, summary, [data-magnetic]';
const TRAIL_POOL = 24;
const NAV_KEYS = ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

interface Candidate {
  el: Element;
  cx: number;
  cy: number;
}

export function MagneticPointer() {
  const { pointer, motion } = usePrefs();
  const ready = useMediaQuery('(hover: hover) and (pointer: fine)');
  const sysReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const reduced = motion === 'reduced' || sysReduced;

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const pulseRef = useRef<HTMLDivElement | null>(null);
  const trailEls = useRef<(HTMLDivElement | null)[]>([]);

  const settingsRef = useRef<PointerSettings>(pointer);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    settingsRef.current = pointer;
    reducedRef.current = reduced;
  }, [pointer, reduced]);

  /* Native cursor hiding — always revoked on unmount/disable so the site never loses its cursor. */
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('act-pointer-on', ready && pointer.enabled && pointer.hideNative);
    return () => html.classList.remove('act-pointer-on');
  }, [ready, pointer.enabled, pointer.hideNative]);

  /* Static styling (sizes, glow, blend, hue, trail pool) — written on settings change, never per frame. */
  useEffect(() => {
    if (!ready) return;
    const ov = overlayRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ov || !ring || !dot) return;
    const s = pointer;
    ov.style.mixBlendMode = s.blend;
    ov.style.filter = s.hue > 0 ? `hue-rotate(${s.hue}deg)` : 'none';
    ring.style.width = `${s.ringSize}px`;
    ring.style.height = `${s.ringSize}px`;
    dot.style.width = `${s.dotSize}px`;
    dot.style.height = `${s.dotSize}px`;
    const g = s.glow / 100;
    ring.style.boxShadow = `0 0 ${Math.round(5 + g * 26)}px color-mix(in srgb, var(--cy) ${Math.round(18 + g * 62)}%, transparent), inset 0 0 ${Math.round(3 + g * 12)}px color-mix(in srgb, var(--cy) ${Math.round(8 + g * 34)}%, transparent)`;
    dot.style.boxShadow = `0 0 ${Math.round(3 + g * 16)}px color-mix(in srgb, var(--mg) ${Math.round(28 + g * 60)}%, transparent)`;
    const n = reduced ? 0 : s.trail;
    trailEls.current.forEach((el, i) => {
      if (!el) return;
      const on = i < n;
      el.style.display = on ? 'block' : 'none';
      if (on) {
        const f = 1 - i / Math.max(1, n);
        const size = Math.max(2, Math.round(s.dotSize * (0.35 + f * 0.85)));
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.opacity = String(0.06 + f * 0.38);
      }
    });
  }, [pointer, ready, reduced]);

  /* The single animation loop + all listeners. Settings live in refs, so this never re-runs on tuning. */
  useEffect(() => {
    if (!ready) return;
    const ov = overlayRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;
    const pulse = pulseRef.current;
    if (!ov || !ring || !dot || !pulse) return;

    let raf = 0;
    let running = false;
    let last = 0;
    let mx = -200;
    let my = -200;
    let rx = -200;
    let ry = -200;
    let stretch = 0;
    let ang = 0;
    let inside = false;
    let keyboard = false;
    let lastActive = false;
    let trailInit = false;
    const trailPos = Array.from({ length: TRAIL_POOL }, () => ({ x: -200, y: -200 }));

    let candidates: Candidate[] = [];
    let lastRefresh = 0;
    let dirty = true;
    let target: Candidate | null = null;

    const clearTarget = () => {
      if (target) target.el.classList.remove('act-magnet');
      target = null;
    };

    /* Cached candidate geometry — querySelectorAll + rect reads at most ~1.7×/s, never per frame. */
    const refresh = (now: number) => {
      lastRefresh = now;
      dirty = false;
      const next: Candidate[] = [];
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (el.closest('.magp') || el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        next.push({ el, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
      });
      candidates = next;
      const t = target;
      if (t) {
        /* Re-point to the fresh geometry so a scroll never pulls toward stale coords. */
        const fresh = next.find((c) => c.el === t.el);
        if (fresh) target = fresh;
        else clearTarget();
      }
    };

    /* Per-frame magnet evaluation over cached geometry — the candidate loop is
       O(n) and cheap, so attraction tracks the pointer with zero throttle lag.
       Only the expensive DOM refresh (querySelectorAll + rects) stays throttled. */
    const scan = (now: number) => {
      if (dirty || now - lastRefresh > 600) refresh(now);
      const s = settingsRef.current;
      let best: Candidate | null = null;
      let bestD = s.radius;
      for (const c of candidates) {
        const d = Math.hypot(c.cx - mx, c.cy - my);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (best !== target) {
        clearTarget();
        target = best;
        if (target) target.el.classList.add('act-magnet');
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const s = settingsRef.current;
      const red = reducedRef.current;
      const active = s.enabled && inside && !keyboard;
      if (active !== lastActive) {
        lastActive = active;
        ov.style.opacity = active ? '1' : '0';
        if (!active) clearTarget();
      }
      if (!active) return;

      /* Evaluate the magnet every frame so the snap is instant on approach and
         re-settles correctly after scroll/resize — geometry stays cached. */
      scan(now);

      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;

      let tx = mx;
      let ty = my;
      let pull = 0;
      if (target) {
        const dx = target.cx - mx;
        const dy = target.cy - my;
        const dist = Math.hypot(dx, dy);
        if (dist <= s.radius && dist > 0.001) {
          pull = (s.strength / 100) * (1 - dist / s.radius);
          tx = mx + dx * pull;
          ty = my + dy * pull;
          ang = Math.atan2(dy, dx);
        }
      }
      /* Snappy follow: low tau keeps the ring tight to the pointer. The old
         0.012 + damping*0.012 mapping trailed ~150ms at the default; this one
         tracks within a few frames while still smoothing jitter. */
      const tau = red ? 0.012 : 0.004 + s.damping * 0.005;
      const k = 1 - Math.exp(-dt / tau);
      rx += (tx - rx) * k;
      ry += (ty - ry) * k;

      const goal = red ? 0 : (s.deform / 100) * pull;
      stretch += (goal - stretch) * Math.min(1, dt * 12);
      const sx = 1 + stretch * 0.85;
      const sy = 1 - stretch * 0.3;
      ring.style.transform = stretch > 0.004
        ? `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) rotate(${ang}rad) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`
        : `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;

      const n = red ? 0 : s.trail;
      if (n > 0) {
        if (!trailInit) {
          trailInit = true;
          for (const p of trailPos) {
            p.x = mx;
            p.y = my;
          }
        }
        const kt = 1 - Math.exp(-dt / 0.035);
        let px = mx;
        let py = my;
        for (let i = 0; i < n; i++) {
          const p = trailPos[i];
          p.x += (px - p.x) * kt;
          p.y += (py - p.y) * kt;
          px = p.x;
          py = p.y;
          const el = trailEls.current[i];
          if (el) el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`;
        }
      } else {
        trailInit = false;
      }
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onVis = () => (document.hidden ? stop() : start());

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      /* High-Hz mice/displays deliver several samples per frame; the last
         coalesced sample is the freshest position, so the dot tracks with the
         lowest possible latency instead of the first (stale) sample. */
      const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
      const p = coalesced && coalesced.length ? coalesced[coalesced.length - 1] : e;
      mx = p.clientX;
      my = p.clientY;
      inside = true;
      keyboard = false;
    };
    const onDown = (e: PointerEvent) => {
      const s = settingsRef.current;
      if (e.pointerType === 'touch' || !s.clickPulse || !s.enabled || reducedRef.current || keyboard || !inside) return;
      const base = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      pulse.getAnimations().forEach((a) => a.cancel());
      pulse.animate(
        [
          { opacity: 0.9, transform: `${base} scale(0.25)` },
          { opacity: 0, transform: `${base} scale(1.7)` },
        ],
        { duration: 480, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
    };
    const onLeave = () => {
      inside = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (NAV_KEYS.includes(e.key)) keyboard = true;
    };
    const onScrollResize = () => {
      dirty = true;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollResize, { passive: true });
    window.addEventListener('resize', onScrollResize, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    start();

    return () => {
      stop();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollResize);
      window.removeEventListener('resize', onScrollResize);
      document.removeEventListener('visibilitychange', onVis);
      clearTarget();
      ov.style.opacity = '0';
    };
  }, [ready]);

  if (!ready) return null;
  return (
    <div ref={overlayRef} className="magp" aria-hidden="true">
      {Array.from({ length: TRAIL_POOL }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            trailEls.current[i] = el;
          }}
          className="magp-trail"
        />
      ))}
      <div ref={ringRef} className="magp-ring" />
      <div ref={dotRef} className="magp-dot" />
      <div ref={pulseRef} className="magp-pulse" />
    </div>
  );
}