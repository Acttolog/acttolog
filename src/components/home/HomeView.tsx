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
} from '@/components/home/HomeSections';
import { getDB, pub, homeSection, divisions as getDivisions } from '@/lib/content';
import { nepalGuide } from '@/lib/content/nepal';
import { loksewaCounts } from '@/lib/content/loksewa';
import { allNotices, noticeFeatured, noticeCategoriesOf, noticeMeta } from '@/lib/content/notices';
import { allSources, sourceMeta, reachByHost, wireEvents, type WireRelease } from '@/lib/content/sources';
import { urlHost } from '@/lib/content/source-utils';
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

  const releases: WireRelease[] = [];
  posts
    .slice(0, 4)
    .forEach((p) =>
      releases.push({
        title: p.title as Bi,
        kind: 'blog',
        date: p.publishedAt,
        route: `/blog/${p.slug}`,
        color: 'var(--vi)',
        icon: 'doc',
      }),
    );
  ents
    .filter((e) => e.featured)
    .slice(0, 2)
    .forEach((e) =>
      releases.push({
        title: e.title as Bi,
        kind: 'entertainment',
        date: e.date,
        route: `/entertainment/${e.slug}`,
        color: 'var(--mg)',
        icon: 'play',
      }),
    );
  drs
    .filter((r) => r.featured)
    .slice(0, 2)
    .forEach((r) =>
      releases.push({
        title: { en: r.name, ne: r.name },
        kind: 'darkroom',
        date: r.reviewDate,
        route: r.presentation === 'profile' ? `/darkroom/${r.slug}` : r.url,
        color: 'var(--gold)',
        icon: 'search',
      }),
    );
  games
    .slice(0, 2)
    .forEach((g) =>
      releases.push({
        title: g.title as Bi,
        kind: 'games',
        date: g.release,
        route: `/games/${g.slug}`,
        color: 'var(--ok)',
        icon: 'game',
      }),
    );
  releases.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

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
  const srcAll = allSources();
  const srcMeta = sourceMeta();

  // The portals an applicant actually needs first, in the order they need them:
  // read the notice, apply online, check the gazette, then the sector boards.
  const firstIds = ['psc', 'psconline1-psc', 'gorkhapatra', 'jobs-nrb', 'moha', 'nea'];
  const ledgerRows = [
    ...firstIds.map((id) => srcAll.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s),
    ...srcAll.filter((s) => !firstIds.includes(s.id)),
  ]
    .slice(0, 6)
    .map((s) => ({
      id: s.id,
      name: s.name,
      host: s.host,
      url: s.url,
      status: s.status,
      httpStatus: s.httpStatus,
      ms: s.ms,
      checkedAt: s.checkedAt,
      lastVerifiedOn: s.lastVerifiedOn,
    }));

  // The ledger already names these portals with their measured answer, so the
  // notice card must not name them again. Filtering before selection keeps the
  // card full and leaves Loksewa's own notices, which live on the board its
  // "view full board" link opens.
  const ledgerHosts = new Set(ledgerRows.map((r) => urlHost(r.url)).filter(Boolean));
  const featNotices = noticeFeatured(5, ledgerHosts);

  const wire = wireEvents({
    releases,
    notices: allNotices(),
    sources: srcAll,
    limit: 6,
  });

  const deck: DeckData = {
    locale,
    divisions: dvs.map((d) => ({ name: d.name, route: d.route, color: d.color, icon: d.icon })),
    counts: data.counts,
    cadence,
    wire,
    sources: {
      items: ledgerRows,
      meta: {
        compiledAt: srcMeta.compiledAt,
        checked: srcMeta.checked,
        reachable: srcMeta.reachable,
        unreachable: srcMeta.unreachable,
        note: srcMeta.note,
      },
    },
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
    notices: { items: featNotices, categories: noticeCategoriesOf(featNotices), meta: noticeMeta(), reach: reachByHost() },
  };

  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const kindLabel: Record<string, string> = {
    release: 'NEW',
    notice: 'NOTICE',
    verified: 'VERIFIED',
    unreachable: 'NO RESPONSE',
    blocked: 'BOT CHECK',
    closing: 'CLOSING',
  };
  // The wire card owns the six headline events. The ticker scrolls the check
  // chronology behind them (slice 6+), so no event title is stated twice on the
  // page and the measured HTTP/ms line gets a fast, visible home of its own.
  const wireTail = wireEvents({
    releases,
    notices: allNotices(),
    sources: srcAll,
    limit: 16,
  }).slice(6);
  const ticker: string[] = wireTail.map((e) => {
    const title = locale === 'ne' ? e.title.ne || e.title.en : e.title.en;
    const meta = e.meta ? ` · ${esc(locale === 'ne' ? e.meta.ne || e.meta.en : e.meta.en)}` : '';
    return `${kindLabel[e.kind] ?? 'WIRE'} · ${esc(title.toUpperCase())}${meta}`;
  });

  return (
    <>
      <Hero
        settings={db.settings}
        ticker={ticker}
        altLang={altLang}
        verified={{ count: srcMeta.reachable, total: srcMeta.checked, date: srcMeta.compiledAt }}
      />
      <HomeDeck data={deck} />
      <Descent divisions={dvs} />
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
