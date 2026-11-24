'use client';

import { useCallback, useEffect, useState } from 'react';

interface Snap {
  id: string;
  metricKey: string;
  periodStart: string;
  value: number | null;
}

export function EtlPanel() {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/etl');
      const data = await res.json();
      setConfigured(data.configured);
      setSnaps(data.snapshots || []);
    } catch {
      setSnaps([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/etl?days=14', { method: 'POST' });
      const data = await res.json();
      setMsg(data.configured ? `Recomputed ${data.snapshots} snapshots across ${data.definitions} metric definitions.` : 'ETL requires PostgreSQL.');
      await load();
    } catch {
      setMsg('ETL run failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel mt-5 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="mono dim text-[10.5px] tracking-[.2em]">ETL · STORED METRIC SNAPSHOTS</div>
        <button className="btn btn-p btn-sm" onClick={run} disabled={busy || !configured}>
          {busy ? 'Recomputing…' : 'Recompute snapshots (14d)'}
        </button>
      </div>
      {msg && <p className="mut mb-3 text-[12.6px]">{msg}</p>}
      {!configured ? (
        <p className="mut text-[12.8px]">Snapshot storage activates when PostgreSQL is connected.</p>
      ) : snaps.length === 0 ? (
        <p className="mut text-[12.8px]">No snapshots stored yet. Run the ETL to roll measured events into daily metric snapshots.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.2px]">
            <thead>
              <tr className="mono dim text-[10.5px] tracking-[.16em]" style={{ borderBottom: '1px solid var(--line)' }}>
                <th className="px-3 py-2">DAY (UTC)</th>
                <th className="px-3 py-2">METRIC</th>
                <th className="px-3 py-2">VALUE</th>
              </tr>
            </thead>
            <tbody>
              {snaps.slice(0, 40).map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="mono px-3 py-2">{s.periodStart.slice(0, 10)}</td>
                  <td className="mono px-3 py-2" style={{ color: 'var(--cy)' }}>{s.metricKey}</td>
                  <td className="mono px-3 py-2">{s.value === null ? 'Insufficient measured data' : s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}