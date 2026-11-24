'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '@/components/intelligence/DataGrid';
import { parseQuery, type QuerySpec } from '@/lib/intelligence/query';

const DrilldownBar = dynamic(() => import('@/components/intelligence/charts/DrilldownBar').then((m) => m.DrilldownBar), {
  ssr: false,
  loading: () => <div className="dim mono text-[11px]">LOADING CHART…</div>,
});

interface Row {
  label: string;
  count: number;
}
const COLS: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'label', header: 'Group', cell: (i) => <span className="mono">{String(i.getValue())}</span> },
  { accessorKey: 'count', header: 'Count', cell: (i) => <span className="mono">{Number(i.getValue()).toLocaleString('en-US')}</span> },
];

const PERIODS = ['7', '28', '90'];

export default function QueriesPage() {
  const [spec, setSpec] = useState<QuerySpec>(parseQuery({}));
  const [period, setPeriod] = useState('28');
  const [rows, setRows] = useState<[string, number][]>([]);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const p = new URLSearchParams({ metric: spec.metric, groupBy: spec.groupBy, period });
      if (spec.div) p.set('div', spec.div);
      if (spec.type) p.set('type', spec.type);
      const res = await fetch(`/api/admin/query?${p.toString()}`);
      const data = await res.json();
      setConfigured(data.configured);
      setRows(data.rows || []);
    } catch {
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [spec, period]);

  useEffect(() => {
    run();
  }, [run]);

  const set = (patch: Partial<QuerySpec>) => setSpec((s) => ({ ...s, ...patch }));

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-[22px] font-bold tracking-[-.02em]">Query Builder</h2>
        <p className="mut mt-1 max-w-[92ch] text-[13px] leading-relaxed">
          Constrained aggregation over measured, consent-gated events. Pick a metric, grouping and optional filters —
          no raw SQL is ever executed, so injection is impossible by construction.
        </p>
      </div>

      <div className="panel mb-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mono dim mb-1 block text-[10.5px] tracking-[.18em]">METRIC</span>
            <select className="inp w-full" value={spec.metric} onChange={(e) => set({ metric: e.target.value as QuerySpec['metric'] })}>
              <option value="page_views">Page views</option>
              <option value="all_events">All events</option>
            </select>
          </label>
          <label className="block">
            <span className="mono dim mb-1 block text-[10.5px] tracking-[.18em]">GROUP BY</span>
            <select className="inp w-full" value={spec.groupBy} onChange={(e) => set({ groupBy: e.target.value as QuerySpec['groupBy'] })}>
              <option value="day">Day</option>
              <option value="div">Division</option>
              <option value="type">Event type</option>
            </select>
          </label>
          <label className="block">
            <span className="mono dim mb-1 block text-[10.5px] tracking-[.18em]">DIVISION FILTER</span>
            <input className="inp w-full" value={spec.div || ''} placeholder="any" onChange={(e) => set({ div: e.target.value || null })} />
          </label>
          <label className="block">
            <span className="mono dim mb-1 block text-[10.5px] tracking-[.18em]">EVENT TYPE FILTER</span>
            <input className="inp w-full" value={spec.type || ''} placeholder="any" onChange={(e) => set({ type: e.target.value || null })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <button key={p} className={`chip${period === p ? ' on' : ''}`} onClick={() => setPeriod(p)}>
              {p} Days
            </button>
          ))}
          <button className="btn btn-p btn-sm ml-auto" onClick={run} disabled={busy}>
            {busy ? 'Running…' : 'Run query'}
          </button>
        </div>
      </div>

      {!configured ? (
        <div className="panel p-8 text-center">
          <p className="mut text-[13px]">Query storage activates when PostgreSQL is connected. No rows are fabricated.</p>
        </div>
      ) : (
        <>
          <div className="panel mb-5 p-6">
            <div className="mono dim mb-4 text-[10.5px] tracking-[.2em]">RESULT · {rows.length} GROUPS</div>
            {rows.length ? <DrilldownBar data={rows} /> : <p className="mut text-[12.8px]">No events match this query in the selected period.</p>}
          </div>
          <div className="panel p-6">
            <div className="mono dim mb-4 text-[10.5px] tracking-[.2em]">RESULT ROWS</div>
            <DataGrid columns={COLS} data={rows.map(([label, count]) => ({ label, count }))} exportName="acttolog-query" emptyText="No events match this query." />
          </div>
        </>
      )}
    </div>
  );
}