'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe } from '@/components/three/Globe';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import type { Bi, SiteSettings } from '@/lib/content/types';
import { Icon } from '@/components/ui/Icon';

/** Layer 01 — 3D Earth Hero (prototype h1, rebuilt on real WebGL). */
export function Hero({ settings }: { settings: SiteSettings }) {
  const { L, locale } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section id="hero" className="hero">
      <Globe />
      <div className="hvig" />

      <div className="wrap heroin" style={{ pointerEvents: 'none' }}>
        <div className="max-w-[760px]">
          <div className="eyebrow">
            {locale === 'ne' ? 'ACTTOLOG संसार · एउटै जोडिएको इकोसिस्टम' : 'ACTTOLOG WORLD · ONE CONNECTED ECOSYSTEM'}
          </div>
          <h1 className="htitle gtext" aria-label={settings.brand}>
            {settings.brand.split('').map((c, i) => (
              <span key={i} aria-hidden="true" style={{ animationDelay: `${120 + i * 58}ms` }}>{c}</span>
            ))}
          </h1>
          <p className="font-display font-semibold text-[clamp(1.15rem,3.2vw,2rem)] tracking-[-.02em] leading-tight"
            style={{ opacity: 0, animation: 'lin .9s .7s forwards' }}>
            {L(settings.tagline)}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3.5" style={{ opacity: 0, animation: 'lin .9s .82s forwards' }}>
            {(settings.lines || []).map((l: Bi, i: number) => (
              <span key={i} className="mono text-[10.5px] tracking-[.18em]" style={{ color: 'var(--cy)' }}>
                {L(l).toUpperCase()}
              </span>
            ))}
          </div>
          <p className="lead mt-5" style={{ opacity: 0, animation: 'lin .9s .9s forwards' }}>{L(settings.purpose)}</p>
          <div className="flex flex-wrap gap-3 mt-8" style={{ opacity: 0, animation: 'lin .9s 1s forwards', pointerEvents: 'auto' }}>
            <a className="btn btn-p btn-lg" href="#intro"
              onClick={() => track('cta_interaction', { cta: 'hero_explore' })}>
              {locale === 'ne' ? 'Acttolog अन्वेषण गर्नुहोस्' : 'Explore Acttolog'} <Icon name="arrow" size={17} />
            </a>
            <Link className="btn btn-g btn-lg" href="/darkroom"
              onClick={() => track('cta_interaction', { cta: 'hero_enter' })}>
              <Icon name="globe" size={17} />{locale === 'ne' ? 'संसारमा प्रवेश' : 'Enter the World'}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 mt-7" style={{ opacity: 0, animation: 'lin .9s 1.1s forwards' }}>
            {(settings.values || []).slice(0, 6).map((v, i) => (
              <span key={v} className="chip">{locale === 'ne' ? (settings.valuesNe || [])[i] || v : v}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="cue" aria-hidden="true"><span>SCROLL</span><i /></div>
      {mounted && null}
    </section>
  );
}
