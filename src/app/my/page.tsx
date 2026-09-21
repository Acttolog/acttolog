import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/session';
import { MyDashboard } from './MyDashboard';

export const metadata: Metadata = {
  title: 'My Acttolog',
  robots: { index: false, follow: false },
};

export default async function MyPage() {
  // server-side check first (middleware already redirects, this is defense-in-depth)
  const user = await getSessionUser();
  return <MyDashboard serverUser={user} />;
}
