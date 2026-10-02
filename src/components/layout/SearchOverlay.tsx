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
  command: 'World Commands', places: 'Places',
  division: t('nav.div'), blog: t('nav.blog'), darkroom: 'Darkroom', games: t('games'),
  entertainment: 'Entertainment', academy: 'Academy', research: 'Thesyn Research', offers: t('nav.offers'),
});

/** Global search overlay (spec §18/§26/§55) — ⌘K: world commands + places + content + AI. */
export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [places, setPlaces] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, locale } = useI18n();
  const router = useRouter();
  const searched = useRef('');
  const placeReq = useRef(0);

  useEffect(() => {
    const on = () => { setOpen(true); };
    window.addEventListener('acttolog:search-open', on);
    return () => window.removeEventListener('acttolog:search-open', on);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    else { setQ(''); setPlaces([]); searched.current = ''; }
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
    const { results } = await searchAnywhere(query, locale);
    setResults(results);
    if (query.trim()) track('search', { q: query.trim(), where: 'global' });
  }, [locale]);

  /* PLACES — Nominatim (key-free), deep-links into /explore (spec §18). */
  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) { setPlaces([]); return; }
    const req = ++placeReq.current;
    const tId = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&q=${encodeURIComponent(query)}`);
        if (!r.ok || req !== placeReq.current) return;
        const j = await r.json();
        setPlaces(j.map((x: { place_id: number; name?: string; display_name?: string; lat: string; lon: string; category?: string; type?: string }) => {
          const name = x.name || x.display_name?.split(',')[0] || 'Unnamed';
          return {
            k: 'places',
            title: name,
            sub: `${(x.display_name || '').split(',').slice(1, 4).join(',').trim() || 'World'} · ${Number(x.lat).toFixed(3)}, ${Number(x.lon).toFixed(3)}`,
            route: `/explore?mode=map&lat=${Number(x.lat).toFixed(5)}&lng=${Number(x.lon).toFixed(5)}&zoom=13&place=${encodeURIComponent(name)}`,
          } as Result;
        }));
      } catch { setPlaces([]); } // offline/blocked → content search still works
    }, 500);
    return () => clearTimeout(tId);
  }, [q]);

  useEffect(() => {
    if (open && !results.length && !searched.current) search('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const ql = q.trim().toLowerCase();
  const WORLD_COMMANDS: { label: string; hint: string; run: () => void }[] = [
    { label: locale === 'ne' ? 'पृथ्वी खोल्नुहोस्' : 'Go to Earth', hint: 'EARTH', run: () => router.push('/explore?mode=earth') },
    { label: locale === 'ne' ? 'नक्सा खोल्नुहोस्' : 'Open Map', hint: 'MAP', run: () => router.push('/explore?mode=map') },
    { label: 'Open Satellite', hint: 'SAT', run: () => router.push('/explore?mode=sat') },
    { label: 'Open 360 Worlds', hint: '360', run: () => router.push('/explore?mode=360') },
    { label: 'Search Kathmandu', hint: 'PLACE', run: () => router.push('/explore?mode=map&lat=27.71720&lng=85.32400&zoom=13&place=Kathmandu') },
    { label: 'Search Pokhara', hint: 'PLACE', run: () => router.push('/explore?mode=map&lat=28.20960&lng=83.98560&zoom=12&place=Pokhara') },
    { label: 'Open Research', hint: 'WORLD', run: () => router.push('/research') },
    { label: 'Open Academy', hint: 'WORLD', run: () => router.push('/academy') },
    { label: 'Open Games', hint: 'WORLD', run: () => router.push('/games') },
    { label: 'Open Darkroom', hint: 'WORLD', run: () => router.push('/darkroom') },
    { label: locale === 'ne' ? 'एआई खोल्नुहोस्' : 'Open AI', hint: 'AI', run: () => router.push('/ai') },
    { label: 'Open My ACTTOLOG', hint: 'ACCOUNT', run: () => router.push('/my') },
  ].filter((c) => !ql || c.label.toLowerCase().includes(ql) || c.hint.toLowerCase().includes(ql));

  const groups: Record<string, Result[]> = {};
  places.forEach((r) => { (groups[r.k] = groups[r.k] || []).push(r); });
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
            placeholder={locale === 'ne' ? 'संसार खोज्नुहोस् — ठाउँ, सामग्री, आदेशहरू…' : 'Search the world — places, content, commands…'}
            aria-label={t('search')} autoComplete="off" />
          <span className="kbd hidden sm:inline">ESC</span>
        </div>
        <div className="p-4 sm:p-5 max-h-[60vh] overflow-auto">
          {WORLD_COMMANDS.length > 0 && (
            <div className="mb-5">
              <div className="mono text-[10px] tracking-[.2em] dim mb-2.5">WORLD COMMANDS · {WORLD_COMMANDS.length}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {WORLD_COMMANDS.map((c) => (
                  <button key={c.label} className="rowlink !grid-cols-[1fr_auto] !py-2.5 text-left"
                    onClick={() => { setOpen(false); track('cta_interaction', { cta: 'world_command', label: c.label }); c.run(); }}>
                    <div className="text-[13px] font-medium truncate">{c.label}</div>
                    <span className="mono text-[9px] tracking-[.16em] dim">{c.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {(places.length > 0 || results.length > 0) ? (
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
                  <Link key={i} className="rowlink !grid-cols-[1fr_auto] !py-3" href={r.route}
                    onClick={() => { setOpen(false); if (k === 'places') track('place_search', { q: q.trim(), where: 'global' }); }}>
                    <div>
                      <div className="text-[14px] font-medium flex items-center gap-2">
                        {k === 'places' && <span style={{ color: 'var(--cy)' }}><Icon name="globe" size={14} /></span>}
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
          <span>{locale === 'ne' ? 'प्रकाशित सामग्री + ठाउँ मात्र' : 'Published content + real places only'}</span>
          <span>ACTTOLOG INDEX · PLACES © OSM</span>
        </div>
      </div>
    </div>
  );
}
