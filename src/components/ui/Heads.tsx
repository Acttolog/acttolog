import { Reveal } from './Reveal';
import { Icon } from './Icon';
import { SpatialFrame } from '@/components/spatial/SpatialFrame';
import { SpatialTrigger } from '@/components/spatial/SpatialTrigger';
import { resolveImage } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * art id → generated 3D-render photo committed in /media.
 * Static map (no fs): Heads is shared with client components, and the media
 * files ship with every deployment; unknown ids fall back to procedural SVG.
 */
const MEDIA_ART: Record<string, string> = {
  research: 'research',
  academy: 'academy',
  darkroom: 'darkroom',
  stage: 'entertainment',
  games: 'games',
  editorial: 'blog',
  offers: 'offers',
  nebula: 'world',
};
function mediaArt(art?: string): string | null {
  if (!art) return null;
  const id = MEDIA_ART[art];
  return id ? `/media/${id}.jpg` : null;
}

/** Division/page hero header (prototype `head()`): art backdrop + kicker + title + lead. */
export function PageHead({
  kicker,
  title,
  body,
  art,
  extra,
}: {
  kicker: string;
  title: string;
  body?: string;
  art?: string;
  extra?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pt-[calc(var(--nav)+50px)] pb-12">
      <div className="absolute inset-0 -z-10 opacity-40">
        <SpatialFrame className="h-full w-full" intensity={4.5} clean>
          {}
          <img
            src={mediaArt(art) || resolveImage(art ? `art:${art}` : '')}
            alt=""
            className="h-full w-full object-cover"
            style={{
              maskImage: 'linear-gradient(180deg,#000,transparent 86%)',
              WebkitMaskImage: 'linear-gradient(180deg,#000,transparent 86%)',
            }}
          />
        </SpatialFrame>
      </div>
      <div className="wrap">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Reveal>
            <div className="eyebrow">{kicker}</div>
          </Reveal>
          <SpatialTrigger className="sp-head-trigger" label="Open spatial view">
            <Icon name="layers" size={14} />
            SPATIAL VIEW
          </SpatialTrigger>
        </div>
        <Reveal delay={60}>
          <h1 className="h1 mt-5 max-w-[22ch]">{title}</h1>
        </Reveal>
        {body && (
          <Reveal delay={120}>
            <p className="lead mt-6">{body}</p>
          </Reveal>
        )}
        {extra}
      </div>
    </section>
  );
}

/** Section heading row (prototype `sh()`): number · kicker + title + lead + optional action. */
export function SectionHead({
  num,
  kicker,
  title,
  body,
  srLabel,
  extra,
}: {
  num: string;
  kicker: string;
  title: string;
  body?: string;
  srLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <Reveal>
      <div className="sechead">
        <div>
          <div className="secnum mb-3">
            {num} · {kicker}
          </div>
          <h2 className="h2 max-w-[26ch]">
            {title}
            {srLabel && <span className="sr-only">{` — ${srLabel}`}</span>}
          </h2>
          {body && <p className="lead mt-4">{body}</p>}
        </div>
        {extra}
      </div>
    </Reveal>
  );
}
