'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import type { Bi } from '@/lib/content/types';

interface Item { label: Bi; route: string; icon: string; kind: string }

const L = {
  en: {
    kicker: 'LAUNCHPAD',
    ph: 'Jump to a page or tool…',
    sub: 'Type to filter · ↑ ↓ to move · Enter to open',
    empty: 'No match. Try “nepal”, “arcade” or “downloads”.',
    page: 'Page',
    tool: 'Tool',
    home: 'Home',
    nepal: 'Nepal Guide',
    loksewa: 'Loksewa Ghar',
    blog: 'Blog',
    offers: 'Offers',
    my: 'My ACTTOLOG',
    ai: 'AI Assistant',
    search: 'Search',
    about: 'About',
    contact: 'Contact',
    explore: '3D World',
    lab: 'Design Lab',
    syllabus: 'Syllabus Explorer',
    downloads: 'Download Centre',
    arcade: 'Arcade',
    cube: 'CUBE/26 Lab',
  },
  ne: {
    kicker: 'लन्चप्याड',
    ph: 'पृष्ठ वा औजारमा जानुहोस्…',
    sub: 'छान्न टाइप गर्नुहोस् · ↑ ↓ सार्नुहोस् · Enter खोल्नुहोस्',
    empty: 'मिलेन। “nepal”, “arcade” वा “downloads” प्रयास गर्नुहोस्।',
    page: 'पृष्ठ',
    tool: 'औजार',
    home: 'गृह',
    nepal: 'नेपाल गाइड',
    loksewa: 'लोकसेवा घर',
    blog: 'ब्लग',
    offers: 'प्रस्तावहरू',
    my: 'मेरो ACTTOLOG',
    ai: 'एआई सहायक',
    search: 'खोज',
    about: 'बारेमा',
    contact: 'सम्पर्क',
    explore: 'थ्रीडी संसार',
    lab: 'डिजाइन प्रयोगशाला',
    syllabus: 'पाठ्यक्रम अन्वेषक',
    downloads: 'डाउनलोड केन्द्र',
    arcade: 'आर्केड',
    cube: 'CUBE/26 प्रयोगशाला',
  },
} as const;

export function Launchpad({ locale }: { locale: 'en' | 'ne' }) {
  const t = L[locale];
  const router = useRouter();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const page = (label: string, route: string, icon: string): Item => ({
      label: { en: label, ne: label },
      route,
      icon,
      kind: t.page,
    });
    const tool = (label: string, route: string, icon: string): Item => ({
      label: { en: label, ne: label },
      route,
      icon,
      kind: t.tool,
    });
    return [
      page(t.home, '/', 'home'),
      page(t.nepal, '/nepal', 'globe'),
      page(t.loksewa, '/loksewa', 'book'),
      page(t.blog, '/blog', 'doc'),
      page(t.offers, '/offers', 'star'),
      page(t.my, '/my', 'users'),
      page(t.about, '/about', 'compass'),
      page(t.contact, '/contact', 'mail'),
      tool(t.ai, '/ai', 'brain'),
      tool(t.search, '/search', 'search'),
      tool(t.explore, '/explore?mode=earth', 'globe'),
      tool(t.lab, '/design-lab', 'layers'),
      tool(t.syllabus, '/loksewa/explorer', 'compass'),
      tool(t.downloads, '/loksewa/downloads', 'down'),
      tool(t.arcade, '/arcade/index.html', 'game'),
      tool(t.cube, '/cube26/index.html', 'game'),
    ];
  }, [t]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) =>
      [it.label.en, it.label.ne || '', it.route, it.kind].some((v) => v.toLowerCase().includes(s)),
    );
  }, [q, items]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    // Keep the active option visible inside the list only — scrollIntoView here
    // would scroll the whole document to the deck on first paint.
    const list = document.getElementById('lp-list');
    const el = document.getElementById(`lp-opt-${active}`);
    if (!list || !el) return;
    const lr = list.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (er.top < lr.top) list.scrollTop += er.top - lr.top;
    else if (er.bottom > lr.bottom) list.scrollTop += er.bottom - lr.bottom;
  }, [active]);

  const go = (route: string) => router.push(route);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (filtered.length ? (a - 1 + filtered.length) % filtered.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = filtered[active]; if (it) go(it.route); }
    else if (e.key === 'Escape') { setQ(''); inputRef.current?.blur(); }
  };
  const bi = (x: Bi) => (locale === 'ne' ? x.ne || x.en : x.en);

  return (
    <div className="lp">
      <p className="dk-kicker mono">{t.kicker}</p>
      <div className="lp-search">
        <Icon name="search" size={16} />
        <input
          ref={inputRef}
          className="lp-input"
          type="text"
          value={q}
          placeholder={t.ph}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded="true"
          aria-controls="lp-list"
          aria-activedescendant={filtered.length ? `lp-opt-${active}` : undefined}
          aria-label={t.kicker}
          autoComplete="off"
          spellCheck={false}
        />
        {q && (
          <button type="button" className="lp-clear" onClick={() => { setQ(''); inputRef.current?.focus(); }} aria-label="Clear">
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>
      <ul className="lp-list dk-scroll" id="lp-list" role="listbox" aria-label={t.kicker}>
        {filtered.length === 0 && <li className="lp-empty dk-dim">{t.empty}</li>}
        {filtered.map((it, i) => (
          <li key={it.route} id={`lp-opt-${i}`} role="option" aria-selected={i === active}>
            <button
              type="button"
              className={`lp-item${i === active ? ' on' : ''}`}
              onClick={() => go(it.route)}
              onMouseEnter={() => setActive(i)}
              tabIndex={-1}
            >
              <span className="lp-ico"><Icon name={it.icon} size={15} /></span>
              <span className="lp-name">{bi(it.label)}</span>
              <span className="lp-kind mono">{it.kind}</span>
              <span className="lp-route mono">{it.route}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="dk-foot mono">{t.sub}</p>
    </div>
  );
}