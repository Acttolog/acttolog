'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { POINTER_DEFAULTS, clampSettings, parseSettings, serializeSettings } from '@/lib/pointer';
import type { PointerSettings } from '@/lib/pointer';

/** Theme (dark default) + currency (NPR default) + deck appearance — all remembered. */

type Theme =
  | 'dark'
  | 'light'
  | 'midnight'
  | 'aurora'
  | 'sunset'
  | 'paper'
  | 'cyber'
  | 'royal'
  | 'ocean'
  | 'rose'
  | 'nebula'
  | 'titanium'
  | 'holo'
  | 'crimson'
  | 'matcha'
  | 'glacier'
  | 'glass'
  | 'crystal'
  | 'veil';
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
  { id: 'nebula', label: 'Nebula Violet', sw: ['#070312', '#a78bfa'] },
  { id: 'titanium', label: 'Titanium Light', sw: ['#e8ebf0', '#0e7490'] },
  { id: 'holo', label: 'Holographic Ice', sw: ['#04070d', '#7df9ff'] },
  { id: 'crimson', label: 'Crimson Signal', sw: ['#0c0407', '#ff5d73'] },
  { id: 'matcha', label: 'Matcha Light', sw: ['#f3f6ee', '#3f7d20'] },
  { id: 'glacier', label: 'Glacier Light', sw: ['#eef4f8', '#0e7fa8'] },
  { id: 'glass', label: 'Frosted Glass · Premium', sw: ['#141a38', '#5ee7ff'] },
  { id: 'crystal', label: 'Crystal Glass · Light', sw: ['#dfe7fb', '#0a86b0'] },
  { id: 'veil', label: 'Transparent Veil', sw: ['#0a0722', '#a98bff'] },
];
type Currency = 'NPR' | 'USD';
export type Density = 'comfortable' | 'compact';
export type Motion = 'full' | 'reduced';

export const APPEARANCE_DEFAULTS = { density: 'comfortable' as Density, motion: 'full' as Motion, glass: 70, glow: 60 };

interface PrefsCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  shuffleTheme: () => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  usdToNpr: number;
  density: Density;
  setDensity: (d: Density) => void;
  motion: Motion;
  setMotion: (m: Motion) => void;
  glass: number;
  setGlass: (n: number) => void;
  glow: number;
  setGlow: (n: number) => void;
  resetAppearance: () => void;
  pointer: PointerSettings;
  setPointer: (patch: Partial<PointerSettings>) => void;
  resetPointer: () => void;
}

