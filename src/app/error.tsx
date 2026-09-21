'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // surface to server logs; never expose internals to visitors
    console.error(error);
  }, [error]);

  return (
    <section className="pt-[calc(var(--nav)+88px)] pb-[120px]">
      <div className="wrap text-center">
        <div className="flex justify-center mb-8 opacity-80"><Logo variant="icon" width={54} /></div>
        <div className="mono text-[11px] tracking-[.3em] mb-5" style={{ color: 'var(--err)' }}>ERROR 500</div>
        <h1 className="h1 mb-5">
          Signal <span className="gtext">interrupted</span>
        </h1>
        <p className="lead mx-auto mb-9">
          केही गडबड भयो। Something went wrong on our side — the incident is logged. Try again, and if it
          persists, contact us and we will investigate.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button className="btn btn-p" onClick={reset}>Try again</button>
          <Link href="/" className="btn btn-g">Return Home</Link>
          <Link href="/contact" className="btn btn-g">Contact us</Link>
        </div>
        {error.digest && (
          <p className="dim mono text-[10.6px] tracking-[.16em] mt-8">REFERENCE · {error.digest}</p>
        )}
      </div>
    </section>
  );
}
