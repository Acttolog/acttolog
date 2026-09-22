'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { fktm } from '@/lib/utils';

interface B { id: string; kind: string; provider: string; location: string; status: string; createdAt: string; size?: number | null }

export function BackupClient() {
  const [rows, setRows] = useState<B[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/admin/backups').then(async (r) => {
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'error'); return null; }
      return r.json();
    }).then((d) => { if (d) setRows(d.backups); }).catch(() => setError('error'));
  }, []);

  if (error === 'not_configured')
    return (
      <div className="panel p-10 text-center">
        <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'color-mix(in srgb,var(--warn) 12%,transparent)', color: 'var(--warn)' }}>
          <Icon name="db" size={22} />
        </span>
        <h3 className="h3 mb-2">Backups require Drive + database</h3>
        <p className="mut text-[13px] max-w-[56ch] mx-auto leading-relaxed">
          Weekly backups start once the Google Drive service account and PostgreSQL are connected.
          The scheduler creates a safety backup before any restore, and retention is indefinite.
        </p>
      </div>
    );
  if (!rows) return <div className="panel p-10 text-center dim mono text-[11px] tracking-[.2em]">{error ? 'UNAVAILABLE' : 'LOADING…'}</div>;
  if (!rows.length) return <div className="panel p-10 text-center mut">No backups recorded yet.</div>;

  return (
    <div className="panel overflow-hidden">
      <table className="tbl">
        <thead><tr><th>Kind</th><th>Location</th><th>Status</th><th>Created (NPT)</th></tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td style={{ color: 'var(--txt)' }}>{b.kind}</td>
              <td className="mono text-[11px]">{b.location}</td>
              <td><span className={`badge ${b.status === 'ok' ? 'b-ok' : 'b-err'}`}>{b.status}</span></td>
              <td className="mono text-[11px]">{fktm(b.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
