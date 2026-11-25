'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LiveWire } from '@/components/home/deck/LiveWire';
import type { DeckData } from '@/components/home/HomeDeck';
import type { HomeData } from '@/components/home/HomeSections';
import { usePrefs } from '@/lib/prefs';
import type { Bi } from '@/lib/content/types';

const copy = {
  en: {
    world: 'WORLD', overview: 'Overview', explore: 'Explore', research: 'Research', academy: 'Academy',
    entertainment: 'Entertainment', games: 'Games', darkroom: 'Darkroom', nepal: 'Nepal', tools: 'Tools',
    updates: 'Latest updates', settings: 'Settings', search: 'Search the world', theme: 'Theme',
    welcome: 'WELCOME TO THE ACTTOLOG DIGITAL WORLD', intro: 'One connected ecosystem for learning, research, play and discovery.',
    catalogue: 'CATALOGUE OVERVIEW', divisions: 'Divisions', services: 'Services', courses: 'Courses',
    resources: 'Resources', posts: 'Articles', screenings: 'Screenings', distribution: 'CONTENT DISTRIBUTION',
    publishing: 'PUBLISHING · LAST 6 MONTHS', signals: 'LATEST SIGNALS', featured: 'FEATURED DISCOVERY',
    quick: 'QUICK ACTIONS', earth: 'Explore Earth', browseResearch: 'Browse Research', openAcademy: 'Open Academy',
    playGames: 'Play Games', searchResources: 'Search Resources', exploreNepal: 'Explore Nepal', openAI: 'Open ACTTOLOG AI',
    read: 'Read the story', open: 'Open destination', source: 'SOURCE LEDGER', notices: 'NOTICE BOARD',
    inventory: 'Catalogue records, not visitor counts.', noFeature: 'Explore the latest published work across ACTTOLOG.',
  },
  ne: {
    world: 'संसार', overview: 'सारांश', explore: 'अन्वेषण', research: 'अनुसन्धान', academy: 'एकेडेमी',
    entertainment: 'मनोरञ्जन', games: 'खेलहरू', darkroom: 'डार्करूम', nepal: 'नेपाल', tools: 'औजार',
    updates: 'नयाँ अपडेट', settings: 'सेटिङ', search: 'संसार खोज्नुहोस्', theme: 'थिम',
    welcome: 'ACTTOLOG डिजिटल संसारमा स्वागत छ', intro: 'सिकाइ, अनुसन्धान, खेल र खोजका लागि एउटै जोडिएको इकोसिस्टम।',
    catalogue: 'क्याटलग सारांश', divisions: 'विभाग', services: 'सेवा', courses: 'पाठ्यक्रम',
    resources: 'स्रोत', posts: 'लेख', screenings: 'प्रदर्शनी', distribution: 'सामग्री वितरण',
    publishing: 'प्रकाशन · गत ६ महिना', signals: 'ताजा संकेत', featured: 'विशेष खोज',
    quick: 'द्रुत कार्य', earth: 'पृथ्वी अन्वेषण', browseResearch: 'अनुसन्धान हेर्नुहोस्', openAcademy: 'एकेडेमी खोल्नुहोस्',
    playGames: 'खेल खेल्नुहोस्', searchResources: 'स्रोत खोज्नुहोस्', exploreNepal: 'नेपाल अन्वेषण', openAI: 'ACTTOLOG AI खोल्नुहोस्',
    read: 'कथा पढ्नुहोस्', open: 'गन्तव्य खोल्नुहोस्', source: 'स्रोत खाता', notices: 'सूचना बोर्ड',
    inventory: 'क्याटलग अभिलेख, आगन्तुकको संख्या होइन।', noFeature: 'ACTTOLOG भरि नयाँ प्रकाशित कार्य हेर्नुहोस्।',
  },
} as const;

const bi = (v: Bi | undefined, locale: 'en' | 'ne') => v ? (locale === 'ne' ? v.ne || v.en : v.en) : '';

