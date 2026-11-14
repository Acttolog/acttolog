/**
 * Audit metadata redaction — pure and unit-tested.
 *
 * Audit rows are append-only and may be read by admins, so secrets and bulky
 * nested payloads must never land in them. Secret-looking keys are masked;
 * strings are truncated; nested objects/arrays are collapsed to a marker rather
 * than walked (avoids leaking PII buried deep in a payload).
 */

const SECRET_KEY = /secret|token|password|passwd|authorization|cookie|api[-_]?key|credential|private[-_]?key/i;
const MAX_STRING = 500;

export function redactMeta(meta: unknown): Record<string, unknown> | null {
  if (meta == null) return null;
  if (typeof meta !== 'object' || Array.isArray(meta)) {
    return { value: String(meta).slice(0, MAX_STRING) };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (SECRET_KEY.test(k)) {
      out[k] = '[redacted]';
    } else if (v == null) {
      out[k] = null;
    } else if (typeof v === 'string') {
      out[k] = v.slice(0, MAX_STRING);
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else {
      out[k] = '[nested]';
    }
  }
  return out;
}