const Ctx = createContext<PrefsCtx | null>(null);

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function PrefsProvider({ usdToNpr, children }: { usdToNpr: number; children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currency, setCurrencyState] = useState<Currency>('NPR');
  const [density, setDensityState] = useState<Density>(APPEARANCE_DEFAULTS.density);
  const [motion, setMotionState] = useState<Motion>(APPEARANCE_DEFAULTS.motion);
  const [glass, setGlassState] = useState(APPEARANCE_DEFAULTS.glass);
  const [glow, setGlowState] = useState(APPEARANCE_DEFAULTS.glow);
  const [pointer, setPointerState] = useState<PointerSettings>(POINTER_DEFAULTS);
  // The layout's inline script paints the stored theme before first paint. Skip
  // the initial effect run (which carries the default 'dark') so hydration never
  // flashes the wrong theme before the restored value propagates from the mount
  // effect below.
  const firstTheme = useRef(true);
  // Same guard for the pointer: never persist the in-memory defaults over a
  // stored preset before the mount effect below has restored it.
  const firstPointer = useRef(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem('act_theme');
      if (THEMES.some((x) => x.id === t)) setTheme(t as Theme);
      const c = localStorage.getItem('act_cur');
      if (c === 'USD' || c === 'NPR') setCurrencyState(c);
      const d = localStorage.getItem('act_density');
      if (d === 'comfortable' || d === 'compact') setDensityState(d);
      const m = localStorage.getItem('act_motion');
      if (m === 'full' || m === 'reduced') setMotionState(m);
      const g = localStorage.getItem('act_glass');
      if (g !== null && !Number.isNaN(Number(g))) setGlassState(clamp(Number(g)));
      const w = localStorage.getItem('act_glow');
      if (w !== null && !Number.isNaN(Number(w))) setGlowState(clamp(Number(w)));
      const pt = localStorage.getItem('act_pointer');
      if (pt !== null) setPointerState(parseSettings(pt));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (firstTheme.current) {
      firstTheme.current = false;
      return;
    }
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('act_theme', theme);
      const m = document.querySelector('meta[name=theme-color]');
      if (m)
        m.setAttribute(
          'content',
          theme === 'light' || theme === 'paper' || theme === 'titanium' || theme === 'matcha' || theme === 'glacier' || theme === 'crystal'
            ? '#f4f7fc'
            : '#05060c',
        );
      window.dispatchEvent(new CustomEvent('acttolog:theme', { detail: theme }));
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setThemeSafe = useCallback((t: Theme) => setTheme(t), []);
  const toggleTheme = useCallback(
    () =>
      setTheme((t) => {
        const i = THEMES.findIndex((x) => x.id === t);
        return THEMES[(i + 1) % THEMES.length].id;
      }),
    [],
  );
  const shuffleTheme = useCallback(
    () =>
      setTheme((t) => {
        const pool = THEMES.filter((x) => x.id !== t);
        return pool[Math.floor(Math.random() * pool.length)].id;
      }),
    [],
  );

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem('act_cur', c);
    } catch {
      /* ignore */
    }
  }, []);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    try {
      localStorage.setItem('act_density', d);
    } catch {
      /* ignore */
    }
  }, []);
  const setMotion = useCallback((m: Motion) => {
    setMotionState(m);
    try {
      localStorage.setItem('act_motion', m);
    } catch {
      /* ignore */
    }
  }, []);
  const setGlass = useCallback((n: number) => {
    const v = clamp(n);
    setGlassState(v);
    try {
      localStorage.setItem('act_glass', String(v));
    } catch {
      /* ignore */
    }
  }, []);
  const setGlow = useCallback((n: number) => {
    const v = clamp(n);
    setGlowState(v);
    try {
      localStorage.setItem('act_glow', String(v));
    } catch {
      /* ignore */
    }
  }, []);
  const resetAppearance = useCallback(() => {
    setDensity(APPEARANCE_DEFAULTS.density);
    setMotion(APPEARANCE_DEFAULTS.motion);
    setGlass(APPEARANCE_DEFAULTS.glass);
    setGlow(APPEARANCE_DEFAULTS.glow);
  }, [setDensity, setMotion, setGlass, setGlow]);

  const setPointer = useCallback((patch: Partial<PointerSettings>) => {
    setPointerState((prev) => clampSettings({ ...prev, ...patch }));
  }, []);
  const resetPointer = useCallback(() => setPointerState({ ...POINTER_DEFAULTS }), []);
  useEffect(() => {
    if (firstPointer.current) {
      firstPointer.current = false;
      return;
    }
    try {
      localStorage.setItem('act_pointer', serializeSettings(pointer));
    } catch {
      /* ignore */
    }
  }, [pointer]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeSafe,
      toggleTheme,
      shuffleTheme,
      currency,
      setCurrency,
      usdToNpr,
      density,
      setDensity,
      motion,
      setMotion,
      glass,
      setGlass,
      glow,
      setGlow,
      resetAppearance,
      pointer,
      setPointer,
      resetPointer,
    }),
    [theme, setThemeSafe, toggleTheme, shuffleTheme, currency, setCurrency, usdToNpr, density, setDensity, motion, setMotion, glass, setGlass, glow, setGlow, resetAppearance, pointer, setPointer, resetPointer],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): PrefsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs must be used within PrefsProvider');
  return c;
}