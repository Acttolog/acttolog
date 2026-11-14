/**
 * ACTTOLOG metric engine — pure, framework-free, unit-testable.
 *
 * Honesty contract (Enterprise brief §7, §29, §48):
 *  - Every number is derived from measured events; nothing is invented.
 *  - A rate that cannot be computed (zero denominator) returns null, and the UI
 *    renders "Insufficient measured data" instead of a fake 0% or 100%.
 *  - Sessionization and engagement rules are explicit constants below, mirrored
 *    in docs/METRIC_DICTIONARY.md so the definition is never hidden.
 *
 * This module replaces the previous aggregation where `eng` was a constant 100%
 * and `sessions` was merely the unique-id count (see ACTTOLOG_ENTERPRISE_AUDIT.md §4).
 */

export interface MetricEvent {
  t: string;
  sid: string;
  /** epoch milliseconds, UTC */
  ts: number;
  div?: string | null;
  path?: string;
}

export interface Session {
  sid: string;
  start: number;
  end: number;
  events: number;
  pageViews: number;
  keyEvent: boolean;
  engaged: boolean;
  divs: string[];
}

/** A new session begins after this much inactivity for the same anonymous id. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
/** Engaged criterion 1: session lasts at least this long. */
export const ENGAGED_MIN_MS = 10 * 1000;
/** Engaged criterion 2: at least this many page views in the session. */
export const ENGAGED_MIN_PV = 2;
/** Engaged criterion 3: any of these key events marks the session engaged. */
export const KEY_EVENTS = new Set([
  'sign_in',
  'search',
  'game_launch',
  'game_completed',
  'contact_submit',
  'newsletter_subscribe',
  'download',
  'offer_interaction',
  'resource_save',
]);

const toMs = (ts: number | string | Date): number =>
  ts instanceof Date ? ts.getTime() : typeof ts === 'string' ? Date.parse(ts) : ts;

/** Normalize raw rows (Prisma `ts` is a Date) into MetricEvent. */
export function normalize(
  rows: { t: string; sid: string; ts: number | string | Date; div?: string | null; path?: string }[],
): MetricEvent[] {
  return rows
    .map((r) => ({ t: r.t, sid: r.sid, ts: toMs(r.ts), div: r.div ?? null, path: r.path }))
    .filter((e) => Number.isFinite(e.ts) && e.sid);
}

/**
 * Group events into sessions per anonymous id using a 30-minute inactivity window.
 * Events are sorted by time; a gap larger than SESSION_TIMEOUT_MS starts a new session.
 */
export function sessionize(events: MetricEvent[]): Session[] {
  const bySid = new Map<string, MetricEvent[]>();
  for (const e of events) {
    const arr = bySid.get(e.sid);
    if (arr) arr.push(e);
    else bySid.set(e.sid, [e]);
  }
  const sessions: Session[] = [];
  for (const [sid, list] of bySid) {
    list.sort((a, b) => a.ts - b.ts);
    let cur: Session | null = null;
    let prevTs = -Infinity;
    const divs = new Set<string>();
    const flush = () => {
      if (!cur) return;
      cur.divs = [...divs];
      cur.engaged =
        cur.end - cur.start >= ENGAGED_MIN_MS ||
        cur.pageViews >= ENGAGED_MIN_PV ||
        cur.keyEvent;
      sessions.push(cur);
      divs.clear();
    };
    for (const e of list) {
      if (!cur || e.ts - prevTs > SESSION_TIMEOUT_MS) {
        flush();
        cur = { sid, start: e.ts, end: e.ts, events: 0, pageViews: 0, keyEvent: false, engaged: false, divs: [] };
      }
      cur.end = e.ts;
      cur.events += 1;
      if (e.t === 'page_view') cur.pageViews += 1;
      if (KEY_EVENTS.has(e.t)) cur.keyEvent = true;
      if (e.div) divs.add(e.div);
      prevTs = e.ts;
    }
    flush();
  }
  return sessions;
}

