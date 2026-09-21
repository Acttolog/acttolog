import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/staff';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/admin/users — private member registry (no public directory ever). */
export async function GET() {
  const denied = await requireStaff();
  if (denied) return denied;
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }, take: 200,
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true, deletionRequestedAt: true },
  });
  return NextResponse.json({ users });
}
