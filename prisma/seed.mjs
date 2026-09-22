/**
 * ACTTOLOG database seed — populates PostgreSQL from the mechanically
 * extracted prototype content (src/lib/content/seed.json).
 * Idempotent: safe to re-run; uses stable ids from the seed document.
 * Run: npm run db:seed   (requires DATABASE_URL)
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'content', 'seed.json'), 'utf8'));

const prisma = new PrismaClient();
const d = (v) => (v ? new Date(v) : null);

async function main() {
  console.log('→ SiteSettings');
  await prisma.siteSettings.upsert({
    where: { id: 'global' },
    update: { data: seed.settings },
    create: { id: 'global', data: seed.settings },
  });

  console.log('→ SEOSettings');
  await prisma.sEOSettings.upsert({
    where: { id: 'global' },
    update: { pages: seed.seo.pages, robots: seed.seo.robots },
    create: { id: 'global', pages: seed.seo.pages, robots: seed.seo.robots },
  });

  console.log('→ Navigation (' + seed.nav.length + ')');
  for (const [i, n] of seed.nav.entries()) {
    await prisma.navigationItem.upsert({
      where: { id: n.id }, update: { label: n.label, route: n.route, order: n.order ?? i, visible: n.visible !== false },
      create: { id: n.id, label: n.label, route: n.route, order: n.order ?? i, visible: n.visible !== false },
    });
  }

  console.log('→ Divisions (' + seed.divisions.length + ')');
  for (const div of seed.divisions) {
    await prisma.division.upsert({
      where: { id: div.id },
      update: { slug: div.slug, name: div.name, sub: div.sub, desc: div.desc, route: div.route, color: div.color, icon: div.icon, art: div.art, order: div.order, visible: div.visible !== false, status: div.status ?? 'published' },
      create: { id: div.id, slug: div.slug, name: div.name, sub: div.sub, desc: div.desc, route: div.route, color: div.color, icon: div.icon, art: div.art, order: div.order, visible: div.visible !== false, status: div.status ?? 'published' },
    });
  }

  console.log('→ HomeSections (' + seed.homeSections.length + ')');
  for (const [i, s] of seed.homeSections.entries()) {
    await prisma.homeSection.upsert({
      where: { id: s.id }, update: { title: s.title, body: s.body, visible: s.visible !== false, order: i },
      create: { id: s.id, title: s.title, body: s.body, visible: s.visible !== false, order: i },
    });
  }

  console.log('→ Research services/programs/packages');
  for (const s of seed.services) {
    await prisma.researchService.upsert({
      where: { id: s.id },
      update: { title: s.title, summary: s.summary, icon: s.icon, order: s.order, status: s.status, access: s.access, visible: s.visible !== false },
      create: { id: s.id, title: s.title, summary: s.summary, icon: s.icon, order: s.order, status: s.status, access: s.access, visible: s.visible !== false },
    });
  }
  for (const [i, p] of seed.programs.entries()) {
    await prisma.researchProgram.upsert({
      where: { id: p.id }, update: { code: p.code, name: p.name, note: p.note, status: p.status ?? 'published', order: i },
      create: { id: p.id, code: p.code, name: p.name, note: p.note, status: p.status ?? 'published', order: i },
    });
  }
  for (const [i, p] of seed.packages.entries()) {
    await prisma.researchPackage.upsert({
      where: { id: p.id },
      update: { name: p.name, tagline: p.tagline, npr: p.npr ?? 0, usd: p.usd ?? 0, interval: p.interval, desc: p.desc, features: p.features ?? [], mode: p.mode ?? 'inquiry', accent: p.accent, status: p.status ?? 'published', order: i },
      create: { id: p.id, name: p.name, tagline: p.tagline, npr: p.npr ?? 0, usd: p.usd ?? 0, interval: p.interval, desc: p.desc, features: p.features ?? [], mode: p.mode ?? 'inquiry', accent: p.accent, status: p.status ?? 'published', order: i },
    });
  }

  console.log('→ Entertainment (' + seed.entertainment.length + ')');
  for (const e of seed.entertainment) {
    await prisma.entertainmentItem.upsert({
      where: { id: e.id },
      update: { slug: e.slug, title: e.title, desc: e.desc, body: e.body ?? undefined, thumb: e.thumb, media: e.media, category: e.category, tags: e.tags ?? [], date: d(e.date) ?? new Date(), audience: e.audience ?? 'global', access: e.access ?? 'public', status: e.status ?? 'published', featured: !!e.featured, visible: e.visible !== false },
      create: { id: e.id, slug: e.slug, title: e.title, desc: e.desc, body: e.body ?? undefined, thumb: e.thumb, media: e.media, category: e.category, tags: e.tags ?? [], date: d(e.date) ?? new Date(), audience: e.audience ?? 'global', access: e.access ?? 'public', status: e.status ?? 'published', featured: !!e.featured, visible: e.visible !== false },
    });
  }

  console.log('→ Academy courses/modules/lessons');
  for (const [ci, c] of seed.academy.courses.entries()) {
    await prisma.academyCourse.upsert({
      where: { id: c.id },
      update: { slug: c.slug, title: c.title, level: c.level, summary: c.summary, image: c.image, access: c.access ?? 'members', status: c.status ?? 'published', featured: !!c.featured, visible: c.visible !== false, order: ci },
      create: { id: c.id, slug: c.slug, title: c.title, level: c.level, summary: c.summary, image: c.image, access: c.access ?? 'members', status: c.status ?? 'published', featured: !!c.featured, visible: c.visible !== false, order: ci },
    });
    await prisma.academyModule.deleteMany({ where: { courseId: c.id } });
    for (const [mi, m] of (c.modules ?? []).entries()) {
      const mod = await prisma.academyModule.create({ data: { id: `${c.id}_m${mi}`, courseId: c.id, title: m.title, order: mi } });
      for (const [li, l] of (m.lessons ?? []).entries()) {
        await prisma.academyLesson.create({ data: { id: `${mod.id}_l${li}`, moduleId: mod.id, title: typeof l === 'string' ? { en: l } : l, order: li } });
      }
    }
  }

  console.log('→ Games (' + seed.games.length + ')');
  for (const g of seed.games) {
    await prisma.game.upsert({
      where: { id: g.id },
      update: { slug: g.slug, title: g.title, desc: g.desc, thumb: g.thumb, url: g.url, category: g.category ?? 'Arcade', launch: g.launch ?? 'embedded', access: g.access ?? 'members', status: g.status ?? 'published', featured: !!g.featured, visible: g.visible !== false, release: d(g.release) ?? new Date() },
      create: { id: g.id, slug: g.slug, title: g.title, desc: g.desc, thumb: g.thumb, url: g.url, category: g.category ?? 'Arcade', launch: g.launch ?? 'embedded', access: g.access ?? 'members', status: g.status ?? 'published', featured: !!g.featured, visible: g.visible !== false, release: d(g.release) ?? new Date() },
    });
  }

  console.log('→ Darkroom categories/resources/collections');
  for (const c of seed.drCats) {
    await prisma.darkroomCategory.upsert({
      where: { id: c.id }, update: { slug: c.slug, name: c.name, subs: c.subs ?? [], order: c.order, visible: c.visible !== false },
      create: { id: c.id, slug: c.slug, name: c.name, subs: c.subs ?? [], order: c.order, visible: c.visible !== false },
    });
  }
  const colBySlug = {};
  for (const col of seed.drCols ?? []) for (const s of col.items ?? []) (colBySlug[s] = colBySlug[s] || []).push(col.id);
  for (const r of seed.dr) {
    await prisma.darkroomResource.upsert({
      where: { id: r.id },
      update: { slug: r.slug, name: r.name, url: r.url, category: r.category, subcategory: r.subcategory, tags: r.tags ?? [], type: r.type, pricing: r.pricing, official: !!r.official, verification: r.verification ?? 'needs-review', region: r.region ?? 'Global', audience: r.audience ?? 'Everyone', language: r.language ?? 'en', featured: !!r.featured, reviewDate: d(r.reviewDate) ?? new Date(), status: r.status ?? 'published', presentation: r.presentation ?? 'link', short: r.short, full: r.full, usage: 0, visible: r.visible !== false, collectionIds: colBySlug[r.slug] ?? [] },
      create: { id: r.id, slug: r.slug, name: r.name, url: r.url, category: r.category, subcategory: r.subcategory, tags: r.tags ?? [], type: r.type, pricing: r.pricing, official: !!r.official, verification: r.verification ?? 'needs-review', region: r.region ?? 'Global', audience: r.audience ?? 'Everyone', language: r.language ?? 'en', featured: !!r.featured, reviewDate: d(r.reviewDate) ?? new Date(), status: r.status ?? 'published', presentation: r.presentation ?? 'link', short: r.short, full: r.full, usage: 0, visible: r.visible !== false, collectionIds: colBySlug[r.slug] ?? [] },
    });
  }
  for (const col of seed.drCols ?? []) {
    await prisma.darkroomCollection.upsert({
      where: { id: col.id }, update: { name: col.name, desc: col.desc, items: col.items ?? [], status: col.status ?? 'published' },
      create: { id: col.id, name: col.name, desc: col.desc, items: col.items ?? [], status: col.status ?? 'published' },
    });
  }
  await prisma.darkroomSettings.upsert({
    where: { id: 'global' }, update: { weights: seed.drW, aiRules: seed.drAi },
    create: { id: 'global', weights: seed.drW, aiRules: seed.drAi },
  });

  console.log('→ Blog categories/tags/posts');
  for (const cat of seed.cats ?? []) {
    await prisma.blogCategory.upsert({ where: { id: `cat_${cat.toLowerCase()}` }, update: { name: cat }, create: { id: `cat_${cat.toLowerCase()}`, name: cat } });
  }
  const tagIds = new Set();
  for (const p of seed.posts) for (const t of p.tags ?? []) tagIds.add(t);
  for (const t of tagIds) {
    const slug = String(t).toLowerCase().replace(/\s+/g, '-');
    await prisma.blogTag.upsert({ where: { slug }, update: { name: t }, create: { id: `tag_${slug}`, name: t, slug } });
  }
  for (const p of seed.posts) {
    const tags = await prisma.blogTag.findMany({ where: { slug: { in: (p.tags ?? []).map((t) => String(t).toLowerCase().replace(/\s+/g, '-')) } } });
    await prisma.blogPost.upsert({
      where: { id: p.id },
      update: { slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content, cover: p.cover, author: p.author ?? 'Acttolog Editorial', categoryId: p.category ? `cat_${p.category.toLowerCase()}` : null, status: p.status ?? 'published', access: p.access ?? 'public', audience: p.audience ?? 'global', featured: !!p.featured, seoTitle: p.seoTitle, seoDescription: p.seoDescription, socialImage: p.socialImage, publishedAt: d(p.publishedAt), tags: { set: tags.map((t) => ({ id: t.id })) } },
      create: { id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content, cover: p.cover, author: p.author ?? 'Acttolog Editorial', categoryId: p.category ? `cat_${p.category.toLowerCase()}` : null, status: p.status ?? 'published', access: p.access ?? 'public', audience: p.audience ?? 'global', featured: !!p.featured, seoTitle: p.seoTitle, seoDescription: p.seoDescription, socialImage: p.socialImage, publishedAt: d(p.publishedAt), tags: { connect: tags.map((t) => ({ id: t.id })) } },
    });
  }

  console.log('→ Offers (' + seed.offers.length + ')');
  for (const o of seed.offers) {
    await prisma.offer.upsert({
      where: { id: o.id },
      update: { slug: o.slug, division: o.division, title: o.title, short: o.short, desc: o.desc, npr: o.npr ?? 0, usd: o.usd ?? 0, discount: o.discount, mode: o.mode ?? 'inquiry', features: o.features ?? [], terms: o.terms ?? { en: '' }, validUntil: d(o.validUntil), accent: o.accent, art: o.art, status: o.status ?? 'published', access: o.access ?? 'public', audience: o.audience ?? 'global', featured: !!o.featured, visible: o.visible !== false },
      create: { id: o.id, slug: o.slug, division: o.division, title: o.title, short: o.short, desc: o.desc, npr: o.npr ?? 0, usd: o.usd ?? 0, discount: o.discount, mode: o.mode ?? 'inquiry', features: o.features ?? [], terms: o.terms ?? { en: '' }, validUntil: d(o.validUntil), accent: o.accent, art: o.art, status: o.status ?? 'published', access: o.access ?? 'public', audience: o.audience ?? 'global', featured: !!o.featured, visible: o.visible !== false },
    });
  }

  console.log('→ Media assets');
  for (const m of seed.media ?? []) {
    await prisma.mediaAsset.upsert({
      where: { id: m.id }, update: { name: m.name, src: m.src, type: m.type, note: m.note, usedBy: m.usedBy },
      create: { id: m.id, name: m.name, src: m.src, type: m.type, note: m.note, usedBy: m.usedBy },
    });
  }

  console.log('✓ seed complete');
}

main()
  .catch((e) => { console.error('SEED FAILED:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
