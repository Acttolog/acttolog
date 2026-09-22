import { AdminRootRedirect } from './AdminRootRedirect';

export const metadata = { title: 'Admin | ACTTOLOG', robots: { index: false, follow: false } };

export default function AdminIndexPage() {
  return <AdminRootRedirect />;
}
