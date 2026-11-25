'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { MediaCover } from '@/components/ui/MediaCover';
import type { Division } from '@/lib/content/types';

const labels = {
  en: {
    kicker: 'WORLD PORTALS', title: 'Five divisions. One connected world.', body: 'Choose a doorway. Each world has its own tools, content and way of moving through ACTTOLOG.',
    more: 'MORE DESTINATIONS', back: 'Return to atrium', open: 'Enter world', catalogue: 'catalogue records',
    nepal: 'Nepal Explorer', world: 'World Explorer', loksewa: 'Loksewa Ghar', blog: 'Blog', offers: 'Offers', ai: 'ACTTOLOG AI',
  },
  ne: {
    kicker: 'संसार पोर्टल', title: 'पाँच विभाग। एउटै जोडिएको संसार।', body: 'एउटा ढोका छान्नुहोस्। हरेक संसारसँग आफ्नै औजार, सामग्री र ACTTOLOG भित्र यात्रा गर्ने तरिका छ।',
    more: 'अरु गन्तव्य', back: 'एट्रियममा फर्कनुहोस्', open: 'संसारमा प्रवेश', catalogue: 'क्याटलग अभिलेख',
    nepal: 'नेपाल अन्वेषण', world: 'वर्ल्ड अन्वेषण', loksewa: 'लोकसेवा घर', blog: 'ब्लग', offers: 'अफर', ai: 'ACTTOLOG AI',
  },
} as const;

export function DivisionPortals({
  divisions,
  counts,
  locale,
  shots,
}: {
  divisions: Division[];
  counts: Record<string, number>;
  locale: 'en' | 'ne';
  shots: string[];
}) {
  const t = labels[locale];
  const countFor = (id: string) => counts[id] ?? 0;
  const more = [
    { label: t.nepal, href: '/nepal', icon: 'globe' },
    { label: t.world, href: '/explore', icon: 'compass' },
    { label: t.loksewa, href: '/loksewa', icon: 'shield' },
    { label: t.blog, href: '/blog', icon: 'doc' },
    { label: t.offers, href: '/offers', icon: 'star' },
    { label: t.ai, href: '/ai', icon: 'brain' },
  ] as const;
  return (
    <section id="portals" className="portals sec">
      <div className="wrap">
        <div className="sechead">
          <div>
            <p className="kicker mono">{t.kicker}</p>
            <h2 className="h2 mt-4 max-w-[20ch]">{t.title}</h2>
            <p className="lead mt-4 max-w-[62ch]">{t.body}</p>
          </div>
          <Link className="btn btn-g btn-sm" href="#atrium"><Icon name="arrow" size={14} />{t.back}</Link>
        </div>
        <div className="portal-grid">
          {divisions.map((d, i) => (
            <Link
              key={d.id}
              href={d.route}
              className="world-portal"
              style={{ '--c': d.color, '--i': i } as CSSProperties}
            >
              <span className="world-portal-media"><MediaCover id={d.id} art={d.art || 'nebula'} shots={shots} alt="" /></span>
              <span className="world-portal-scrim" />
              <span className="world-portal-num mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="world-portal-copy">
                <b>{locale === 'ne' ? d.name.ne || d.name.en : d.name.en}</b>
                <em>{locale === 'ne' ? d.sub.ne || d.sub.en : d.sub.en}</em>
                <span className="world-portal-count mono">{countFor(d.id)} {t.catalogue}</span>
                <span className="world-portal-cta">{t.open} <Icon name="arrow" size={15} /></span>
              </span>
            </Link>
          ))}
        </div>
        <div className="portal-more">
          <p className="kicker mono">{t.more}</p>
          <div>{more.map((m) => <Link key={m.label} href={m.href}><Icon name={m.icon} size={16} /><span>{m.label}</span></Link>)}</div>
        </div>
      </div>
    </section>
  );
}
