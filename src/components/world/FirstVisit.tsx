'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { useConsent } from '@/lib/consent';
import { track } from '@/lib/analytics';

const KEY = 'act_welcomed';

/**
 * First-visit experience (spec §35) — quick, skippable, once per browser.
 * Only on the home route so deep links into /explore restore untouched.
 */
export function FirstVisit() {
  const [show, setShow] = useState(false);
  const { locale } = useI18n();
  const { decided } = useConsent(); // never stack two dialogs (§42/§73)
  const router = useRouter();
  const ne = locale === 'ne';

  useEffect(() => {
    if (window.location.pathname !== '/' || !decided) return;
    try { if (localStorage.getItem(KEY)) return; } catch { return; }
    const t = setTimeout(() => setShow(true), 900); // let the world paint first
    return () => clearTimeout(t);
  }, [decided]);

  const done = (action: string) => {
    try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ }
    setShow(false);
    track('cta_interaction', { cta: 'first_visit', action });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true"
      aria-label={ne ? 'ACTTOLOG संसारमा स्वागत छ' : 'Welcome to Acttolog World'}
      style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)', backdropFilter: 'blur(10px)' }}>
      <div className="panel fv-card p-8 sm:p-10 text-center relative overflow-hidden" style={{ width: 'min(560px,94vw)' }}>
        {/* portal rings */}
        <div aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 -top-24 w-[340px] h-[340px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb,var(--cy) 16%,transparent) 0%, transparent 62%)' }} />
        <div aria-hidden="true" className="absolute left-1/2 top-8 -translate-x-1/2 w-16 h-16 rounded-full"
          style={{ border: '1px solid color-mix(in srgb,var(--cy) 55%,transparent)', boxShadow: '0 0 34px color-mix(in srgb,var(--cy) 30%,transparent), inset 0 0 18px color-mix(in srgb,var(--vi) 25%,transparent)', animation: 'fvSpin 9s linear infinite' }} />

        <div className="eyebrow mt-14 mb-2">ACTTOLOG WORLD</div>
        <h2 className="font-display font-bold text-[clamp(1.5rem,4.4vw,2.15rem)] tracking-[-.02em] gtext leading-tight">
          {ne ? 'ACTTOLOG संसारमा स्वागत छ' : 'WELCOME TO ACTTOLOG WORLD'}
        </h2>
        <p className="mono text-[10.6px] tracking-[.22em] mt-3" style={{ color: 'var(--cy)' }}>
          {ne ? 'खोज्नुहोस्। सिक्नुहोस्। बनाउनुहोस्। जोडिनुहोस्।' : 'DISCOVER. LEARN. CREATE. CONNECT.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-8">
          <button className="btn btn-p" onClick={() => { done('earth'); router.push('/explore?mode=earth'); }}>
            <Icon name="globe" size={16} />{ne ? 'पृथ्वी अन्वेषण' : 'EXPLORE EARTH'}
          </button>
          <button className="btn btn-g" onClick={() => { done('enter'); document.getElementById('intro')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <Icon name="rocket" size={16} />{ne ? 'एक्टोलग प्रवेश' : 'ENTER ACTTOLOG'}
          </button>
          <button className="btn btn-g" onClick={() => { done('search'); window.dispatchEvent(new CustomEvent('acttolog:search-open')); }}>
            <Icon name="search" size={16} />{ne ? 'संसार खोज' : 'SEARCH WORLD'}
          </button>
        </div>
        <button className="dim text-[11.6px] mt-6 underline underline-offset-4 hover:text-[var(--txt)] transition-colors"
          onClick={() => done('skip')}>
          {ne ? 'स्किप गर्नुहोस्' : 'Skip — take me straight in'}
        </button>
      </div>
      <style>{`
        .fv-card { animation: fvIn .5s ease both; }
        @keyframes fvIn { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes fvSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .fv-card { animation: none; }
          .fv-card * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
