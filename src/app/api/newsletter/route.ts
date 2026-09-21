import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/lib/db';
import { rateLimit, clientKey } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const Body = z.object({ email: z.string().email().max(200) });

/** POST /api/newsletter — honest signup recording; delivery starts when an email provider is connected. */
export async function POST(req: Request) {
  if (!rateLimit(`nl:${clientKey(req)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  let email: string;
  try {
    email = Body.parse(await req.json()).email.toLowerCase();
  } catch {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    // Persistence not configured yet — say so honestly instead of pretending.
    return NextResponse.json({
      ok: false,
      error: 'not_configured',
      note: 'Newsletter storage is not configured yet. Please try again after launch, or contact us directly.',
    }, { status: 503 });
  }

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: true, note: 'This email is already subscribed.' });
  }
  await prisma.newsletterSubscriber.create({ data: { email, consent: true, status: 'subscribed' } });
  return NextResponse.json({
    ok: true,
    note: 'Subscribed. Delivery starts once an email provider is connected.',
  });
}
