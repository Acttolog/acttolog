import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getPrisma } from '@/lib/db';
import { rateLimit, clientKey } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/my/deletion — Request Account Deletion (spec §50).
 * No instant self-delete: the request enters the private admin workflow.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  if (!rateLimit(`del:${user.uid}`, 2, 60 * 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  await prisma.user.updateMany({
    where: { providerId: user.uid.replace(/^g_/, '') },
    data: { deletionRequestedAt: new Date() },
  });
  // Also record as a notification for admins via contact-style queue
  await prisma.contactMessage.create({
    data: {
      name: user.name,
      email: user.email,
      subject: '[ACCOUNT DELETION REQUEST]',
      division: 'system',
      message: `User ${user.email} (${user.uid}) requested account deletion from My Acttolog → Settings. Process privately per policy; never auto-delete without review.`,
      status: 'new',
    },
  });

  return NextResponse.json({ ok: true });
}
