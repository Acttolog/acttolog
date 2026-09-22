'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import enMessages from '../../messages/en.json';
import neMessages from '../../messages/ne.json';
import type { Bi, Locale } from '@/lib/content/types';

/**
 * ACTTOLOG i18n — manual switch only (spec §10).
 * Default English; never auto-replaced from browser language.
 * Preference is remembered in localStorage + cookie.
 */

type Messages = Record<string, string>;
const DICT: Record<Locale, Messages> = { en: enMessages, ne: neMessages };

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** UI dictionary lookup (prototype `t()`), with optional fallback. */
  t: (key: string, fallback?: string) => string;
  /** Bilingual content resolver (prototype `L()`). */
  L: (value: Bi | string | undefined | null) => string;
  /** True when Nepali is missing for this value (fallback flagging). */
  missingNe: (value: Bi | string | undefined | null) => boolean;
}

const Ctx = createContext<I18nCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLoc] = useState<Locale>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('act_loc');
      if (stored === 'ne' || stored === 'en') setLoc(stored);
    } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLoc(l);
    try {
      localStorage.setItem('act_loc', l);
      document.cookie = `atl_locale=${l};path=/;max-age=31536000;samesite=lax`;
    } catch { /* ignore */ }
  }, []);

  const value = useMemo<I18nCtx>(() => {
    const t = (key: string, fallback?: string) => DICT[locale][key] || DICT.en[key] || fallback || key;
    const L = (v: Bi | string | undefined | null) => {
      if (v == null) return '';
      if (typeof v === 'string') return v;
      return v[locale] || v.en || v.ne || '';
    };
    const missingNe = (v: Bi | string | undefined | null) =>
      Boolean(locale === 'ne' && v && typeof v === 'object' && !v.ne && v.en);
    return { locale, setLocale, t, L, missingNe };
  }, [locale, setLocale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n must be used within LocaleProvider');
  return c;
}
