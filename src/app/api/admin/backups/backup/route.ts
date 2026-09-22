import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/staff';
import { getPrisma } from '@/lib/db';
import { driveConfigured, uploadBackup, listBackups } from '@/lib/backup/drive';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/backup/run — create a backup dump and upload it to the
 * private ACTTOLOG Drive folder; record a BackupRecord.
 * GET  — list recorded backups. Weekly scheduling is handled by the host's
 * cron (Vercel Cron) calling this route with a staff session/cron secret.
 */
export async function POST(req: Request) {
  const denied = await requireStaff();
  if (denied) return denied;
  if (!driveConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const kind = 'Database';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const [posts, divisions, resources, offers, settings] = await Promise.all([
    prisma.blogPost.findMany(),
    prisma.division.findMany(),
    prisma.darkroomResource.findMany(),
    prisma.offer.findMany(),
    prisma.siteSettings.findMany(),
  ]);
  const payload = { kind, at: new Date().toISOString(), posts, divisions, resources, offers, settings };

  try {
    const file = await uploadBackup(kind, `acttolog-db-${stamp}.json`, payload);
    const rec = await prisma.backupRecord.create({
      data: { kind, provider: 'google_drive', location: `ACTTOLOG/Backups/${kind}/${file.name}`, status: 'ok', note: `drive file ${file.id}` },
    });
    return NextResponse.json({ ok: true, backup: rec });
  } catch (e) {
    const rec = await prisma.backupRecord.create({
      data: { kind, provider: 'google_drive', location: '-', status: 'failed', note: String(e).slice(0, 300) },
    });
    return NextResponse.json({ ok: false, backup: rec }, { status: 500 });
  }
}

export async function GET() {
  const denied = await requireStaff();
  if (denied) return denied;
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  const records = await prisma.backupRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  let drive: unknown = null;
  if (driveConfigured()) {
    try { drive = await listBackups('Database'); } catch { drive = 'unreachable'; }
  }
  return NextResponse.json({ configured: driveConfigured(), records, drive });
}
