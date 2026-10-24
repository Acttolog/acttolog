'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Icon } from '@/components/ui/Icon';
import { prefersReducedMotion } from '@/components/three/tier';
import { useQuality } from '@/components/three/QualityProvider';
import { NepalShot } from './NepalShot';
import type { ShotSource } from '@/lib/nepal-media';
import type { NepalVideo } from '@/lib/content/nepal';

/**
 * VideoReel — tourism promo clips that cost nothing until they are seen.
 *
 * Design constraints that shaped this:
 *  · The static GitHub Pages build has a 470 MB memory ceiling and the site is
 *    WebGL-heavy, so clips are mounted only once the reel nears the viewport
 *    (IntersectionObserver), with preload="none" until then.
 *  · On the `low` tier the reel never auto-plays and shows a single tap-to-play
 *    clip at a time. Reduced motion disables autoplay entirely.
 *  · If a clip is missing or fails to decode, the card falls back to an
 *    animated still rather than an empty black box — a broken player is worse
 *    than no player.
 */

function useInView<T extends Element>(rootMargin = '300px') {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return { ref, seen };
}

function Clip({ v, posterMap, tier, reduced, primary }: {
  v: NepalVideo; posterMap: Record<string, ShotSource>; tier: string; reduced: boolean; primary: boolean;
}) {
  const { L, locale } = useI18n();
  const { ref, seen } = useInView<HTMLDivElement>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [broken, setBroken] = useState(false);
  const ne = locale === 'ne';
  const shot = posterMap[v.id] || null;
  const posterUrl = shot ? `/media/nepal/${shot.base}-${shot.has[shot.has.length - 1]}.jpg` : undefined;
  const autoplay = seen && !broken && !reduced && (tier === 'high' || tier === 'medium') && primary;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !autoplay) return;
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => setPlaying(false));
  }, [autoplay]);

  const start = () => {
    const el = videoRef.current;
    if (!el) return;
    el.preload = 'metadata';
    const p = el.play();
    if (p && typeof p.then === 'function') p.then(() => setPlaying(true)).catch(() => setBroken(true));
    else setPlaying(true);
  };

  return (
    <div ref={ref} className={`np-clip${primary ? ' np-clip-hero' : ''}`} data-broken={broken || undefined}>
      {seen && !broken && (
        <video
          ref={videoRef}
          className="np-clip-video"
          poster={posterUrl}
          src={v.src}
          muted
          loop={primary}
          playsInline
          preload="none"
          aria-label={`${L(v.title)} — ${L(v.desc)}`}
          onError={() => setBroken(true)}
        />
      )}
      {(!seen || broken || !playing) && !reduced && (
        <NepalShot shot={shot} alt="" art="himalaya" variant="wide" className="np-clip-still" />
      )}
      {(!seen || broken) && reduced && (
        <NepalShot shot={shot} alt="" art="himalaya" variant="wide" className="np-clip-still np-clip-still-static" />
      )}

      <div className="np-clip-scrim" />
      <div className="np-clip-top">
        <span className="tag np-clip-mood">{v.mood.toUpperCase()}</span>
        {broken && <span className="mono np-clip-flag">{ne ? 'क्लिप अनुपलब्ध' : 'CLIP UNAVAILABLE'}</span>}
      </div>
      <div className="np-clip-body">
        <h3 className="np-clip-title">{L(v.title)}</h3>
        <p className="np-clip-desc">{L(v.desc)}</p>
        {broken ? (
          <p className="mono np-clip-alt">{ne ? 'स्थिर चित्रबाट जारी' : 'SHOWN AS STILL'}</p>
        ) : (
          <button className="btn btn-sm np-clip-play" onClick={start} aria-label={`Play ${v.title.en}`}>
            <Icon name="play" size={12} />{ne ? 'चलाउनुहोस्' : 'PLAY'}
          </button>
        )}
      </div>
      {v.credit && <p className="mono np-clip-credit">{v.credit}</p>}

      <style>{`
        .np-clip { position: relative; overflow: hidden; border-radius: 16px; border: 1px solid var(--line);
          background: var(--bg); aspect-ratio: 16 / 10; }
        .np-clip-hero { aspect-ratio: 21 / 9; }
        .np-clip-video, .np-clip-still { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .np-clip-still { animation: npken 22s ease-in-out infinite alternate; }
        .np-clip-still-static { animation: none; }
        @keyframes npken { from { transform: scale(1) translate3d(0,0,0) } to { transform: scale(1.13) translate3d(-1.5%,1%,0) } }
        .np-clip-scrim { position: absolute; inset: 0;
          background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 34%, transparent) 0%, transparent 34%,
            color-mix(in srgb, var(--bg) 88%, transparent) 78%, var(--bg) 100%); }
        .np-clip-top { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; gap: 8px; justify-content: space-between; }
        .np-clip-mood { font-size: 8.8px; letter-spacing: .18em; background: color-mix(in srgb, var(--bg) 70%, transparent); }
        .np-clip-flag { font-size: 8.8px; letter-spacing: .14em; color: var(--gold); }
        .np-clip-body { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px; display: flex;
          flex-direction: column; gap: 7px; align-items: flex-start; }
        .np-clip-title { font: 600 clamp(1rem, 1.5vw, 1.24rem)/1.2 var(--font-display); color: var(--txt); margin: 0; letter-spacing: -.015em; }
        .np-clip-desc { font-size: 12.4px; line-height: 1.55; color: var(--mut); margin: 0; max-width: 52ch; }
        .np-clip-play { margin-top: 4px; }
        .np-clip-alt { font-size: 9px; letter-spacing: .14em; color: var(--dim); margin: 4px 0 0; }
        .np-clip-credit { position: absolute; right: 10px; bottom: 8px; font-size: 8px; letter-spacing: .1em;
          color: var(--dim); margin: 0; }
        @media (prefers-reduced-motion: reduce) { .np-clip-still { animation: none; } }
      `}</style>
    </div>
  );
}

export function VideoReel({ videos, posters }: { videos: NepalVideo[]; posters: Record<string, ShotSource> }) {
  const { locale } = useI18n();
  const { tier } = useQuality();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const laid = useMemo(() => videos, [videos]);

  return (
    <div>
      <div className="np-reel-head">
        <p className="mono np-reel-meta">
          {(locale === 'ne' ? 'गुणस्तर · ' : 'QUALITY · ') + tier.toUpperCase()}
          {reduced ? (locale === 'ne' ? ' · चाल हटाइएको' : ' · MOTION REDUCED') : ''}
          {(locale === 'ne' ? ' · डेस्कमै उपलब्ध' : ' · LOADED ON DEMAND')}
        </p>
      </div>
      <div className="np-reel">
        {laid.map((v, i) => (
          <Clip key={v.id} v={v} posterMap={posters} tier={tier} reduced={reduced} primary={i === 0} />
        ))}
      </div>
      <style>{`
        .np-reel { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        .np-reel .np-clip:first-child { grid-column: 1 / -1; }
        .np-reel-head { display: flex; justify-content: flex-end; margin-bottom: 14px; }
        .np-reel-meta { font-size: 9.5px; letter-spacing: .16em; color: var(--dim); margin: 0; }
        @media (max-width: 680px) { .np-reel { grid-template-columns: 1fr; } .np-reel .np-clip:first-child { grid-column: auto; } }
      `}</style>
    </div>
  );
}
