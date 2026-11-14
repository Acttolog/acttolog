import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDailySnapshots } from './etl.ts';
import { evaluateRules, DEFAULT_RULES, type AlertRule } from './alerts.ts';
import { parseQuery, runQuery, DEFAULT_QUERY } from './query.ts';
import type { MetricEvent } from '../metrics.ts';

const DAY = 86400000;
const now = Date.UTC(2026, 10, 14, 12, 0, 0);
const ev = (t: string, sid: string, ts: number, div?: string): MetricEvent => ({ t, sid, ts, div: div ?? null });

// ── ETL ──
test('etl: empty events yield zero counts and null rates (no fake numbers)', () => {
  const rows = computeDailySnapshots([], now, 2);
  assert.equal(rows.length, 14); // 7 metrics × 2 days
  const pv = rows.find((r) => r.metricKey === 'page_views');
  const eng = rows.find((r) => r.metricKey === 'engaged_rate');
  assert.equal(pv?.value, 0);
  assert.equal(eng?.value, null);
  assert.equal(eng?.denominator, 0);
});

test('etl: a day with measured events produces correct counts and engaged rate', () => {
  const start = Date.UTC(2026, 10, 14, 0, 0, 0);
  const events = [ev('page_view', 'a', start + 1000), ev('page_view', 'a', start + 2000), ev('page_view', 'a', start + 3000)];
  const rows = computeDailySnapshots(events, now, 1);
  const pv = rows.find((r) => r.metricKey === 'page_views');
  const sess = rows.find((r) => r.metricKey === 'sessions');
  const eng = rows.find((r) => r.metricKey === 'engaged_rate');
  assert.equal(pv?.value, 3);
  assert.equal(sess?.value, 1);
  assert.equal(eng?.value, 100);
  assert.equal(eng?.numerator, 1);
  assert.equal(eng?.denominator, 1);
});

test('etl: game completion rate is null without launches, real with them', () => {
  const start = Date.UTC(2026, 10, 14, 0, 0, 0);
  const none = computeDailySnapshots([ev('page_view', 'a', start)], now, 1);
  assert.equal(none.find((r) => r.metricKey === 'game_completion_rate')?.value, null);
  const some = computeDailySnapshots(
    [ev('game_launch', 'a', start), ev('game_launch', 'b', start), ev('game_completed', 'a', start + 5000)],
    now,
    1,
  );
  assert.equal(some.find((r) => r.metricKey === 'game_completion_rate')?.value, 50);
});

// ── Alerts ──
const rule = (over: Partial<AlertRule>): AlertRule => ({ id: 'x', label: 'x', metric: 'page_views', op: 'lt', threshold: 5, ...over });

test('alerts: a null (insufficient) metric never triggers', () => {
  const out = evaluateRules([rule({ metric: 'engaged_rate', op: 'lt', threshold: 40 })], { latest: { page_views: 0, sessions: 0, engaged_rate: null }, byDay: [] });
  assert.deepEqual(out, []);
});

test('alerts: lt and gt fire only on real measured values', () => {
  const latest = { page_views: 3, sessions: 10, engaged_rate: 80 };
  assert.equal(evaluateRules([rule({ op: 'lt', threshold: 5 })], { latest, byDay: [] }).length, 1);
  assert.equal(evaluateRules([rule({ op: 'gt', threshold: 5 })], { latest, byDay: [] }).length, 0);
  assert.equal(evaluateRules([rule({ metric: 'sessions', op: 'gt', threshold: 5 })], { latest, byDay: [] }).length, 1);
});

test('alerts: anomaly rule fires on a spike, not on a flat series', () => {
  const flat: [string, number][] = Array.from({ length: 12 }, (_, i) => [`d${i}`, 10]);
  const spike = [...flat.slice(0, 11), ['d11', 200]] as [string, number][];
  const r = [rule({ op: 'anomaly', threshold: 2 })];
  assert.equal(evaluateRules(r, { latest: { page_views: 10, sessions: 1, engaged_rate: null }, byDay: flat }).length, 0);
  const hit = evaluateRules(r, { latest: { page_views: 200, sessions: 1, engaged_rate: null }, byDay: spike });
  assert.equal(hit.length, 1);
  assert.match(hit[0].detail, /NOT A CAUSAL FINDING/);
});

test('alerts: default rules evaluate cleanly on empty data', () => {
  assert.deepEqual(evaluateRules(DEFAULT_RULES, { latest: { page_views: null, sessions: null, engaged_rate: null }, byDay: [] }), []);
});

// ── Query builder ──
test('query: parseQuery falls back to defaults for unknown enums and caps dims', () => {
  const q = parseQuery({ metric: 'DROP TABLE', groupBy: 'evil', div: 'x'.repeat(200) });
  assert.equal(q.metric, DEFAULT_QUERY.metric);
  assert.equal(q.groupBy, DEFAULT_QUERY.groupBy);
  assert.equal(q.div?.length, 80);
});

test('query: page_views by day counts only page_view events', () => {
  const start = Date.UTC(2026, 10, 14, 0, 0, 0);
  const events = [ev('page_view', 'a', start), ev('page_view', 'a', start + 1000), ev('game_launch', 'a', start + 2000)];
  const rows = runQuery(events, parseQuery({ metric: 'page_views', groupBy: 'day' }));
  assert.deepEqual(rows, [['2026-11-14', 2]]);
});

test('query: all_events by type and div filter behave correctly', () => {
  const start = Date.UTC(2026, 10, 14, 0, 0, 0);
  const events = [ev('page_view', 'a', start, 'games'), ev('page_view', 'a', start, 'home'), ev('game_launch', 'a', start, 'games')];
  const byType = runQuery(events, parseQuery({ metric: 'all_events', groupBy: 'type' }));
  assert.deepEqual(byType, [['page_view', 2], ['game_launch', 1]]);
  const games = runQuery(events, parseQuery({ metric: 'all_events', groupBy: 'type', div: 'games' }));
  assert.deepEqual(games, [['page_view', 1], ['game_launch', 1]]);
});

test('query: an injection-shaped div is treated as a literal filter, never executed', () => {
  const start = Date.UTC(2026, 10, 14, 0, 0, 0);
  const events = [ev('page_view', 'a', start, 'games')];
  const rows = runQuery(events, parseQuery({ div: "'; DROP TABLE users; --" }));
  assert.deepEqual(rows, []);
});