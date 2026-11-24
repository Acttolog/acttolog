import type { Bi } from './types';
import {
  categoryColor,
  isExternal,
  noticeState,
  type Notice,
  type NoticeScope,
} from './notice-utils';

/**
 * Pure, JSON-free helpers for the build-time source verification ledger
 * (sources.json, written by tools/research-sources.js). Mirrors the
 * notices.ts / notice-utils.ts split: client components import these types
 * and helpers without pulling the ledger into the browser bundle.
 *
 * Honesty contract: every measured field here comes from a real HTTPS check
 * performed at build time. `status: 'reachable'` means the portal answered
 * that one request — it is NOT a live government vacancy feed, and nothing
 * in this module may invent activity that is not backed by a dated record.
 */

/**
 * `blocked` is a measured HTTP 200/403 that returned a WAF or JavaScript
 * challenge instead of the page — the host is up, but we could not verify it.
 */
export type SourceStatus = 'reachable' | 'unreachable' | 'redirected' | 'blocked';

export interface VerifiedSource {
  id: string;
  name: Bi;
  host: string;
  url: string;
  scope: NoticeScope;
  category: string;
  status: SourceStatus;
  httpStatus: number | null;
  ms: number | null;
  checkedAt: string;
  /** Advances only when a fetch actually succeeded; null if never verified. */
  lastVerifiedOn: string | null;
  finalUrl?: string;
  contentType?: string | null;
  title?: string | null;
  error?: string;
  /** Measured body size in bytes; a tiny body is how a WAF page is recognised. */
  bytes?: number | null;
  redirects?: number;
  /** Set when the server sent an incomplete chain and we completed it via AIA. */
  tlsChain?: string;
  errorKind?: string;
}

export interface SourcesMeta {
  compiledAt: string;
  generator: string;
  checked: number;
  reachable: number;
  unreachable: number;
  blocked?: number;
  note: Bi;
}

/* ── freshness (pure; called with Date.now()) ────────────────────── */

const DAY = 86_400_000;
export const SOURCE_STALE_AFTER_DAYS = 14;

export interface SourceFreshness {
  daysSinceCheck: number;
  stale: boolean;
}

/** Age of the last real reachability check. Unparseable dates read as stale. */
export function sourceFreshness(s: VerifiedSource, now: number): SourceFreshness {
  const t = Date.parse(s.checkedAt);
  const base = Number.isFinite(t) ? t : 0;
  const daysSinceCheck = Math.max(0, Math.floor((now - base) / DAY));
  return { daysSinceCheck, stale: daysSinceCheck > SOURCE_STALE_AFTER_DAYS };
}

export const isReachable = (s: VerifiedSource): boolean =>
  s.status === 'reachable' || s.status === 'redirected';

/** Host key that matches one portal across the ledger and the notice directory. */
export const urlHost = (url: string): string => {
  const m = /^https?:\/\/([^/]+)/i.exec(url);
  return m ? m[1].replace(/^www\./, '').toLowerCase() : '';
};

/** What the build-time check actually measured for one portal. */
export interface PortalReach {
  status: SourceStatus;
  checkedAt: string;
}

/* ── live activity wire (pure; ledgers passed in, never imported) ── */

export type WireKind = 'release' | 'notice' | 'verified' | 'unreachable' | 'blocked' | 'closing';

/** A real content release the homepage passes in (blog / entertainment / games / darkroom …). */
export interface WireRelease {
  title: Bi;
  /** Content family: 'research' | 'blog' | 'entertainment' | 'games' | 'darkroom' | 'academy' | 'nepal' | 'loksewa' … */
  kind: string;
  /** ISO date of the actual release record. */
  date: string;
  route: string;
  color?: string;
  icon?: string;
  org?: Bi;
  meta?: Bi;
}

export interface WireEvent {
  id: string;
  at: string;
  kind: WireKind;
  title: Bi;
  org?: Bi;
  route: string;
  ext?: boolean;
  color: string;
  icon: string;
  meta?: Bi;
}

export interface WireOptions {
  releases?: WireRelease[];
  notices?: Notice[];
  sources?: VerifiedSource[];
  now?: number;
  limit?: number;
}

const RELEASE_STYLE: Record<string, { color: string; icon: string }> = {
  research: { color: 'var(--cy)', icon: 'compass' },
  blog: { color: 'var(--cy)', icon: 'doc' },
  post: { color: 'var(--cy)', icon: 'doc' },
  entertainment: { color: 'var(--mg)', icon: 'play' },
  games: { color: 'var(--ok)', icon: 'game' },
  darkroom: { color: 'var(--gold)', icon: 'search' },
  academy: { color: 'var(--vi)', icon: 'book' },
  loksewa: { color: 'var(--gold)', icon: 'shield' },
  nepal: { color: 'var(--cy)', icon: 'globe' },
};
const RELEASE_FALLBACK = { color: 'var(--mut)', icon: 'spark' };

const normRoute = (route: string) => route.replace(/\/+$/, '') || '/';
const timeOf = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

/**
 * Build the homepage "live activity wire" from real ledger data only:
 *  (a) caller-supplied content releases,
 *  (b) ACTTOLOG's own posted notices, plus the soonest-closing one as an alert,
 *  (c) measured reachability checks — answered portals and dead ones alike.
 * Newest first, one row per portal. Every event traces to a dated record: no
 * simulated activity, no fake social proof, no curation date sold as a check.
 */
