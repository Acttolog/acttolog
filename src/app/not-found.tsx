import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <section className="pt-[calc(var(--nav)+88px)] pb-[120px]">
      <div className="wrap text-center">
        <div className="mb-8 flex justify-center opacity-80">
          <Logo variant="icon" width={54} />
        </div>
        <div className="mono mb-5 text-[11px] tracking-[.3em]" style={{ color: 'var(--cy)' }}>
          ERROR 404
        </div>
        <h1 className="h1 mb-5">
          Lost in <span className="gtext">orbit</span>
        </h1>
        <p className="lead mx-auto mb-9">
          इसो पृष्ठ Acttolog संसारमा भेटिएन। This page does not exist in the Acttolog World — it may have
          moved, or the link may be broken.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-p">
            Return Home
          </Link>
          <Link href="/darkroom" className="btn btn-g">
            Explore Darkroom
          </Link>
          <Link href="/search" className="btn btn-g">
            Search the World
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {[
            '/research',
            '/entertainment',
            '/academy',
            '/games',
            '/blog',
            '/offers',
            '/about',
            '/contact',
            '/ai',
          ].map((r) => (
            <Link key={r} href={r} className="chip">
              {r}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
