'use client';

import { useEffect, useMemo, useState } from 'react';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { DrCard } from '@/components/darkroom/DrCard';
import { DarkroomSubmit } from './DarkroomSubmit';
import { NlSearch } from './NlSearch';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { drRank } from '@/lib/darkroom';
import { track } from '@/lib/analytics';
import type {
  DarkroomCategory,
  DarkroomCollection,
  DarkroomResource,
  DarkroomWeights,
} from '@/lib/content/types';

/**
 * Darkroom explorer — fully public (spec §33).
 * Search is never personalised; smart relevance uses owner-configured weights.
 */
export function DarkroomClient({
  resources,
  cats,
  cols,
  weights,
  initialCat,
  initialQuery,
  initialFromUrl,
}: {
  resources: DarkroomResource[];
  cats: DarkroomCategory[];
  cols: DarkroomCollection[];
  weights: DarkroomWeights;
  initialCat: string;
  initialQuery: string;
  initialFromUrl?: boolean;
}) {
  const { L, t, locale } = useI18n();
  const { user } = useSession();
  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState(initialCat);
  useEffect(() => {
    if (!initialFromUrl) return;
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('c')) setCat(sp.get('c')!);
      if (sp.get('q')) setQ(sp.get('q')!);
    } catch {
      /* ignore */
    }
  }, [initialFromUrl]);
  const [sub, setSub] = useState('All');
  const [pricing, setPricing] = useState('All');
  const [verif, setVerif] = useState('All');
  const [sort, setSort] = useState<'smart' | 'newest' | 'alpha'>('smart');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [nlOpen, setNlOpen] = useState(false);

  const subs = useMemo(() => {
    const c = cats.find((x) => x.slug === cat);
    return c?.subs || (Array.from(new Set(resources.map((r) => r.subcategory).filter(Boolean))) as string[]);
  }, [cat, cats, resources]);

  const ranked = useMemo(() => {
    let list = resources;
    if (cat !== 'All') {
      const c = cats.find((x) => x.slug === cat);
      if (c) list = list.filter((r) => r.category === c.name.en);
    }
    if (sub !== 'All') list = list.filter((r) => r.subcategory === sub);
    if (pricing !== 'All') list = list.filter((r) => r.pricing === pricing);
    if (verif === 'official') list = list.filter((r) => r.official);
    else if (verif !== 'All') list = list.filter((r) => r.verification === verif);

    let rk = drRank(list, q, weights, locale);
    if (sort === 'newest')
      rk = rk.slice().sort((a, b) => String(b.r.reviewDate).localeCompare(String(a.r.reviewDate)));
    if (sort === 'alpha') rk = rk.slice().sort((a, b) => a.r.name.localeCompare(b.r.name));
    return rk;
  }, [resources, cats, cat, sub, pricing, verif, q, weights, locale, sort]);

  const onQuery = (v: string) => {
    setQ(v);
    if (v.trim().length > 2) track('search', { q: v.trim(), where: 'darkroom' });
  };

  return (
    <>
      {/* Search + controls */}
      <Reveal>
        <div className="panel mb-6 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex min-w-[240px] flex-1 items-center gap-3">
              <span style={{ color: 'var(--cy)' }}>
                <Icon name="search" size={18} />
              </span>
              <input
                className="inp !border-0 !bg-transparent !px-0 !py-1"
                value={q}
                onChange={(e) => onQuery(e.target.value)}
                placeholder={
                  locale === 'ne'
                    ? 'स्रोत खोज्नुहोस्…'
                    : 'Search resources — tools, databases, official sites…'
                }
                aria-label={t('dark.search')}
              />
            </div>
            <button className="btn btn-g btn-sm" onClick={() => setNlOpen(true)}>
              <Icon name="brain" size={15} />
              {locale === 'ne' ? 'वाक्यमा खोज' : 'Natural search'}
            </button>
            <button
              className="btn btn-p btn-sm"
              onClick={() => (user ? setSubmitOpen(true) : setSubmitOpen(true))}
            >
              <Icon name="down" size={15} style={{ transform: 'rotate(180deg)' }} />
              {t('dark.submit')}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              className={`chip${cat === 'All' ? ' on' : ''}`}
              onClick={() => {
                setCat('All');
                setSub('All');
              }}
            >
              {t('all')}
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                className={`chip${cat === c.slug ? ' on' : ''}`}
                onClick={() => {
                  setCat(c.slug);
                  setSub('All');
                }}
              >
                {L(c.name)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="sel !w-auto !py-1.5 !text-[12.4px]"
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              aria-label="Subcategory"
            >
              <option>All</option>
              {subs.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="sel !w-auto !py-1.5 !text-[12.4px]"
              value={pricing}
              onChange={(e) => setPricing(e.target.value)}
              aria-label="Pricing"
            >
              {['All', 'Free', 'Freemium', 'Paid'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="sel !w-auto !py-1.5 !text-[12.4px]"
              value={verif}
              onChange={(e) => setVerif(e.target.value)}
              aria-label="Verification"
            >
              {['All', 'verified', 'needs-review', 'official'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <span className="mx-1 hidden sm:block" style={{ color: 'var(--line2)' }}>
              |
            </span>
            <span className="mono dim text-[10.5px] tracking-[.16em]">{t('dark.sort')}:</span>
            <button className={`chip${sort === 'smart' ? ' on' : ''}`} onClick={() => setSort('smart')}>
              {t('dark.smart')}
            </button>
            <button className={`chip${sort === 'newest' ? ' on' : ''}`} onClick={() => setSort('newest')}>
              {t('dark.new')}
            </button>
            <button className={`chip${sort === 'alpha' ? ' on' : ''}`} onClick={() => setSort('alpha')}>
              A→Z
            </button>
          </div>

          <div className="mono dim mt-4 text-[10.5px] tracking-[.16em]" id="drN">
            {ranked.length} {locale === 'ne' ? 'स्रोत भेट्टाइयो' : 'RESOURCES MATCHED'}
            {q ? ` · “${q}”` : ''}
          </div>
        </div>
      </Reveal>

      {/* Grid */}
      {ranked.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.slice(0, 36).map((x, i) => (
            <Reveal key={x.r.id} delay={(i % 3) * 40}>
              <DrCard r={x.r} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="panel mut p-12 text-center">{t('none')}</div>
      )}

      <p className="dim mt-6 max-w-[86ch] text-[12.1px] leading-relaxed">{t('dark.nopop')}</p>

      {/* Collections */}
      {cols.length > 0 && (
        <div className="mt-12">
          <div className="secnum mb-4">CURATED COLLECTIONS</div>
          <div className="grid gap-4 md:grid-cols-3">
            {cols.map((c) => (
              <Reveal key={c.id}>
                <div className="panel h-full p-6">
                  <h3 className="font-display mb-2 text-[15.4px] font-semibold">{L(c.name)}</h3>
                  <p className="mut mb-4 text-[12.8px] leading-relaxed">{L(c.desc)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.items || []).map((slug) => {
                      const r = resources.find((x) => x.slug === slug);
                      return r ? (
                        <span key={slug} className="tag">
                          {r.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* Verification pipeline note (spec §37) */}
      <Reveal>
        <div className="panel mt-12 p-6 sm:p-8">
          <div className="eyebrow mb-4">DISCOVER → VERIFY → ORGANIZE → ACCESS</div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['Discover', 'Keyword search, natural-language interpretation and AI assistance where useful.'],
              ['Verify', 'Automated pre-checks plus human admin review before anything is published.'],
              [
                'Organize',
                'Categories, subcategories and curated collections — ranking is rule-based and global.',
              ],
              ['Access', 'Open Here for the in-app profile or Open in New Tab for the official destination.'],
            ].map(([k, v], i) => (
              <div key={k}>
                <div className="mono mb-2 text-[10.5px] tracking-[.2em]" style={{ color: 'var(--gold)' }}>
                  0{i + 1} · {k.toUpperCase()}
                </div>
                <p className="mut text-[12.6px] leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
          <p className="dim mt-5 text-[11.6px] leading-relaxed">
            Automated checks do not guarantee that a destination is safe. Human admin verification is required
            before publication, and verified status reflects the last manual review date shown on each
            profile.
          </p>
        </div>
      </Reveal>

      {submitOpen && <DarkroomSubmit onClose={() => setSubmitOpen(false)} />}
      {nlOpen && (
        <NlSearch
          onClose={() => setNlOpen(false)}
          onApply={(query) => {
            setQ(query);
            setNlOpen(false);
          }}
        />
      )}
    </>
  );
}
