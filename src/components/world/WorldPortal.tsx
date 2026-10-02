'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { useSyncExternalStore } from 'react';

const RM_QUERY = '(prefers-reduced-motion: reduce)';
const subRM = (cb: () => void) => {
  const mq = window.matchMedia(RM_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const getRM = () => window.matchMedia(RM_QUERY).matches;

/**
 * WorldPortal (spec §13/WOW6) — the reusable cinematic doorway from a
 * section page into its ACTTOLOG 360 environment. Pure CSS/SVG motion
 * (cheap, reliable, reduced-motion aware) — the heavy WebGL lives behind
 * the portal in /explore, loaded on demand.
 */
export function WorldPortal({ world, title, titleNe, subtitle, accent = 'var(--cy)', earthLink }: {
  world: string;
  title: string;
  titleNe?: string;
  subtitle: string;
  accent?: string;
  earthLink?: string;
}) {
  const { locale } = useI18n();
  const reduced = useSyncExternalStore(subRM, getRM, () => false);
  const ne = locale === 'ne';
  const uid = `wp-${world}`;

  return (
    <section className="sec" aria-label={`${title} world portal`}>
      <div className="wrap">
        <div className="panel relative overflow-hidden p-7 sm:p-10">
          {/* portal visual */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="relative flex-none" style={{ width: 220, height: 220 }}>
              <svg viewBox="0 0 220 220" width="220" height="220" role="img" aria-label={`${title} portal`}>
                <defs>
                  <radialGradient id={`${uid}-g`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={accent} stopOpacity=".38" />
                    <stop offset="55%" stopColor={accent} stopOpacity=".10" />
                    <stop offset="100%" stopColor={accent} stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="110" cy="110" r="104" fill={`url(#${uid}-g)`} />
                <g className={reduced ? undefined : 'wp-spin'} style={{ transformOrigin: '110px 110px' }}>
                  <ellipse cx="110" cy="110" rx="96" ry="38" fill="none" stroke={accent} strokeOpacity=".55" strokeWidth="1.2" />
                  <ellipse cx="110" cy="110" rx="96" ry="38" fill="none" stroke={accent} strokeOpacity=".3" strokeWidth="1" transform="rotate(60 110 110)" />
                  <ellipse cx="110" cy="110" rx="96" ry="38" fill="none" stroke={accent} strokeOpacity=".3" strokeWidth="1" transform="rotate(120 110 110)" />
                </g>
                <circle cx="110" cy="110" r="64" fill="none" stroke={accent} strokeOpacity=".75" strokeWidth="1.4"
                  className={reduced ? undefined : 'wp-pulse'} style={{ transformOrigin: '110px 110px' }} />
                <circle cx="110" cy="110" r="46" fill="none" stroke="var(--vi)" strokeOpacity=".5" strokeWidth="1" strokeDasharray="4 7"
                  className={reduced ? undefined : 'wp-spin-r'} style={{ transformOrigin: '110px 110px' }} />
                <circle cx="110" cy="110" r="26" fill={accent} fillOpacity=".14" stroke={accent} strokeOpacity=".9" strokeWidth="1.4" />
                <text x="110" y="115" textAnchor="middle" className="mono" fontSize="10" letterSpacing="2" fill="var(--txt)">360°</text>
                {/* orbiting node */}
                <g className={reduced ? undefined : 'wp-orbit'} style={{ transformOrigin: '110px 110px' }}>
                  <circle cx="110" cy="14" r="3.4" fill={accent} />
                </g>
              </svg>
            </div>

            <div className="text-center md:text-left">
              <div className="eyebrow mb-2">{ne ? 'संसार पोर्टल' : 'WORLD PORTAL'} · 360°</div>
              <h2 className="font-display font-bold text-[clamp(1.35rem,3.2vw,1.9rem)] tracking-[-.02em] leading-tight">
                {ne && titleNe ? titleNe : title}
              </h2>
              <p className="mut text-[13.4px] leading-relaxed mt-3 max-w-[480px]">{subtitle}</p>
              <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
                <Link className="btn btn-p" href={`/explore?mode=360&world=${world}`}
                  onClick={() => track('360_open', { world, via: 'portal' })}>
                  <Icon name="rocket" size={16} />{ne ? 'पोर्टल प्रवेश' : 'ENTER THE PORTAL'}
                </Link>
                {earthLink && (
                  <Link className="btn btn-g" href={earthLink} onClick={() => track('earth_open', { via: 'portal', world })}>
                    <Icon name="globe" size={16} />{ne ? 'पृथ्वीमा हेर्नुहोस्' : 'VIEW ON EARTH'}
                  </Link>
                )}
              </div>
              <p className="dim text-[11px] mt-4">
                {ne ? 'एक्टोलग आफ्नै ३६० संसार — हटस्पटहरूबाट अर्को तहमा जानुहोस्।' : 'An ACTTOLOG-owned 360 environment — click hotspots inside to travel deeper.'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes wpSpin { to { transform: rotate(360deg); } }
        @keyframes wpPulse { 0%,100% { transform: scale(1); opacity: .9 } 50% { transform: scale(1.06); opacity: .55 } }
        .wp-spin { animation: wpSpin 26s linear infinite; }
        .wp-spin-r { animation: wpSpin 40s linear infinite reverse; }
        .wp-orbit { animation: wpSpin 7s linear infinite; }
        .wp-pulse { animation: wpPulse 4.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .wp-spin, .wp-spin-r, .wp-orbit, .wp-pulse { animation: none; } }
      `}</style>
    </section>
  );
}
