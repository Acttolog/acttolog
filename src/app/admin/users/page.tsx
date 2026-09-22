import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Users | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { UsersClient } from './UsersClient';

export default function Page() {
  return (
    <div>
      <AHead title="Users" desc="Google-signed-in members. Profiles are private by default — no public directory, no activity feed, no followers (§49)." />
      <UsersClient />
    </div>
  );
}
