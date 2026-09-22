import 'server-only';

/**
 * Minimal in-memory sliding-window rate limiter (spec §86).
 * Single-instance scope: on serverless this limits per-container abuse;
 * pair with platform-level rate limiting in production hardening.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { buckets.set(key, arr); return false; }
  arr.push(now);
  buckets.set(key, arr);
  // opportunistic cleanup
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      const fresh = v.filter((t) => now - t < windowMs);
      if (fresh.length) buckets.set(k, fresh); else buckets.delete(k);
    }
  }
  return true;
}

export function clientKey(req: Request): string {
  const h = req.headers;
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
}
