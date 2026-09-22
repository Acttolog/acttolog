import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { AdminDashClient } from './AdminDashClient';
import { integrationStatus } from '@/lib/system';

export const metadata: Metadata = {
  title: 'Admin Dashboard | ACTTOLOG',
  robots: { index: false, follow: false },
};

export default async function AdminIndex() {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  return <AdminDashClient integ={integrationStatus()} />;
}
