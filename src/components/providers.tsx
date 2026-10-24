'use client';

import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LocaleProvider } from '@/lib/i18n';
import { PrefsProvider } from '@/lib/prefs';
import { SessionProvider } from '@/lib/session';
import { ConsentProvider, useConsent } from '@/lib/consent';
import { ToastProvider } from '@/lib/toast';
import { useSession } from '@/lib/session';
import { QualityProvider } from '@/components/three/QualityProvider';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { loadGA, track } from '@/lib/analytics';

/** Bridges consent state → analytics gate + GA4 bootstrap (spec §63, §73). */
function ConsentBridge({ gaId }: { gaId?: string }) {
  const { consent } = useConsent();
  useEffect(() => {
    window.__atlConsent = { analytics: Boolean(consent?.analytics) };
    if (consent?.analytics && gaId) loadGA(gaId);
  }, [consent, gaId]);
  return null;
}

/** page_view + division_view on every route change (spec §64). */
function PageViewTracker() {
  const pathname = usePathname();
  const { user } = useSession();
  useEffect(() => {
    track('page_view', { path: pathname });
    const div = (pathname.split('/')[1] || 'home');
    if (['research', 'entertainment', 'academy', 'games', 'darkroom'].includes(div)) {
      track('division_view', { division: div });
    }
    // Every route change also feeds My Acttolog → Recently Viewed, which had a
    // reader but no writer. Guest history shares the same `guest` key as saved items.
    const privateRoute = pathname === '/' || /^\/(my|admin|search|contact)(\/|$)/.test(pathname);
    if (!privateRoute) {
      try {
        const key = `act_recent_${user?.uid || 'guest'}`;
        const prev = JSON.parse(localStorage.getItem(key) || '[]');
        const title = document.title.replace(/\s*\|\s*ACTTOLOG\s*$/, '').trim() || pathname;
        const rest = Array.isArray(prev) ? prev.filter((x) => x && x.id !== pathname) : [];
        const next = [{ kind: 'page', id: pathname, title, at: new Date().toISOString() }, ...rest].slice(0, 30);
        localStorage.setItem(key, JSON.stringify(next));
      } catch { /* private mode */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user?.uid]);
  return null;
}

export function Providers({ usdToNpr, gaId, children }: {
  usdToNpr: number; gaId?: string; children: ReactNode;
}) {
  return (
    <LocaleProvider>
      <PrefsProvider usdToNpr={usdToNpr}>
        <QualityProvider>
          <ConsentProvider>
            <ToastProvider>
              <SessionProvider>
                <ConsentBridge gaId={gaId} />
                <PageViewTracker />
                {children}
                <Suspense fallback={null}>
                  <AuthNotice />
                </Suspense>
              </SessionProvider>
            </ToastProvider>
          </ConsentProvider>
        </QualityProvider>
      </PrefsProvider>
    </LocaleProvider>
  );
}
