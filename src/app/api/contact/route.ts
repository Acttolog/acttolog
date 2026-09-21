import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/lib/db';
import { rateLimit, clientKey } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().or(z.literal('')),
  subject: z.string().min(2).max(200),
  division: z.string().max(60).optional().or(z.literal('')),
  message: z.string().min(10).max(5000),
  website: z.string().max(200).optional(), // honeypot — bots fill it, humans never see it
});

/** POST /api/contact — public, no login (spec §45). Rate-limited + honeypot. */
export async function POST(req: Request) {
  if (!rateLimit(`contact:${clientKey(req)}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  if (body.website) {
    // honeypot triggered — pretend success to the bot, store nothing
    return NextResponse.json({ ok: true });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({
      error: 'not_configured',
      hint: 'Message storage is not configured yet. Please email or call us directly.',
    }, { status: 503 });
  }

  await prisma.contactMessage.create({
    data: {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || null,
      subject: body.subject.trim(),
      division: body.division || null,
      message: body.message.trim(),
      status: 'new',
    },
  });

  return NextResponse.json({ ok: true });
}
