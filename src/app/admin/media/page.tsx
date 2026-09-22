import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Media | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead, DbNotice, CollectionTable } from '../AdminUi';
import { getDB } from '@/lib/content';
import { dbReady } from '@/lib/db';

export default function Page() {
  const db = getDB();
  return (
    <div>
      <AHead title="Media Library" desc="Persistent object storage — never localStorage, never base64. Uploads enforce size limits and MIME checks; images are optimized and metadata-tracked." />
      <DbNotice configured={dbReady()} />
      <CollectionTable rows={db.media as unknown as Record<string, unknown>[]}
        cols={[{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'note', label: 'Note' }, { key: 'usedBy', label: 'Used by' }]} />
      <p className="dim text-[12px] mt-4">Seeded entries reference generated brand art (art: scheme). Real uploads activate when object storage credentials are connected (Admin → Integrations).</p>
    </div>
  );
}
