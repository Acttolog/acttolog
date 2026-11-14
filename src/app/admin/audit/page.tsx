import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Audit Log | Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

import { AHead } from '../AdminUi';
import { getPrisma } from '@/lib/db';
import { redactMeta } from '@/lib/intelligence/redact';

export default async function Page() {
  const prisma = getPrisma();
  const rows = prisma
    ? await prisma.auditLog.findMany({ orderBy: { ts: 'desc' }, take: 100 })
    : [];

  return (
    <div>
      <AHead
        title="Audit Log"
        desc="Append-only record of sensitive admin actions (exports, configuration changes). Secret-bearing fields are redacted before display. Newest first."
      />
      {!prisma ? (
        <div className="panel p-8 text-center">
          <p className="mut text-[13px]">Audit storage activates when PostgreSQL is connected. No entries are fabricated.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="mut text-[13px]">No audit entries yet. Sensitive actions such as data exports will appear here.</p>
        </div>
      ) : (
        <div className="panel overflow-x-auto p-0">
          <table className="w-full text-left text-[12.4px]">
            <thead>
              <tr className="mono dim text-[9.6px] tracking-[.16em]" style={{ borderBottom: '1px solid var(--line)' }}>
                <th className="px-4 py-3">TIMESTAMP (UTC)</th>
                <th className="px-4 py-3">ACTOR</th>
                <th className="px-4 py-3">ACTION</th>
                <th className="px-4 py-3">TARGET</th>
                <th className="px-4 py-3">DETAIL (REDACTED)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="mono px-4 py-2.5 whitespace-nowrap">{r.ts.toISOString().replace('T', ' ').slice(0, 19)}</td>
                  <td className="px-4 py-2.5">{r.actorEmail || 'system'}</td>
                  <td className="mono px-4 py-2.5" style={{ color: 'var(--cy)' }}>{r.action}</td>
                  <td className="mono px-4 py-2.5">{r.target || '—'}</td>
                  <td className="mono dim px-4 py-2.5 text-[11px]">{JSON.stringify(redactMeta(r.meta))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}