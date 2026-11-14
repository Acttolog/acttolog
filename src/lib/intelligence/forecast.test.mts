import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forecastSeries, leastSquares, FORECAST_LABEL } from './forecast.ts';

test('insufficient measured data returns null (no fabricated forecast)', () => {
  assert.equal(forecastSeries([5, 6], 3, 'linear-trend'), null);
  assert.equal(forecastSeries([], 3), null);
  assert.equal(forecastSeries([1, 2], 2, 'moving-average', 3), null);
});

test('zero horizon returns null', () => {
  assert.equal(forecastSeries([1, 2, 3, 4], 0), null);
});

test('every forecast is labelled NOT MEASURED', () => {
  const f = forecastSeries([10, 12, 14, 16], 3);
  assert.equal(f?.label, FORECAST_LABEL);
  assert.equal(f?.label, 'AUTOMATED FORECAST — NOT MEASURED');
});

test('linear trend projects an increasing series upward', () => {
  const f = forecastSeries([10, 20, 30, 40], 2, 'linear-trend');
  assert.ok(f);
  assert.equal(f.basedOn, 4);
  assert.equal(f.points.length, 2);
  // slope ~10, next values ~50, ~60
  assert.ok(f.points[0].y >= 45 && f.points[0].y <= 55, `got ${f.points[0].y}`);
  assert.ok(f.points[1].y > f.points[0].y);
  assert.equal(f.points[0].x, 4);
});

test('leastSquares recovers a known line', () => {
  const { slope, intercept } = leastSquares([2, 4, 6, 8]); // y = 2x + 2
  assert.equal(Math.round(slope), 2);
  assert.equal(Math.round(intercept), 2);
});

test('forecasts never go negative (counts are clamped at 0)', () => {
  const f = forecastSeries([30, 20, 10, 0], 4, 'linear-trend');
  assert.ok(f);
  for (const p of f.points) {
    assert.ok(p.y >= 0);
    assert.ok(p.lower >= 0);
    assert.ok(p.upper >= p.y);
  }
});

test('moving average forecasts the mean of the recent window', () => {
  const f = forecastSeries([100, 2, 4, 6], 2, 'moving-average', 3);
  assert.ok(f);
  assert.equal(f.points[0].y, 4); // mean of [2,4,6]
  assert.equal(f.method, 'moving-average');
});

test('non-finite measured values are dropped before fitting', () => {
  const f = forecastSeries([10, NaN, 20, 30, Infinity, 40], 1);
  assert.ok(f);
  assert.equal(f.basedOn, 4);
});