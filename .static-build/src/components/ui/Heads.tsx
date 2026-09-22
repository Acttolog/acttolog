import { Reveal } from './Reveal';
import { resolveImage } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Division/page hero header (prototype `head()`): art backdrop + kicker + title + lead. */
export function PageHead({ kicker, title, body, art, extra }: {
  kicker: string; title: string; body?: string; art?: string; extra?: ReactNode;
}) {
  return (
    <section className="relative pt-[calc(var(--nav)+50px)] pb-12 overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolveImage(art ? `art:${art}` : '')} alt="" className="w-full h-full object-cover"
          style={{ maskImage: 'linear-gradient(180deg,#000,transparent 86%)', WebkitMaskImage: 'linear-gradient(180deg,#000,transparent 86%)' }} />
      </div>
      <div className="wrap">
        <Reveal><div className="eyebrow">{kicker}</div></Reveal>
        <Reveal delay={60}><h1 className="h1 mt-5 max-w-[22ch]">{title}</h1></Reveal>
        {body && <Reveal delay={120}><p className="lead mt-6">{body}</p></Reveal>}
        {extra}
      </div>
    </section>
  );
}

/** Section heading row (prototype `sh()`): number · kicker + title + lead + optional action. */
export function SectionHead({ num, kicker, title, body, extra }: {
  num: string; kicker: string; title: string; body?: string; extra?: ReactNode;
}) {
  return (
    <Reveal>
      <div className="sechead">
        <div>
          <div className="secnum mb-3">{num} · {kicker}</div>
          <h2 className="h2 max-w-[26ch]">{title}</h2>
          {body && <p className="lead mt-4">{body}</p>}
        </div>
        {extra}
      </div>
    </Reveal>
  );
}
