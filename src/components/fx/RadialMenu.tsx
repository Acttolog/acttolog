'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { prefersReduced } from './Motion';
import type { Division } from '@/lib/content/types';

/**
 * RadialMenu — nonlinear navigation: the five divisions fan out around a
 * floating command button instead of living only in the flat header.
 *
 * Everything is reachable by keyboard: arrows move the highlight, Enter opens,
 * Escape closes and returns focus. Under reduced motion the same items render
 * as a plain list, so the interaction never depends on the animation.
 */
export function RadialMenu({ divisions }: { divisions: Division[] }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [mounted, setMounted] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const btn = useRef<HTMLButtonElement | null>(null);
  const hiRef = useRef(0);
  const { setLocale, locale } = useI18n();
  const reduced = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    reduced.current = prefersReduced();
  }, []);

  useEffect(() => {
    if (!open) return;
    const count = divisions.length + 2;
    // Focus follows the highlight: on a short viewport the pad scrolls, and a
    // highlight that moved without focus would leave the active row off-screen.
    const move = (d: number) => {
      const n = (hiRef.current + d + count) % count;
      hiRef.current = n;
      setHi(n);
      root.current?.querySelectorAll<HTMLElement>('.radial-link')[n]?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        btn.current?.focus();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      }
    };
    const onAway = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onAway);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onAway);
    };
  }, [open, divisions.length]);

  const items = [
    ...divisions.map((d) => ({ key: d.id, href: d.route, label: d.name.en, sub: d.sub.en, color: d.color })),
    { key: 'search', href: '', label: 'Search', sub: 'World', color: 'var(--cy)' },
    { key: 'locale', href: '', label: locale === 'ne' ? 'English' : 'नेपाली', sub: 'Language', color: 'var(--gold)' },
  ];

  const activate = (key: string) => {
    if (key === 'search') {
      window.dispatchEvent(new CustomEvent('acttolog:search-open'));
      setOpen(false);
    } else if (key === 'locale') {
      setLocale(locale === 'ne' ? 'en' : 'ne');
      setOpen(false);
    } else {
      setOpen(false);
    }
  };

  const tree = (
    <div className={`radial${open ? ' open' : ''}${reduced.current ? ' rm' : ''}`} ref={root}>
      <button
        ref={btn}
        type="button"
        className="radial-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close the division menu' : 'Open the division menu'}
        onClick={() => {
          setOpen((o) => !o);
          hiRef.current = 0;
          setHi(0);
        }}
      >
        <span className="radial-btn-core" aria-hidden="true">
          <Icon name={open ? 'close' : 'layers'} size={19} />
        </span>
        <span className="radial-btn-ring" aria-hidden="true" />
      </button>

      {open && (
        <ul className="radial-items" role="menu" aria-label="Jump to a division">
          {items.map((it, i) => (
            <li
              key={it.key}
              role="none"
              className={`radial-item${hi === i ? ' hi' : ''}`}
              style={
                {
                  // A sine bulge gives the cascade its fan silhouette without
                  // letting any row share another row's vertical band.
                  '--dx': `${Math.round(-56 * Math.sin((Math.PI * i) / Math.max(items.length - 1, 1)))}px`,
                  '--c': it.color,
                } as CSSProperties
              }
              onMouseEnter={() => {
                hiRef.current = i;
                setHi(i);
              }}
            >
              {it.href ? (
                <Link role="menuitem" href={it.href} className="radial-link" tabIndex={hi === i ? 0 : -1} onClick={() => setOpen(false)}>
                  <b>{it.label}</b>
                  <small>{it.sub}</small>
                </Link>
              ) : (
                <button
                  role="menuitem"
                  type="button"
                  className="radial-link"
                  tabIndex={hi === i ? 0 : -1}
                  onClick={() => activate(it.key)}
                >
                  <b>{it.label}</b>
                  <small>{it.sub}</small>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // Body-level portal: the route template animates a translate, and any element
  // inside it would resolve `position: fixed` against the page, not the viewport.
  return mounted ? createPortal(tree, document.body) : null;
}
