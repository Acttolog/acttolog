'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** Theme (dark default) + currency (NPR default) — both remembered. */

type Theme = 'dark' | 'light' | 'midnight' | 'aurora' | 'sunset' | 'paper' | 'cyber' | 'royal' | 'ocean' | 'rose';
export const THEMES: { id: Theme; label: string; sw: [string, string] }[] = [
  { id: 'dark', label: 'Obsidian (default)', sw: ['#05060c', '#35e0ff'] },
  { id: 'light', label: 'Daylight', sw: ['#f4f7fc', '#0aa0cf'] },
  { id: 'midnight', label: 'Midnight Indigo', sw: ['#020312', '#5ea2ff'] },
  { id: 'aurora', label: 'Aurora Teal', sw: ['#02100d', '#2dffd0'] },
  { id: 'sunset', label: 'Sunset Ember', sw: ['#12040a', '#ffb454'] },
  { id: 'paper', label: 'Himalayan Paper', sw: ['#f6f1e7', '#0a7f8f'] },
  { id: 'cyber', label: 'Cyber Terminal', sw: ['#030a04', '#49ff8b'] },
  { id: 'royal', label: 'Royal Violet Gold', sw: ['#0a0618', '#c084fc'] },
  { id: 'ocean', label: 'Deep Ocean', sw: ['#02121c', '#38dfff'] },
  { id: 'rose', label: 'Rose Quartz', sw: ['#14060f', '#ff6fa5'] },
];
type Currency = 'NPR' | 'USD';

interface PrefsCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
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
      if (THEMES.some((x) => x.id === t)) setTheme(t as Theme);
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

  const setThemeSafe = useCallback((t: Theme) => setTheme(t), []);
  const toggleTheme = useCallback(() => setTheme((t) => {
    const i = THEMES.findIndex((x) => x.id === t);
    return THEMES[(i + 1) % THEMES.length].id;
  }), []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem('act_cur', c); } catch { /* ignore */ }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme: setThemeSafe, toggleTheme, currency, setCurrency, usdToNpr }),
    [theme, setThemeSafe, toggleTheme, currency, setCurrency, usdToNpr],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): PrefsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs must be used within PrefsProvider');
  return c;
}
