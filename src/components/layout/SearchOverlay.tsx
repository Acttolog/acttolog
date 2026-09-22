'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { searchAnywhere } from '@/lib/search-client';

interface Result {
  k: string; title: string; sub: string; route: string; ext?: boolean; mem?: boolean;
}

const GROUP_NAMES = (t: (k: string) => string) => ({
  division: t('nav.div'), blog: t('nav.blog'), darkroom: 'Darkroom', games: t('games'),
  entertainment: 'Entertainment', academy: 'Academy', research: 'Thesyn Research', offers: t('nav.offers'),
});

/** Global search overlay (spec §55) — ⌘K, grouped results, AI fallback. */
export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, locale } = useI18n();
  const router = useRouter();
  const searched = useRef('');

  useEffect(() => {
    const on = () => { setOpen(true); };
    window.addEventListener('acttolog:search-open', on);
    return () => window.removeEventListener('acttolog:search-open', on);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    else { setQ(''); searched.current = ''; }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const search = useCallback(async (query: string) => {
    setQ(query);
    if (searched.current === query) return;
    searched.current = query;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&locale=${locale}`);
      const data = await res.json();
      setResults(data.results || []);
      if (query.trim()) track('search', { q: query.trim(), where: 'global' });
    } catch { /* keep previous */ }
  }, [locale]);

  useEffect(() => {
    if (open && !results.length && !searched.current) search('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const groups: Record<string, Result[]> = {};
  results.forEach((r) => { (groups[r.k] = groups[r.k] || []).push(r); });
  const names = GROUP_NAMES(t);

  const askAI = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('acttolog:ai-open', { detail: q }));
    if (window.location.pathname !== '/ai') router.push('/ai');
  };

  return (
    <div className="mbd" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="mcard" role="dialog" aria-modal="true" aria-label={t('search')}>
        <div className="p-4 sm:p-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--cy)' }}><Icon name="search" size={19} /></span>
          <input ref={inputRef} className="inp !border-0 !bg-transparent !px-0 !py-1 !text-[16px] !shadow-none"
            value={q} onChange={(e) => search(e.target.value)}
            placeholder={t('search.ph')} aria-label={t('search')} autoComplete="off" />
          <span className="kbd hidden sm:inline">ESC</span>
        </div>
        <div className="p-4 sm:p-5 max-h-[60vh] overflow-auto">
          {results.length ? (
            Object.keys(groups).map((k) => (
              <div className="mb-5" key={k}>
                <div className="mono text-[10px] tracking-[.2em] dim mb-2.5">
                  {(names[k as keyof typeof names] || k).toUpperCase()} · {groups[k].length}
                </div>
                {groups[k].slice(0, 8).map((r, i) => r.ext ? (
                  <a key={i} className="rowlink !grid-cols-[1fr_auto] !py-3" href={r.route}
                    target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                    <div>
                      <div className="text-[14px] font-medium">{r.title}</div>
                      <div className="dim text-[12px] mt-0.5">{r.sub}</div>
                    </div>
                    <Icon name="arrow" size={15} />
                  </a>
                ) : (
                  <Link key={i} className="rowlink !grid-cols-[1fr_auto] !py-3" href={r.route} onClick={() => setOpen(false)}>
                    <div>
                      <div className="text-[14px] font-medium flex items-center gap-2">
                        {r.title}
                        {r.mem && <span className="badge b-vi"><Icon name="lock" size={10} />{t('members')}</span>}
                      </div>
                      <div className="dim text-[12px] mt-0.5">{r.sub}</div>
                    </div>
                    <Icon name="arrow" size={15} />
                  </Link>
                ))}
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <div className="dim mb-3">{t('none')}</div>
              <button className="btn btn-g btn-sm" onClick={askAI}>
                {locale === 'ne' ? 'Acttolog AI लाई सोध्नुहोस्' : 'Ask Acttolog AI instead'}
              </button>
            </div>
          )}
        </div>
        <div className="px-5 py-3 flex items-center justify-between gap-3 text-[11.4px] dim mono"
          style={{ borderTop: '1px solid var(--line)' }}>
          <span>{locale === 'ne' ? 'खोजले प्रकाशित सामग्री मात्र देखाउँछ' : 'Search shows published content only'}</span>
          <span>ACTTOLOG INDEX</span>
        </div>
      </div>
    </div>
  );
}
