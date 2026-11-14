export const dynamic = 'force-static';
import type { MetadataRoute } from 'next';
import { getDB, pub } from '@/lib/content';
import { loksewaPapers } from '@/lib/content/loksewa';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acttolog.com.np';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDB();
  const now = new Date();

  const staticRoutes = [
    '',
    '/research',
    '/entertainment',
    '/academy',
    '/games',
    '/darkroom',
    '/blog',
    '/offers',
    '/about',
    '/contact',
    '/ai',
    '/search',
    '/explore',
    '/nepal',
  ].map((path) => ({
    url: `${SITE}${path}`,
    // No lastModified: these pages have no per-page publish date, and a build clock
    // stamped on all 62 URLs reads as noise to crawlers.
    changeFrequency: (path === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: path === '' ? 1 : 0.7,
    ...(path === ''
      ? { alternates: { languages: { en: `${SITE}/`, ne: `${SITE}/ne`, 'x-default': `${SITE}/` } } }
      : {}),
  }));

  const nepaliHome = {
    url: `${SITE}/ne`,
    changeFrequency: 'daily' as const,
    priority: 1,
    alternates: { languages: { en: `${SITE}/`, ne: `${SITE}/ne`, 'x-default': `${SITE}/` } },
  };

  // Loksewa Ghar: hub, then every paper, then every subject folder.
  const lk = loksewaPapers();
  const loksewaRoutes = [
    { url: `${SITE}/loksewa`, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${SITE}/loksewa/downloads`, changeFrequency: 'weekly' as const, priority: 0.85 },
    { url: `${SITE}/loksewa/explorer`, changeFrequency: 'monthly' as const, priority: 0.75 },
    ...lk.map((p) => ({ url: `${SITE}/loksewa/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...lk.flatMap((p) =>
      p.subjects.map((s) => ({
        url: `${SITE}/loksewa/${p.slug}/${s.slug}`,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    ),
  ];

  const posts = pub(db.posts).map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt || now),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const resources = pub(db.dr)
    .filter((r) => r.presentation === 'profile')
    .map((r) => ({
      url: `${SITE}/darkroom/${r.slug}`,
      lastModified: new Date(r.reviewDate || now),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

  const offers = pub(db.offers).map((o) => ({
    url: `${SITE}/offers/${o.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const entertainment = pub(db.entertainment).map((e) => ({
    url: `${SITE}/entertainment/${e.slug}`,
    lastModified: new Date(e.date || now),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const courses = pub(db.academy.courses, true).map((c) => ({
    url: `${SITE}/academy/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const games = pub(db.games).map((g) => ({
    url: `${SITE}/games/${g.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [staticRoutes[0], nepaliHome, ...staticRoutes.slice(1), ...loksewaRoutes, ...posts, ...resources, ...offers, ...entertainment, ...courses, ...games];
}
