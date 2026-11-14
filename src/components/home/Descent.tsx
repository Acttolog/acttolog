'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { nf } from '@/lib/utils';
import type { Bi, Division, Locale } from '@/lib/content/types';

/**
 * THE DESCENT — scroll-driven 3D corridor.
 *
 * Six portals sit on a fixed Z axis. Scroll pushes the world toward the
 * viewer; each gate fills the frame, flashes, and falls behind. The copy
 * is driven by proximity. Motion lives in one rAF loop that writes CSS
 * vars directly, so React re-renders only when the active stratum changes.
 */

const ORDER = ['research', 'darkroom', 'academy', 'entertainment', 'games'];

const ART: Record<string, string> = {
  research: '/media/descent/research',
  darkroom: '/media/descent/darkroom',
  academy: '/media/descent/academy',
  entertainment: '/media/descent/entertainment',
  games: '/media/descent/games',
};

const COUNT_LABEL: Record<string, Bi> = {
  research: { en: 'services', ne: 'सेवाहरू' },
  darkroom: { en: 'verified resources', ne: 'प्रमाणित स्रोत' },
  academy: { en: 'courses', ne: 'पाठ्यक्रम' },
  entertainment: { en: 'stories & media', ne: 'कथा र मिडिया' },
  games: { en: 'games', ne: 'खेलहरू' },
};

const CORE_TONE = '#ffe3b0';
const STRATUM_DEPTH = 240;

interface Gate {
  id: string;
  title: Bi;
  sub: Bi;
  desc: Bi;
  tone: string;
  route: string;
  route2?: string;
  cta: Bi;
  cta2?: Bi;
  image?: string;
  count?: number;
  countLabel?: Bi;
  depth: number;
  core?: boolean;
}

const DUST = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  dur: 6 + ((i * 13) % 9),
  delay: -((i * 7) % 15),
  size: 1 + ((i * 5) % 3) * 0.6,
  alpha: 0.1 + ((i * 11) % 7) / 42,
}));

const STREAKS = Array.from({ length: 9 }, (_, i) => ({
  left: (i * 53 + 17) % 100,
  dur: 0.9 + ((i * 7) % 6) * 0.18,
  delay: -((i * 5) % 11) * 0.22,
  len: 14 + ((i * 3) % 5) * 4,
}));

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const cssVars = (v: Record<string, string | number>) => v as CSSProperties;

function ChapterBody({
  gate,
  locale,
  L,
  inline,
  onNext,
}: {
  gate: Gate;
  locale: Locale;
  L: (v: Bi | string | undefined | null) => string;
  inline?: boolean;
  onNext?: () => void;
}) {
  const Heading = (inline ? 'h3' : 'h2') as 'h2' | 'h3';
  return (
    <>
      <div className="dsc-kicker">
        <span>{gate.core ? 'STRATUM 06 / 06 · CORE' : `STRATUM 0${gate.depth / STRATUM_DEPTH} / 06`}</span>
        <i />
        <em>
          {locale === 'ne' ? 'गहिराइ' : 'DEPTH'} −{nf(gate.depth)} m
        </em>
      </div>
      <Heading className="dsc-title">{L(gate.title)}</Heading>
      <div className="dsc-sub">{L(gate.sub)}</div>
      <p className="dsc-desc">{L(gate.desc)}</p>
      <div className="dsc-facts">
        {gate.count != null && gate.countLabel && (
          <span className="dsc-fact">
            <b>{nf(gate.count)}</b> {L(gate.countLabel)}
          </span>
        )}
        <span className="dsc-fact">
          {locale === 'ne' ? 'तह' : 'GATE'} <b>{String(gate.depth / STRATUM_DEPTH).padStart(2, '0')}</b> / 06
        </span>
      </div>
      <div className="dsc-actions">
        <Link className="btn btn-p" href={gate.route}>
          {L(gate.cta)} <Icon name="arrow" size={15} />
        </Link>
        {gate.route2 && (
          <Link className="btn btn-g" href={gate.route2}>
            {L(gate.cta2)}
          </Link>
        )}
        {onNext && (
          <button type="button" className="btn btn-g dsc-next" onClick={onNext}>
            {locale === 'ne' ? 'अर्को तह' : 'Next stratum'} <Icon name="down" size={15} />
          </button>
        )}
      </div>
    </>
  );
}

