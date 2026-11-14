import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactMeta } from './redact.ts';

test('null/undefined meta yields null', () => {
  assert.equal(redactMeta(null), null);
  assert.equal(redactMeta(undefined), null);
});

test('secret-looking keys are masked', () => {
  const out = redactMeta({
    apiKey: 'abc',
    api_key: 'abc',
    password: 'hunter2',
    Authorization: 'Bearer xyz',
    cookie: 'atl_session=jwt',
    clientSecret: 's',
    token: 't',
    safe: 'kept',
  });
  assert.equal(out?.apiKey, '[redacted]');
  assert.equal(out?.api_key, '[redacted]');
  assert.equal(out?.password, '[redacted]');
  assert.equal(out?.Authorization, '[redacted]');
  assert.equal(out?.cookie, '[redacted]');
  assert.equal(out?.clientSecret, '[redacted]');
  assert.equal(out?.token, '[redacted]');
  assert.equal(out?.safe, 'kept');
});

test('long strings are truncated to 500 chars', () => {
  const out = redactMeta({ note: 'x'.repeat(900) });
  assert.equal((out?.note as string).length, 500);
});

test('numbers, booleans and null pass through; nested objects collapse', () => {
  const out = redactMeta({ count: 5, ok: true, missing: null, nested: { a: 1 }, arr: [1, 2] });
  assert.equal(out?.count, 5);
  assert.equal(out?.ok, true);
  assert.equal(out?.missing, null);
  assert.equal(out?.nested, '[nested]');
  assert.equal(out?.arr, '[nested]');
});

test('non-object meta is wrapped as a truncated value', () => {
  assert.deepEqual(redactMeta('hello'), { value: 'hello' });
  assert.deepEqual(redactMeta([1, 2]), { value: '1,2' });
});