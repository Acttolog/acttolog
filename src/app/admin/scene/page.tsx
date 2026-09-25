import type { Metadata } from 'next';
import { AHead, DbNotice } from '../AdminUi';
import { SceneEditorClient } from './SceneEditorClient';
import { dbReady } from '@/lib/db';

export const metadata: Metadata = { title: 'Scene Editor | ACTTOLOG Admin', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <div>
      <AHead title="Scene Editor" desc="Structured 3D scene configuration (spec §19/§43): objects, scale, position, rotation, camera presets, lighting, animation, visibility, quality. No arbitrary-code editing. Values persist to the CMS database once connected; until then edits are preview-local and exportable." />
      <DbNotice configured={dbReady()} />
      <SceneEditorClient />
    </div>
  );
}
