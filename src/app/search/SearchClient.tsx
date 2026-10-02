'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { searchAnywhere } from '@/lib/search-client';

interface Result { k: string; title: string; sub: string; route: string; ext?: boolean; mem?: boolean }

/** Full search page — global index across every content kind (spec §55). */
export function SearchClient() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState('');
  useEffect(() => {
    try { setQ(new URLSearchParams(window.location.search).get('q') || ''); } catch { /* ignore */ }
  }, []);
  const [results, setResults] = useState<Result[]>([]);
  const [places, setPlaces] = useState<Result[]>([]);
  const [loaded, setLoaded] = useState(false);

  /* PLACES — real-world locations via Nominatim, deep-linked into /explore (spec §18) */
  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) { setPlaces([]); return; }
    const tId = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`);
        if (!r.ok) return;
        const j = await r.json();
        setPlaces(j.map((x: { place_id: number; name?: string; display_name?: string; lat: string; lon: string }) => {
          const name = x.name || x.display_name?.split(',')[0] || 'Unnamed';
          return {
            k: 'places',
            title: name,
            sub: `${(x.display_name || '').split(',').slice(1, 4).join(',').trim() || 'World'} · ${Number(x.lat).toFixed(3)}, ${Number(x.lon).toFixed(3)} · © OSM`,
            route: `/explore?mode=map&lat=${Number(x.lat).toFixed(5)}&lng=${Number(x.lon).toFixed(5)}&zoom=13&place=${encodeURIComponent(name)}`,
          } as Result;
        }));
      } catch { /* offline — content results still work */ }
    }, 500);
    return () => clearTimeout(tId);
  }, [q]);

  const run = useCallback(async (query: string) => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&locale=${locale}`);
      const data = await res.json();
      setResults(data.results || []);
      setLoaded(true);
      if (query.trim()) track('search', { q: query.trim(), where: 'page' });
    } catch { setLoaded(true); }
  }, [locale]);

  useEffect(() => { run(q); /* initial */ }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (v: string) => {
    setQ(v);
    run(v);
    try {
      const params = new URLSearchParams(window.location.search);
      if (v) params.set('q', v); else params.delete('q');
      window.history.replaceState(null, '', `/search${params.toString() ? `?${params}` : ''}`);
    } catch { /* ignore */ }
  };

  const groups: Record<string, Result[]> = {};
  places.forEach((r) => { (groups[r.k] = groups[r.k] || []).push(r); });
  results.forEach((r) => { (groups[r.k] = groups[r.k] || []).push(r); });
  const names: Record<string, string> = {
    places: 'Places',
    division: t('nav.div'), blog: t('nav.blog'), darkroom: 'Darkroom', games: t('games'),
    entertainment: 'Entertainment', academy: 'Academy', research: 'Thesyn Research', offers: t('nav.offers'),
  };

  return (
    <>
      <div className="panel p-5 mb-8">
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--cy)' }}><Icon name="search" size={19} /></span>
          <input className="inp !border-0 !bg-transparent !px-0 !py-1 !text-[16px] !shadow-none" autoFocus
            value={q} onChange={(e) => onChange(e.target.value)}
            placeholder={t('search.ph')} aria-label={t('search')} />
        </div>
      </div>

      {loaded && !results.length && !places.length && (
        <div className="panel p-12 text-center">
          <div className="dim mb-4">{t('none')}</div>
          <button className="btn btn-g btn-sm"
            onClick={() => window.dispatchEvent(new CustomEvent('acttolog:ai-open', { detail: q }))}>
            {locale === 'ne' ? 'Acttolog AI लाई सोध्नुहोस्' : 'Ask Acttolog AI instead'}
          </button>
        </div>
      )}

      {Object.keys(groups).map((k) => (
        <div className="mb-8" key={k}>
          <div className="mono text-[10px] tracking-[.2em] dim mb-3">
            {(names[k] || k).toUpperCase()} · {groups[k].length}
          </div>
          <div className="panel" style={{ borderRadius: 16, overflow: 'hidden' }}>
            {groups[k].map((r, i) => r.ext ? (
              <a key={i} className="rowlink" href={r.route} target="_blank" rel="noopener noreferrer"
                onClick={() => track('resource_open', { from: 'search' })}>
                <RowIcon k={r.k} />
                <RowBody title={r.title} sub={r.sub} mem={r.mem} t={t} />
                <Icon name="arrow" size={16} />
              </a>
            ) : (
              <Link key={i} className="rowlink" href={r.route}>
                <RowIcon k={r.k} />
                <RowBody title={r.title} sub={r.sub} mem={r.mem} t={t} />
                <Icon name="arrow" size={16} />
              </Link>
            ))}
          </div>
        </div>
      ))}

      <p className="dim text-[11.6px] mono tracking-[.14em]">
        {locale === 'ne' ? 'खोजले प्रकाशित सामग्री मात्र देखाउँछ · ग्लोबल इन्डेक्स' : 'SEARCH SHOWS PUBLISHED CONTENT ONLY · GLOBAL INDEX'}
      </p>
    </>
  );
}

function RowIcon({ k }: { k: string }) {
  const map: Record<string, [string, string]> = {
    division: ['var(--cy)', 'compass'], blog: ['var(--vi)', 'doc'], darkroom: ['var(--gold)', 'search'],
    games: ['var(--ok)', 'game'], entertainment: ['var(--mg)', 'play'], academy: ['var(--vi)', 'book'],
    research: ['var(--cy)', 'sigma'], offers: ['var(--gold)', 'star'],
  };
  const [color, icon] = map[k] || ['var(--cy)', 'spark'];
  return (
    <span className="w-[50px] h-[50px] rounded-xl grid place-items-center"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 28%, transparent)` }}>
      <Icon name={icon} size={19} />
    </span>
  );
}

function RowBody({ title, sub, mem, t }: { title: string; sub: string; mem?: boolean; t: (k: string) => string }) {
  return (
    <div className="min-w-0">
      <div className="text-[14.4px] font-medium truncate flex items-center gap-2">
        {title}
        {mem && <span className="badge b-vi flex-none"><Icon name="lock" size={10} />{t('members')}</span>}
      </div>
      <div className="dim text-[12px] mt-0.5 truncate">{sub}</div>
    </div>
  );
}
