/**
 * ETL: roll measured events into per-day metric snapshots (brief §11).
 *
 * Pure computation only — the API route persists the rows. Every snapshot is
 * derived from measured, consent-gated events; a rate with no denominator is
 * stored as null (never a fake 0/100). Re-running is idempotent: the route
 * replaces the snapshots for the recomputed days.
 */
import { computeMetrics, type MetricEvent } from '../metrics.ts';

export interface SnapshotRow {
  metricKey: string;
  periodStart: Date;
  periodEnd: Date;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
}

const DAY = 86400000;
const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const rate = (num: number, den: number): number | null => (den ? Math.round((num / den) * 1000) / 10 : null);

/** Compute one snapshot row per metric per day for the trailing `days` days. */
export function computeDailySnapshots(events: MetricEvent[], now: number, days: number): SnapshotRow[] {
  const rows: SnapshotRow[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const start = startOfDay(now - d * DAY);
    const end = start + DAY - 1;
    const slice = events.filter((e) => e.ts >= start && e.ts <= end);
    const m = computeMetrics(slice);
    const t = m.byType;
    const push = (metricKey: string, value: number | null, numerator: number | null, denominator: number | null) =>
      rows.push({ metricKey, periodStart: new Date(start), periodEnd: new Date(end), value, numerator, denominator });

    push('page_views', m.pageViews, m.pageViews, null);
    push('sessions', m.sessions, m.sessions, null);
    push('users', m.users, m.users, null);
    push('engaged_sessions', m.engagedSessions, m.engagedSessions, null);
    push('engaged_rate', m.engagedRate, m.engagedSessions, m.sessions);
    push('game_completion_rate', rate(t['game_completed'] || 0, t['game_launch'] || 0), t['game_completed'] || 0, t['game_launch'] || 0);
    push('search_success_rate', rate(t['search_result_selected'] || 0, t['search'] || 0), t['search_result_selected'] || 0, t['search'] || 0);
  }
  return rows;
}