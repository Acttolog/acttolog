import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize,
  sessionize,
  computeMetrics,
  pctChange,
  SESSION_TIMEOUT_MS,
  type MetricEvent,
} from './metrics.ts';

const ev = (t: string, sid: string, ts: number, div?: string): MetricEvent => ({ t, sid, ts, div });
const MIN = 60 * 1000;

test('normalize coerces Date/string timestamps and drops invalid rows', () => {
  const rows = [
    { t: 'page_view', sid: 'a', ts: new Date('2026-11-14T00:00:00Z') },
    { t: 'page_view', sid: 'b', ts: '2026-11-14T00:01:00Z' },
    { t: 'page_view', sid: '', ts: 0 }, // dropped: no sid
  ];
  const out = normalize(rows);
  assert.equal(out.length, 2);
  assert.ok(out.every((e) => Number.isFinite(e.ts)));
});

test('sessionize splits a single id after 30 minutes of inactivity', () => {
  const events = [
    ev('page_view', 'a', 0),
    ev('page_view', 'a', 5 * MIN),
    ev('page_view', 'a', SESSION_TIMEOUT_MS + 10 * MIN), // new session
  ];
  const s = sessionize(events);
  assert.equal(s.length, 2);
  assert.equal(s[0].pageViews, 2);
  assert.equal(s[1].pageViews, 1);
});

test('sessionize keeps separate ids separate', () => {
  const s = sessionize([ev('page_view', 'a', 0), ev('page_view', 'b', 0)]);
  assert.equal(s.length, 2);
});

test('engaged by duration >= 10s', () => {
  const s = sessionize([ev('page_view', 'a', 0), ev('page_view', 'a', 11 * 1000)]);
  assert.equal(s[0].engaged, true);
});

test('engaged by >= 2 page views even when fast', () => {
  const s = sessionize([ev('page_view', 'a', 0), ev('page_view', 'a', 1000)]);
  assert.equal(s[0].engaged, true);
});

test('engaged by a key event', () => {
  const s = sessionize([ev('page_view', 'a', 0), ev('game_launch', 'a', 500)]);
  assert.equal(s[0].engaged, true);
});

test('single quick page view is NOT engaged', () => {
  const s = sessionize([ev('page_view', 'a', 0)]);
  assert.equal(s[0].engaged, false);
});

test('engagedRate is null when there are no sessions (no fake 0/100)', () => {
  const m = computeMetrics([]);
  assert.equal(m.sessions, 0);
  assert.equal(m.engagedRate, null);
  assert.equal(m.avgSessionDurationMs, null);
});

test('computeMetrics produces truthful counts and a real engaged rate', () => {
  const events = [
    // sid a: engaged (2 pv)
    ev('page_view', 'a', 0, 'games'),
    ev('page_view', 'a', 1000, 'games'),
    // sid b: single quick view, not engaged
    ev('page_view', 'b', 0, 'home'),
  ];
  const m = computeMetrics(events);
  assert.equal(m.pageViews, 3);
  assert.equal(m.sessions, 2);
  assert.equal(m.users, 2);
  assert.equal(m.engagedSessions, 1);
  assert.equal(m.engagedRate, 50);
  assert.deepEqual(m.byDiv, { games: 2, home: 1 });
  assert.equal(m.byType.page_view, 3);
});

test('pctChange returns null for growth from an unmeasured base', () => {
  assert.equal(pctChange(10, 0), null);
  assert.equal(pctChange(0, 0), 0);
  assert.equal(pctChange(150, 100), 50);
  assert.equal(pctChange(80, 100), -20);
});