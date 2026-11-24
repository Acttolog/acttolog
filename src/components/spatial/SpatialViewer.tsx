'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, MouseEvent, PointerEvent, WheelEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { SPATIAL_EVENT } from './types';
import type { SpatialEventDetail, SpatialItem } from './types';

/**
 * Full-screen 3D deck. Seven world plates sit on a CSS-3D ring; drag, wheel,
 * arrow keys or the dots orbit it. Opening is event-driven so any page can
 * summon it without loading a second instance.
 */
export function SpatialViewer({ items }: { items: SpatialItem[] }) {
  const { L, locale } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const openPath = useRef('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ x: number; index: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const wheelAt = useRef(0);
  const count = items.length;
  const step = count ? 360 / count : 0;

  const close = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    setAuto(false);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
      setClosing(false);
      const target = restoreRef.current;
      if (target?.isConnected) target.focus({ preventScroll: true });
    }, 240);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (!count) return;
      setAuto(false);
      setActive(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<SpatialEventDetail | undefined>).detail;
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      const index = detail?.id ? items.findIndex((item) => item.id === detail.id) : 0;
      restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      openPath.current = window.location.pathname;
      setActive(index >= 0 ? index : 0);
      setClosing(false);
      setOpen(true);
    };
    window.addEventListener(SPATIAL_EVENT, onOpen);
    return () => window.removeEventListener(SPATIAL_EVENT, onOpen);
  }, [items]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    document.documentElement.setAttribute('data-spatial-open', '');
    const timer = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 30);
    return () => {
      clearTimeout(timer);
      document.documentElement.removeAttribute('data-spatial-open');
    };
  }, [open]);

  useEffect(() => {
    if (!open || closing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setTimeout(() => setAuto(true), 7000);
    return () => clearTimeout(timer);
  }, [open, closing]);

  useEffect(() => {
    if (!open || pathname === openPath.current) return;
    setOpen(false);
    setClosing(false);
    setAuto(false);
    document.documentElement.removeAttribute('data-spatial-open');
    const target = restoreRef.current;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }, [pathname, open]);

  useEffect(() => {
    if (!open || !auto || !count) return;
    const id = setInterval(() => setActive((index) => (index + 1) % count), 6500);
    return () => clearInterval(id);
  }, [open, auto, count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      setAuto(false);
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(active + 1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(active - 1);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, active, go, close]);

  if (!open || !count) return null;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    setAuto(false);
    drag.current = { x: event.clientX, index: active, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    if (Math.abs(dx) < 10) return;
    state.moved = true;
    const target = state.index - Math.round(dx / 100);
    setActive(((target % count) + count) % count);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!state?.moved) return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 350);
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - wheelAt.current < 240) return;
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(delta) < 14) return;
    wheelAt.current = now;
    go(active + (delta > 0 ? 1 : -1));
  };

  const onCardClick = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (suppressClick.current) {
      event.preventDefault();
      suppressClick.current = false;
      return;
    }
    if (index !== active) {
      event.preventDefault();
      go(index);
    }
  };

  const pad = (value: number) => String(value).padStart(2, '0');
  const current = items[active];

  return createPortal(
    <div
      ref={panelRef}
      className={`spv${closing ? ' closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="ACTTOLOG spatial view"
    >
      <div className="spv-aura" aria-hidden="true" />
      <div className="spv-floor" aria-hidden="true" />

      <header className="spv-top">
        <div className="spv-brand">
          <span className="spv-pulse" aria-hidden="true" />
          <span>ACTTOLOG</span>
          <span className="spv-slash">/</span>
          <span className="spv-mode">SPATIAL VIEW</span>
        </div>
        <div className="spv-top-right">
          <span className="spv-count mono">
            {pad(active + 1)} <i>/</i> {pad(count)}
          </span>
          <button
            ref={closeRef}
            type="button"
            className="spv-x"
            onClick={close}
            aria-label="Close spatial view"
          >
            &times;
          </button>
        </div>
      </header>

      <div
        className="spv-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onPointerEnter={() => setAuto(false)}
      >
        <div className="spv-center">
          <div
            className="spv-ring"
            style={{ '--spv-step': `${step}deg`, '--spv-rot': `${-active * step}deg` } as CSSProperties}
          >
            {items.map((item, index) => {
              const on = index === active;
              return (
                <div
                  key={item.id}
                  className={`spv-slot${on ? ' on' : ''}`}
                  style={{ '--i': index, '--spv-tone': item.color } as CSSProperties}
                >
                  <Link
                    href={item.route}
                    className="spv-card"
                    tabIndex={on ? 0 : -1}
                    onClick={(event) => onCardClick(event, index)}
                    aria-label={`${L(item.title)} — ${locale === 'ne' ? 'स्पेशियल भ्यूमा खोल्नुहोस्' : 'open in spatial view'}`}
                  >
                    {}
                    <img
                      src={item.image}
                      srcSet={item.srcSet}
                      sizes="(max-width: 700px) 78vw, 440px"
                      alt=""
                      decoding="async"
                      draggable={false}
                    />
                    <span className="spv-shade" aria-hidden="true" />
                    <span className="spv-sheen" aria-hidden="true" />
                    <span className="spv-tag mono">{item.tag}</span>
                    <span className="spv-index mono">{pad(index + 1)}</span>
                    <span className="spv-meta">
                      <span className="spv-sub mono">{L(item.sub)}</span>
                      <span className="spv-title">{L(item.title)}</span>
                      <span className="spv-desc">{L(item.desc)}</span>
                      <span className="spv-enter">
                        {locale === 'ne' ? 'प्रवेश गर्नुहोस्' : 'ENTER'}
                        <Icon name="arrow" size={15} />
                      </span>
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="spv-nav prev"
        onClick={() => go(active - 1)}
        aria-label="Previous world"
      >
        <Icon name="arrow" size={21} />
      </button>
      <button type="button" className="spv-nav next" onClick={() => go(active + 1)} aria-label="Next world">
        <Icon name="arrow" size={21} />
      </button>

      <footer className="spv-bottom">
        <div className="spv-dots">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === active ? 'on' : ''}
              style={{ '--spv-tone': item.color } as CSSProperties}
              onClick={() => go(index)}
              aria-label={L(item.title)}
              aria-current={index === active ? 'true' : undefined}
            />
          ))}
        </div>
        <p className="spv-hint mono">
          {locale === 'ne' ? 'तान्नुहोस् · स्क्रोल · ← → · ESC' : 'DRAG · SCROLL · ← → · ESC'}
        </p>
        <p className="sr-only" aria-live="polite">
          {L(current.title)}
        </p>
      </footer>
    </div>,
    document.body,
  );
}
