import type { Metadata } from 'next';
import { MyDashboard } from '../MyDashboard';

export const metadata: Metadata = { title: 'My Acttolog', robots: { index: false, follow: false } };

export default function Page() {
  return <MyDashboard serverUser={null} initialTab="notifications" />;
}
