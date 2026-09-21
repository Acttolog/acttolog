import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser, isStaff } from '@/lib/auth/session';
import { AdminLoginClient } from './AdminLoginClient';

export const metadata: Metadata = {
  title: 'Admin Login | ACTTOLOG',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user && isStaff(user)) redirect('/admin/dashboard');
  return <AdminLoginClient notStaff={Boolean(user && !isStaff(user))} />;
}
