'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { DeckData } from '@/components/home/HomeDeck';

const copy = {
  en: { kicker: 'FEATURED GAMES', title: 'Play a little. Explore a lot.', body: 'Direct launches from the Nepal Series and the wider ACTTOLOG catalogue.', all: 'Open Games', catalogue: 'catalogue games', arcade: 'arcade games', public: 'public-playable' },
  ne: { kicker: 'विशेष खेल', title: 'खेल्नुहोस्। अन्वेषण गर्नुहोस्।', body: 'नेपाल सिरिज र व्यापक ACTTOLOG क्याटलगबाट सिधै खेल्नुहोस्।', all: 'सबै खेल', catalogue: 'क्याटलग खेल', arcade: 'आर्केड खेल', public: 'सार्वजनिक खेल' },
} as const;

export function FeaturedGames({
  quick,
  counts,
  locale,
}: {
  quick: DeckData['quick'];
  counts: { catalogue: number; arcade: number; publicPlayable: number };
  locale: 'en' | 'ne';
}) {
  const t = copy[locale];
  return (
    <section className="featured-games sec" aria-labelledby="featured-games-title">
      <div className="wrap">
        <div className="sechead">
          <div>
            <p className="kicker mono">{t.kicker}</p>
            <h2 id="featured-games-title" className="h2 mt-4">{t.title}</h2>
            <p className="lead mt-4">{t.body}</p>
          </div>
          <div className="fg-counts mono">
            <span><b>{counts.catalogue}</b> {t.catalogue}</span>
            <span><b>{counts.arcade}</b> {t.arcade}</span>
            <span><b>{counts.publicPlayable}</b> {t.public}</span>
          </div>
        </div>
        <div className="fg-grid">
          {quick.map((g) => (
            <Link key={g.url} href={g.url} className="fg-card">
              <img src={g.thumb} alt="" loading="lazy" />
              <span className="fg-scrim" />
              <span className="fg-copy"><b>{locale === 'ne' ? g.title.ne || g.title.en : g.title.en}</b><em>{g.tag}</em><span>{locale === 'ne' ? 'खेल्नुहोस्' : 'Play now'} <Icon name="play" size={13} /></span></span>
            </Link>
          ))}
        </div>
        <Link className="btn btn-g btn-sm mt-6" href="/games">{t.all} <Icon name="arrow" size={14} /></Link>
      </div>
    </section>
  );
}
