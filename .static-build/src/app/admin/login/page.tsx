import type { Metadata } from 'next';
import { AdminLoginGate } from './AdminLoginGate';

export const metadata: Metadata = {
  title: 'Admin Login | ACTTOLOG',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginGate />;
}
