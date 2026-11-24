'use client';

import { useEffect, useState } from 'react';
import { THEMES, usePrefs } from '@/lib/prefs';

const L = {
  en: {
    kicker: 'DEVICE PULSE',
    sub: 'THIS DEVICE · LIVE SESSION',
    note: 'Device signals only — not server traffic.',
    connection: 'Connection',
    online: 'Online',
    offline: 'Offline',
    uptime: 'Session uptime',
    viewport: 'Viewport',
    pointer: 'Pointer',
    fine: 'Fine',
    coarse: 'Coarse',
    motion: 'Motion',
    full: 'Full',
    reduced: 'Reduced',
    theme: 'Theme',
    language: 'Language',
  },
  ne: {
    kicker: 'यन्त्र पल्स',
    sub: 'यही यन्त्र · प्रत्यक्ष सत्र',
    note: 'यन्त्र सङ्केत मात्र — सर्भर ट्राफिक होइन।',
    connection: 'जडान',
    online: 'अनलाइन',
    offline: 'अफलाइन',
    uptime: 'सत्र अवधि',
    viewport: 'भ्युपोर्ट',
    pointer: 'पोइन्टर',
    fine: 'सूक्ष्म',
    coarse: 'स्थूल',
    motion: 'गति',
    full: 'पूर्ण',
    reduced: 'घटाइएको',
    theme: 'थिम',
    language: 'भाषा',
  },
} as const;

const fmtUp = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export function Pulse({ locale }: { locale: 'en' | 'ne' }) {
  const t = L[locale];
  const { theme, motion } = usePrefs();
  const [online, setOnline] = useState<boolean | null>(null);
  const [up, setUp] = useState(0);
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
  const [pointer, setPointer] = useState<'fine' | 'coarse' | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const [osReduced, setOsReduced] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    setVp({ w: window.innerWidth, h: window.innerHeight });
    setPointer(matchMedia('(hover: hover) and (pointer: fine)').matches ? 'fine' : 'coarse');
    setLang(navigator.language);
    setOsReduced(matchMedia('(prefers-reduced-motion: reduce)').matches);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const rs = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('resize', rs);
    const id = setInterval(() => setUp((s) => s + 1), 1000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('resize', rs);
      clearInterval(id);
    };
  }, []);

  const reduced = motion === 'reduced' || osReduced;
  const rows: { k: string; v: string; tone?: string }[] = [
    { k: t.connection, v: online === null ? '—' : online ? t.online : t.offline, tone: online === false ? 'var(--err)' : 'var(--ok)' },
    { k: t.uptime, v: fmtUp(up) },
    { k: t.viewport, v: vp ? `${vp.w}×${vp.h}` : '—' },
    { k: t.pointer, v: pointer === null ? '—' : pointer === 'fine' ? t.fine : t.coarse },
    { k: t.motion, v: reduced ? t.reduced : t.full },
    { k: t.theme, v: THEMES.find((x) => x.id === theme)?.label ?? theme },
    { k: t.language, v: lang ?? '—' },
  ];

  return (
    <div className="pulse">
      <p className="dk-kicker mono">{t.kicker}</p>
      <ul className="pulse-list" suppressHydrationWarning>
        {rows.map((r) => (
          <li key={r.k}>
            <span className="pulse-k">{r.k}</span>
            <span className="pulse-v mono" style={r.tone ? { color: r.tone } : undefined}>
              {r.k === t.connection && <span className="pulse-dot" style={{ background: r.tone }} aria-hidden="true" />}
              {r.v}
            </span>
          </li>
        ))}
      </ul>
      <p className="dk-foot mono">{t.sub}</p>
      <p className="pulse-note dk-dim">{t.note}</p>
    </div>
  );
}