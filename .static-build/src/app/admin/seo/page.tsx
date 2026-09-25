import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'SEO | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead, DbNotice, CollectionTable } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export default function Page() {
  const db = getDB();
  const rows = Object.entries(db.seo.pages).map(([route, p]) => ({ id: route, route, title: p.title, desc: p.desc.slice(0, 90) + '…', canon: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acttolog.com.np'}${route}` }));
  return (
    <div>
      <AHead title="SEO" desc="Per-route title, description, canonical (EN + NE), Open Graph, structured data, sitemap and robots." />
      <DbNotice configured={dbReady()} />
      <CollectionTable rows={rows}
        cols={[{ key: 'route', label: 'Route' }, { key: 'title', label: 'Title' }, { key: 'desc', label: 'Description' }, { key: 'canon', label: 'Canonical' }]} />
      <div className="panel p-6 mt-5">
        <div className="mono text-[9.7px] tracking-[.2em] dim mb-3">ROBOTS</div>
        <pre className="mono text-[11.6px] mut whitespace-pre-wrap">{db.seo.robots}</pre>
      </div>
    </div>
  );
}
