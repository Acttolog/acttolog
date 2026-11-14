import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'SEO | Admin', robots: { index: false, follow: false } };

import { AHead, DbNotice, CollectionTable } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export default function Page() {
  const db = getDB();
  const rows = Object.entries(db.seo.pages).map(([route, p]) => ({
    id: route,
    route,
    title: p.title,
    desc: p.desc.slice(0, 90) + '…',
    canon: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acttolog.com.np'}${route}`,
  }));
  return (
    <div>
      <AHead
        title="SEO"
        desc="Per-route title, description, canonical (EN + NE), Open Graph, structured data, sitemap and robots."
      />
      <DbNotice configured={dbReady()} />
      <CollectionTable
        rows={rows}
        cols={[
          { key: 'route', label: 'Route' },
          { key: 'title', label: 'Title' },
          { key: 'desc', label: 'Description' },
          { key: 'canon', label: 'Canonical' },
        ]}
      />
      <div className="panel mt-5 p-6">
        <div className="mono dim mb-3 text-[9.7px] tracking-[.2em]">ROBOTS</div>
        <pre className="mono mut text-[11.6px] whitespace-pre-wrap">{db.seo.robots}</pre>
      </div>
    </div>
  );
}
