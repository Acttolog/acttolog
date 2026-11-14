import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Navigation | Admin', robots: { index: false, follow: false } };

import { AHead, DbNotice, CollectionTable } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export default function Page() {
  const db = getDB();
  return (
    <div>
      <AHead
        title="Navigation"
        desc="Desktop: Home | Divisions | Blog | Offers | About | Contact. The Divisions mega-menu is generated from the Division entity."
      />
      <DbNotice configured={dbReady()} />
      <CollectionTable
        rows={db.nav as unknown as Record<string, unknown>[]}
        cols={[
          { key: 'label', label: 'Label' },
          { key: 'route', label: 'Route' },
          { key: 'order', label: 'Order' },
          { key: 'visible', label: 'Visible' },
        ]}
      />
      <div className="panel mt-5 p-6">
        <div className="mono dim mb-4 text-[9.7px] tracking-[.2em]">DIVISIONS (mega-menu source)</div>
        <CollectionTable
          rows={db.divisions as unknown as Record<string, unknown>[]}
          cols={[
            { key: 'name', label: 'Name' },
            { key: 'sub', label: 'Position' },
            { key: 'route', label: 'Route' },
            { key: 'order', label: 'Order' },
            { key: 'visible', label: 'Visible' },
          ]}
        />
      </div>
    </div>
  );
}
