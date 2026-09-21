import type { Bi, DarkroomResource, DarkroomWeights, Locale } from '@/lib/content/types';

/**
 * Darkroom ranking & intent engine (spec §34–35).
 * Deterministic, global, never personalised — identical results for everyone.
 * Weights are owner-configured (CMS): relevance/official/verification/freshness/usage.
 */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const bi = (v: Bi | string | undefined, locale: Locale) =>
  v == null ? '' : typeof v === 'string' ? v : v[locale] || v.en || '';

export function drRank(list: DarkroomResource[], q: string, weights: DarkroomWeights, locale: Locale = 'en') {
  const w = weights || { relevance: 40, official: 20, verification: 15, freshness: 10, usage: 15 };
  const tot = Object.keys(w).reduce((a, k) => a + ((w as unknown as Record<string, number>)[k] || 0), 0) || 1;
  const qs = (q || '').trim().toLowerCase();
  const terms = qs ? qs.split(/\s+/).filter((x) => x.length > 1) : [];
  const stop = ['i', 'need', 'want', 'free', 'for', 'the', 'a', 'an', 'with', 'and', 'to', 'software', 'tool', 'tools', 'best', 'good', 'please', 'me', 'my', 'of', 'in', 'on', 'is', 'are'];
  const kw = terms.filter((x) => !stop.includes(x));
  const now = Date.now();

  return list
    .map((r) => {
      let rel = 0;
      if (terms.length) {
        const hay = `${r.name} ${bi(r.short, locale)} ${(r.tags || []).join(' ')} ${r.category} ${r.subcategory} ${r.pricing} ${bi(r.full, locale)}`.toLowerCase();
        let hit = 0;
        terms.forEach((x) => { if (hay.includes(x)) hit++; });
        rel = (hit / terms.length) * 100;
        kw.forEach((k) => {
          if (r.name.toLowerCase().includes(k)) rel += 22;
          if ((r.tags || []).some((tg) => tg.toLowerCase().includes(k))) rel += 12;
        });
        if (/free|निःशुल्क/.test(qs) && /free/i.test(r.pricing)) rel += 16;
        if (/panel|time series|econometric/.test(qs) && /stata|eviews|spss|r-project|jasp/i.test(r.slug)) rel += 20;
        if (/nepal|नेपाल/.test(qs) && r.region === 'Nepal') rel += 24;
        if (/citation|reference/.test(qs) && /zotero|mendeley/i.test(r.slug)) rel += 22;
        if (/statistic|analysis/.test(qs) && r.subcategory === 'Analysis Software') rel += 16;
      } else rel = 50;

      const fresh = clamp(100 - (now - new Date(r.reviewDate || now).getTime()) / 864e5 / 3.65, 0, 100);
      const score =
        (rel * w.relevance +
          (r.official ? 100 : 45) * w.official +
          (r.verification === 'verified' ? 100 : r.verification === 'needs-review' ? 40 : 10) * w.verification +
          fresh * w.freshness +
          clamp((r.usage || 0) / 4, 0, 100) * w.usage) / tot;
      return { r, score: Math.round(score * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score);
}

export interface ParsedIntent {
  pricing: string;
  cats: string[];
  subs: string[];
  region: string;
  official: boolean;
}

const SUB_MAP: Record<string, string[]> = {
  'panel data': ['Analysis Software'], econometric: ['Analysis Software'], regression: ['Analysis Software'],
  statistic: ['Analysis Software', 'Public Data'], thesis: ['Reference Managers', 'Academic Search'],
  citation: ['Reference Managers'], reference: ['Reference Managers'], journal: ['Journals'],
  'open access': ['Journals'], preprint: ['Journals'], paper: ['Academic Search', 'Journals'],
  dataset: ['Models & Datasets', 'Public Data'], data: ['Public Data', 'Models & Datasets'],
  census: ['Public Data'], nepal: ['Nepal'], government: ['Nepal', 'Public Data'],
  ai: ['Models & Datasets'], 'machine learning': ['Models & Datasets'], model: ['Models & Datasets'],
  design: ['Design'], video: ['Video & Audio'], audio: ['Video & Audio'], music: ['Video & Audio'],
  code: ['Tools', 'Docs'], developer: ['Tools', 'Docs'], course: ['Courses', 'Open Courseware'],
  learn: ['Courses', 'Open Courseware'], market: ['Market Data'], business: ['Market Data'],
  spreadsheet: ['Productivity'], excel: ['Productivity', 'Analysis Software'],
};

/** Layer 2 — natural-language interpretation (prototype `parseIntent`). */
export function parseIntent(q: string, drCats: { name: Bi; subs: string[] }[]): ParsedIntent {
  const s = q.toLowerCase();
  const o: ParsedIntent = { pricing: '', cats: [], subs: [], region: '', official: false };
  if (/free|निःशुल्क|no cost/.test(s)) o.pricing = 'Free';
  else if (/paid|premium|शुल्क/.test(s)) o.pricing = 'Paid';
  else if (/freemium/.test(s)) o.pricing = 'Freemium';
  if (/official|सरकारी|government/.test(s)) o.official = true;
  Object.keys(SUB_MAP).forEach((k) => {
    if (s.includes(k)) SUB_MAP[k].forEach((v) => { if (!o.subs.includes(v)) o.subs.push(v); });
  });
  drCats.forEach((c) => {
    if ((c.subs || []).some((x) => o.subs.includes(x))) o.cats.push(c.name.en);
  });
  if (/nepal|नेपाल/.test(s)) o.region = 'Nepal';
  else if (/international|global|world/.test(s)) o.region = 'International';
  return o;
}

/** URL pre-checks for submissions (spec §37) — honest, non-guaranteeing. */
export function precheckUrl(url: string, existingUrls: string[], pendingUrls: string[]) {
  const norm = (u: string) => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '');
  let parsed: URL | null = null;
  try { parsed = new URL(url); } catch { parsed = null; }
  const domain = parsed ? parsed.hostname : '';
  return [
    ['URL format valid', Boolean(parsed)] as [string, boolean],
    ['HTTPS scheme', url.startsWith('https')] as [string, boolean],
    ['Domain well-formed', /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)] as [string, boolean],
    ['Not already in Darkroom', !existingUrls.some((u) => norm(u) === norm(url))] as [string, boolean],
    ['Not already pending review', !pendingUrls.some((u) => norm(u) === norm(url))] as [string, boolean],
  ];
}
