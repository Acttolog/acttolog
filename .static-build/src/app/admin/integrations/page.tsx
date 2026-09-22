import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Integrations | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { integrationStatus } from '@/lib/system';
import { HealthBadge } from '../AdminDashClient';

export default function Page() {
  const rows = integrationStatus();
  return (
    <div>
      <AHead title="Integrations" desc="Every external service is checked against real environment state — never faked. Connect credentials via host environment variables; nothing is ever committed to the repository." />
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key} className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="font-display font-semibold text-[14.4px]">{r.label}</div>
              <HealthBadge status={r.status} />
            </div>
            <p className="mut text-[12.8px] leading-relaxed max-w-[96ch]">{r.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