export interface Metrics {
  pageViews: number;
  sessions: number;
  /** unique anonymous ids (not authenticated users) */
  users: number;
  engagedSessions: number;
  /** null when there are no sessions — UI must show "Insufficient measured data" */
  engagedRate: number | null;
  avgSessionDurationMs: number | null;
  byDay: [string, number][];
  byDiv: Record<string, number>;
  byType: Record<string, number>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Compute the truthful metric set from measured events. */
export function computeMetrics(events: MetricEvent[]): Metrics {
  const sessions = sessionize(events);
  const pv = events.filter((e) => e.t === 'page_view');
  const users = new Set(events.map((e) => e.sid)).size;
  const engaged = sessions.filter((s) => s.engaged).length;

  const byDay: Record<string, number> = {};
  const byDiv: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const e of pv) {
    const day = new Date(e.ts).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
    const d = e.div || 'home';
    byDiv[d] = (byDiv[d] || 0) + 1;
  }
  for (const e of events) byType[e.t] = (byType[e.t] || 0) + 1;

  const durations = sessions.map((s) => s.end - s.start);
  const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  return {
    pageViews: pv.length,
    sessions: sessions.length,
    users,
    engagedSessions: engaged,
    engagedRate: sessions.length ? round1((engaged / sessions.length) * 100) : null,
    avgSessionDurationMs: avg === null ? null : Math.round(avg),
    byDay: Object.entries(byDay).sort() as [string, number][],
    byDiv,
    byType,
  };
}

/** Percentage change vs a previous period; null when the base is insufficient. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return round1(((current - previous) / previous) * 100);
}

// ─── Metric dictionary (rendered in admin; mirrored in METRIC_DICTIONARY.md) ───

export interface MetricDefinition {
  key: string;
  name: string;
  description: string;
  formula: string;
  source: string;
  unit: 'count' | 'percent' | 'ms';
  /** minimum sessions/events before a comparison is meaningful */
  needsHistory: boolean;
}

export const METRIC_DICTIONARY: MetricDefinition[] = [
  {
    key: 'page_views',
    name: 'Page views',
    description: 'Count of measured page_view events in the selected period.',
    formula: 'count(events where t = page_view)',
    source: 'First-party AnalyticsEvent (consent-gated)',
    unit: 'count',
    needsHistory: false,
  },
  {
    key: 'sessions',
    name: 'Sessions',
    description: 'Event groups per anonymous id, split after 30 minutes of inactivity.',
    formula: 'sessionize(events, timeout = 30m)',
    source: 'First-party AnalyticsEvent',
    unit: 'count',
    needsHistory: false,
  },
  {
    key: 'users',
    name: 'Anonymous ids',
    description: 'Distinct anonymous session ids. Not authenticated accounts; identity is never attached.',
    formula: 'count(distinct sid)',
    source: 'First-party AnalyticsEvent',
    unit: 'count',
    needsHistory: false,
  },
  {
    key: 'engaged_sessions',
    name: 'Engaged sessions',
    description: 'Sessions lasting ≥10s, OR with ≥2 page views, OR containing a key event.',
    formula: 'count(sessions where duration≥10s OR pageViews≥2 OR keyEvent)',
    source: 'First-party AnalyticsEvent',
    unit: 'count',
    needsHistory: false,
  },
  {
    key: 'engaged_rate',
    name: 'Engaged rate',
    description: 'Share of sessions that are engaged. Null (Insufficient measured data) when there are no sessions.',
    formula: 'engaged_sessions / sessions × 100',
    source: 'Derived from sessions',
    unit: 'percent',
    needsHistory: false,
  },
  {
    key: 'game_completion_rate',
    name: 'Game completion rate',
    description: 'Completed game sessions divided by valid started sessions. Requires game_completed events.',
    formula: 'count(game_completed) / count(game_launch) × 100',
    source: 'First-party AnalyticsEvent (game events)',
    unit: 'percent',
    needsHistory: true,
  },
  {
    key: 'search_success_rate',
    name: 'Search success rate',
    description: 'Searches that produced a selected result divided by measured searches.',
    formula: 'count(search_result_selected) / count(search) × 100',
    source: 'First-party AnalyticsEvent (search events)',
    unit: 'percent',
    needsHistory: true,
  },
];