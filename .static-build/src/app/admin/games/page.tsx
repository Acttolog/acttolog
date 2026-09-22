import type { Metadata } from 'next';
import { AHead, CollectionTable, DbNotice } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export const metadata: Metadata = { title: 'Games | ACTTOLOG Admin', robots: { index: false, follow: false } };

export default function Page() {
  const db = getDB();
  const rows = (db.games).map((r) => ({ ...r, __href: ((r)=>`/games/${r.slug}`)(r) })) as Record<string, unknown>[];
  return (
    <div>
      <AHead title="Games" desc="Browser games and interactive experiences. Playing requires Continue with Google." />
      <DbNotice configured={dbReady()} />
      <CollectionTable rows={rows} cols={[['title','Title'],['category','Category'],['launch','Launch'],['status','Status'],['access','Access']].map(([key, label]) => ({ key, label }))} />
    </div>
  );
}
