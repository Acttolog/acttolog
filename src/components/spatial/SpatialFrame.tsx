'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * CSS-3D image plate. Pointer movement tilts the plane, moves a light source
 * and reveals a scan layer; no WebGL and no per-frame React work. Coarse
 * pointers and reduced-motion users get the same still plate.
 */
export function SpatialFrame({
  children,
  className = '',
  style,
  intensity = 8,
  clean = false,
  hud,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  intensity?: number;
  clean?: boolean;
  hud?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--sp-rx', `${(-ny * intensity).toFixed(2)}deg`);
        el.style.setProperty('--sp-ry', `${(nx * intensity * 1.35).toFixed(2)}deg`);
        el.style.setProperty('--sp-mx', `${((nx + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty('--sp-my', `${((ny + 0.5) * 100).toFixed(1)}%`);
        el.dataset.live = 'true';
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--sp-rx', '0deg');
      el.style.setProperty('--sp-ry', '0deg');
      el.dataset.live = 'false';
    };

    el.addEventListener('pointerenter', move);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointerenter', move);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', reset);
    };
  }, [intensity]);

  return (
    <div ref={ref} className={`sp-frame${clean ? 'sp-clean' : ''} ${className}`} style={style}>
      <div className="sp-plane">
        {children}
        {!clean && <span className="sp-scan" aria-hidden="true" />}
        <span className="sp-glare" aria-hidden="true" />
        <span className="sp-corner" aria-hidden="true" />
        {hud && (
          <span className="sp-hud" aria-hidden="true">
            {hud}
          </span>
        )}
      </div>
    </div>
  );
}
