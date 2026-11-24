'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Icon } from '@/components/ui/Icon';

export interface RailItem {
  id: string;
  label: string;
}

const byVisualOrder = (a: Element, b: Element) =>
  (Number(getComputedStyle(a).order) || 0) - (Number(getComputedStyle(b).order) || 0);

/**
 * Console rail navigation for narrow screens. The deck keeps all fifteen cards
 * mounted in a horizontal snap rail; this is the steering wheel for it. Card
 * order follows the rendered order, which CSS reorders per breakpoint.
 */
export function DeckRail({
  gridRef,
  items,
  locale,
}: {
  gridRef: RefObject<HTMLDivElement | null>;
  items: RailItem[];
  locale: 'en' | 'ne';
}) {
  const [active, setActive] = useState(0);
  const [labels, setLabels] = useState<string[]>([]);
  const seeded = useRef(false);
  const t =
    locale === 'ne'
      ? { prev: 'अघिल्लो कार्ड', next: 'अर्को कार्ड', card: 'कार्ड', cards: 'कन्सोल कार्डहरू' }
      : { prev: 'Previous card', next: 'Next card', card: 'Card', cards: 'Console cards' };

  const cardsOf = useCallback(() => {
    const rail = gridRef.current;
    if (!rail) return [] as HTMLElement[];
    return [...rail.querySelectorAll<HTMLElement>('.deck-card')].sort(byVisualOrder);
  }, [gridRef]);

  const labelOf = useCallback(
    (el: Element) => items.find((it) => el.classList.contains(it.id))?.label || '',
    [items],
  );

  const go = useCallback(
    (i: number) => {
      const rail = gridRef.current;
      const cards = cardsOf();
      if (!rail || !cards.length) return;
      const idx = ((i % cards.length) + cards.length) % cards.length;
      const el = cards[idx];
      // offsetLeft is relative to the nearest positioned ancestor, which is not
      // the rail — measure against the rail's own box instead.
      const left = el.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
      rail.scrollTo({ left: left - (rail.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
      setActive(idx);
    },
    [gridRef, cardsOf],
  );

  useEffect(() => {
    const rail = gridRef.current;
    if (!rail) return;
    const cards = cardsOf();
    if (!cards.length) return;
    // Chrome anchors horizontal scroll to a node inside a card; as fonts and
    // lazy art land, that anchor drags the rail several cards deep. Open on 01.
    // Once only — this effect re-runs when `items` changes identity, and
    // resetting every time would fight the arrows.
    if (!seeded.current) {
      seeded.current = true;
      rail.scrollLeft = 0;
      setActive(0);
    }
    setLabels(cards.map(labelOf));
    const io = new IntersectionObserver(
      (entries) => {
        let best = -1;
        let bestRatio = 0.55;
        for (const e of entries) {
          if (e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            best = cards.indexOf(e.target as HTMLElement);
          }
        }
        if (best >= 0) setActive(best);
      },
      { root: rail, threshold: [0.55, 0.8, 1] },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [gridRef, cardsOf, labelOf]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(active - 1);
    }
  };

  return (
    <div className="deck-rail-nav" onKeyDown={onKey}>
      <button type="button" className="drn-arrow" onClick={() => go(active - 1)} aria-label={t.prev}>
        <Icon name="arrow" size={15} />
      </button>
      <div className="drn-mid">
        <p className="drn-count mono">
          {String(active + 1).padStart(2, '0')} <span>/ {String(labels.length || items.length).padStart(2, '0')}</span>
        </p>
        <p className="drn-label">{labels[active] || ''}</p>
      </div>
      <button type="button" className="drn-arrow next" onClick={() => go(active + 1)} aria-label={t.next}>
        <Icon name="arrow" size={15} />
      </button>
      {/* A group of buttons, not a tablist: there are no tabpanels, so
          aria-selected would promise a relationship the markup does not have. */}
      <div className="drn-dots" role="group" aria-label={t.cards}>
        {(labels.length ? labels : items.map((i) => i.label)).map((l, i) => (
          <button
            key={l + i}
            type="button"
            aria-current={i === active ? 'true' : undefined}
            aria-label={`${t.card} ${i + 1}: ${l}`}
            className={`drn-dot${i === active ? ' on' : ''}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}