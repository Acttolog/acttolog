'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LocaleProvider } from '@/lib/i18n';
import { PrefsProvider } from '@/lib/prefs';
import { SessionProvider } from '@/lib/session';
import { ConsentProvider, useConsent } from '@/lib/consent';
import { ToastProvider } from '@/lib/toast';
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
  useEffect(() => {
    track('page_view', { path: pathname });
    const div = (pathname.split('/')[1] || 'home');
    if (['research', 'entertainment', 'academy', 'games', 'darkroom'].includes(div)) {
      track('division_view', { division: div });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return null;
}

export function Providers({ usdToNpr, gaId, children }: {
  usdToNpr: number; gaId?: string; children: ReactNode;
}) {
  return (
    <LocaleProvider>
      <PrefsProvider usdToNpr={usdToNpr}>
        <ConsentProvider>
          <ToastProvider>
            <SessionProvider>
              <ConsentBridge gaId={gaId} />
              <PageViewTracker />
              {children}
            </SessionProvider>
          </ToastProvider>
        </ConsentProvider>
      </PrefsProvider>
    </LocaleProvider>
  );
}
