import 'server-only';
import { getDB, pub } from '@/lib/content';
import { L as resolveBi } from '@/lib/content';

/** Global search index (spec §55) — server-side, published content only. */

export interface SearchEntry {
  k: 'division' | 'blog' | 'darkroom' | 'games' | 'entertainment' | 'academy' | 'research' | 'offers';
  title: string;
  sub: string;
  route: string;
  ext?: boolean;
  mem?: boolean;
  txt: string;
}

export function buildSearchIndex(locale: 'en' | 'ne' = 'en'): SearchEntry[] {
  const db = getDB();
  const o: SearchEntry[] = [];
  const L = (v: Parameters<typeof resolveBi>[0]) => resolveBi(v, locale);

  db.divisions.filter((d) => d.visible !== false).forEach((d) =>
    o.push({ k: 'division', title: L(d.name), sub: L(d.sub), route: d.route, txt: `${L(d.name)} ${L(d.sub)} ${L(d.desc)}`.toLowerCase() }));

  pub(db.posts).forEach((p) =>
    o.push({ k: 'blog', title: L(p.title), sub: p.category, route: `/blog/${p.slug}`, txt: `${L(p.title)} ${L(p.excerpt)} ${L(p.content)} ${(p.tags || []).join(' ')}`.toLowerCase(), mem: p.access === 'members' }));

  pub(db.dr).forEach((r) =>
    o.push({ k: 'darkroom', title: r.name, sub: `${r.category} · ${r.subcategory}`, route: r.presentation === 'profile' ? `/darkroom/${r.slug}` : r.url, ext: r.presentation !== 'profile', txt: `${r.name} ${L(r.short)} ${(r.tags || []).join(' ')} ${r.category} ${r.pricing}`.toLowerCase() }));

  pub(db.games).forEach((g) =>
    o.push({ k: 'games', title: L(g.title), sub: g.category, route: `/games/${g.slug}`, txt: `${L(g.title)} ${L(g.desc)}`.toLowerCase(), mem: g.access === 'members' }));

  pub(db.entertainment).forEach((e) =>
    o.push({ k: 'entertainment', title: L(e.title), sub: e.category, route: `/entertainment/${e.slug}`, txt: `${L(e.title)} ${L(e.desc)}`.toLowerCase(), mem: e.access === 'members' }));

  pub(db.academy.courses).forEach((c) =>
    o.push({ k: 'academy', title: L(c.title), sub: c.level, route: `/academy/${c.slug}`, txt: `${L(c.title)} ${L(c.summary)}`.toLowerCase(), mem: c.access === 'members' }));

  pub(db.services).forEach((sv) =>
    o.push({ k: 'research', title: L(sv.title), sub: L(sv.summary), route: '/research', txt: `${L(sv.title)} ${L(sv.summary)}`.toLowerCase(), mem: sv.access === 'members' }));

  pub(db.offers).forEach((x) =>
    o.push({ k: 'offers', title: L(x.title), sub: L(x.short), route: `/offers/${x.slug}`, txt: `${L(x.title)} ${L(x.short)} ${L(x.desc)}`.toLowerCase(), mem: x.access === 'members' }));

  return o;
}

export function runSearch(q: string, locale: 'en' | 'ne' = 'en'): SearchEntry[] {
  const idx = buildSearchIndex(locale);
  const query = (q || '').trim().toLowerCase();
  if (!query) return idx.slice(0, 60);
  const qs = query.split(/\s+/).filter((x) => x.length > 1);
  return idx
    .map((r) => {
      let sc = 0;
      qs.forEach((w) => {
        if (r.title.toLowerCase().includes(w)) sc += 6;
        if (r.txt.includes(w)) sc += 2;
      });
      return { r, sc };
    })
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.r)
    .slice(0, 60);
}