export function wireEvents(opts: WireOptions = {}): WireEvent[] {
  const { releases = [], notices = [], sources = [], now = Date.now(), limit = 6 } = opts;
  const events: WireEvent[] = [];

  for (const r of releases) {
    if (!r || !r.route || timeOf(r.date) == null) continue;
    const style = RELEASE_STYLE[r.kind] ?? RELEASE_FALLBACK;
    events.push({
      id: `release:${r.route}:${r.date}`,
      at: r.date,
      kind: 'release',
      title: r.title,
      org: r.org,
      route: r.route,
      ext: isExternal(r.route),
      color: r.color || style.color,
      icon: r.icon || style.icon,
      meta: r.meta,
    });
  }

  // Only ACTTOLOG's own posted notices are events here. A curated portal link
  // carries a curation date, not a measurement; the ledger loop below reports
  // what was actually checked, so a directory entry never claims verification.
  for (const n of notices) {
    if (n.kind !== 'notice' || timeOf(n.posted) == null) continue;
    events.push({
      id: `notice:${n.id}`,
      at: n.posted,
      kind: 'notice',
      title: n.title,
      org: n.org,
      route: n.sourceUrl,
      ext: isExternal(n.sourceUrl),
      color: categoryColor(n.category),
      icon: 'bell',
    });
  }

  for (const s of sources) {
    if (timeOf(s.checkedAt) == null) continue;
    const ok = isReachable(s);
    const blocked = s.status === 'blocked';
    const measured = s.httpStatus != null ? `HTTP ${s.httpStatus}${s.ms != null ? ` · ${s.ms} ms` : ''}` : '';
    events.push({
      id: `source:${s.id}`,
      at: s.checkedAt,
      kind: ok ? 'verified' : blocked ? 'blocked' : 'unreachable',
      title: s.name,
      org: { en: s.host, ne: s.host },
      route: s.url,
      ext: true,
      color: ok ? 'var(--ok)' : blocked ? 'var(--warn)' : 'var(--err)',
      icon: ok ? 'shield' : 'globe',
      meta: ok
        ? { en: `Reachability checked · ${measured}`, ne: `पहुँच जाँच · ${measured}` }
        : blocked
          ? {
              en: `Bot challenge — page not served to our checker (${measured})`,
              ne: `बोट चुनौती — जाँचकर्तालाई पृष्ठ दिइएन (${measured})`,
            }
          : {
              en: `Unreachable at last check${s.error ? ` (${s.error})` : ''}`,
              ne: `पछिल्लो जाँचमा पहुँचयोग्य भएन${s.error ? ` (${s.error})` : ''}`,
            },
    });
  }

  // Urgency alert: only a notice the board itself already flags as closing
  // (inside the 7-day window). Anything further out is not an alert.
  let soonest: Notice | null = null;
  let soonestClose = Infinity;
  for (const n of notices) {
    if (n.kind !== 'notice' || !n.closesOn) continue;
    const st = noticeState(n, now);
    if (st.status !== 'closing' || st.msLeft == null) continue;
    const close = Date.parse(n.closesOn + 'T23:59:59');
    if (Number.isFinite(close) && close < soonestClose) {
      soonest = n;
      soonestClose = close;
    }
  }
  if (soonest && soonest.closesOn) {
    const st = noticeState(soonest, now);
    events.push({
      id: `closing:${soonest.id}`,
      at: soonest.closesOn,
      kind: 'closing',
      title: soonest.title,
      org: soonest.org,
      route: soonest.sourceUrl,
      ext: isExternal(soonest.sourceUrl),
      color: 'var(--warn)',
      icon: 'clock',
      meta: {
        en: `Closes ${soonest.closesOn} — ${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} left`,
        ne: `${soonest.closesOn} मा बन्द — ${st.daysLeft} दिन बाँकी`,
      },
    });
  }

  // One row per portal: the ledger and the notice directory link the same hosts
  // at different paths, so reachability events dedupe on host, not full route.
  const hostOf = (route: string) => urlHost(route) || normRoute(route);
  const isCheck = (k: WireKind) => k === 'verified' || k === 'unreachable' || k === 'blocked';
  const best = new Map<string, WireEvent>();
  for (const e of events) {
    const key = isCheck(e.kind) ? `check|${hostOf(e.route)}` : `${e.kind}|${normRoute(e.route)}`;
    const cur = best.get(key);
    if (!cur || (timeOf(e.at) ?? 0) > (timeOf(cur.at) ?? 0)) best.set(key, e);
  }

  const kindRank: Record<WireKind, number> = { closing: 0, verified: 1, unreachable: 1, blocked: 1, notice: 2, release: 3 };
  const sorted = [...best.values()].sort((a, b) => {
    const d = (timeOf(b.at) ?? 0) - (timeOf(a.at) ?? 0);
    return d !== 0 ? d : kindRank[a.kind] - kindRank[b.kind];
  });

  // A build-time check stamps every portal with the same instant, so recency
  // alone would fill the wire with verification rows. Deal one row per kind in
  // turn, then order the dealt hand chronologically.
  const lanes: Record<WireKind, WireEvent[]> = { closing: [], verified: [], unreachable: [], blocked: [], notice: [], release: [] };
  for (const e of sorted) lanes[e.kind].push(e);
  const order: WireKind[] = ['closing', 'release', 'notice', 'verified', 'unreachable', 'blocked'];
  const picked: WireEvent[] = [];
  for (let round = 0; picked.length < limit; round++) {
    const before = picked.length;
    for (const k of order) {
      if (picked.length >= limit) break;
      const e = lanes[k][round];
      if (e) picked.push(e);
    }
    if (picked.length === before) break;
  }
  picked.sort((a, b) => {
    const d = (timeOf(b.at) ?? 0) - (timeOf(a.at) ?? 0);
    return d !== 0 ? d : kindRank[a.kind] - kindRank[b.kind];
  });
  return picked.slice(0, Math.max(0, limit));
}