'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** Theme (dark default) + currency (NPR default) — both remembered. */

type Theme = 'dark' | 'light';
type Currency = 'NPR' | 'USD';

interface PrefsCtx {
  theme: Theme;
  toggleTheme: () => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  usdToNpr: number;
}

const Ctx = createContext<PrefsCtx | null>(null);

export function PrefsProvider({ usdToNpr, children }: { usdToNpr: number; children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currency, setCurrencyState] = useState<Currency>('NPR');

  useEffect(() => {
    try {
      const t = localStorage.getItem('act_theme');
      if (t === 'light' || t === 'dark') setTheme(t);
      const c = localStorage.getItem('act_cur');
      if (c === 'USD' || c === 'NPR') setCurrencyState(c);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('act_theme', theme);
      const m = document.querySelector('meta[name=theme-color]');
      if (m) m.setAttribute('content', theme === 'dark' ? '#05060c' : '#f4f7fc');
      window.dispatchEvent(new CustomEvent('acttolog:theme', { detail: theme }));
    } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem('act_cur', c); } catch { /* ignore */ }
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme, currency, setCurrency, usdToNpr }),
    [theme, toggleTheme, currency, setCurrency, usdToNpr],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): PrefsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs must be used within PrefsProvider');
  return c;
}
