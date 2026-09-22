import type { Metadata } from 'next';
import { AHead, CollectionTable, DbNotice } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export const metadata: Metadata = { title: 'Entertainment | ACTTOLOG Admin', robots: { index: false, follow: false } };

export default function Page() {
  const db = getDB();
  const rows = (db.entertainment).map((r) => ({ ...r, __href: ((r)=>`/entertainment/${r.slug}`)(r) })) as Record<string, unknown>[];
  return (
    <div>
      <AHead title="Entertainment" desc="Stories, comedy, drama, horror, short films, music, cinematic and AI media." />
      <DbNotice configured={dbReady()} />
      <CollectionTable rows={rows} cols={[['title','Title'],['category','Category'],['status','Status'],['access','Access'],['featured','Featured'],['date','Date']].map(([key, label]) => ({ key, label }))} />
    </div>
  );
}