function Distribution({ values, locale }: { values: { label: string; value: number; color: string }[]; locale: 'en' | 'ne' }) {
  const total = values.reduce((sum, v) => sum + v.value, 0);
  let at = 0;
  const stops = values.map((v) => {
    const start = at;
    at += total ? (v.value / total) * 100 : 0;
    return `${v.color} ${start}% ${at}%`;
  });
  return (
    <div className="atr-chart atr-distribution">
      <div className="atr-donut" style={{ background: total ? `conic-gradient(${stops.join(',')})` : 'var(--line)' }} role="img" aria-label={copy[locale].distribution}>
        <div><b>{total}</b><span>{copy[locale].resources}</span></div>
      </div>
      <ul>
        {values.map((v) => (
          <li key={v.label}><i style={{ background: v.color }} /><span>{v.label}</span><b>{v.value}</b></li>
        ))}
      </ul>
    </div>
  );
}

function Publishing({ cadence, locale }: { cadence: DeckData['cadence']; locale: 'en' | 'ne' }) {
  const max = Math.max(1, ...cadence.map((c) => c.count));
  const points = cadence.map((c, i) => `${40 + i * (520 / Math.max(1, cadence.length - 1))},${150 - (c.count / max) * 112}`).join(' ');
  return (
    <div className="atr-chart atr-publishing">
      <svg viewBox="0 0 600 190" role="img" aria-label={copy[locale].publishing}>
        {[0, 1, 2, 3].map((i) => <line key={i} x1="40" x2="560" y1={38 + i * 37} y2={38 + i * 37} className="atr-gridline" />)}
        <polyline points={points} className="atr-line" />
        {cadence.map((c, i) => {
          const x = 40 + i * (520 / Math.max(1, cadence.length - 1));
          const y = 150 - (c.count / max) * 112;
          return <circle key={c.label} cx={x} cy={y} r="4" className="atr-point" />;
        })}
        {cadence.map((c, i) => {
          const x = 40 + i * (520 / Math.max(1, cadence.length - 1));
          return <text key={c.label} x={x} y="178" textAnchor="middle">{c.label}</text>;
        })}
      </svg>
      <div className="atr-timeline-total"><b>{cadence.reduce((s, c) => s + c.count, 0)}</b><span>{copy[locale].posts}</span></div>
    </div>
  );
}

