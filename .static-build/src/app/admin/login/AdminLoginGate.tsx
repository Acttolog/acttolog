'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { AdminLoginClient } from './AdminLoginClient';

/** Staff-only login. Role re-verified server-side by every /api/admin route
 *  and by the proxy middleware in SSR deployments (defence in depth). */
export function AdminLoginGate() {
  const { user, loading } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user && (user.role === 'Owner' || user.role === 'Admin')) {
      router.replace('/admin/dashboard');
    }
  }, [user, loading, router]);
  return <AdminLoginClient notStaff={Boolean(user && user.role !== 'Owner' && user.role !== 'Admin')} />;
}
