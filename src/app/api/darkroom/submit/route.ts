import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { getPrisma } from '@/lib/db';
import { getDB } from '@/lib/content';
import { precheckUrl } from '@/lib/darkroom';
import { rateLimit, clientKey } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().min(2).max(200),
  url: z.string().url().max(2000),
  cat: z.string().max(80),
  desc: z.string().min(20).max(2000),
  why: z.string().min(20).max(2000),
  tags: z.string().max(300).optional(),
});

/**
 * POST /api/darkroom/submit — authenticated submission (spec §38).
 * Flow: Continue with Google → Submit → Automated Pre-check → Admin Review → Publish.
 * The submitter only ever sees "Submission received".
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  if (!rateLimit(`drsub:${user.uid}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  if (!body.url.startsWith('https://')) {
    return NextResponse.json({ error: 'https_required' }, { status: 400 });
  }

  const db = getDB();
  const norm = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const dupe = db.dr.some((r) => norm(r.url) === norm(body.url));
  if (dupe) return NextResponse.json({ error: 'duplicate' }, { status: 409 });

  const checks = precheckUrl(body.url, db.dr.map((r) => r.url), db.drSubs.map((s) => s.url));
  const checksReport = checks.map(([label, ok]) => `${label}: ${ok ? 'pass' : 'fail'}`).join('; ');

  const prisma = getPrisma();
  if (!prisma) {
    // Persistence not configured — be honest rather than silently dropping.
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  await prisma.darkroomSubmission.create({
    data: {
      name: body.name.trim(),
      url: body.url.trim(),
      category: body.cat || 'Other',
      desc: body.desc.trim(),
      why: body.why.trim(),
      tags: (body.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10),
      byUserId: user.uid,
      byEmail: user.email, // private — admin queue only, never shown back to the user
      status: 'pending',
      checks: `client+server: ${checksReport}`,
    },
  });

  return NextResponse.json({ ok: true, message: 'Submission received' });
}
