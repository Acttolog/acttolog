'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { usePrefs, THEMES } from '@/lib/prefs';
import { useSession } from '@/lib/session';
import type { Division, NavItem } from '@/lib/content/types';
import { track } from '@/lib/analytics';

const DIV_ROUTES = /^\/(research|entertainment|academy|games|darkroom)/;

export function Header({ nav, divisions: divs, brand }: {
  nav: NavItem[]; divisions: Division[]; brand: string;
}) {
  const { t, L, locale, setLocale } = useI18n();
  const { theme, setTheme, toggleTheme } = usePrefs();
  const [themeOpen, setThemeOpen] = useState(false);
  const { user, signIn, signOut } = useSession();
  const pathname = usePathname();

  const [stuck, setStuck] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setDrawerOpen(false); setMegaOpen(false); setMeOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const openSearch = useCallback(() => window.dispatchEvent(new CustomEvent('acttolog:search-open')), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') { setMegaOpen(false); setMeOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSearch]);

  const items = [
    { id: 'home', label: { en: 'Home', ne: 'गृहपृष्ठ' }, route: '/', order: 1, visible: true },
    { id: 'div', label: { en: 'Divisions', ne: 'विभागहरू' }, route: '', order: 2, visible: true, mega: true },
    ...nav,
    { id: 'ai', label: { en: 'AI', ne: 'एआई' }, route: '/ai', order: 7, visible: true },
  ].sort((a, b) => (a.order || 9) - (b.order || 9)) as (NavItem & { mega?: boolean })[];

  const isOn = (route: string) =>
    pathname === (route || '/') ||
    (route === '/blog' && pathname.startsWith('/blog')) ||
    (route === '/offers' && pathname.startsWith('/offers'));

  const initials = (user?.name || 'A').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const isStaff = user?.role === 'Owner' || user?.role === 'Admin';

  return (
    <>
      <header id="nav" className={stuck ? 'stuck' : ''}>
        <div className="wrap navin">
          <Link href="/" className="brand" aria-label={`${brand} — Home`}>
            <span className="bmark"><Logo variant="icon" width={20} /></span>
            <span>{brand}</span>
          </Link>

          <nav className="nlinks" aria-label="Primary">
            {items.map((n) => n.mega ? (
              <button key={n.id} className="nlink" aria-haspopup="true" aria-expanded={megaOpen}
                onMouseEnter={() => { if (megaTimer.current) clearTimeout(megaTimer.current); setMegaOpen(true); }}
                onClick={() => setMegaOpen((v) => !v)}
                style={DIV_ROUTES.test(pathname) ? { color: 'var(--txt)' } : undefined}>
                {L(n.label)}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                  style={{ marginLeft: 5, transform: megaOpen ? 'rotate(180deg)' : 'none', transition: '.3s' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            ) : (
              <Link key={n.id} href={n.route || '/'}
                className={`nlink${isOn(n.route) ? ' on' : ''}`}
                style={n.route === '/ai' ? { color: 'var(--cy)' } : undefined}
                onMouseEnter={() => setMegaOpen(false)}>
                {L(n.label)}
              </Link>
            ))}
          </nav>

          <div className="nact" onMouseLeave={() => { megaTimer.current = setTimeout(() => setMegaOpen(false), 160); }}>
            <button className="ico" onClick={openSearch} aria-label={t('search')} title="Search (⌘K)">
              <Icon name="search" size={17} />
            </button>
            <button className="ico" onClick={() => setLocale(locale === 'en' ? 'ne' : 'en')}
              aria-label={t('lang')} title="English | नेपाली">
              <span className="mono text-[10.4px] font-bold">{locale === 'en' ? 'EN' : 'ने'}</span>
            </button>
            <button className="ico" onClick={(e) => { e.stopPropagation(); setThemeOpen((v) => !v); }} aria-label={t('theme')} title={t('theme')} aria-haspopup="menu" aria-expanded={themeOpen}>
              {theme === 'dark' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
                </svg>
              )}
            </button>
            {themeOpen && (
              <div className="panel" role="menu" style={{ position: 'fixed', top: 64, right: 96, zIndex: 960, minWidth: 210, padding: 10, borderRadius: 16 }}
                onClick={() => setThemeOpen(false)}>
                <div className="mono text-[9.4px] tracking-[.22em] dim px-2 pb-2">THEMES</div>
                {THEMES.map((th) => (
                  <button key={th.id} className="w-full flex items-center gap-3 px-3 py-2 rounded-[11px] text-[12.8px] transition-colors"
                    style={theme === th.id ? { background: 'color-mix(in srgb,var(--cy) 14%,transparent)', color: 'var(--txt)' } : { color: 'var(--mut)' }}
                    onClick={() => setTheme(th.id)}>
                    <span className="w-6 h-6 rounded-lg flex-none border" style={{ background: th.sw[0], borderColor: 'var(--line2)' }}>
                      <span className="block w-2.5 h-2.5 rounded-full m-auto" style={{ background: th.sw[1] }} />
                    </span>
                    {th.label}
                    {theme === th.id && <span className="ml-auto" style={{ color: 'var(--cy)' }}><Icon name="check" size={13} /></span>}
                  </button>
                ))}
              </div>
            )}

            {!user ? (
              <button className="btn btn-p btn-sm hidden sm:inline-flex"
                onClick={() => { track('cta_interaction', { cta: 'header_signin' }); signIn(); }}>
                {t('signin')}
              </button>
            ) : (
              <div className="relative">
                <button className="ico !w-auto !px-2.5" aria-haspopup="menu" aria-expanded={meOpen}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={(e) => { e.stopPropagation(); setMeOpen((v) => !v); }}>
                  <span className="w-6 h-6 rounded-full grid place-items-center mono text-[10px] font-bold"
                    style={{ background: 'var(--grad)', color: '#04060e' }}>{initials}</span>
                  <span className="hidden md:inline text-[12.8px] font-medium" style={{ color: 'var(--txt)' }}>
                    {user.name.split(' ')[0]}
                  </span>
                </button>
                {meOpen && (
                  <div className="panel" role="menu" onClick={() => setMeOpen(false)}
                    style={{ position: 'fixed', top: 64, right: 14, zIndex: 960, minWidth: 250, padding: 10, borderRadius: 16 }}>
                    <div className="p-3 mb-2" style={{ borderBottom: '1px solid var(--line)' }}>
                      <div className="font-display font-semibold text-[14.3px] mb-1">
                        {user.name} <span className="badge b-info">{user.role}</span>
                      </div>
                      <div className="dim text-[11.8px] mono">{user.email}</div>
                    </div>
                    <nav className="anav">
                      <Link href="/my" className="!flex gap-2.5 items-center px-3 py-2.5 rounded-[11px] text-[13.3px]">
                        <Icon name="users" size={16} />{t('my')}
                      </Link>
                      {isStaff && (
                        <Link href="/admin" className="!flex gap-2.5 items-center px-3 py-2.5 rounded-[11px] text-[13.3px]">
                          <Icon name="gear" size={16} />{t('admin')}
                        </Link>
                      )}
                      <button onClick={signOut} className="!flex gap-2.5 items-center px-3 py-2.5 rounded-[11px] text-[13.3px]"
                        style={{ color: 'var(--err)' }}>
                        <Icon name="out" size={16} />{t('signout')}
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            )}

            <button className={`burger${drawerOpen ? ' on' : ''}`} aria-label="Menu" aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}><i /></button>
          </div>
        </div>
      </header>

      {/* Divisions mega-menu */}
      <div id="mega" className={megaOpen ? 'open' : ''}
        onMouseEnter={() => { if (megaTimer.current) clearTimeout(megaTimer.current); setMegaOpen(true); }}
        onMouseLeave={() => { megaTimer.current = setTimeout(() => setMegaOpen(false), 160); }}>
        <div className="wrap">
          <div className="mega-in">
            {divs.map((d) => (
              <Link key={d.id} href={d.route} className="mega-item" onClick={() => track('division_view', { division: d.id })}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="w-8 h-8 rounded-lg grid place-items-center"
                    style={{ background: `${d.color}1f`, color: d.color, border: `1px solid ${d.color}44` }}>
                    <Icon name={d.icon} size={16} />
                  </span>
                  <span className="font-display font-semibold text-[14px]">{L(d.name)}</span>
                </div>
                <div className="mono text-[9.4px] tracking-[.16em] dim mb-1.5">{L(d.sub).toUpperCase()}</div>
                <p className="mut text-[12.2px] leading-relaxed line-clamp-2">{L(d.desc)}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile drawer — its own polished composition (spec §14) */}
      <div id="drawer" className={drawerOpen ? 'open' : ''} aria-hidden={!drawerOpen}>
        <Link href="/" className="dlink !border-0 !text-[clamp(1.5rem,6vw,2.2rem)]" style={{ color: 'var(--txt)' }}>
          <span className="gtext">ACTTOLOG</span>
          <span className="mono text-[10px] dim tracking-[.26em]">WORLD</span>
        </Link>
        {items.filter((n) => !n.mega).map((n) => (
          <Link key={n.id} href={n.route || '/'} className={`dlink !text-[clamp(1.3rem,5.6vw,2rem)]${isOn(n.route) ? ' on' : ''}`}
            style={n.route === '/ai' ? { color: 'var(--cy)' } : undefined}>
            <span>{L(n.label)}</span>
            <Icon name="arrow" size={17} />
          </Link>
        ))}
        <div className="pt-3">
          <div className="dlink" style={{ pointerEvents: 'none' }}>
            <span>{locale === 'ne' ? 'विभागहरू' : 'Divisions'}</span>
          </div>
          {divs.map((d) => (
            <Link key={d.id} href={d.route}
              className="dlink !text-[clamp(1.05rem,4.4vw,1.4rem)] pl-4"
              onClick={() => track('division_view', { division: d.id })}>
              <span className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg grid place-items-center"
                  style={{ background: `${d.color}1f`, color: d.color, border: `1px solid ${d.color}44` }}>
                  <Icon name={d.icon} size={14} />
                </span>
                {L(d.name)}
              </span>
              <Icon name="arrow" size={15} />
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-8">
          {!user ? (
            <button className="btn btn-p" onClick={() => { setDrawerOpen(false); signIn(); }}>{t('signin')}</button>
          ) : (
            <>
              <Link href="/my" className="btn btn-g">{t('my')}</Link>
              <button className="btn btn-g" onClick={signOut}>{t('signout')}</button>
            </>
          )}
          <button className="btn btn-g" onClick={() => setLocale(locale === 'en' ? 'ne' : 'en')}>
            {locale === 'en' ? 'नेपाली' : 'English'}
          </button>
          <button className="btn btn-g" onClick={toggleTheme}>
            <Icon name={theme === 'dark' ? 'star' : 'spark'} size={15} />{t('theme')}
          </button>
        </div>
      </div>
    </>
  );
}
