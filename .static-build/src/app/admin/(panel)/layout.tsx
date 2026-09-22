import type { Metadata } from 'next';
import { AdminGate } from './AdminGate';

export const metadata: Metadata = {
  title: 'Admin | ACTTOLOG',
  robots: { index: false, follow: false },
};

/**
 * Admin shell. Authorization is enforced in three layers:
 *  1. proxy middleware (SSR deployments) redirects unauthenticated traffic
 *  2. this client gate renders nothing but the login/forbidden state
 *  3. every /api/admin/* route re-verifies the session server-side (real authz)
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
