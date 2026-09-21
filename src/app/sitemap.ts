import type { MetadataRoute } from 'next';
import { getDB, pub } from '@/lib/content';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acttolog.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDB();
  const now = new Date();

  const staticRoutes = [
    '', '/research', '/entertainment', '/academy', '/games', '/darkroom',
    '/blog', '/offers', '/about', '/contact', '/ai', '/search',
  ].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: (path === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  const posts = pub(db.posts).map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt || now),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const resources = pub(db.dr).filter((r) => r.presentation === 'profile').map((r) => ({
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

  return [...staticRoutes, ...posts, ...resources, ...offers, ...entertainment, ...courses, ...games];
}
