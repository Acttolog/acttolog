import type { Metadata } from 'next';
import { AdminGate } from './AdminGate';

export const metadata: Metadata = {
  title: 'Admin | ACTTOLOG',
  robots: { index: false, follow: false },
};

/**
 * Admin shell (no route groups — Vercel output-safe).
 * Authorization layers: proxy middleware (SSR) → this client gate →
 * every /api/admin/* route re-verifies the session server-side.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
