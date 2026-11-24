'use client';

import { useCallback, useEffect, useState } from 'react';

interface Agg {
  configured: boolean;
  period: string;
  pv: number;
  users: number;
  sessions: number;
  eng: number | null;
  byDiv: Record<string, number>;
  byDay: [string, number][];
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function ReportsPage() {
  const [data, setData] = useState<Agg | null>(null);
  const [cadence, setCadence] = useState('weekly');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics?period=28');
      setData(await res.json());
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const download = () => {
    if (!data) return;
    const lines: (string | number)[][] = [
      ['ACTTOLOG measured report', data.period],
      ['generated', new Date().toISOString()],
      ['page_views', data.pv],
      ['sessions', data.sessions],
      ['anonymous_ids', data.users],
      ['engaged_rate', data.eng === null ? 'insufficient measured data' : data.eng],
      [],
      ['day', 'page_views'],
      ...data.byDay,
      [],
      ['division', 'page_views'],
      ...Object.entries(data.byDiv),
    ];
    const csv = lines.map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acttolog-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-[22px] font-bold tracking-[-.02em]">Reports</h2>
        <p className="mut mt-1 max-w-[92ch] text-[13px] leading-relaxed">
          Compose a report from measured, consent-gated events and export it manually. Scheduled delivery is shown
          honestly below: it requires a cron runner and an email provider, and is not active — nothing is emailed
          automatically.
        </p>
      </div>

      <div className="panel mb-5 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="mono dim text-[10.5px] tracking-[.2em]">REPORT PREVIEW · {data?.period || '…'}</div>
          <button className="btn btn-p btn-sm" onClick={download} disabled={!data || !data.configured}>
            Download report (CSV)
          </button>
        </div>
        {!data || !data.configured ? (
          <p className="mut text-[12.8px]">Report data activates when PostgreSQL is connected. No numbers are fabricated.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ['Page views', data.pv.toLocaleString('en-US')],
                ['Sessions', data.sessions.toLocaleString('en-US')],
                ['Anonymous ids', data.users.toLocaleString('en-US')],
                ['Engaged rate', data.eng === null ? 'Insufficient measured data' : `${data.eng}%`],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="rounded-lg border p-4" style={{ borderColor: 'var(--line)' }}>
                <div className="mono dim mb-1 text-[10.5px] tracking-[.18em]">{k.toUpperCase()}</div>
                <div className="font-display text-[20px] font-bold">{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel p-6">
        <div className="mono dim mb-4 text-[10.5px] tracking-[.2em]">SCHEDULED DELIVERY · HONEST STATUS</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {['daily', 'weekly', 'monthly'].map((c) => (
            <button key={c} className={`chip${cadence === c ? ' on' : ''}`} onClick={() => setCadence(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
          <span className="badge b-info mr-2">not active</span>
          <span className="mut text-[12.8px]">
            A {cadence} digest is configured locally, but delivery requires a cron runner and an email provider. Until
            those are connected, use manual export above. No email is sent and no delivery is claimed.
          </span>
        </div>
      </div>
    </div>
  );
}