import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Home | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead, DbNotice, CollectionTable } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export default function Page() {
  const db = getDB();
  return (
    <div>
      <AHead title="Home" desc="The 12 home layers. Section copy (bilingual) and visibility are CMS-editable — Layer 01 is the 3D Earth hero." />
      <DbNotice configured={dbReady()} />
      <CollectionTable
        rows={db.homeSections.map((s, i) => ({ id: s.id, layer: String(i + 2).padStart(2, '0'), title: s.title, visible: s.visible }))}
        cols={[{ key: 'layer', label: 'Layer' }, { key: 'id', label: 'Section' }, { key: 'title', label: 'Title' }, { key: 'visible', label: 'Visible' }]} />
      <p className="dim text-[12px] mt-4">Layer 01 (3D Earth Hero) and Layer 12 (Footer) are structural — managed under Settings.</p>
    </div>
  );
}
