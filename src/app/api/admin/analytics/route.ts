import { NextResponse } from 'next/server';
import { requireIntel } from '@/lib/intelligence/guard';
import { writeAudit } from '@/lib/intelligence/audit';
import { getSessionUser } from '@/lib/auth/session';
import { getPrisma } from '@/lib/db';
import { toCSV } from '@/lib/utils';
import { computeMetrics, normalize } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

function rangeOf(p: string) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (p === 'live') return { f: new Date(Date.now() - 18e5), t: to, label: 'Live (30 min)' };
  if (p === 'today') return { f: from, t: to, label: 'Today' };
  const n = p === '7' ? 6 : p === '90' ? 89 : 27;
  const f = new Date(from);
  f.setDate(f.getDate() - n);
  return { f, t: to, label: `Last ${p} days` };
}

/** GET /api/admin/analytics — measured events only; CSV export supported. */
export async function GET(req: Request) {
  const denied = await requireIntel('view');
  if (denied) return denied;

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || '28';
  const format = url.searchParams.get('format');
  const div = url.searchParams.get('div') || null;
  const divFilter = div ? { div } : {};
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({
      configured: false,
      period,
      pv: 0,
      users: 0,
      sessions: 0,
      eng: null,
      engagedSessions: 0,
      avgSessionDurationMs: null,
      byDiv: {},
      byDay: [],
      byType: {},
      prev: { pv: 0, users: 0, sessions: 0 },
      live: { online: 0, by: {} },
    });

  const r = rangeOf(period);
  const prevSpan = r.t.getTime() - r.f.getTime();
  const prev = { f: new Date(r.f.getTime() - prevSpan - 1), t: new Date(r.f.getTime() - 1) };

  const [events, prevEvents, liveEvents] = await Promise.all([
    prisma.analyticsEvent.findMany({ where: { ts: { gte: r.f, lte: r.t }, ...divFilter }, take: 20000 }),
    prisma.analyticsEvent.findMany({ where: { ts: { gte: prev.f, lte: prev.t }, ...divFilter }, take: 20000 }),
    prisma.analyticsEvent.findMany({
      where: { t: 'page_view', ts: { gte: new Date(Date.now() - 18e5) }, ...divFilter },
      take: 2000,
    }),
  ]);

  const agg = computeMetrics(normalize(events));
  const prevAgg = computeMetrics(normalize(prevEvents));
  const liveNorm = normalize(liveEvents);
  const liveSids = new Set(liveNorm.map((e) => e.sid));
  const liveBy: Record<string, number> = {};
  liveNorm.forEach((e) => {
    const d = e.div || 'home';
    liveBy[d] = (liveBy[d] || 0) + 1;
  });

  if (format === 'csv') {
    const exportDenied = await requireIntel('export');
    if (exportDenied) return exportDenied;
    const rows = events.map((e) => ({
      ts: e.ts.toISOString(),
      type: e.t,
      path: e.path,
      division: e.div || '',
      session: e.sid,
    }));
    await writeAudit({
      actor: await getSessionUser(),
      action: 'analytics.export',
      target: period,
      meta: { format: 'csv', rows: rows.length },
    });
    return new NextResponse(toCSV(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="acttolog-${period}.csv"`,
      },
    });
  }

  return NextResponse.json({
    configured: true,
    period: r.label,
    pv: agg.pageViews,
    users: agg.users,
    sessions: agg.sessions,
    eng: agg.engagedRate,
    engagedSessions: agg.engagedSessions,
    avgSessionDurationMs: agg.avgSessionDurationMs,
    byDiv: agg.byDiv,
    byType: agg.byType,
    byDay: agg.byDay,
    prev: { pv: prevAgg.pageViews, users: prevAgg.users, sessions: prevAgg.sessions },
    live: { online: liveSids.size, by: liveBy },
  });
}
