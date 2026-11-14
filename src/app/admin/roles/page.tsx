import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Roles | Admin', robots: { index: false, follow: false } };

import { AHead, CollectionTable } from '../AdminUi';
import { getDB } from '@/lib/content';

export default function Page() {
  const db = getDB();
  return (
    <div>
      <AHead
        title="Roles & Workflow"
        desc="Initially Owner and Admin only. Editor/Contributor exist in the model and activate later. Owner/Admin publish directly; Editor/Contributor follow Draft → Review → Approve → Publish."
      />
      <CollectionTable
        rows={db.roles as unknown as Record<string, unknown>[]}
        cols={[
          { key: 'name', label: 'Role' },
          { key: 'perms', label: 'Permissions' },
          { key: 'note', label: 'Note' },
        ]}
      />
      <div className="panel mt-5 p-6">
        <div className="mono dim mb-3 text-[9.7px] tracking-[.2em]">WORKFLOW STATUSES</div>
        <div className="flex flex-wrap gap-2">
          {db.wf.statuses.map((s) => (
            <span key={s} className="badge b-mut">
              {s.replace('_', ' ')}
            </span>
          ))}
        </div>
        <p className="dim mt-4 text-[12px]">
          Direct publish: {db.wf.direct.join(', ')} · Owner timezone: {db.wf.tz} (backend timestamps stored in
          UTC).
        </p>
      </div>
    </div>
  );
}
