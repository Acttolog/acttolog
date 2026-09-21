import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/staff';
import { getPrisma } from '@/lib/db';
import { toCSV } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Ev { t: string; path: string; div: string | null; sid: string; ts: Date }

function rangeOf(p: string) {
  const to = new Date(); to.setHours(23, 59, 59, 999);
  const from = new Date(); from.setHours(0, 0, 0, 0);
  if (p === 'live') return { f: new Date(Date.now() - 18e5), t: to, label: 'Live (30 min)' };
  if (p === 'today') return { f: from, t: to, label: 'Today' };
  const n = p === '7' ? 6 : p === '90' ? 89 : 27;
  const f = new Date(from); f.setDate(f.getDate() - n);
  return { f, t: to, label: `Last ${p} days` };
}

function aggregate(events: Ev[], label: string) {
  const pv = events.filter((e) => e.t === 'page_view');
  const users = new Set(pv.map((e) => e.sid));
  const byDiv: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  pv.forEach((e) => {
    const d = e.div || 'home';
    byDiv[d] = (byDiv[d] || 0) + 1;
    byDay[e.ts.toISOString().slice(0, 10)] = (byDay[e.ts.toISOString().slice(0, 10)] || 0) + 1;
  });
  events.forEach((e) => { byType[e.t] = (byType[e.t] || 0) + 1; });
  return {
    period: label,
    pv: pv.length,
    users: users.size,
    sessions: users.size,
    eng: users.size ? Math.round((users.size / Math.max(1, users.size)) * 100) : 0,
    byDiv, byType,
    byDay: Object.entries(byDay).sort() as [string, number][],
  };
}

/** GET /api/admin/analytics — measured events only; CSV export supported. */
export async function GET(req: Request) {
  const denied = await requireStaff();
  if (denied) return denied;

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || '28';
  const format = url.searchParams.get('format');
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ configured: false, period, pv: 0, users: 0, sessions: 0, eng: 0, byDiv: {}, byDay: [], byType: {}, prev: { pv: 0, users: 0, sessions: 0 }, live: { online: 0, by: {} } });

  const r = rangeOf(period);
  const prevSpan = r.t.getTime() - r.f.getTime();
  const prev = { f: new Date(r.f.getTime() - prevSpan - 1), t: new Date(r.f.getTime() - 1) };

  const [events, prevEvents, liveEvents] = await Promise.all([
    prisma.analyticsEvent.findMany({ where: { ts: { gte: r.f, lte: r.t } }, take: 20000 }),
    prisma.analyticsEvent.findMany({ where: { ts: { gte: prev.f, lte: prev.t } }, take: 20000 }),
    prisma.analyticsEvent.findMany({ where: { t: 'page_view', ts: { gte: new Date(Date.now() - 18e5) } }, take: 2000 }),
  ]);

  const agg = aggregate(events as Ev[], r.label);
  const prevAgg = aggregate(prevEvents as Ev[], 'previous');
  const liveSids = new Set((liveEvents as Ev[]).map((e) => e.sid));
  const liveBy: Record<string, number> = {};
  (liveEvents as Ev[]).forEach((e) => { const d = e.div || 'home'; liveBy[d] = (liveBy[d] || 0) + 1; });

  if (format === 'csv') {
    const rows = (events as Ev[]).map((e) => ({ ts: e.ts.toISOString(), type: e.t, path: e.path, division: e.div || '', session: e.sid }));
    return new NextResponse(toCSV(rows), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="acttolog-${period}.csv"` },
    });
  }

  return NextResponse.json({
    configured: true,
    ...agg,
    prev: { pv: prevAgg.pv, users: prevAgg.users, sessions: prevAgg.sessions },
    live: { online: liveSids.size, by: liveBy },
  });
}
