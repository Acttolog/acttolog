import type { Metadata } from 'next';
import { AHead, CollectionTable, DbNotice } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export const metadata: Metadata = { title: 'Darkroom | ACTTOLOG Admin', robots: { index: false, follow: false } };

export default function Page() {
  const db = getDB();
  const rows = (db.dr) as unknown as Record<string, unknown>[];
  return (
    <div>
      <AHead title="Darkroom" desc="Verified discovery hub — resources, taxonomy, collections, ranking weights and the submission review queue. Public popularity is never exposed." />
      <DbNotice configured={dbReady()} />
      <CollectionTable rows={rows} cols={[['name','Name'],['category','Category'],['pricing','Pricing'],['verification','Verification'],['official','Official'],['status','Status']].map(([key, label]) => ({ key, label }))} />
    </div>
  );
}
