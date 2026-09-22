import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'System Health | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { integrationStatus, overallHealth } from '@/lib/system';
import { HealthBadge } from '../AdminDashClient';
import { SystemChecks } from './SystemChecks';

export default function Page() {
  const rows = integrationStatus();
  const overall = overallHealth(rows);
  return (
    <div>
      <AHead title="System Health" desc="Live checks against the actual environment. Statuses are honest: Healthy · Warning · Error · Not Configured."
        actions={<span className="badge b-info self-center">overall: {overall.replace('_', ' ')}</span>} />
      <SystemChecks />
      <div className="panel overflow-hidden mt-5">
        <table className="tbl">
          <thead><tr><th>Component</th><th>Status</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td style={{ color: 'var(--txt)' }}>{r.label}</td>
                <td><HealthBadge status={r.status} /></td>
                <td className="max-w-[70ch]">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
