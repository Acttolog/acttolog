import type { Metadata } from 'next';
import { AHead, CollectionTable, DbNotice } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export const metadata: Metadata = { title: 'Offers | ACTTOLOG Admin', robots: { index: false, follow: false } };

export default function Page() {
  const db = getDB();
  const rows = (db.offers).map((r) => ({ ...r, __href: ((r)=>`/offers/${r.slug}`)(r) })) as Record<string, unknown>[];
  return (
    <div>
      <AHead title="Offers" desc="Commercial offers across divisions — inquiry, purchase or both. Prices are editable, never hard-coded." />
      <DbNotice configured={dbReady()} />
      <CollectionTable rows={rows} cols={[['title','Title'],['division','Division'],['npr','NPR'],['usd','USD'],['mode','Mode'],['status','Status']].map(([key, label]) => ({ key, label }))} />
    </div>
  );
}
