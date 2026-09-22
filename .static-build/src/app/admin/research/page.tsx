import type { Metadata } from 'next';
import { AHead, CollectionTable, DbNotice } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export const metadata: Metadata = { title: 'Thesyn Research | ACTTOLOG Admin', robots: { index: false, follow: false } };

export default function Page() {
  const db = getDB();
  const rows = (db.services) as unknown as Record<string, unknown>[];
  return (
    <div>
      <AHead title="Thesyn Research" desc="Services, programmes and packages (Silver/Gold/Diamond). Honest positioning — no invented affiliations, no absolute guarantees." />
      <DbNotice configured={dbReady()} />
      <CollectionTable rows={rows} cols={[['title','Title'],['order','Order'],['status','Status'],['access','Access'],['visible','Visible']].map(([key, label]) => ({ key, label }))} />
    </div>
  );
}
