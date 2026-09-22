import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Messages | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { MessagesClient } from './MessagesClient';

export default function Page() {
  return (
    <div>
      <AHead title="Contact Messages" desc="Private inbox. Public form only — never shows the owner email; routes here with rate limiting and honeypot protection." />
      <MessagesClient />
    </div>
  );
}
