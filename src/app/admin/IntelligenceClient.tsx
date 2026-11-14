'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ColumnDef } from '@tanstack/react-table';
import { Icon } from '@/components/ui/Icon';
import {
  DEFAULT_FILTERS,
  parseFilters,
  filtersToParams,
  PERIODS,
  type GlobalFilters,
  type Period,
} from '@/lib/intelligence/filters';
import { forecastSeries } from '@/lib/intelligence/forecast';
import { detectAnomalies, ANOMALY_LABEL } from '@/lib/intelligence/anomaly';
import { DataGrid } from '@/components/intelligence/DataGrid';

// Recharts is heavy — code-split it out of the main admin bundle.
const AreaTrend = dynamic(() => import('@/components/intelligence/charts/AreaTrend').then((m) => m.AreaTrend), {
  ssr: false,
  loading: () => <div className="dim mono text-[11px]">LOADING CHART…</div>,
});
const DrilldownBar = dynamic(() => import('@/components/intelligence/charts/DrilldownBar').then((m) => m.DrilldownBar), {
  ssr: false,
  loading: () => <div className="dim mono text-[11px]">LOADING CHART…</div>,
});

interface DayRow {
  day: string;
  views: number;
}
const DAY_COLUMNS: ColumnDef<DayRow, unknown>[] = [
  { accessorKey: 'day', header: 'Day', cell: (i) => <span className="mono">{String(i.getValue())}</span> },
  {
    accessorKey: 'views',
    header: 'Page views',
    cell: (i) => <span className="mono">{Number(i.getValue()).toLocaleString('en-US')}</span>,
  },
];

interface Agg {
  configured: boolean;
  period: string;
  pv: number;
  users: number;
  sessions: number;
  eng: number | null;
  engagedSessions: number;
  avgSessionDurationMs: number | null;
  byDiv: Record<string, number>;
  byDay: [string, number][];
  byType: Record<string, number>;
  prev: { pv: number; users: number; sessions: number };
  live: { online: number; by: Record<string, number> };
}

