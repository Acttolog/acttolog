'use client';

import { Icon } from '@/components/ui/Icon';
import type { Bi } from '@/lib/content/types';

export interface LedgerSource {
  id: string;
  name: Bi;
  host: string;
  url: string;
  status: string;
  httpStatus: number | null;
  ms: number | null;
  checkedAt: string;
  lastVerifiedOn: string | null;
}

export interface LedgerMeta {
  compiledAt: string;
  checked: number;
  reachable: number;
  unreachable: number;
  note: Bi;
}

const T = {
  en: {
    kicker: 'SOURCE LEDGER',
    reachable: 'reachable',
    verified: 'VERIFIED',
    down: 'NO RESPONSE',
    blocked: 'BOT CHECK',
    open: 'Open the official portal',
    checked: 'checked',
  },
  ne: {
    kicker: 'स्रोत खाता',
    reachable: 'पहुँचयोग्य',
    verified: 'प्रमाणित',
    down: 'प्रतिक्रिया छैन',
    blocked: 'बोट जाँच',
    open: 'आधिकारिक पोर्टल खोल्नुहोस्',
    checked: 'जाँचिएको',
  },
} as const;

const day = (iso: string) => String(iso || '').slice(0, 10);

/**
 * The homepage's single statement of source provenance: which official portals
 * were actually fetched, what they answered, and when. Nothing here is inferred.
 */
export function SourceLedger({
  locale,
  sources,
  meta,
}: {
  locale: 'en' | 'ne';
  sources: LedgerSource[];
  meta: LedgerMeta;
}) {
  const t = T[locale];
  const bi = (v: Bi) => (locale === 'ne' ? v.ne || v.en : v.en);
  const rows = sources.slice(0, 6);
  const timed = rows.filter((r) => r.ms != null);
  const avg = timed.length ? Math.round(timed.reduce((s, r) => s + (r.ms || 0), 0) / timed.length) : 0;

  return (
    <div className="srcled">
      <p className="dk-kicker mono">
        {t.kicker}{' '}
        <span className="dk-dim">
          · {meta.reachable}/{meta.checked} {t.reachable}
        </span>
      </p>
      <ul className="dk-net">
        {rows.map((s) => {
          const up = s.status === 'reachable' || s.status === 'redirected';
          const measured = [
            s.host,
            s.httpStatus != null ? `HTTP ${s.httpStatus}` : null,
            s.ms != null ? `${s.ms}ms` : null,
            `${t.checked} ${day(s.checkedAt)}`,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={s.id}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={measured}
                aria-label={`${bi(s.name)} — ${up ? t.verified : t.down}. ${t.open}.`}
              >
                <span
                  className="dk-dot"
                  style={{ background: up ? 'var(--ok)' : 'var(--warn, var(--gold))' }}
                  aria-hidden="true"
                />
                <span className="dk-net-name">{bi(s.name)}</span>
                <span className={`dk-status mono${up ? '' : ' down'}`}>
                  {up ? t.verified : s.status === 'blocked' ? t.blocked : t.down}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="dk-foot mono srcled-foot">
        <Icon name="search" size={11} />
        <time dateTime={meta.compiledAt}>{day(meta.compiledAt)}</time>
        {timed.length > 0 && <> · {avg}ms</>}
      </p>
      <p className="srcled-note">{bi(meta.note)}</p>
    </div>
  );
}