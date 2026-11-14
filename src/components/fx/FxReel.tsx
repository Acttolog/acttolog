'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { prefersReduced } from './Motion';

/**
 * FxReel — the accepted coverflow treatment (preview 06).
 *
 * Photographs sit on a real 3D ring and turn on click or with the controls.
 * Under prefers-reduced-motion, or before hydration, the same items render as a
 * plain scrollable row, so nobody loses access to an image or its credit.
 */
export interface ReelItem {
  src: string;
  alt: string;
  title: string;
  credit: string;
}

export function FxReel({ items, label = 'Featured photographs' }: { items: ReelItem[]; label?: string }) {
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const stage = useRef<HTMLDivElement | null>(null);
  const reduced = useRef(true);

  useEffect(() => {
    reduced.current = prefersReduced();
    setReady(!reduced.current);
  }, []);

  useEffect(() => {
    const host = stage.current;
    if (!host || reduced.current) return;
    const cells = Array.from(host.querySelectorAll<HTMLElement>('[data-cell]'));
    if (!cells.length) return;
    const rel = (i: number) => {
      const raw = ((i - active + cells.length) % cells.length);
      return raw > cells.length / 2 ? raw - cells.length : raw;
    };
    cells.forEach((c, i) => {
      const r = rel(i);
      const abs = Math.abs(r);
      gsap.to(c, {
        duration: 0.7,
        ease: 'power3.out',
        rotationY: r * -24,
        x: r * 158,
        z: -abs * 220,
        scale: 1 - abs * 0.1,
        opacity: abs > 2 ? 0 : 1 - abs * 0.22,
        zIndex: 10 - abs,
        pointerEvents: r === 0 ? 'auto' : 'none',
      });
      c.setAttribute('aria-hidden', abs > 2 ? 'true' : 'false');
    });
  }, [active, ready]);

  if (!items.length) return null;
  const step = (d: number) => setActive((a) => (a + d + items.length) % items.length);

  if (!ready) {
    return (
      <div className="fx-reel fx-reel-static" aria-label={label}>
        {items.map((it) => (
          <figure key={it.src} className="fx-reel-cell">
            <img src={it.src} alt={it.alt} loading="lazy" decoding="async" />
            <figcaption>
              {it.title} · {it.credit}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className="fx-reel" aria-label={label} role="group">
      <div className="fx-reel-stage" ref={stage}>
        {items.map((it, i) => (
          <div key={it.src} data-cell className="fx-reel-cell" onClick={() => setActive(i)}>
            <img src={it.src} alt={it.alt} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" />
            <figcaption className="fx-reel-cap">
              <span className="fx-reel-t">{it.title}</span>
              <span className="fx-reel-c">{it.credit}</span>
            </figcaption>
          </div>
        ))}
      </div>
      <div className="fx-reel-nav">
        <button type="button" className="chip" onClick={() => step(-1)}>
          ← Prev
        </button>
        <span className="mono fx-reel-i">
          {String(active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <button type="button" className="chip" onClick={() => step(1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
