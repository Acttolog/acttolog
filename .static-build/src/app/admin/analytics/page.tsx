import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Analytics | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { IntelligenceClient } from '../IntelligenceClient';

export default function Page() {
  return (
    <div>
      <AHead title="Analytics" desc="Measured traffic only — events persist server-side after consent. No sample data is ever presented as real traffic (§104)." />
      <IntelligenceClient variant="analytics" />
    </div>
  );
}