export function IntelligenceClient({ variant }: { variant: 'analytics' | 'intelligence' }) {
  const [filters, setFilters] = useState<GlobalFilters>(DEFAULT_FILTERS);
  const period = filters.period;
  const [data, setData] = useState<Agg | null>(null);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string[] | null>(null);

  // Filters are URL-persisted: read them on mount, write them back on change.
  useEffect(() => {
    setFilters(parseFilters(new URLSearchParams(window.location.search)));
  }, []);

  const patchFilters = useCallback((patch: Partial<GlobalFilters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      const qs = filtersToParams(next).toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
      return next;
    });
  }, []);

  const setPeriod = useCallback((p: Period) => patchFilters({ period: p }), [patchFilters]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (filters.div) params.set('div', filters.div);
      const res = await fetch(`/api/admin/analytics?${params.toString()}`);
      setData(await res.json());
    } catch {
      setData(null);
    }
  }, [period, filters.div]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (variant !== 'intelligence') return;
    const id = setInterval(load, 30000); // live refresh
    return () => clearInterval(id);
  }, [load, variant]);

  const ask = () => {
    if (!data || !q.trim()) return;
    const lines: string[] = [];
    const qq = q.toLowerCase();
    lines.push(
      `MEASURED FACT. ${data.period}: ${data.pv} page views, ${data.sessions} sessions, ${data.users} anonymous ids, ${
        data.eng === null ? 'insufficient measured data for engaged rate' : `${data.eng}% engaged`
      }.`,
    );
    if (/divis|compare/.test(qq))
      Object.entries(data.byDiv)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([k, v]) => lines.push(`MEASURED FACT. ${k}: ${v} page views.`));
    if (/change|previous|last/.test(qq))
      lines.push(
        `MEASURED FACT. Page views ${data.pv >= data.prev.pv ? '+' : ''}${data.prev.pv ? Math.round(((data.pv - data.prev.pv) / data.prev.pv) * 1000) / 10 : 0}% versus the previous period.`,
      );
    if (/source/.test(qq))
      lines.push('MEASURED FACT. Acquisition sources appear once measured events accumulate.');
    lines.push(
      'AUTOMATED INTERPRETATION. These are arithmetic comparisons of measured counts. No causal explanation or success claim is inferred from traffic data alone.',
    );
    setAnswer(lines);
  };

  if (!data)
    return <div className="panel dim mono p-10 text-center text-[11px] tracking-[.2em]">LOADING…</div>;

  if (!data.configured) {
    return (
      <div className="panel p-10 text-center">
        <span
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl"
          style={{ background: 'color-mix(in srgb,var(--warn) 12%,transparent)', color: 'var(--warn)' }}
        >
          <Icon name="chart" size={22} />
        </span>
        <h3 className="h3 mb-2">No measured data yet</h3>
        <p className="mut mx-auto max-w-[62ch] text-[13.2px] leading-relaxed">
          Acttolog never shows sample numbers as real traffic. Analytics storage activates when PostgreSQL is
          connected; events are recorded only after visitors grant analytics consent. GA4 (when configured)
          loads under the same consent gate.
        </p>
      </div>
    );
  }

  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : a ? 100 : 0);
  const anomalies = detectAnomalies(data.byDay);

  return (
    <div>
      <div className="panel mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(({ id, label }) => (
              <button key={id} className={`chip${period === id ? 'on' : ''}`} onClick={() => setPeriod(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {variant === 'intelligence' && (
              <a
                className="btn btn-g btn-sm"
                href={`/api/admin/analytics?${(() => {
                  const p = filtersToParams(filters);
                  p.set('format', 'csv');
                  return p.toString();
                })()}`}
              >
                <Icon name="down" size={14} />
                Export CSV
              </a>
            )}
            <span className="dim mono text-[10.4px]">displayed in Asia/Kathmandu</span>
          </div>
        </div>
      </div>

      {variant === 'intelligence' && (
        <div className="panel mb-5 p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="dot" />
            <div className="mono dim text-[9.7px] tracking-[.2em]">
              LIVE NOW · NEPAL TIME · AGGREGATED ONLY
            </div>
          </div>
          <div className="font-display mb-1 text-[36px] leading-none font-bold tracking-[-.03em]">
            {data.live.online}
          </div>
          <div className="mut mb-5 text-[12.8px]">visitors online (identity never exposed)</div>
          <div className="space-y-2">
            {Object.entries(data.live.by)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(84px,150px)_1fr_auto] items-center gap-3">
                  <div className="truncate text-[12.5px]">{k}</div>
                  <div className="h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
                    <i
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (v / Math.max(1, data.live.online)) * 100)}%`,
                        background: 'var(--grad)',
                      }}
                    />
                  </div>
                  <span className="mono dim text-[11.6px]">{v}</span>
                </div>
              ))}
            {!Object.keys(data.live.by).length && (
              <p className="mut text-[12.6px]">Nobody online in the last 30 minutes.</p>
            )}
          </div>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['Page views', data.pv, data.prev.pv],
            ['Sessions', data.sessions, data.prev.sessions],
            ['Anonymous ids', data.users, data.prev.users],
          ] as [string, number, number][]
        ).map(([label, v, prev]) => (
          <div key={label} className="panel p-5">
            <div className="mono dim mb-2 text-[9.6px] tracking-[.18em]">{label.toUpperCase()}</div>
            <div className="font-display text-[28px] font-bold tracking-[-.03em]">
              {v.toLocaleString('en-US')}
            </div>
            {prev > 0 ? (
              <span className={`badge mt-2 ${pct(v, prev) >= 0 ? 'b-ok' : 'b-err'}`}>
                {pct(v, prev) > 0 ? '+' : ''}
                {pct(v, prev)}%
              </span>
            ) : (
              <span className="dim mt-2 block text-[10.4px]">no prior-period base</span>
            )}
          </div>
        ))}
        <div className="panel p-5">
          <div className="mono dim mb-2 text-[9.6px] tracking-[.18em]">ENGAGED RATE</div>
          {data.eng === null ? (
            <div className="mut text-[13px] leading-snug">Insufficient measured data</div>
          ) : (
            <>
              <div className="font-display text-[28px] font-bold tracking-[-.03em]">{data.eng}%</div>
              <span className="dim mt-2 block text-[10.4px]">
                {data.engagedSessions} of {data.sessions} sessions engaged
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="panel p-6">
          <div className="mono dim mb-4 text-[9.7px] tracking-[.2em]">TRAFFIC TREND · PAGE VIEWS</div>
          <AreaTrend data={data.byDay} forecast={forecastSeries(data.byDay.map(([, v]) => v), 7)} />
        </div>
        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="mono dim text-[9.7px] tracking-[.2em]">DIVISION PERFORMANCE</div>
            {filters.div && (
              <button className="chip on !text-[10px]" onClick={() => patchFilters({ div: null })}>
                {filters.div} ✕
              </button>
            )}
          </div>
          <DrilldownBar
            data={Object.entries(data.byDiv)}
            onSelect={(k) => patchFilters({ div: filters.div === k ? null : k })}
          />
          <p className="dim mt-2 text-[10.4px]">Click a division to cross-filter the dashboard.</p>
        </div>
      </div>

      <div className="panel mb-5 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="mono dim text-[9.7px] tracking-[.2em]">ANOMALY WATCH · DAILY PAGE VIEWS</div>
          <span className="badge b-vi">{anomalies.length} flagged</span>
        </div>
        {anomalies.length === 0 ? (
          <p className="mut text-[12.8px]">
            No statistical anomalies in this period. Detection needs at least 8 measured days; a flag is a
            statistical observation, not proof of cause.
          </p>
        ) : (
          <div className="space-y-2">
            {anomalies.map((a) => (
              <div
                key={a.x}
                className="grid grid-cols-[minmax(96px,140px)_auto_1fr] items-center gap-3 rounded-lg border px-3 py-2"
                style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
              >
                <span className="mono text-[12px]">{a.x}</span>
                <span className={`badge ${a.direction === 'spike' ? 'b-ok' : 'b-err'}`}>
                  {a.direction === 'spike' ? 'spike' : 'drop'} · z {a.z}
                </span>
                <span className="mono dim text-[11.6px]">{a.y.toLocaleString('en-US')} page views</span>
              </div>
            ))}
          </div>
        )}
        <p className="dim mt-3 text-[10.4px]">{ANOMALY_LABEL}</p>
      </div>

      <div className="panel mb-5 p-6">
        <div className="mono dim mb-4 text-[9.7px] tracking-[.2em]">DAILY MEASURED DATA</div>
        <DataGrid
          columns={DAY_COLUMNS}
          data={data.byDay.map(([day, views]) => ({ day, views }))}
          exportName={`acttolog-daily-${period}`}
          emptyText="No events in this period."
        />
      </div>

      {variant === 'intelligence' && (
        <div className="panel mb-5 p-6">
          <div className="mono dim mb-4 text-[9.7px] tracking-[.2em]">ASK YOUR DATA</div>
          <div className="mb-4 flex gap-2.5">
            <input
              className="inp flex-1"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="Show me traffic over 28 days · Compare divisions · What changed from last period?"
            />
            <button className="btn btn-p" onClick={ask} disabled={!q.trim()}>
              <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {['Compare divisions', 'What changed from last period?', 'Which sections get most views?'].map(
              (s) => (
                <button
                  key={s}
                  className="chip !text-[11px]"
                  onClick={() => {
                    setQ(s);
                  }}
                >
                  {s}
                </button>
              ),
            )}
          </div>
          {answer && (
            <div
              className="space-y-2 rounded-xl border p-4"
              style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
            >
              {answer.map((l, i) => (
                <p key={i} className="mut text-[13px] leading-relaxed">
                  <span className={`badge mr-2 ${l.startsWith('MEASURED') ? 'b-info' : 'b-vi'}`}>
                    {l.split('.')[0]}
                  </span>
                  {l.slice(l.indexOf('.') + 2)}
                </p>
              ))}
            </div>
          )}
          <p className="dim mt-4 text-[11.4px]">
            Deterministic arithmetic over measured events — nothing is invented. Connect OpenAI for
            natural-language summaries of the same measured data.
          </p>
        </div>
      )}

      <div className="panel p-6">
        <div className="mono dim mb-4 text-[9.7px] tracking-[.2em]">EVENT BREAKDOWN</div>
        <DrilldownBar data={Object.entries(data.byType)} />
      </div>
    </div>
  );
}
