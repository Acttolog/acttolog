import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { HomeLayers, type HomeData, type LatestItem } from '@/components/home/HomeLayers';
import { getDB, pub, homeSection, seoFor, divisions as getDivisions } from '@/lib/content';
import type { Bi } from '@/lib/content/types';

export const metadata: Metadata = {
  title: seoFor('/').title,
  description: seoFor('/').desc,
  alternates: { canonical: '/' },
  openGraph: { title: seoFor('/').title, description: seoFor('/').desc, url: '/' },
};

export default function HomePage() {
  const db = getDB();
  const dvs = getDivisions();
  const posts = pub(db.posts).slice().sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const ents = pub(db.entertainment);
  const drs = pub(db.dr);
  const courses = pub(db.academy.courses);
  const games = pub(db.games);
  const offers = pub(db.offers);

  // latest feed (prototype h6)
  const feed: LatestItem[] = [];
  posts.slice(0, 4).forEach((p) => feed.push({ title: p.title as Bi, kind: 'Blog', date: p.publishedAt, route: `/blog/${p.slug}`, color: 'var(--vi)', icon: 'doc', mem: p.access === 'members' }));
  ents.filter((e) => e.featured).slice(0, 2).forEach((e) => feed.push({ title: e.title as Bi, kind: 'Entertainment', date: e.date, route: `/entertainment/${e.slug}`, color: 'var(--mg)', icon: 'play', mem: e.access === 'members' }));
  drs.filter((r) => r.featured).slice(0, 2).forEach((r) => feed.push({ title: { en: r.name, ne: r.name }, kind: 'Darkroom', date: r.reviewDate, route: r.presentation === 'profile' ? `/darkroom/${r.slug}` : r.url, ext: r.presentation !== 'profile', color: 'var(--gold)', icon: 'search', mem: false }));
  games.slice(0, 2).forEach((g) => feed.push({ title: g.title as Bi, kind: 'Games', date: g.release, route: `/games/${g.slug}`, color: 'var(--ok)', icon: 'game', mem: g.access === 'members' }));
  feed.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const sections: HomeData['sections'] = {};
  for (const id of ['intro', 'eco', 'divisions', 'featured', 'latest', 'academy', 'darkroom', 'offers', 'about', 'cta']) {
    sections[id] = homeSection(id);
  }

  const data: HomeData = {
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
    offers: offers.filter((o) => o.featured).slice(0, 3).length ? offers.filter((o) => o.featured).slice(0, 3) : offers.slice(0, 3),
  };

  return (
    <>
      <Hero settings={db.settings} />
      <HomeLayers data={data} />
    </>
  );
}
