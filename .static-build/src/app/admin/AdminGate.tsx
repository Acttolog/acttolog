'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { AdminNav } from './AdminNav';
import { usePathname } from 'next/navigation';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const staff = Boolean(user && (user.role === 'Owner' || user.role === 'Admin'));

  const isLogin = pathname.startsWith('/admin/login');

  useEffect(() => {
    if (isLogin || loading || user) return;
    router.replace('/admin/login');
  }, [isLogin, loading, user, router]);

  // the login page renders without the gated shell
  if (isLogin) return <>{children}</>;

  if (loading) {
    return (
      <section className="pt-[calc(var(--nav)+88px)] pb-24">
        <div className="wrap text-center dim mono text-[11px] tracking-[.24em]">VERIFYING SESSION…</div>
      </section>
    );
  }
  if (!user) return null;
  if (!staff) {
    return <ForbiddenRedirect />;
  }
  return (
    <div className="ashell" style={{ paddingTop: 0 }}>
      <AdminNav user={{ name: user.name, email: user.email, role: user.role }} />
      <div className="amain">{children}</div>
    </div>
  );
}

function ForbiddenRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/forbidden'); }, [router]);
  return null;
}
