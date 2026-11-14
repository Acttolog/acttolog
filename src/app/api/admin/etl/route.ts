import { NextResponse } from 'next/server';
import { requireIntel } from '@/lib/intelligence/guard';
import { writeAudit } from '@/lib/intelligence/audit';
import { getSessionUser } from '@/lib/auth/session';
import { getPrisma } from '@/lib/db';
import { normalize, METRIC_DICTIONARY } from '@/lib/metrics';
import { computeDailySnapshots } from '@/lib/intelligence/etl';

export const dynamic = 'force-dynamic';

const DAY = 86400000;

/** GET /api/admin/etl — recent stored snapshots (measured only). */
export async function GET() {
  const denied = await requireIntel('view');
  if (denied) return denied;
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ configured: false, snapshots: [] });
  const snapshots = await prisma.metricSnapshot.findMany({ orderBy: { periodStart: 'desc' }, take: 200 });
  return NextResponse.json({ configured: true, snapshots });
}

/** POST /api/admin/etl?days=N — recompute daily snapshots from measured events. */
export async function POST(req: Request) {
  const denied = await requireIntel('build_reports');
  if (denied) return denied;
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ configured: false, snapshots: 0 });

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '14', 10) || 14));
  const events = await prisma.analyticsEvent.findMany({ where: { ts: { gte: new Date(Date.now() - days * DAY) } }, take: 50000 });
  const rows = computeDailySnapshots(normalize(events), Date.now(), days);

  for (const d of METRIC_DICTIONARY) {
    const definition = `${d.description} Formula: ${d.formula}`;
    await prisma.metricDefinition.upsert({
      where: { key: d.key },
      create: { key: d.key, label: d.name, unit: d.unit, definition },
      update: { label: d.name, unit: d.unit, definition },
    });
  }

  const starts = [...new Set(rows.map((r) => r.periodStart.getTime()))].map((t) => new Date(t));
  await prisma.$transaction([
    prisma.metricSnapshot.deleteMany({ where: { periodStart: { in: starts } } }),
    prisma.metricSnapshot.createMany({
      data: rows.map((r) => ({
        metricKey: r.metricKey,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        value: r.value,
        numerator: r.numerator,
        denominator: r.denominator,
      })),
    }),
  ]);

  await writeAudit({ actor: await getSessionUser(), action: 'etl.run', target: `${days}d`, meta: { snapshots: rows.length } });
  return NextResponse.json({ configured: true, days, definitions: METRIC_DICTIONARY.length, snapshots: rows.length });
}