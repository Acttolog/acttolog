import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectAnomalies, ANOMALY_WINDOW, MIN_ANOMALY_POINTS } from './anomaly.ts';

const day = (i: number) => `2026-11-${String(i + 1).padStart(2, '0')}`;
const flat = (n: number, v = 10): [string, number][] => Array.from({ length: n }, (_, i) => [day(i), v]);

test('insufficient measured history returns no anomalies', () => {
  assert.deepEqual(detectAnomalies(flat(MIN_ANOMALY_POINTS - 1)), []);
  assert.deepEqual(detectAnomalies([]), []);
});

test('a perfectly flat series has zero variance and flags nothing', () => {
  assert.deepEqual(detectAnomalies(flat(20)), []);
});

test('a large spike above a stable baseline is flagged as a spike', () => {
  const s = flat(10);
  s.push([day(10), 200]);
  const a = detectAnomalies(s);
  assert.equal(a.length, 1);
  assert.equal(a[0].direction, 'spike');
  assert.equal(a[0].y, 200);
  assert.ok(a[0].z >= 2);
});

test('a large drop below a stable baseline is flagged as a drop', () => {
  const s = flat(10, 100);
  s.push([day(10), 0]);
  const a = detectAnomalies(s);
  assert.equal(a.length, 1);
  assert.equal(a[0].direction, 'drop');
  assert.ok(a[0].z <= -2);
});

test('normal jitter within the threshold is not flagged', () => {
  const s: [string, number][] = Array.from({ length: 20 }, (_, i) => [day(i), 10 + (i % 3)]);
  assert.deepEqual(detectAnomalies(s, 3), []);
});

test('a higher threshold suppresses a moderate spike', () => {
  const s = flat(10);
  s.push([day(10), 20]);
  assert.ok(detectAnomalies(s, 2).length >= 1);
  assert.deepEqual(detectAnomalies(s, 50), []);
});

test('the baseline is trailing only — the first window points are never flagged', () => {
  const s = flat(10);
  s[0] = [day(0), 999]; // huge value inside the initial baseline window
  const a = detectAnomalies(s);
  assert.ok(a.every((p) => p.x !== day(0)));
});

test('window is configurable and defaults to the documented constant', () => {
  const s = flat(4);
  s.push([day(4), 100]);
  assert.equal(detectAnomalies(s, 2, 4).length, 1);
  assert.equal(ANOMALY_WINDOW, 7);
});