export function Descent({ divisions, counts }: { divisions: Division[]; counts: Record<string, number> }) {
  const { L, locale } = useI18n();
  const gates = useMemo<Gate[]>(() => {
    const list = ORDER.map((id) => divisions.find((d) => d.id === id))
      .filter((d): d is Division => Boolean(d))
      .map((d, i): Gate => ({
        id: d.id,
        title: d.name,
        sub: d.sub,
        desc: d.desc,
        tone: d.color,
        route: d.route,
        image: ART[d.id],
        count: counts[d.id],
        countLabel: COUNT_LABEL[d.id],
        depth: (i + 1) * STRATUM_DEPTH,
        cta: {
          en: `Enter ${d.name.en}`,
          ne: `${d.name.ne} खोल्नुहोस्`,
        },
      }));
    list.push({
      id: 'core',
      title: { en: 'The core', ne: 'मुटु' },
      sub: { en: 'One world · five divisions · infinite layers', ne: 'एक संसार · पाँच विभाग · अनन्त तहहरू' },
      desc: {
        en: 'Six strata down, the corridor opens into the thing itself: research, resources, learning, stories and play — built in Nepal, open to the world. The descent ends. The world begins.',
        ne: 'छ तह तल, कोरिडोर आफैंमा खुल्छ: अनुसन्धान, स्रोत, सिकाइ, कथा र खेल — नेपालबाट बनेको, संसारका लागि खुला। अवतरण यहीँ टुंगिन्छ। संसार सुरु हुन्छ।',
      },
      tone: CORE_TONE,
      route: '/explore?mode=earth',
      route2: '/nepal',
      cta: { en: 'Enter the world', ne: 'संसारमा प्रवेश गर्नुहोस्' },
      cta2: { en: 'Explore Nepal', ne: 'नेपाल अन्वेषण गर्नुहोस्' },
      depth: 6 * STRATUM_DEPTH,
      core: true,
    });
    return list;
  }, [divisions, counts]);

  const N = gates.length;
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  const [reduced, setReduced] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const gateRefs = useRef<Array<HTMLElement | null>>([]);
  const depthRef = useRef<HTMLSpanElement>(null);
  const rateRef = useRef<HTMLElement>(null);
  const gateNumRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const progRef = useRef<HTMLElement>(null);

  const activeRef = useRef(0);
  const startedRef = useRef(false);
  const camRef = useRef(0);
  const tiltRef = useRef({ x: 0, y: 0 });
  const pointerRef = useRef({ x: 0, y: 0 });
  const metricsRef = useRef({ gap: 560, persp: 1300, start: -437, end: 0, total: 1, top: 0 });

  const current = gates[Math.min(active, N - 1)] || gates[0];

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const stage = stageRef.current;
    const world = worldRef.current;
    if (!section || !stage || !world) return;

    const m = metricsRef.current;
    let raf = 0;
    let inView = false;
    let first = true;
    let prevCam = camRef.current;
    let rate = 0;
    let lastHud = 0;
    let lastTick = 0;

    const measure = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const gap = Math.min(660, Math.max(430, vh * 0.66));
      const persp = Math.min(1600, Math.max(1100, vw * 1.04));
      m.gap = gap;
      m.persp = persp;
      m.start = -gap;
      m.end = (N - 1) * gap + gap * 0.18;
      m.top = section.getBoundingClientRect().top + window.scrollY;
      m.total = Math.max(1, section.offsetHeight - vh);
      stage.style.setProperty('--persp', `${persp}px`);
      gateRefs.current.forEach((el, i) => {
        if (el) el.style.setProperty('--gz', `${-i * gap}px`);
      });
      const p = clamp((window.scrollY - m.top) / m.total, 0, 1);
      if (first) camRef.current = m.start + p * (m.end - m.start);
    };

    const tick = (ts = performance.now()) => {
      raf = 0;
      if (!inView) return;
      const dt = lastTick ? clamp(ts - lastTick, 8, 600) : 16.7;
      lastTick = ts;
      const p = clamp((window.scrollY - m.top) / m.total, 0, 1);
      const target = m.start + p * (m.end - m.start);
      if (first) {
        camRef.current = target;
        first = false;
      }
      // Time-based damping: keeps the glide identical at 60/120 Hz and
      // catches up in one frame when the tab or compositor is starved.
      const k = 1 - Math.pow(1 - 0.14, dt / 16.7);
      camRef.current += (target - camRef.current) * k;
      if (Math.abs(target - camRef.current) < 0.04) camRef.current = target;
      const cam = camRef.current;

      tiltRef.current.x += (pointerRef.current.x - tiltRef.current.x) * 0.08;
      tiltRef.current.y += (pointerRef.current.y - tiltRef.current.y) * 0.08;
      world.style.transform = `translate3d(0,0,${cam.toFixed(2)}px) rotateX(${(tiltRef.current.y * 1.5).toFixed(2)}deg) rotateY(${(tiltRef.current.x * 2.3).toFixed(2)}deg)`;

      let nearest = 0;
      let nearestDist = Infinity;
      gateRefs.current.forEach((el, i) => {
        if (!el) return;
        const z = cam - i * m.gap;
        const o =
          z >= 0
            ? Math.max(0, 1 - z / (m.persp * 0.38))
            : Math.min(1, Math.max(0.2, 1 - (-z / (m.gap * N)) * 0.74));
        el.style.opacity = o.toFixed(3);
        const d = Math.abs(z);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = i;
        }
      });

      if (nearest !== activeRef.current) {
        activeRef.current = nearest;
        setActive(nearest);
      }
      if (!startedRef.current && p > 0.015) {
        startedRef.current = true;
        setStarted(true);
      }

      if (railRef.current) railRef.current.style.transform = `scaleY(${p.toFixed(4)})`;
      if (progRef.current) progRef.current.style.transform = `scaleX(${p.toFixed(4)})`;

      const now = performance.now();
      if (now - lastHud > 90) {
        lastHud = now;
        const depth = Math.round(clamp((cam - m.start) / m.gap + 1, 0, N) * STRATUM_DEPTH);
        if (depthRef.current) depthRef.current.textContent = `−${String(depth).padStart(4, '0')} m`;
        if (gateNumRef.current) gateNumRef.current.textContent = String(nearest + 1).padStart(2, '0');
        const inst = (Math.abs(cam - prevCam) / (dt / 16.7)) * 3.6;
        rate += (inst - rate) * (1 - Math.pow(0.7, dt / 16.7));
        if (rateRef.current) rateRef.current.textContent = `${Math.min(99.9, rate).toFixed(1)} m/s`;
        section.style.setProperty('--vel', Math.min(1, rate / 70).toFixed(2));
      }
      prevCam = cam;
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (inView && !raf) raf = requestAnimationFrame(tick);
    };

    // When frames are starved (background tab, occluded window, low-end
    // compositor), scroll still fires — drive one synchronous step so the
    // corridor never freezes behind the scrollbar.
    const onScroll = () => {
      if (!inView) return;
      if (performance.now() - lastTick < 200) return;
      if (raf) cancelAnimationFrame(raf);
      tick();
    };

    const onResize = () => {
      const wasFirst = first;
      first = true;
      measure();
      first = wasFirst;
      start();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      pointerRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    const onLeave = () => {
      pointerRef.current = { x: 0, y: 0 };
    };

    measure();
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
      },
      { rootMargin: '240px 0px' },
    );
    io.observe(section);
    section.addEventListener('pointermove', onMove, { passive: true });
    section.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    start();

    return () => {
      io.disconnect();
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [N, reduced]);

  const jump = (i: number) => {
    const safe = clamp(i, 0, N - 1);
    if (reduced) {
      gateRefs.current[safe]?.scrollIntoView({ behavior: 'auto', block: 'center' });
      return;
    }
    const m = metricsRef.current;
    const p = clamp((safe * m.gap - m.start) / (m.end - m.start), 0, 1);
    const top = m.top + p * m.total + 2;
    const from = window.scrollY;
    window.scrollTo({ top, behavior: 'smooth' });
    // Kiosks, remote sessions and starved compositors never animate smooth
    // scroll — land on the chosen stratum regardless.
    window.setTimeout(() => {
      if (Math.abs(window.scrollY - from) < 4 && Math.abs(window.scrollY - top) > 4) {
        window.scrollTo({ top, behavior: 'instant' });
      }
    }, 360);
  };

  return (
    <section
      id="descent"
      ref={sectionRef}
      className="dsc"
      data-active={active}
      data-started={started ? 'true' : 'false'}
      data-reduced={reduced ? 'true' : 'false'}
      style={cssVars({ '--tone': current.tone })}
      aria-label={locale === 'ne' ? 'एक्टोलग अवतरण — छ तह' : 'The ACTTOLOG descent — six strata'}
    >
      <div className="dsc-sticky">
        <div className="dsc-static-head">
          <div className="eyebrow">THE ACTTOLOG DESCENT</div>
          <h2 className="h2 mt-4">
            {locale === 'ne' ? 'सतह र मुटुबीच छ तह' : 'Six strata between the surface and the core'}
            <span className="sr-only">
              {locale === 'ne'
                ? ' — एक्टोलगका पाँच विभाग: अनुसन्धान, एकेडेमी, डार्करूम, मनोरञ्जन र खेल'
                : ' — the five ACTTOLOG divisions: research, academy, darkroom, entertainment and games'}
            </span>
          </h2>
          <p className="lead mt-3">
            {locale === 'ne'
              ? 'स्थिर दृश्य — प्रत्येक तह तल स्क्रोल गर्नुहोस्।'
              : 'A still view of the same journey — scroll through each stratum.'}
          </p>
        </div>

        <div className="dsc-atmos" aria-hidden="true">
          <div className="dsc-tones">
            {gates.map((g, i) => (
              <i key={g.id} data-on={i === active} style={cssVars({ '--tone': g.tone })} />
            ))}
          </div>
          <div className="dsc-grid" />
          <div className="dsc-dust">
            {DUST.map((d, i) => (
              <i
                key={i}
                style={cssVars({
                  left: `${d.left}%`,
                  width: `${d.size}px`,
                  height: `${d.size}px`,
                  opacity: d.alpha,
                  animationDuration: `${d.dur}s`,
                  animationDelay: `${d.delay}s`,
                })}
              />
            ))}
          </div>
          <div className="dsc-streaks">
            {STREAKS.map((s, i) => (
              <i
                key={i}
                style={cssVars({
                  left: `${s.left}%`,
                  height: `${s.len}vh`,
                  animationDuration: `${s.dur}s`,
                  animationDelay: `${s.delay}s`,
                })}
              />
            ))}
          </div>
          <div className="dsc-vig" />
        </div>

        <div className="dsc-top">
          <div className="dsc-brand">
            <span className="dsc-dot" />
            ACTTOLOG · DESCENT
          </div>
          <div className="dsc-route" aria-hidden="true">
            SURFACE
            <i />
            CORE
          </div>
          <div className="dsc-read" aria-hidden="true">
            <span className="dsc-depth" ref={depthRef}>
              −0240 m
            </span>
            <em>
              GATE <b ref={gateNumRef}>01</b>/{String(N).padStart(2, '0')}
            </em>
            <em className="dsc-rate" ref={rateRef}>
              0.0 m/s
            </em>
          </div>
          <a className="dsc-skip" href="#world">
            {locale === 'ne' ? 'अवतरण छोड्नुहोस्' : 'Skip'} <Icon name="down" size={12} />
          </a>
        </div>
        <div className="dsc-prog" aria-hidden="true">
          <i ref={progRef} />
        </div>

        <div className="dsc-stage" ref={stageRef}>
          <div className="dsc-world" ref={worldRef}>
            {gates.map((g, i) => (
              <article
                key={g.id}
                ref={(el) => {
                  gateRefs.current[i] = el;
                }}
                className="dsc-gate"
                data-on={i === active}
                data-core={g.core ? 'true' : 'false'}
                style={cssVars({ '--gz': `${-i * 560}px`, '--tone': g.tone })}
              >
                <div className="dsc-portal">
                  {g.image ? (
                    <>
                      <img
                        src={`${g.image}.jpg`}
                        srcSet={`${g.image}-800.webp 800w, ${g.image}.webp 1600w`}
                        sizes="(max-width: 760px) 92vw, 55vw"
                        alt={L(g.title)}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        draggable={false}
                        onLoad={(e) => {
                          e.currentTarget.closest('.dsc-gate')?.setAttribute('data-img', '1');
                        }}
                      />
                      <span className="dsc-plate-scrim" />
                      <span className="dsc-scan" />
                    </>
                  ) : (
                    <div className="dsc-aperture">
                      <i />
                      <i />
                      <i />
                      <b />
                      <span />
                    </div>
                  )}
                  <span className="dsc-corners" />
                  <span className="dsc-tag">
                    <i />
                    {g.core ? 'CORE' : `GATE ${String(i + 1).padStart(2, '0')}`}
                  </span>
                  <span className="dsc-tag dsc-tag-r">{`−${nf(g.depth)} m`}</span>
                  <span className="dsc-portal-shadow" />
                  <span className="dsc-sheen" />
                </div>
                <div className="dsc-gate-copy">
                  <ChapterBody gate={g} locale={locale} L={L} inline />
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="dsc-flash" key={active} aria-hidden="true" />

        <div className="dsc-copy">
          <div className="dsc-chapter" key={current.id}>
            <ChapterBody
              gate={current}
              locale={locale}
              L={L}
              onNext={active < N - 1 ? () => jump(active + 1) : undefined}
            />
          </div>
        </div>

        <div className="dsc-rail-wrap">
          <nav className="dsc-rail" aria-label={locale === 'ne' ? 'अवतरण अध्याय' : 'Descent chapters'}>
            <span className="dsc-rail-track">
              <i ref={railRef} />
            </span>
            {gates.map((g, i) => (
              <button
                key={g.id}
                type="button"
                data-on={i === active}
                style={cssVars({ '--tone': g.tone })}
                onClick={() => jump(i)}
                aria-label={`${locale === 'ne' ? 'जानुहोस्' : 'Go to'} ${L(g.title)}`}
                aria-current={i === active ? 'step' : undefined}
              >
                <span className="dsc-rail-lab">{L(g.title)}</span>
                <span className="dsc-rail-dot" />
              </button>
            ))}
          </nav>
        </div>

        <div className="dsc-edge dsc-edge-top" aria-hidden="true" />
        <div className="dsc-edge dsc-edge-bot" aria-hidden="true" />
      </div>
      <span className="dsc-sr" aria-live="polite">
        {locale === 'ne'
          ? `तह ${active + 1} / ${N}: ${L(current.title)}`
          : `Stratum ${active + 1} of ${N}: ${L(current.title)}`}
      </span>
    </section>
  );
}
