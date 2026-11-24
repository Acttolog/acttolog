'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import {
  nb,
  isExternal,
  noticeState,
  noticeSort,
  categoryColor,
  type Notice,
  type NoticeMeta,
  type NoticeCategory,
} from '@/lib/content/notice-utils';
import { urlHost, type PortalReach } from '@/lib/content/source-utils';

const L = {
  en: {
    live: 'NOTICE STATUS',
    search: 'Search notices, organisations, tags…',
    sort: 'Sort',
    urgent: 'Closing soon',
    newest: 'Newest',
    org: 'A–Z',
    all: 'All',
    saved: 'Saved',
    save: 'Save notice',
    unsave: 'Remove from saved',
    more: 'Details',
    less: 'Hide',
    source: 'Official source',
    open: 'Open',
    checked: 'checked',
    listed: 'listed',
    ago: 'd ago',
    today: 'today',
    posted: 'Posted',
    closes: 'Closes',
    location: 'Location',
    tags: 'Tags',
    empty: 'No notices match your filters.',
    clear: 'Clear filters',
    results: 'notices',
    viewAll: 'View full board',
    updated: 'Ledger updated',
    statusLive: 'OFFICIAL PORTAL',
    statusDown: 'NO RESPONSE',
    statusBlocked: 'BOT CHECK',
    statusOpen: 'OPEN',
    statusClosing: 'CLOSING SOON',
    statusClosed: 'CLOSED',
    available: 'available now',
    closedNote: 'window ended',
  },
  ne: {
    live: 'सूचना स्थिति',
    search: 'सूचना, निकाय, ट्याग खोज्नुहोस्…',
    sort: 'क्रम',
    urgent: 'छिट्टै बन्द',
    newest: 'नयाँ',
    org: 'क–ज्ञ',
    all: 'सबै',
    saved: 'सुरक्षित',
    save: 'सूचना सुरक्षित गर्नुहोस्',
    unsave: 'सुरक्षितबाट हटाउनुहोस्',
    more: 'विवरण',
    less: 'लुकाउनुहोस्',
    source: 'आधिकारिक स्रोत',
    open: 'खोल्नुहोस्',
    checked: 'जाँचिएको',
    listed: 'सूचीकृत',
    ago: ' दिन अघि',
    today: 'आज',
    posted: 'प्रकाशित',
    closes: 'बन्द हुने',
    location: 'स्थान',
    tags: 'ट्याग',
    empty: 'तपाईंको फिल्टरसँग कुनै सूचना मेल खाएन।',
    clear: 'फिल्टर हटाउनुहोस्',
    results: 'सूचना',
    viewAll: 'पूरा पाटी हेर्नुहोस्',
    updated: 'खाता अपडेट',
    statusLive: 'आधिकारिक पोर्टल',
    statusDown: 'प्रतिक्रिया छैन',
    statusBlocked: 'बोट जाँच',
    statusOpen: 'खुला',
    statusClosing: 'छिट्टै बन्द',
    statusClosed: 'बन्द',
    available: 'अहिले उपलब्ध',
    closedNote: 'अवधि सकियो',
  },
} as const;

const SAVE_KEY = 'act_notices_saved';

