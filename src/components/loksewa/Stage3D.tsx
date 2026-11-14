'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReduced } from '@/components/fx/Motion';
import { useMedium, Lk } from './Interactive';
import type { LkStage } from '@/lib/content/loksewa';

/**
 * Stage3D — the selection ladder as a real 3D structure.
 *
 * Slabs start scattered in depth and assemble into a pyramid as the visitor
 * scrolls, so the shape itself carries the meaning: the objective gate at the
 * bottom, the interview at the top. Reduced motion renders the finished
 * pyramid with no animation.
 */
export function Stage3D({ stages }: { stages: LkStage[] }) {
  const root = useRef<HTMLDivElement | null>(null);
  const { medium } = useMedium();

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReduced()) return;
    gsap.registerPlugin(ScrollTrigger);
    const slabs = gsap.utils.toArray<HTMLElement>('.lkslab', el);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        slabs,
        { y: () => gsap.utils.random(-140, 140), z: () => gsap.utils.random(-520, 120), rotateX: -26, opacity: 0.15 },
        {
          y: 0,
          z: (i) => -i * 26,
          rotateX: -14,
          opacity: 1,
          ease: 'none',
          stagger: 0.02,
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'bottom 40%', scrub: 0.7 },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div className="lkstage" ref={root} aria-label="चयन चरणहरू / Selection stages">
      <div className="lkstage-scene">
        {stages.map((s) => (
          <div key={s.id} className="lkslab" data-kind={s.kind.ne.length > 0 ? s.id : ''} style={{ '--w': `${Math.max(38, 100 - s.order * 8)}%` } as React.CSSProperties}>
            <span className="lkslab-order mono">{String(s.order).padStart(2, '0')}</span>
            <span className="lkslab-body">
              <Lk v={s.title} as="span" className="lkslab-title" />
              <span className="lkslab-meta">
                {s.marks} {medium === 'en' ? 'marks' : 'अङ्क'}
                {s.negative > 0 && (
                  <em className="lkslab-neg">
                    −{Math.round(s.negative * 100)}% {medium === 'en' ? 'negative' : 'नकारात्मक'}
                  </em>
                )}
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="lkstage-note">
        {medium === 'en'
          ? 'The pyramid is the strategy: everything above the first slab is unreachable until the objective gate is cleared.'
          : 'पिरामिड नै रणनीति हो: पहिलो तह पार नभएसम्म माथिको कुनै पनि तह पहुँचयोग्य छैन।'}
      </p>
    </div>
  );
}
