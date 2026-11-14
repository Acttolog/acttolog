import { NextResponse } from 'next/server';
import { requireIntel } from '@/lib/intelligence/guard';
import { getPrisma } from '@/lib/db';
import { normalize } from '@/lib/metrics';
import { parseQuery, runQuery } from '@/lib/intelligence/query';

export const dynamic = 'force-dynamic';

/** GET /api/admin/query — constrained aggregation over measured events (no raw SQL). */
export async function GET(req: Request) {
  const denied = await requireIntel('run_queries');
  if (denied) return denied;
  const url = new URL(req.url);
  const spec = parseQuery({
    metric: url.searchParams.get('metric'),
    groupBy: url.searchParams.get('groupBy'),
    div: url.searchParams.get('div'),
    type: url.searchParams.get('type'),
  });
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ configured: false, spec, rows: [] });

  const p = url.searchParams.get('period') || '28';
  const n = p === '7' ? 6 : p === '90' ? 89 : 27;
  const from = new Date(Date.now() - n * 86400000);
  const events = await prisma.analyticsEvent.findMany({ where: { ts: { gte: from } }, take: 20000 });
  const rows = runQuery(normalize(events), spec);
  return NextResponse.json({ configured: true, spec, rows });
}