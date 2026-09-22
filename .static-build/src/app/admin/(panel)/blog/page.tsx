import type { Metadata } from 'next';
import { AHead, CollectionTable, DbNotice } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export const metadata: Metadata = { title: 'Blog | ACTTOLOG Admin', robots: { index: false, follow: false } };

export default function Page() {
  const db = getDB();
  const rows = (db.posts).map((r) => ({ ...r, __href: ((r)=>`/blog/${r.slug}`)(r) })) as Record<string, unknown>[];
  return (
    <div>
      <AHead title="Blog" desc="Create, edit, schedule and publish articles. Language + Audience + Access + Status are independent fields." />
      <DbNotice configured={dbReady()} />
      <CollectionTable rows={rows} cols={[['title','Title'],['category','Category'],['status','Status'],['access','Access'],['publishedAt','Published'],['author','Author']].map(([key, label]) => ({ key, label }))} />
    </div>
  );
}
