/**
 * Constrained query builder over measured events (brief §12).
 *
 * Deliberately NOT raw SQL: the operator picks a metric, a grouping and optional
 * dimension filters from fixed enums, and this pure function aggregates the
 * in-memory measured events. No user string ever reaches a database query, so
 * injection is impossible by construction. Unit-tested.
 */
import type { MetricEvent } from '@/lib/metrics';

export type QueryMetric = 'page_views' | 'all_events';
export type QueryGroup = 'day' | 'div' | 'type';

export interface QuerySpec {
  metric: QueryMetric;
  groupBy: QueryGroup;
  div: string | null;
  type: string | null;
}

export const DEFAULT_QUERY: QuerySpec = { metric: 'page_views', groupBy: 'day', div: null, type: null };

const METRICS = new Set<QueryMetric>(['page_views', 'all_events']);
const GROUPS = new Set<QueryGroup>(['day', 'div', 'type']);

/** Validate untrusted input into a safe spec (unknown values fall back to defaults). */
export function parseQuery(raw: { metric?: string | null; groupBy?: string | null; div?: string | null; type?: string | null }): QuerySpec {
  const clean = (v: string | null | undefined) => {
    const t = (v || '').trim().slice(0, 80);
    return t.length ? t : null;
  };
  return {
    metric: raw.metric && METRICS.has(raw.metric as QueryMetric) ? (raw.metric as QueryMetric) : DEFAULT_QUERY.metric,
    groupBy: raw.groupBy && GROUPS.has(raw.groupBy as QueryGroup) ? (raw.groupBy as QueryGroup) : DEFAULT_QUERY.groupBy,
    div: clean(raw.div),
    type: clean(raw.type),
  };
}

/** Aggregate measured events into sorted [label, count] rows. */
export function runQuery(events: MetricEvent[], spec: QuerySpec): [string, number][] {
  const filtered = events.filter(
    (e) =>
      (spec.metric === 'all_events' || e.t === 'page_view') &&
      (!spec.div || (e.div || 'home') === spec.div) &&
      (!spec.type || e.t === spec.type),
  );
  const acc: Record<string, number> = {};
  for (const e of filtered) {
    const key =
      spec.groupBy === 'day'
        ? new Date(e.ts).toISOString().slice(0, 10)
        : spec.groupBy === 'div'
          ? e.div || 'home'
          : e.t;
    acc[key] = (acc[key] || 0) + 1;
  }
  return Object.entries(acc).sort((a, b) => (spec.groupBy === 'day' ? a[0].localeCompare(b[0]) : b[1] - a[1]));
}