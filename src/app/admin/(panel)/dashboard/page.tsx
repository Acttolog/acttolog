import type { Metadata } from 'next';
import { AdminDashClient } from '../AdminDashClient';
import { integrationStatus } from '@/lib/system';

export const metadata: Metadata = { title: 'Dashboard | ACTTOLOG Admin', robots: { index: false, follow: false } };

export default function Page() {
  return <AdminDashClient integ={integrationStatus()} />;
}
