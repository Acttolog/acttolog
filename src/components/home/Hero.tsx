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
  verified,
}: {
  settings: SiteSettings;
  ticker?: string[];
  altLang?: { href: string; label: string; lang: string };
  /** Compiled-on source verification, measured by tools/research-sources.js. */
  verified?: { count: number; total: number; date: string };
}) {
  const { L, locale } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useMotionArm();
  const title = useRef<HTMLHeadingElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const journeyRef = useRef(0);
  const heroCopyRef = useRef<HTMLDivElement | null>(null);
  const portalCopyRef = useRef<HTMLDivElement | null>(null);
  const atriumLabelRef = useRef<HTMLDivElement | null>(null);
  const phaseLabelRef = useRef<HTMLSpanElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Live intelligence line: NPT time-of-day greeting + today's date. Client-only
  // (set after mount) so SSR markup never mismatches; nothing here is fabricated.
  const [brief, setBrief] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    const tz = 'Asia/Kathmandu';
    const date = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(now);
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hour12: false }).format(now));
    const greet =
      locale === 'ne'
        ? hour < 12 ? 'शुभ प्रभात' : hour < 17 ? 'शुभ अपराह्न' : 'शुभ सन्ध्या'
        : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    setBrief(`${greet} · ${date} · NPT`);
  }, [locale]);

  // Damped pointer parallax: writes --hx/--hy so the HUD shards lean in 3D and
  // drift at depth. The loop settles and stops (no perpetual rAF); touch and
  // reduced-motion keep the static composition.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const tick = () => {
      raf = 0;
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      hero.style.setProperty('--hx', cx.toFixed(3));
      hero.style.setProperty('--hy', cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // One scroll controller owns the Earth → portal → doors → atrium journey.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      journeyRef.current = 1;
      hero.dataset.phase = 'atrium';
      if (phaseLabelRef.current) phaseLabelRef.current.textContent = 'ATRIUM';
      if (heroCopyRef.current) gsap.set(heroCopyRef.current, { autoAlpha: 0 });
      if (portalCopyRef.current) gsap.set(portalCopyRef.current, { autoAlpha: 0 });
      if (atriumLabelRef.current) gsap.set(atriumLabelRef.current, { autoAlpha: 1 });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const distance = window.innerWidth < 700 ? 1100 : window.innerWidth < 1100 ? 1800 : 2600;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: `+=${distance}`,
          scrub: window.innerWidth < 700 ? true : 0.8,
          pin: true,
          anticipatePin: 1,
        },
        onUpdate: () => {
          const p = journeyRef.current;
          const phase = p < 0.18 ? 'earth' : p < 0.5 ? 'approach' : p < 0.74 ? 'doors' : 'atrium';
          hero.dataset.phase = phase;
          hero.style.setProperty('--journey', p.toFixed(3));
          if (phaseLabelRef.current) phaseLabelRef.current.textContent = phase.toUpperCase();
        },
      });
      tl.to(journeyRef, { current: 0.38, duration: 1, ease: 'none' }, 0)
        .to(heroCopyRef.current, { autoAlpha: 0, y: -50, duration: 0.24, ease: 'power2.in' }, 0.12)
        .to(portalCopyRef.current, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.34)
        .to(journeyRef, { current: 0.7, duration: 0.36, ease: 'none' }, 0.38)
        .to(portalCopyRef.current, { autoAlpha: 0, y: -24, duration: 0.16 }, 0.7)
        .to(atriumLabelRef.current, { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out' }, 0.78)
        .to(journeyRef, { current: 1, duration: 0.22, ease: 'none' }, 0.78);
      timelineRef.current = tl;
    });
    return () => {
      ctx.revert();
      timelineRef.current = null;
    };
  }, []);

  const enterJourney = () => {
    const trigger = timelineRef.current?.scrollTrigger;
    if (!trigger) {
      document.getElementById('atrium')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const top = trigger.start + (trigger.end - trigger.start) * 0.62;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section id="hero" className="hero" ref={heroRef}>
      <AuroraGL />
      <Globe journeyRef={journeyRef} />
      <div className="hvig" />
      <div className="hero-aura" aria-hidden="true" />
      <div className="hero-rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="hero-shards" aria-hidden="true">
        <div className="hero-shard">
          {/* Inline size overrides the 8.6px stylesheet floor: ≥10.5px desktop, ≥11px mobile. */}
          <span style={{ fontSize: '11px' }}>
            {locale === 'ne' ? 'अवतरण' : 'DESCENT'} · 06 {locale === 'ne' ? 'तह' : 'STRATA'}
          </span>
          <b>{locale === 'ne' ? 'सतहदेखि मुटुसम्म' : 'Surface → core'}</b>
          <u>
            <i />
          </u>
        </div>
        <div className="hero-shard">
          <span style={{ fontSize: '11px' }}>
            {verified
              ? locale === 'ne'
                ? 'स्रोत जाँच'
                : 'SOURCE CHECK'
              : locale === 'ne'
                ? 'संसार सञ्जाल'
                : 'WORLD NETWORK'}
          </span>
          <b style={verified ? { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' } : undefined}>
            {/* The ratio itself is stated once, in the source ledger card; the
                shard carries the check date and the gauge, not a second number. */}
            {verified
              ? verified.date.slice(0, 10)
              : locale === 'ne'
                ? 'नेपाल → संसारभर'
                : 'Nepal → worldwide'}
          </b>
          <u>
            <i
              style={
                verified && verified.total > 0
                  ? {
                      width: `${Math.min(100, Math.round((verified.count / verified.total) * 100))}%`,
                      background: 'var(--ok)',
                      boxShadow: '0 0 10px var(--ok)',
                    }
                  : undefined
              }
            />
          </u>
        </div>
      </div>

      <div className="wrap heroin" style={{ pointerEvents: 'none' }}>
        <div ref={heroCopyRef} className="max-w-[760px]">
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
            className="hero-lines mt-3.5 flex flex-wrap gap-x-5 gap-y-1"
            style={{ opacity: 0, animation: 'lin .9s .82s forwards' }}
          >
            {(settings.lines || []).map((l: Bi, i: number) => (
              <span key={i} className="mono text-[10.5px] tracking-[.18em]" style={{ color: 'var(--cy)' }}>
                {L(l).toUpperCase()}
              </span>
            ))}
          </div>
          {brief && (
            <p className="hero-brief mono" role="status">
              <span className="hero-brief-dot" aria-hidden="true" />
              {brief}
            </p>
          )}
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
            <button
              type="button"
              className="btn btn-g btn-lg"
              onClick={() => {
                track('cta_interaction', { cta: 'hero_enter' });
                enterJourney();
              }}
            >
              {locale === 'ne' ? 'ACTTOLOG मा प्रवेश गर्नुहोस्' : 'Enter ACTTOLOG'} <Icon name="arrow" size={17} />
            </button>
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
              <Link className="hero-link hero-lang" href={altLang.href} lang={altLang.lang}>
                <Icon name="globe" size={14} />
                {altLang.label}
              </Link>
            )}
            <Link className="hero-link" href="#atrium">
              <Icon name="arrow" size={14} />
              {locale === 'ne' ? 'सिधै एट्रियम' : 'Skip to atrium'}
            </Link>
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

      <div ref={portalCopyRef} className="journey-overlay portal-overlay">
        <p className="eyebrow justify-center">{locale === 'ne' ? 'एक्टोलग प्रवेशद्वार' : 'ACTTOLOG GRAND ENTRANCE'}</p>
        <h2 className="h2 journey-title">{locale === 'ne' ? 'एउटा संसारको ढोका' : 'The doorway to one connected world'}</h2>
        <p className="lead journey-lead">
          {locale === 'ne'
            ? 'पृथ्वीबाट एट्रियमसम्म — वास्तविक ढोका, वास्तविक गहिराइ, र तपाईंको अगाडि खुला संसार।'
            : 'From Earth to atrium — real architecture, real depth, and a world opening in front of you.'}
        </p>
        <div className="journey-actions">
          <button type="button" className="btn btn-p btn-lg" onClick={enterJourney}>
            {locale === 'ne' ? 'भित्र प्रवेश गर्नुहोस्' : 'Enter the atrium'} <Icon name="arrow" size={17} />
          </button>
          <Link className="btn btn-g btn-lg" href="#atrium">
            {locale === 'ne' ? 'सिधै एट्रियम' : 'Skip to atrium'}
          </Link>
        </div>
      </div>

      <div ref={atriumLabelRef} className="journey-overlay atrium-overlay">
        <p className="eyebrow justify-center">{locale === 'ne' ? 'डिजिटल एट्रियम' : 'DIGITAL ATRIUM'}</p>
        <h2 className="h2 journey-title">{locale === 'ne' ? 'ACTTOLOG संसारमा स्वागत छ' : 'Welcome to the ACTTOLOG world'}</h2>
        <p className="lead journey-lead">
          {locale === 'ne' ? 'सिक्नुहोस्। अनुसन्धान गर्नुहोस्। खेल्नुहोस्। खोज्नुहोस्। जोडिनुहोस्।' : 'Discover. Learn. Create. Connect.'}
        </p>
        <Link className="btn btn-p btn-lg" href="#atrium">
          {locale === 'ne' ? 'ड्यासबोर्ड खोल्नुहोस्' : 'Open the world dashboard'} <Icon name="arrow" size={17} />
        </Link>
      </div>

      <div className="journey-hud">
        <span>JOURNEY</span>
        <b ref={phaseLabelRef}>EARTH</b>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          {locale === 'ne' ? 'पृथ्वी' : 'Earth'}
        </button>
      </div>

      <button
        type="button"
        className="cue"
        aria-label={locale === 'ne' ? 'ACTTOLOG मा प्रवेश गर्नुहोस्' : 'Enter ACTTOLOG'}
        style={{ bottom: 46 }}
        onClick={enterJourney}
      >
        <span>ENTER</span>
        <i />
      </button>
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
