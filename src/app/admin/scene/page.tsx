import type { Metadata } from 'next';
import { AHead, DbNotice } from '../AdminUi';
import { SceneEditorClient } from './SceneEditorClient';
import { dbReady } from '@/lib/db';

export const metadata: Metadata = { title: 'Scene Editor | Admin', robots: { index: false, follow: false } };

export default function Page() {
  const staticPreview = process.env.NEXT_PUBLIC_STATIC === '1';
  return (
    <div>
      <AHead title="Scene Editor" desc="Structured 3D scene configuration (spec §19/§43): camera, animation, environment, particles, interaction and per-node position/visibility. No arbitrary-code editing. Values are preview-local in this browser and exportable as JSON; this build has no database persistence." />
      {staticPreview && (
        <div className="panel p-5 mb-5" role="status">
          <div className="mono text-[9.7px] tracking-[.2em]" style={{ color: 'var(--cy)' }}>STATIC PREVIEW · LOCAL ONLY</div>
          <p className="mut text-[12.8px] leading-relaxed mt-2">
            Hosted sign-in is not configured on this mirror, so the scene editor is open here.
            Changes save in this browser and affect only your own view of the globe; production admin remains staff-only.
          </p>
        </div>
      )}
      <DbNotice configured={dbReady()} />
      <SceneEditorClient />
    </div>
  );
}