function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${p(h)}h ${p(m)}m`;
  if (h > 0) return `${h}h ${p(m)}m ${p(sec)}s`;
  return `${m}m ${p(sec)}s`;
}

/** Owns its own clock so only the status/countdown re-renders, not the list. */
function LiveClock({ n, locale, reach }: { n: Notice; locale: 'en' | 'ne'; reach?: PortalReach }) {
  const t = L[locale];
  const [now, setNow] = useState<number | null>(null);
  const ticking = n.kind === 'notice' && Boolean(n.closesOn);
  useEffect(() => {
    setNow(Date.now());
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  const st = now == null ? null : noticeState(n, now);
  const ago = (iso: string) => {
    const ms = Date.parse(iso);
    if (now == null || !Number.isFinite(ms)) return '';
    const d = Math.max(0, Math.floor((now - ms) / 86_400_000));
    return d === 0 ? t.today : `${d}${t.ago}`;
  };

  // A portal row reports the reachability check that was actually performed.
  // `verifiedOn` is only the date we listed it, so it never reads as a check.
  // A bot challenge is neither an answer nor a dead host — it gets its own badge.
  const reachStatus = reach?.status ?? null;
  const status = n.kind === 'source'
    ? (reachStatus == null ? 'idle'
      : reachStatus === 'blocked' ? 'blocked'
      : reachStatus === 'unreachable' ? 'down'
      : 'live')
    : (st?.status ?? 'idle');
  const label = n.kind === 'source'
    ? (status === 'down' ? t.statusDown : status === 'blocked' ? t.statusBlocked : t.statusLive)
    : status === 'closing' ? t.statusClosing
    : status === 'closed' ? t.statusClosed
    : status === 'open' ? t.statusOpen
    : '—';

  return (
    <span className="nb-live">
      <span className={`nb-status s-${status}`}>
        <span className="nb-pulse" aria-hidden="true" />
        {label}
      </span>
      {n.kind === 'source' && now != null && (
        <span className="nb-fresh mono">
          {reach ? `${t.checked} ${ago(reach.checkedAt)}` : `${t.listed} ${ago(n.verifiedOn)}`}
        </span>
      )}
      {st && n.kind === 'notice' && n.closesOn && st.status !== 'closed' && st.msLeft != null && (
        <span className="nb-count mono" aria-label={`${t.closes} ${n.closesOn}`}>
          <Icon name="clock" size={12} /> {fmtLeft(st.msLeft)}
        </span>
      )}
      {st && n.kind === 'notice' && n.closesOn && st.status === 'closed' && (
        <span className="nb-fresh mono">{t.closedNote}</span>
      )}
      {st && n.kind === 'notice' && !n.closesOn && <span className="nb-fresh mono">{t.available}</span>}
    </span>
  );
}

function SourceLink({ n, locale, className }: { n: Notice; locale: 'en' | 'ne'; className?: string }) {
  const t = L[locale];
  const ext = isExternal(n.sourceUrl);
  const label = ext ? t.source : t.open;
  const inner = (
    <>
      <Icon name={ext ? 'out' : 'arrow'} size={13} />
      <span>{label}</span>
      <em className="mono">{n.sourceName}</em>
    </>
  );
  return ext ? (
    <a className={className} href={n.sourceUrl} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <Link className={className} href={n.sourceUrl}>
      {inner}
    </Link>
  );
}

export interface NoticeBoardProps {
  notices: Notice[];
  categories: NoticeCategory[];
  meta: NoticeMeta;
  locale: 'en' | 'ne';
  variant?: 'full' | 'section' | 'compact';
  accent?: string;
  title?: { en: string; ne?: string };
  subtitle?: { en: string; ne?: string };
  href?: string;
  id?: string;
  /** Measured reachability by portal host, from the build-time source ledger. */
  reach?: Record<string, PortalReach>;
}

export function NoticeBoard({
  notices,
  categories,
  meta,
  locale,
  variant = 'section',
  accent = 'var(--cy)',
  title,
  subtitle,
  href,
  id,
  reach,
}: NoticeBoardProps) {
  const t = L[locale];
  const compact = variant === 'compact';
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState<'urgent' | 'newest' | 'org'>('urgent');
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) setSaved(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
    // Slow refresh keeps urgency ordering and source freshness current without
    // re-rendering the list every second (each LiveClock owns its own clock).
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const toggleSave = (nid: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(nid)) next.delete(nid);
      else next.add(nid);
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const toggleOpen = (nid: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(nid)) next.delete(nid);
      else next.add(nid);
      return next;
    });

  const catColor = (cid: string) => categories.find((c) => c.id === cid)?.color ?? categoryColor(cid);
  const catLabel = (cid: string) => {
    const c = categories.find((x) => x.id === cid);
    return c ? nb(c.label, locale) : cid;
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = notices.filter((n) => {
      if (cat !== 'all' && n.category !== cat) return false;
      if (savedOnly && !saved.has(n.id)) return false;
      if (!q) return true;
      const hay = [
        n.title.en, n.title.ne, n.org.en, n.org.ne, n.summary.en, n.summary.ne,
        n.sourceName, ...(n.tags ?? []),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
    out = [...out].sort((a, b) =>
      sort === 'urgent' ? noticeSort.urgent(a, b, now)
      : sort === 'newest' ? noticeSort.newest(a, b)
      : noticeSort.org(a, b),
    );
    return out;
  }, [notices, query, cat, sort, savedOnly, saved, now]);

  const shown = compact ? list.slice(0, 5) : list;
  const heading = title ? nb(title, locale) : nb(meta.name, locale);
  const sub = subtitle ? nb(subtitle, locale) : nb(meta.tagline, locale);
  const savedCount = notices.filter((n) => saved.has(n.id)).length;

  return (
    <div
      className={`nb nb-${variant}`}
      id={id}
      style={{ '--nb-ac': accent } as CSSProperties}
      data-notice-board={variant}
    >
      <div className="nb-head">
        <div className="nb-head-l">
          <span className="nb-bell" aria-hidden="true">
            <Icon name="bell" size={16} />
          </span>
          <div>
            <h3 className="nb-title">{heading}</h3>
            {!compact && <p className="nb-sub">{sub}</p>}
          </div>
        </div>
        <span className="nb-live-tag mono">
          <span className="nb-pulse" aria-hidden="true" /> {t.live}
        </span>
      </div>

      {!compact && (
        <>
          <div className="nb-toolbar">
            <label className="nb-search">
              <Icon name="search" size={15} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search}
                aria-label={t.search}
              />
            </label>
            <label className="nb-sortwrap">
              <span className="mono">{t.sort}</span>
              <select
                className="nb-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as 'urgent' | 'newest' | 'org')}
                aria-label={t.sort}
              >
                <option value="urgent">{t.urgent}</option>
                <option value="newest">{t.newest}</option>
                <option value="org">{t.org}</option>
              </select>
            </label>
            <button
              type="button"
              className={`nb-savedtoggle${savedOnly ? ' on' : ''}`}
              aria-pressed={savedOnly}
              onClick={() => setSavedOnly((v) => !v)}
            >
              <Icon name="star" size={14} style={{ fill: savedOnly ? 'currentColor' : 'none' }} />
              {t.saved} <b className="mono">{savedCount}</b>
            </button>
          </div>

          <div className="nb-chips" role="group" aria-label={t.all}>
            <button
              type="button"
              className={`nb-chip${cat === 'all' ? ' on' : ''}`}
              aria-pressed={cat === 'all'}
              onClick={() => setCat('all')}
            >
              {t.all} <b className="mono">{notices.length}</b>
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`nb-chip${cat === c.id ? ' on' : ''}`}
                style={{ '--c': c.color } as CSSProperties}
                aria-pressed={cat === c.id}
                onClick={() => setCat(c.id)}
              >
                <span className="nb-dot" aria-hidden="true" />
                {nb(c.label, locale)} <b className="mono">{c.count}</b>
              </button>
            ))}
          </div>
        </>
      )}

      {shown.length === 0 ? (
        <div className="nb-empty">
          <p>{t.empty}</p>
          {!compact && (
            <button
              type="button"
              className="btn btn-g btn-sm"
              onClick={() => { setQuery(''); setCat('all'); setSavedOnly(false); }}
            >
              <Icon name="refresh" size={14} /> {t.clear}
            </button>
          )}
        </div>
      ) : (
        <ul className="nb-list">
          {shown.map((n) => {
            const isOpen = open.has(n.id);
            const isSaved = saved.has(n.id);
            return (
              <li
                key={n.id}
                className={`nb-card${isSaved ? ' saved' : ''}`}
                style={{ '--c': catColor(n.category) } as CSSProperties}
                data-category={n.category}
                data-kind={n.kind}
              >
                <div className="nb-card-top">
                  <span className="nb-cat mono">
                    <span className="nb-dot" aria-hidden="true" />
                    {catLabel(n.category)}
                  </span>
                  {!compact && (
                    <button
                      type="button"
                      className={`nb-save${isSaved ? ' on' : ''}`}
                      aria-pressed={isSaved}
                      aria-label={isSaved ? t.unsave : t.save}
                      title={isSaved ? t.unsave : t.save}
                      onClick={() => toggleSave(n.id)}
                    >
                      <Icon name="star" size={15} style={{ fill: isSaved ? 'currentColor' : 'none' }} />
                    </button>
                  )}
                </div>

                <h4 className="nb-name">{nb(n.title, locale)}</h4>
                <p className="nb-org mono">{nb(n.org, locale)}</p>
                {!compact && <p className="nb-summary">{nb(n.summary, locale)}</p>}

                <div className="nb-card-foot">
                  <LiveClock n={n} locale={locale} reach={reach?.[urlHost(n.sourceUrl)]} />
                  <SourceLink n={n} locale={locale} className="nb-source" />
                </div>

                {!compact && (n.detail || n.tags?.length || n.location) && (
                  <>
                    <button
                      type="button"
                      className="nb-more"
                      aria-expanded={isOpen}
                      onClick={() => toggleOpen(n.id)}
                    >
                      <Icon name="arrow" size={13} className={isOpen ? 'nb-chev up' : 'nb-chev'} />
                      {isOpen ? t.less : t.more}
                    </button>
                    {isOpen && (
                      <div className="nb-detail">
                        {n.detail && <p>{nb(n.detail, locale)}</p>}
                        <dl className="nb-meta">
                          {n.location && (
                            <div><dt className="mono">{t.location}</dt><dd>{nb(n.location, locale)}</dd></div>
                          )}
                          <div><dt className="mono">{t.posted}</dt><dd className="mono">{n.posted}</dd></div>
                          {n.closesOn && (
                            <div><dt className="mono">{t.closes}</dt><dd className="mono">{n.closesOn}</dd></div>
                          )}
                          {n.tags?.length ? (
                            <div><dt className="mono">{t.tags}</dt><dd>{n.tags.join(' · ')}</dd></div>
                          ) : null}
                        </dl>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {compact ? (
        <div className="nb-compact-foot">
          <p className="nb-disclosure compact">{nb(meta.shortDisclosure, locale)}</p>
          <span className="nb-fresh mono">{meta.updated}</span>
          {href && (
            <Link className="nb-viewall" href={href}>
              {t.viewAll} <Icon name="arrow" size={13} />
            </Link>
          )}
        </div>
      ) : (
        <div className="nb-foot">
          <p className="nb-count-line mono">
            {shown.length} {t.results} · {t.updated} {meta.updated}
          </p>
          <p className="nb-disclosure">{nb(meta.disclosure, locale)}</p>
          <p className="nb-livenote mono">{nb(meta.liveNote, locale)}</p>
        </div>
      )}
    </div>
  );
}