import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Acttolog Intelligence | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { IntelligenceClient } from '../IntelligenceClient';

export default function Page() {
  return (
    <div>
      <AHead title="Acttolog Intelligence" desc="Private Owner/Admin command centre. Measured facts are always separated from automated interpretation. Reports are never emailed automatically — export manually." />
      <IntelligenceClient variant="intelligence" />
    </div>
  );
}
