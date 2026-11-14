import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Metric Dictionary | Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

import { AHead } from '../AdminUi';
import { EtlPanel } from './EtlPanel';
import { getPrisma } from '@/lib/db';
import { computeMetrics, normalize, METRIC_DICTIONARY } from '@/lib/metrics';

/** Current measured value for a dictionary key, or null when not computable. */
function currentValue(key: string, m: ReturnType<typeof computeMetrics> | null): number | null {
  if (!m) return null;
  const t = m.byType;
  switch (key) {
    case 'page_views':
      return m.pageViews;
    case 'sessions':
      return m.sessions;
    case 'users':
      return m.users;
    case 'engaged_sessions':
      return m.engagedSessions;
    case 'engaged_rate':
      return m.engagedRate;
    case 'game_completion_rate':
      return t['game_launch'] ? Math.round(((t['game_completed'] || 0) / t['game_launch']) * 1000) / 10 : null;
    case 'search_success_rate':
      return t['search'] ? Math.round(((t['search_result_selected'] || 0) / t['search']) * 1000) / 10 : null;
    default:
      return null;
  }
}

function fmt(v: number | null, unit: string): string {
  if (v === null) return 'Insufficient measured data';
  if (unit === 'percent') return `${v}%`;
  if (unit === 'ms') return `${(v / 1000).toFixed(1)}s`;
  return v.toLocaleString('en-US');
}

async function loadCurrentMetrics(): Promise<ReturnType<typeof computeMetrics> | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  const from = new Date(Date.now() - 27 * 86400000);
  const events = await prisma.analyticsEvent.findMany({ where: { ts: { gte: from } }, take: 20000 });
  return computeMetrics(normalize(events));
}

export default async function Page() {
  const metrics = await loadCurrentMetrics();

  return (
    <div>
      <AHead
        title="Metric Dictionary"
        desc="Every metric's definition, formula and source are public to admins. Current values are computed from measured, consent-gated events over the last 28 days — a rate with no denominator reads Insufficient measured data, never a fake number."
      />
      <div className="space-y-3">
        {METRIC_DICTIONARY.map((d) => {
          const v = currentValue(d.key, metrics);
          return (
            <div key={d.key} className="panel p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="font-display text-[14.4px] font-semibold">{d.name}</div>
                <div className="flex items-center gap-2">
                  <span className="badge b-info">{d.unit}</span>
                  <span className="mono text-[13px] font-semibold" style={{ color: v === null ? 'var(--warn)' : 'var(--cy)' }}>
                    {fmt(v, d.unit)}
                  </span>
                </div>
              </div>
              <p className="mut mb-2 max-w-[96ch] text-[12.8px] leading-relaxed">{d.description}</p>
              <div className="mono dim text-[11px]">
                <span className="mr-4">formula: {d.formula}</span>
                <span>source: {d.source}</span>
              </div>
            </div>
          );
        })}
      </div>
      <EtlPanel />
    </div>
  );
}