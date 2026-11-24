'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { Bi } from '@/lib/content/types';

export interface EcoNode {
  name: Bi;
  route: string;
  color: string;
  icon: string;
}

const L = {
  en: {
    kicker: 'ECOSYSTEM MAP',
    core: 'ACTTOLOG',
    divisions: 'divisions',
    live: 'DIRECT ROUTES · KEYBOARD READY',
    hint: 'Hover or focus a node to inspect a division.',
    open: 'Open division',
  },
  ne: {
    kicker: 'इकोसिस्टम नक्सा',
    core: 'ACTTOLOG',
    divisions: 'महाशाखा',
    live: 'सिधै मार्ग · किबोर्ड तयार',
    hint: 'महाशाखा हेर्न नोडमा होभर वा फोकस गर्नुहोस्।',
    open: 'महाशाखा खोल्नुहोस्',
  },
} as const;

const CX = 320;
const CY = 150;
const RX = 250;
const RY = 112;

function pos(i: number, n: number) {
  const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
  return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) };
}

/** Orbital map of the five division routes — relationships, not figures. */
export function Ecosystem({ nodes, locale }: { nodes: EcoNode[]; locale: 'en' | 'ne' }) {
  const t = L[locale];
  const [active, setActive] = useState<number | null>(null);
  const n = nodes.length;
  const current = active !== null ? nodes[active] : null;
  const bi = (x: Bi) => (locale === 'ne' ? x.ne || x.en : x.en);

  return (
    <div className="eco">
      <p className="dk-kicker mono">{t.kicker}</p>

      <svg className="eco-svg" viewBox="0 0 640 300" role="img" aria-label={`${t.kicker}: ${n} ${t.divisions}`}>
        <defs>
          <radialGradient id="ecoCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--cy)" stopOpacity="0.9" />
            <stop offset="60%" stopColor="var(--vi)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--vi)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse className="eco-ring" cx={CX} cy={CY} rx={RX} ry={RY} />

        {nodes.map((d, i) => {
          const p = pos(i, n);
          return (
            <line
              key={`l-${d.route}`}
              className={`eco-line${active === i ? ' on' : ''}${active !== null && active !== i ? ' off' : ''}`}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke={d.color}
            />
          );
        })}

        <circle className="eco-core-glow" cx={CX} cy={CY} r="58" fill="url(#ecoCore)" />
        <circle className="eco-core" cx={CX} cy={CY} r="34" />
        <text className="eco-core-label mono" x={CX} y={CY - 2} textAnchor="middle">
          {t.core}
        </text>
        <text className="eco-core-num mono" x={CX} y={CY + 16} textAnchor="middle">
          {n}
        </text>

        {nodes.map((d, i) => {
          const p = pos(i, n);
          const dim = active !== null && active !== i;
          return (
            <a
              key={d.route}
              href={d.route}
              className={`eco-node${active === i ? ' on' : ''}${dim ? ' off' : ''}`}
              style={{ '--nc': d.color } as CSSProperties}
              aria-label={`${bi(d.name)}. ${t.open}.`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <circle className="eco-node-hit" cx={p.x} cy={p.y} r="52" fill="transparent" pointerEvents="all" />
              <circle className="eco-node-bg" cx={p.x} cy={p.y} r="30" />
              <circle className="eco-node-ring" cx={p.x} cy={p.y} r="30" />
              <svg x={p.x - 11} y={p.y - 11} width="22" height="22">
                <Icon name={d.icon} size={22} strokeWidth={1.8} />
              </svg>
            </a>
          );
        })}
      </svg>

      <div className="eco-legend" role="list">
        {nodes.map((d, i) => (
          <Link
            key={d.route}
            href={d.route}
            role="listitem"
            className={`eco-chip${active === i ? ' on' : ''}`}
            style={{ '--nc': d.color } as CSSProperties}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <span className="eco-chip-dot" aria-hidden="true" />
            <span className="eco-chip-name">{bi(d.name)}</span>
          </Link>
        ))}
      </div>

      <p className="eco-detail" aria-live="polite">
        {current ? (
          <>
            <b style={{ color: current.color }}>{bi(current.name)}</b>{' '}
            <span className="mono eco-route">{current.route}</span> ·{' '}
            <Link href={current.route} className="eco-open">
              {t.open} <Icon name="arrow" size={12} />
            </Link>
          </>
        ) : (
          <span className="dk-dim">{t.hint}</span>
        )}
      </p>
      <p className="dk-foot mono">{t.live}</p>
    </div>
  );
}