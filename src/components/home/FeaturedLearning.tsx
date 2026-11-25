'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { HomeData } from '@/components/home/HomeSections';

const copy = {
  en: { kicker: 'FEATURED LEARNING', title: 'Learn, verify, acquire.', body: 'Three practical surfaces, each connected to the wider ACTTOLOG world.', academy: 'Academy', darkroom: 'Darkroom', offers: 'Offers', enter: 'Enter', items: 'Selected records' },
  ne: { kicker: 'विशेष सिकाइ', title: 'सिक्नुहोस्, प्रमाणित गर्नुहोस्, प्राप्त गर्नुहोस्।', body: 'तीनवटा उपयोगी कार्यक्षेत्र, प्रत्येक व्यापक ACTTOLOG संसारसँग जोडिएको।', academy: 'एकेडेमी', darkroom: 'डार्करूम', offers: 'अफर', enter: 'प्रवेश', items: 'छानिएका अभिलेख' },
} as const;

export function FeaturedLearning({ data, locale }: { data: HomeData; locale: 'en' | 'ne' }) {
  const t = copy[locale];
  const offer = data.featured.offer;
  const cards = [
    { label: t.academy, href: '/academy', icon: 'book', color: 'var(--vi)', items: data.courses.slice(0, 2).map((c) => ({ label: locale === 'ne' ? c.title.ne || c.title.en : c.title.en, href: `/academy/${c.slug}` })) },
    { label: t.darkroom, href: '/darkroom', icon: 'search', color: 'var(--gold)', items: data.drFeatured.slice(0, 2).map((r) => ({ label: r.name, href: r.presentation === 'profile' ? `/darkroom/${r.slug}` : r.url })) },
    { label: t.offers, href: '/offers', icon: 'star', color: 'var(--cy)', items: offer ? [{ label: locale === 'ne' ? offer.title.ne || offer.title.en : offer.title.en, href: `/offers/${offer.slug}` }] : [] },
  ];
  return (
    <section className="featured-learning sec" aria-labelledby="featured-learning-title">
      <div className="wrap">
        <div className="sechead">
          <div><p className="kicker mono">{t.kicker}</p><h2 id="featured-learning-title" className="h2 mt-4">{t.title}</h2><p className="lead mt-4">{t.body}</p></div>
        </div>
        <div className="fl-grid">
          {cards.map((c) => (
            <article key={c.label} className="fl-card" style={{ borderColor: `color-mix(in srgb, ${c.color} 30%, var(--line))` }}>
              <header><Icon name={c.icon} size={18} /><h3>{c.label}</h3><Link href={c.href} aria-label={`${t.enter} ${c.label}`}><Icon name="arrow" size={15} /></Link></header>
              <ul>{c.items.map((it) => <li key={it.href}><Link href={it.href}>{it.label}<Icon name="arrow" size={12} /></Link></li>)}</ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
