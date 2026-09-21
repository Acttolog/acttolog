import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDB } from '@/lib/content';
import { precheckUrl } from '@/lib/darkroom';
import { rateLimit, clientKey } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const Body = z.object({ url: z.string().max(2000), name: z.string().max(200).optional() });

/**
 * POST /api/darkroom/check — automated pre-check (spec §37).
 * URL validation · HTTPS · duplicates · reachability. Never a safety guarantee.
 */
export async function POST(req: Request) {
  if (!rateLimit(`drchk:${clientKey(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const db = getDB();
  const checks = precheckUrl(body.url, db.dr.map((r) => r.url), db.drSubs.map((s) => s.url));

  // reachability probe (server-side, short timeout, HEAD then GET fallback)
  let reachable: [string, boolean] = ['Destination responds', false];
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    let res = await fetch(body.url, { method: 'HEAD', signal: ctl.signal, redirect: 'follow' });
    if (!res.ok) res = await fetch(body.url, { method: 'GET', signal: ctl.signal, redirect: 'follow' });
    clearTimeout(timer);
    reachable = ['Destination responds', res.ok];
  } catch {
    reachable = ['Destination responds', false];
  }

  return NextResponse.json({
    checks: [...checks, reachable],
    disclaimer: 'These checks do not guarantee that a destination is safe. Human admin verification is required before publication.',
  });
}