export function AtriumDashboard({ data, deck }: { data: HomeData; deck: DeckData }) {
  const { toggleTheme } = usePrefs();
  const locale = deck.locale;
  const t = copy[locale];
  const feature = data.featured.dr;
  const metrics = [
    { label: t.divisions, value: data.divisions.length, route: '#portals', color: 'var(--cy)' },
    { label: t.services, value: data.counts.research, route: '/research', color: 'var(--vi)' },
    { label: t.games, value: data.counts.games, route: '/games', color: 'var(--ok)' },
    { label: t.courses, value: data.counts.academy, route: '/academy', color: 'var(--cy)' },
    { label: t.resources, value: data.counts.darkroom, route: '/darkroom', color: 'var(--gold)' },
    { label: t.posts, value: data.counts.posts, route: '/blog', color: 'var(--mg)' },
  ];
  const distribution = [
    { label: t.research, value: data.counts.research, color: '#7c5cff' },
    { label: t.academy, value: data.counts.academy, color: '#35e0ff' },
    { label: t.games, value: data.counts.games, color: '#3ddc97' },
    { label: t.darkroom, value: data.counts.darkroom, color: '#f5c26b' },
    { label: t.entertainment, value: data.counts.entertainment, color: '#ff4ecd' },
  ];
  const quick = [
    { label: t.earth, href: '/explore?mode=earth', icon: 'globe' },
    { label: t.browseResearch, href: '/research', icon: 'compass' },
    { label: t.openAcademy, href: '/academy', icon: 'book' },
    { label: t.playGames, href: '/games', icon: 'game' },
    { label: t.searchResources, href: '/darkroom', icon: 'search' },
    { label: t.exploreNepal, href: '/nepal', icon: 'globe' },
    { label: t.openAI, href: '/ai', icon: 'brain' },
  ] as const;
  const nav = [
    { label: t.overview, href: '#atrium', icon: 'home' },
    { label: t.explore, href: '/explore', icon: 'compass' },
    { label: t.research, href: '/research', icon: 'doc' },
    { label: t.academy, href: '/academy', icon: 'book' },
    { label: t.entertainment, href: '/entertainment', icon: 'play' },
    { label: t.games, href: '/games', icon: 'game' },
    { label: t.darkroom, href: '/darkroom', icon: 'search' },
    { label: t.nepal, href: '/nepal', icon: 'globe' },
    { label: t.tools, href: '/design-lab#instruments', icon: 'gear' },
    { label: t.updates, href: '#signals', icon: 'bell' },
  ] as const;

  return (
    <section id="atrium" className="atr" aria-label={t.welcome}>
      <div className="atr-shell">
        <aside className="atr-side">
          <Link href="/" className="atr-brand"><Icon name="layers" size={18} /> ACTTOLOG</Link>
          <nav aria-label={t.world}>
            {nav.map((n) => <Link key={n.label} href={n.href}><Icon name={n.icon} size={17} /><span>{n.label}</span></Link>)}
          </nav>
          <Link href="/design-lab#appearance" className="atr-settings"><Icon name="gear" size={17} /><span>{t.settings}</span></Link>
        </aside>

        <div className="atr-main">
          <header className="atr-top">
            <div><span className="atr-status-dot" /> ACTTOLOG WORLD</div>
            <div className="atr-top-actions">
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('acttolog:search-open'))}><Icon name="search" size={16} /><span>{t.search}</span></button>
              <button type="button" onClick={toggleTheme} aria-label={t.theme}><Icon name="spark" size={16} /></button>
              <Link href={locale === 'en' ? '/ne' : '/'}>{locale === 'en' ? 'ने' : 'EN'}</Link>
            </div>
          </header>

          <div className="atr-content">
            <section className="atr-welcome">
              <div>
                <p className="atr-kicker">{t.welcome}</p>
                <h2>{locale === 'ne' ? 'एउटै संसार। अनन्त सम्भावना।' : 'One world. Endless possibilities.'}</h2>
                <p>{t.intro}</p>
              </div>
              <div className="atr-welcome-mark" aria-hidden="true"><Icon name="globe" size={54} /></div>
            </section>

            <section className="atr-metrics" aria-label={t.catalogue}>
              <div className="atr-section-head"><h3>{t.catalogue}</h3><span>{t.inventory}</span></div>
              <div className="atr-metric-grid">
                {metrics.map((m) => (
                  <Link key={m.label} href={m.route} className="atr-metric" style={{ '--ac': m.color } as CSSProperties}>
                    <span>{m.label}</span><b>{m.value.toLocaleString('en-US')}</b><Icon name="arrow" size={15} />
                  </Link>
                ))}
              </div>
            </section>

            <div className="atr-charts">
              <section className="atr-panel"><div className="atr-section-head"><h3>{t.distribution}</h3></div><Distribution values={distribution} locale={locale} /></section>
              <section className="atr-panel"><div className="atr-section-head"><h3>{t.publishing}</h3></div><Publishing cadence={deck.cadence} locale={locale} /></section>
            </div>

            <div className="atr-lower">
              <section className="atr-panel atr-signals" id="signals">
                <div className="atr-section-head"><h3>{t.signals}</h3><Link href="/blog">{t.open} <Icon name="arrow" size={13} /></Link></div>
                <LiveWire locale={locale} events={deck.wire.slice(0, 4)} compiledAt={deck.sources.meta.compiledAt} />
              </section>
              <section className="atr-panel atr-featured">
                <div className="atr-section-head"><h3>{t.featured}</h3></div>
                {feature ? (
                  <Link href={feature.presentation === 'profile' ? `/darkroom/${feature.slug}` : feature.url} className="atr-feature-card">
                    <img src="/media/darkroom.jpg" alt="" loading="lazy" />
                    <div><span>DARKROOM</span><h4>{feature.name}</h4><p>{bi(feature.short, locale)}</p><p>{t.open} <Icon name="arrow" size={13} /></p></div>
                  </Link>
                ) : <p className="atr-empty">{t.noFeature}</p>}
              </section>
            </div>

            <section className="atr-quick">
              <div className="atr-section-head"><h3>{t.quick}</h3></div>
              <div>{quick.map((q) => <Link key={q.label} href={q.href}><Icon name={q.icon} size={18} /><span>{q.label}</span></Link>)}</div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
