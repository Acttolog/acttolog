import Link from 'next/link';
import { Logo } from '@/components/Logo';

export const metadata = { title: 'Forbidden | ACTTOLOG', robots: { index: false, follow: false } };

export default function Forbidden() {
  return (
    <section className="pt-[calc(var(--nav)+88px)] pb-[120px]">
      <div className="wrap text-center">
        <div className="flex justify-center mb-8 opacity-80"><Logo variant="icon" width={54} /></div>
        <div className="mono text-[11px] tracking-[.3em] mb-5" style={{ color: 'var(--err)' }}>ERROR 403</div>
        <h1 className="h1 mb-5">Restricted zone</h1>
        <p className="lead mx-auto mb-9">
          यो क्षेत्र अधिकृत प्रयोगकर्ताहरूका लागि मात्र हो। This area requires an Owner or Admin role —
          authorization is resolved server-side and cannot be bypassed from the client.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="btn btn-p">Return Home</Link>
          <Link href="/my" className="btn btn-g">My Acttolog</Link>
        </div>
      </div>
    </section>
  );
}
