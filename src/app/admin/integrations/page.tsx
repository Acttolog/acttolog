import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Integrations | Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { ConnectionCheckPanel } from './ConnectionCheckPanel';

export default function Page() {
  return (
    <div>
      <AHead
        title="Integrations"
        desc="Configuration status reflects environment presence only — never a claimed connection. Reachability is proven separately by the live connection checks below. Connect credentials via host environment variables; nothing is ever committed to the repository."
      />
      <ConnectionCheckPanel />
    </div>
  );
}