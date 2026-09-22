'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Consent (spec §73–74): necessary functions always on; analytics and
 * personalisation are opt-in. Google identity and analytics stay logically
 * separate — guests browse anonymously.
 */

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  personalization: boolean;
  at: string;
}

interface ConsentCtx {
  consent: ConsentState | null;
  decided: boolean;
  save: (analytics: boolean, personalization: boolean) => void;
  reset: () => void;
}

const Ctx = createContext<ConsentCtx | null>(null);
const KEY = 'act_consent';

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setConsent(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((analytics: boolean, personalization: boolean) => {
    const next: ConsentState = { necessary: true, analytics, personalization, at: new Date().toISOString() };
    setConsent(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    if (analytics) window.dispatchEvent(new CustomEvent('acttolog:consent-analytics'));
  }, []);

  const reset = useCallback(() => {
    setConsent(null);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  const value = useMemo(
    () => ({ consent, decided: consent !== null, save, reset }),
    [consent, save, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsent(): ConsentCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConsent must be used within ConsentProvider');
  return c;
}
