import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser, isStaff } from '@/lib/auth/session';
import { AdminNav } from '../AdminNav';

export const metadata: Metadata = {
  title: 'Admin | ACTTOLOG',
  robots: { index: false, follow: false },
};

/** Admin shell — server-side role gate on every request (spec §52, §86, §88). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  if (!isStaff(user)) redirect('/forbidden');

  return (
    <div className="ashell" style={{ paddingTop: 0 }}>
      <AdminNav user={{ name: user.name, email: user.email, role: user.role }} />
      <div className="amain">{children}</div>
    </div>
  );
}
