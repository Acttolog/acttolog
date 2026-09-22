'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';

/** /admin → dashboard once the client session resolves (SSR + static safe). */
export function AdminRootRedirect() {
  const { user, loading } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const staff = user && (user.role === 'Owner' || user.role === 'Admin');
    router.replace(staff ? '/admin/dashboard' : '/admin/login');
  }, [user, loading, router]);
  return (
    <section className="pt-[calc(var(--nav)+88px)] pb-24">
      <div className="wrap text-center dim mono text-[11px] tracking-[.24em]">LOADING ADMIN…</div>
    </section>
  );
}
