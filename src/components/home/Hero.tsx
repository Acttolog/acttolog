'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Globe } from '@/components/three/Globe';
import { SpatialTrigger } from '@/components/spatial/SpatialTrigger';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import type { Bi, SiteSettings } from '@/lib/content/types';
import { Icon } from '@/components/ui/Icon';
import { useMotionArm } from '@/components/fx/Motion';
import { AuroraGL } from '@/components/fx/AuroraGL';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Layer 01 — 3D Earth Hero (prototype h1, rebuilt on real WebGL). */
export function Hero({
  settings,
  ticker = [],
  altLang,
}: {
  settings: SiteSettings;
  ticker?: string[];
  altLang?: { href: string; label: string; lang: string };
}) {
  const { L, locale } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useMotionArm();
  const title = useRef<HTMLHeadingElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  // Kinetic type: the letterforms open up and gain weight as you leave the hero.
  useEffect(() => {
    const h1 = title.current;
    const hero = heroRef.current;
    if (!h1 || !hero) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.to(h1, {
        letterSpacing: '-0.02em',
        fontVariationSettings: "'wght' 700",
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=460', scrub: true },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section id="hero" className="hero" ref={heroRef}>
      <AuroraGL />
      <Globe />
      <div className="hvig" />
      <div className="hero-aura" aria-hidden="true" />
      <div className="hero-rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="hero-shards" aria-hidden="true">
        <div className="hero-shard">
          <span>
            {locale === 'ne' ? 'अवतरण' : 'DESCENT'} · 06 {locale === 'ne' ? 'तह' : 'STRATA'}
          </span>
          <b>{locale === 'ne' ? 'सतहदेखि मुटुसम्म' : 'Surface → core'}</b>
          <u>
            <i />
          </u>
        </div>
        <div className="hero-shard">
          <span>{locale === 'ne' ? 'संसार सञ्जाल' : 'WORLD NETWORK'}</span>
          <b>{locale === 'ne' ? '५ विभाग · अनलाइन' : '5 divisions · online'}</b>
          <u>
            <i />
          </u>
        </div>
      </div>

      <div className="wrap heroin" style={{ pointerEvents: 'none' }}>
        <div className="max-w-[760px]">
          <div className="eyebrow">
            {locale === 'ne'
              ? 'ACTTOLOG संसार · एउटै जोडिएको इकोसिस्टम'
              : 'ACTTOLOG WORLD · ONE CONNECTED ECOSYSTEM'}
          </div>
          <h1
            ref={title}
            className="htitle gtext"
            aria-label={
              locale === 'ne' ? 'एक्टोलग — नेपालको डिजिटल इकोसिस्टम' : `${settings.brand} — digital ecosystem from Nepal`
            }
          >
            {settings.brand.split('').map((c, i) => (
              <span key={i} aria-hidden="true" style={{ animationDelay: `${120 + i * 58}ms` }}>
                {c}
              </span>
            ))}
          </h1>
          <p
            className="font-display text-[clamp(1.15rem,3.2vw,2rem)] leading-tight font-semibold tracking-[-.02em]"
            style={{ opacity: 0, animation: 'lin .9s .7s forwards' }}
          >
            {L(settings.tagline)}
          </p>
          <div
            className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1"
            style={{ opacity: 0, animation: 'lin .9s .82s forwards' }}
          >
            {(settings.lines || []).map((l: Bi, i: number) => (
              <span key={i} className="mono text-[10.5px] tracking-[.18em]" style={{ color: 'var(--cy)' }}>
                {L(l).toUpperCase()}
              </span>
            ))}
          </div>
          <p className="lead mt-5" style={{ opacity: 0, animation: 'lin .9s .9s forwards' }}>
            {L(settings.purpose)}
          </p>
          <div
            className="mt-8 flex flex-wrap gap-3"
            style={{ opacity: 0, animation: 'lin 1s 1s forwards', pointerEvents: 'auto' }}
          >
            <Link
              className="btn btn-p btn-lg"
              href="/explore?mode=earth"
              onClick={() => track('earth_open', { via: 'hero' })}
            >
              <Icon name="globe" size={17} />
              {locale === 'ne' ? 'पृथ्वी अन्वेषण गर्नुहोस्' : 'Explore Earth'}
            </Link>
            <a
              className="btn btn-g btn-lg"
              href="#descent"
              onClick={() => track('cta_interaction', { cta: 'hero_descent' })}
            >
              {locale === 'ne' ? 'अवतरण सुरु गर्नुहोस्' : 'Begin descent'} <Icon name="down" size={17} />
            </a>
          </div>
          <div
            className="hero-sub"
            style={{ opacity: 0, animation: 'lin .9s 1.08s forwards', pointerEvents: 'auto' }}
          >
            <SpatialTrigger
              id="world"
              className="hero-link"
              label={locale === 'ne' ? 'स्पेशियल भ्यू खोल्नुहोस्' : 'Open spatial view'}
            >
              <Icon name="layers" size={14} />
              {locale === 'ne' ? 'स्पेशियल भ्यू' : 'Spatial view'}
            </SpatialTrigger>
            <button
              className="hero-link"
              type="button"
              onClick={() => {
                track('cta_interaction', { cta: 'hero_search' });
                window.dispatchEvent(new CustomEvent('acttolog:search-open'));
              }}
            >
              <Icon name="search" size={14} />
              {locale === 'ne' ? 'संसार खोज्नुहोस्' : 'Search world'}
            </button>
            {altLang && (
              <Link className="hero-link" href={altLang.href} lang={altLang.lang}>
                <Icon name="globe" size={14} />
                {altLang.label}
              </Link>
            )}
          </div>
          <div
            className="mt-7 flex flex-wrap gap-2"
            style={{ opacity: 0, animation: 'lin .9s 1.18s forwards' }}
          >
            {(settings.values || []).slice(0, 6).map((v, i) => (
              <span key={v} className="chip">
                {locale === 'ne' ? (settings.valuesNe || [])[i] || v : v}
              </span>
            ))}
          </div>
        </div>
      </div>

      <a
        className="cue"
        href="#descent"
        aria-label={locale === 'ne' ? 'अवतरण सुरु गर्नुहोस्' : 'Begin the descent'}
        style={{ bottom: 46 }}
      >
        <span>SCROLL</span>
        <i />
      </a>
      {ticker.length > 0 && (
        <div className="hero-ticker" aria-hidden="true">
          <div className="marqt">
            {[0, 1].map((dup) => (
              <span key={dup} className="flex" style={{ gap: 0 }}>
                {ticker.map((t, i) => (
                  <span key={i} className="tk" dangerouslySetInnerHTML={{ __html: t }} />
                ))}
              </span>
            ))}
          </div>
        </div>
      )}
      {mounted && null}
    </section>
  );
}
