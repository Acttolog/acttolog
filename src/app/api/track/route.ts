import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DIVS: Record<string, string> = {
  research: 'research', entertainment: 'entertainment', academy: 'academy', games: 'games',
  darkroom: 'darkroom', blog: 'blog', offers: 'offers', about: 'about', contact: 'contact',
  ai: 'ai', my: 'account', admin: 'admin', search: 'search',
};
const divOf = (p: string) => DIVS[(p || '/').split('/')[1] || ''] || 'home';

interface TrackBody {
  t?: string; path?: string; sid?: string; q?: string;
  [k: string]: unknown;
}

/**
 * POST /api/track — first-party analytics events (spec §64–67).
 * Stored in UTC. Identity is never attached — anonymous session ids only.
 * No-ops honestly when the database is not configured.
 */
export async function POST(req: Request) {
  let body: TrackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const type = String(body.t || '').slice(0, 40);
  const path = String(body.path || '').slice(0, 300);
  if (!type || !path.startsWith('/')) return NextResponse.json({ ok: false }, { status: 400 });

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: true, stored: false });

  const ua = req.headers.get('user-agent') || '';
  const dev = /Mobi|Android/i.test(ua) ? 'mobile' : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop';
  const { t, path: _p, sid, q, ...rest } = body;

  try {
    await prisma.analyticsEvent.create({
      data: {
        t: type,
        path,
        div: divOf(path),
        sid: String(sid || 'anon').slice(0, 40),
        src: 'internal',
        dev,
        q: q ? String(q).slice(0, 200) : null,
        meta: Object.keys(rest).length ? (rest as object) : undefined,
        ts: new Date(),
      },
    });
    return NextResponse.json({ ok: true, stored: true });
  } catch (e) {
    console.error('track failed', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
