import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFilters,
  filtersToParams,
  filtersToQuery,
  isDefaultFilters,
  DEFAULT_FILTERS,
  type GlobalFilters,
} from './filters.ts';

test('empty params yield defaults', () => {
  assert.deepEqual(parseFilters(new URLSearchParams()), DEFAULT_FILTERS);
});

test('invalid period falls back to default', () => {
  assert.equal(parseFilters(new URLSearchParams('period=bogus')).period, '28');
  assert.equal(parseFilters(new URLSearchParams('period=90')).period, '90');
});

test('dimensions are trimmed, empty becomes null, long values capped', () => {
  const f = parseFilters(new URLSearchParams('div=%20research%20&region=&device=' + 'x'.repeat(200)));
  assert.equal(f.div, 'research');
  assert.equal(f.region, null);
  assert.equal(f.device?.length, 80);
});

test('defaults are omitted from the query string', () => {
  assert.equal(filtersToQuery(DEFAULT_FILTERS), '');
  assert.equal(isDefaultFilters(DEFAULT_FILTERS), true);
  const f: GlobalFilters = { ...DEFAULT_FILTERS, period: '7' };
  assert.equal(filtersToQuery(f), '?period=7');
  assert.equal(isDefaultFilters(f), false);
});

test('round-trip parse(serialize(f)) === f for normalized filters', () => {
  const f: GlobalFilters = { period: 'live', div: 'games', region: 'bagmati', device: 'mobile', q: 'ludo' };
  const back = parseFilters(filtersToParams(f));
  assert.deepEqual(back, f);
});

test('round-trip holds for default filters too', () => {
  assert.deepEqual(parseFilters(filtersToParams(DEFAULT_FILTERS)), DEFAULT_FILTERS);
});

test('q is trimmed and capped at 200 chars', () => {
  const f = parseFilters(new URLSearchParams('q=' + encodeURIComponent('  hello  ')));
  assert.equal(f.q, 'hello');
  const long = parseFilters(new URLSearchParams('q=' + 'a'.repeat(500)));
  assert.equal(long.q.length, 200);
});