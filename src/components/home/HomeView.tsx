import fs from 'node:fs';
import path from 'node:path';
import { Hero } from '@/components/home/Hero';
import { Descent } from '@/components/home/Descent';
import { NepalPromo } from '@/components/home/NepalPromo';
import { FxScene } from '@/components/fx/Motion';
import { RadialMenu } from '@/components/fx/RadialMenu';
import {
  HomeSignal,
  HomeIndex,
  HomeStudio,
  HomeClose,
  type HomeData,
  type LatestItem,
} from '@/components/home/HomeSections';
import { getDB, pub, homeSection, divisions as getDivisions } from '@/lib/content';
import { nepalGuide } from '@/lib/content/nepal';
import { loksewaCounts } from '@/lib/content/loksewa';
import { HomeDeck, type DeckData } from '@/components/home/HomeDeck';
import type { Bi } from '@/lib/content/types';

/**
 * The homepage tree, shared by the English route (/) and the Nepali route (/ne)
 * so both URLs render identical markup and only metadata differs.
 */
export function HomeView({
  locale = 'en',
  altLang,
}: {
  locale?: 'en' | 'ne';
  altLang?: { href: string; label: string; lang: string };
}) {
  const db = getDB();
  const ng = nepalGuide();
  const dvs = getDivisions();
  const posts = pub(db.posts)
    .slice()
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const ents = pub(db.entertainment);
  const drs = pub(db.dr);
  const courses = pub(db.academy.courses);
  const games = pub(db.games);
  const offers = pub(db.offers);

  const mediaDir = path.join(process.cwd(), 'public', 'media');
  const shots = ['world', 'research', 'darkroom', 'academy', 'entertainment', 'games'].filter((id) =>
    fs.existsSync(path.join(mediaDir, `${id}.jpg`)),
  );

  const feed: LatestItem[] = [];
  posts
    .slice(0, 4)
    .forEach((p) =>
      feed.push({
        title: p.title as Bi,
        kind: 'Blog',
        date: p.publishedAt,
        route: `/blog/${p.slug}`,
        color: 'var(--vi)',
        icon: 'doc',
        mem: p.access === 'members',
      }),
    );
  ents
    .filter((e) => e.featured)
    .slice(0, 2)
    .forEach((e) =>
      feed.push({
        title: e.title as Bi,
        kind: 'Entertainment',
        date: e.date,
        route: `/entertainment/${e.slug}`,
        color: 'var(--mg)',
        icon: 'play',
        mem: e.access === 'members',
      }),
    );
  drs
    .filter((r) => r.featured)
    .slice(0, 2)
    .forEach((r) =>
      feed.push({
        title: { en: r.name, ne: r.name },
        kind: 'Darkroom',
        date: r.reviewDate,
        route: r.presentation === 'profile' ? `/darkroom/${r.slug}` : r.url,
        ext: r.presentation !== 'profile',
        color: 'var(--gold)',
        icon: 'search',
        mem: false,
      }),
    );
  games
    .slice(0, 2)
    .forEach((g) =>
      feed.push({
        title: g.title as Bi,
        kind: 'Games',
        date: g.release,
        route: `/games/${g.slug}`,
        color: 'var(--ok)',
        icon: 'game',
        mem: g.access === 'members',
      }),
    );
  feed.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const sections: HomeData['sections'] = {};
  for (const id of [
    'nepal',
    'intro',
    'eco',
    'divisions',
    'featured',
    'latest',
    'academy',
    'darkroom',
    'offers',
    'about',
    'cta',
  ]) {
    sections[id] = homeSection(id);
  }

  const data: HomeData = {
    shots,
    sections,
    settings: db.settings,
    divisions: dvs,
    counts: {
      research: pub(db.services).length,
      entertainment: ents.length,
      academy: courses.length,
      games: games.length,
      darkroom: drs.length,
      posts: posts.length,
      resources: drs.length,
    },
    featured: {
      post: posts.find((p) => p.featured) || posts[0],
      offer: offers.find((o) => o.featured) || offers[0],
      ent: ents.find((e) => e.featured),
      dr: drs.find((r) => r.featured),
    },
    latest: feed,
    courses,
    drCats: db.drCats.filter((c) => c.visible !== false),
    drFeatured: drs.filter((r) => r.featured).slice(0, 6),
    offers: offers.filter((o) => o.featured).slice(0, 3).length
      ? offers.filter((o) => o.featured).slice(0, 3)
      : offers.slice(0, 3),
  };

  const quickIds = [
    'snake-himalaya',
    'himalaya-breakout',
    'danphe-flight',
    'memory-nepal',
    'himalaya-stack',
    'ludo-himalaya',
  ];
  const quick = quickIds
    .map((id) => games.find((g) => g.slug === id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => ({ title: g.title as Bi, thumb: g.thumb, url: g.url, tag: g.category }));

  const cadence: { label: string; count: number }[] = [];
  const nowD = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowD.getFullYear(), nowD.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    cadence.push({
      label: d.toLocaleString('en-US', { month: 'short' }),
      count: posts.filter((p) => String(p.publishedAt).startsWith(key)).length,
    });
  }

  const lk = loksewaCounts();
  const deck: DeckData = {
    locale,
    divisions: dvs.map((d) => ({ name: d.name, route: d.route, color: d.color })),
    counts: data.counts,
    cadence,
    latest: feed.slice(0, 6),
    quick,
    offer: data.featured.offer
      ? {
          title: data.featured.offer.title,
          short: data.featured.offer.short,
          npr: data.featured.offer.npr,
          usd: data.featured.offer.usd,
          slug: data.featured.offer.slug,
        }
      : null,
    loksewa: { papers: lk.papers, subjects: lk.subjects, points: lk.points, questions: lk.questions },
    guide: { places: ng.places.length, regions: ng.regions.length },
  };

  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ticker: string[] = [
    `<b>LIVE</b> ACTTOLOG WORLD NETWORK`,
    ...dvs.map((d) => `${esc(d.name.en.toUpperCase())} <b>ONLINE</b>`),
    `NEPAL GUIDE <b>${ng.places.length}</b> PLACES · <b>${ng.regions.length}</b> REGIONS <b>LIVE</b>`,
    `BLOG ENTRIES <b>${posts.length}</b>`,
    ...posts.slice(0, 2).map((pp) => `NEW · ${esc(pp.title.en.toUpperCase())}`),
    ...drs
      .filter((r) => r.featured)
      .slice(0, 2)
      .map((r) => `FEATURED RESOURCE · ${esc(r.name.toUpperCase())}`),
  ];

  return (
    <>
      <Hero settings={db.settings} ticker={ticker} altLang={altLang} />
      <HomeDeck data={deck} />
      <Descent divisions={dvs} counts={data.counts} />
      <HomeSignal data={data} />
      <HomeIndex data={data} />
      <FxScene>
        <NepalPromo section={data.sections.nepal} locale={locale} />
      </FxScene>
      <HomeStudio data={data} />
      <HomeClose data={data} />
      <RadialMenu divisions={dvs} />
    </>
  );
}
