'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Bi } from '@/lib/content/types';

export interface WireEvent {
  id: string;
  at: string;
  kind: 'release' | 'notice' | 'verified' | 'unreachable' | 'blocked' | 'closing';
  title: Bi;
  org?: Bi;
  route: string;
  ext?: boolean;
  color: string;
  icon: string;
  meta?: Bi;
}

const T = {
  en: {
    kicker: 'LIVE WIRE',
    events: 'events',
    compiled: 'compiled',
    release: 'NEW',
    notice: 'NOTICE',
    verified: 'VERIFIED',
    unreachable: 'NO RESPONSE',
    blocked: 'BOT CHECK',
    closing: 'CLOSING',
    now: 'just now',
    ago: 'ago',
    in: 'in',
    day: 'd',
    hour: 'h',
    min: 'm',
  },
  ne: {
    kicker: 'प्रत्यक्ष तार',
    events: 'गतिविधि',
    compiled: 'सङ्कलित',
    release: 'नयाँ',
    notice: 'सूचना',
    verified: 'प्रमाणित',
    unreachable: 'प्रतिक्रिया छैन',
    blocked: 'बोट जाँच',
    closing: 'बन्द हुँदै',
    now: 'भर्खरै',
    ago: 'अघि',
    in: 'मा',
    day: 'दिन',
    hour: 'घण्टा',
    min: 'मिनेट',
  },
} as const;

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

function stamp(at: string, now: number, locale: 'en' | 'ne') {
  const t = T[locale];
  const then = new Date(at).getTime();
  if (!Number.isFinite(then)) return String(at || '').slice(0, 10);
  const d = then - now;
  const abs = Math.abs(d);
  const n =
    abs >= DAY ? `${Math.floor(abs / DAY)}${t.day}` : abs >= HOUR ? `${Math.floor(abs / HOUR)}${t.hour}` : `${Math.max(1, Math.floor(abs / MIN))}${t.min}`;
  if (abs < MIN) return t.now;
  return d < 0 ? `${n} ${t.ago}` : `${t.in} ${n}`;
}

/**
 * Chronological activity across the network. Every row is a dated ledger record
 * (a release, a posted notice, a measured source check, a real deadline) — the
 * relative stamp is recomputed in the browser, the events themselves are not.
 */
export function LiveWire({
  locale,
  events,
  compiledAt,
}: {
  locale: 'en' | 'ne';
  events: WireEvent[];
  compiledAt: string;
}) {
  const t = T[locale];
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const bi = (v: Bi | undefined) => (v ? (locale === 'ne' ? v.ne || v.en : v.en) : '');
  const rows = events.slice(0, 6);

  return (
    <div className="wire">
      <p className="dk-kicker mono">
        <span className="wire-pulse" aria-hidden="true" />
        {t.kicker}{' '}
        <span className="dk-dim">
          · {rows.length} {t.events} · {t.compiled}{' '}
          <time dateTime={compiledAt}>{String(compiledAt).slice(0, 10)}</time>
        </span>
      </p>
      <ul className="dk-feed">
        {rows.map((e) => {
          const label = t[e.kind];
          const inner = (
            <>
              <span className="dk-kind mono" style={{ color: e.color, borderColor: e.color }}>
                {label}
              </span>
              <span className="dk-feed-title">
                {bi(e.title)}
                {e.org && <em className="wire-org">{bi(e.org)}</em>}
              </span>
              <span className="dk-feed-date mono" suppressHydrationWarning>
                {now == null ? String(e.at).slice(0, 10) : stamp(e.at, now, locale)}
              </span>
            </>
          );
          return (
            <li key={e.id} data-kind={e.kind}>
              {e.ext ? (
                <a href={e.route} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              ) : (
                <Link href={e.route}>{inner}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}