import type { Bi } from './types';

/**
 * Pure, JSON-free helpers shared by the server accessors (notices.ts) and the
 * client NoticeBoard. Keeping these free of the ledger import means the browser
 * bundle never ships the whole directory — pages pass only their scoped subset.
 */

export type NoticeScope =
  | 'loksewa'
  | 'research'
  | 'entertainment'
  | 'academy'
  | 'games'
  | 'darkroom'
  | 'nepal'
  | 'network';

export interface Notice {
  id: string;
  scope: NoticeScope;
  category: string;
  kind: 'source' | 'notice';
  title: Bi;
  org: Bi;
  summary: Bi;
  detail?: Bi;
  sourceUrl: string;
  sourceName: string;
  location?: Bi;
  tags?: string[];
  posted: string;
  verifiedOn: string;
  closesOn?: string;
  featured?: boolean;
}

export interface NoticeMeta {
  name: Bi;
  tagline: Bi;
  disclosure: Bi;
  shortDisclosure: Bi;
  liveNote: Bi;
  updated: string;
}

export interface NoticeCategory {
  id: string;
  label: Bi;
  color: string;
  count: number;
}

/** Category registry — label + accent. Order drives the filter chips. */
export const NOTICE_CATEGORIES: Record<string, { label: Bi; color: string }> = {
  government: { label: { en: 'Government', ne: 'सरकारी' }, color: 'var(--cy)' },
  sansthan: { label: { en: 'Sansthan', ne: 'संस्थान' }, color: 'var(--vi)' },
  bank: { label: { en: 'Bank', ne: 'बैंक' }, color: 'var(--gold)' },
  exam: { label: { en: 'Exam', ne: 'परीक्षा' }, color: 'var(--ok)' },
  course: { label: { en: 'Course', ne: 'पाठ्यक्रम' }, color: 'var(--vi)' },
  service: { label: { en: 'Service', ne: 'सेवा' }, color: 'var(--cy)' },
  resource: { label: { en: 'Resource', ne: 'स्रोत' }, color: 'var(--gold)' },
  release: { label: { en: 'Release', ne: 'रिलिज' }, color: 'var(--mg)' },
  event: { label: { en: 'Event', ne: 'कार्यक्रम' }, color: 'var(--mg)' },
};

export const CATEGORY_ORDER = Object.keys(NOTICE_CATEGORIES);

export const categoryLabel = (id: string, locale: 'en' | 'ne'): string => {
  const c = NOTICE_CATEGORIES[id];
  if (!c) return id;
  return locale === 'ne' ? c.label.ne || c.label.en : c.label.en;
};
export const categoryColor = (id: string): string => NOTICE_CATEGORIES[id]?.color ?? 'var(--mut)';

/* ── live state (pure; called in the browser with Date.now()) ─────── */

export type NoticeStatus = 'open' | 'closing' | 'closed' | 'live';

export interface NoticeState {
  status: NoticeStatus;
  msLeft: number | null;
  daysLeft: number | null;
  freshnessDays: number;
}

const DAY = 86_400_000;
const CLOSING_WINDOW = 7 * DAY;

export function noticeState(n: Notice, now: number): NoticeState {
  const verified = new Date(n.verifiedOn + 'T00:00:00').getTime();
  const freshnessDays = Number.isFinite(verified) ? Math.max(0, Math.floor((now - verified) / DAY)) : 0;
  if (n.kind === 'source' || !n.closesOn) {
    return { status: n.kind === 'source' ? 'live' : 'open', msLeft: null, daysLeft: null, freshnessDays };
  }
  const close = new Date(n.closesOn + 'T23:59:59').getTime();
  if (!Number.isFinite(close)) {
    return { status: 'open', msLeft: null, daysLeft: null, freshnessDays };
  }
  const msLeft = close - now;
  const daysLeft = Math.ceil(msLeft / DAY);
  const status: NoticeStatus = msLeft <= 0 ? 'closed' : msLeft <= CLOSING_WINDOW ? 'closing' : 'open';
  return { status, msLeft, daysLeft, freshnessDays };
}

export const noticeSort = {
  urgent: (a: Notice, b: Notice, now: number) => {
    const rank = (n: Notice) => {
      const s = noticeState(n, now);
      if (s.status === 'closing') return 0;
      if (s.status === 'open' && s.msLeft != null) return 1;
      if (s.status === 'live') return 2;
      if (s.status === 'open') return 3;
      return 4;
    };
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    const am = a.closesOn ? new Date(a.closesOn).getTime() : Infinity;
    const bm = b.closesOn ? new Date(b.closesOn).getTime() : Infinity;
    return am - bm;
  },
  newest: (a: Notice, b: Notice) => String(b.posted).localeCompare(String(a.posted)),
  org: (a: Notice, b: Notice) => a.title.en.localeCompare(b.title.en),
};

/** Resolve a bilingual field for a locale (English fallback). */
export const nb = (v: Bi | string | undefined, locale: 'en' | 'ne'): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return locale === 'ne' ? v.ne || v.en : v.en;
};

export const isExternal = (url: string) => /^https?:\/\//i.test(url);