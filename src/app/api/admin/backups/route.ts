import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/staff';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/admin/backups — backup records (private; Drive locations never public). */
export async function GET() {
  const denied = await requireStaff();
  if (denied) return denied;
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const backups = await prisma.backupRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json({ backups });
}
