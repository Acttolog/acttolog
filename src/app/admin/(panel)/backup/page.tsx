import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Backup & Recovery | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { getDB } from '@/lib/content';
import { BackupClient } from './BackupClient';

export default function Page() {
  const b = getDB().backup as { provider: string; folder: string; schedule: string; retention: string; autoDelete: boolean };
  return (
    <div>
      <AHead title="Backup & Recovery" desc="Weekly backups to the private ACTTOLOG Google Drive folder — indefinite retention, never auto-deleted. Full and selective restore with a safety backup first: Review → Confirm → Restore → Verify." />
      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <BackupClient />
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">POLICY</div>
          <div className="space-y-2.5 text-[13px]">
            <div className="flex justify-between"><span className="dim">Provider</span><span>{b.provider.replace('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="dim">Folder</span><span className="mono text-[11.6px]">{b.folder}</span></div>
            <div className="flex justify-between"><span className="dim">Frequency</span><span>{b.schedule}</span></div>
            <div className="flex justify-between"><span className="dim">Retention</span><span>{b.retention}</span></div>
            <div className="flex justify-between"><span className="dim">Auto-delete</span><span className="badge b-ok">never</span></div>
          </div>
          <p className="dim text-[11.6px] mt-5 leading-relaxed">Drive structure: ACTTOLOG → Backups (Database · CMS · Configuration · Recovery), Website Assets, and one folder per division. The Owner can manually delete; the system never does.</p>
        </div>
      </div>
    </div>
  );
}
