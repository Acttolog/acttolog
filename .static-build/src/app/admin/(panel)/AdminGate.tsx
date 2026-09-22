'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { AdminNav } from '../AdminNav';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const staff = Boolean(user && (user.role === 'Owner' || user.role === 'Admin'));

  useEffect(() => {
    if (!loading && !user) router.replace('/admin/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <section className="pt-[calc(var(--nav)+88px)] pb-24">
        <div className="wrap text-center dim mono text-[11px] tracking-[.24em]">VERIFYING SESSION…</div>
      </section>
    );
  }
  if (!user) return null;
  if (!staff) {
    useEffectForbidden(router);
    return null;
  }
  return (
    <div className="ashell" style={{ paddingTop: 0 }}>
      <AdminNav user={{ name: user.name, email: user.email, role: user.role }} />
      <div className="amain">{children}</div>
    </div>
  );
}

function useEffectForbidden(router: ReturnType<typeof useRouter>) {
  useEffect(() => { router.replace('/forbidden'); }, [router]);
}
