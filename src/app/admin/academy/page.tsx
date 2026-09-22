import type { Metadata } from 'next';
import { AHead, CollectionTable, DbNotice } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export const metadata: Metadata = { title: 'Academy | ACTTOLOG Admin', robots: { index: false, follow: false } };

export default function Page() {
  const db = getDB();
  const rows = (db.academy.courses).map((r) => ({ ...r, __href: ((r)=>`/academy/${r.slug}`)(r) })) as Record<string, unknown>[];
  return (
    <div>
      <AHead title="Academy" desc="Courses → modules → lessons → resources. Academy is protected; guests see the introduction only." />
      <DbNotice configured={dbReady()} />
      <CollectionTable rows={rows} cols={[['title','Title'],['level','Level'],['status','Status'],['access','Access'],['featured','Featured']].map(([key, label]) => ({ key, label }))} />
    </div>
  );
}
