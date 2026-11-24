'use client';

import type { CSSProperties } from 'react';
import { THEMES, usePrefs } from '@/lib/prefs';
import { Icon } from '@/components/ui/Icon';

const L = {
  en: {
    kicker: 'APPEARANCE STUDIO',
    sub: 'Saved on this device',
    theme: 'Theme',
    density: 'Density',
    comfortable: 'Comfortable',
    compact: 'Compact',
    motion: 'Motion',
    full: 'Full',
    reduced: 'Reduced',
    glass: 'Glass blur',
    glow: 'Accent glow',
    shuffle: 'Shuffle theme',
    reset: 'Reset',
  },
  ne: {
    kicker: 'रूप स्टुडियो',
    sub: 'यही यन्त्रमा सुरक्षित',
    theme: 'थिम',
    density: 'घनत्व',
    comfortable: 'आरामदायी',
    compact: 'कम्प्याक्ट',
    motion: 'गति',
    full: 'पूर्ण',
    reduced: 'घटाइएको',
    glass: 'ग्लास ब्लर',
    glow: 'एक्सेन्ट ग्लो',
    shuffle: 'थिम फेरबदल',
    reset: 'रिसेट',
  },
} as const;

export function Appearance({ locale }: { locale: 'en' | 'ne' }) {
  const t = L[locale];
  const p = usePrefs();
  return (
    <div className="ap">
      <p className="dk-kicker mono">{t.kicker}</p>

      <div className="ap-body dk-scroll">
        <span className="ap-label mono">{t.theme}</span>
        <div className="ap-themes" role="group" aria-label={t.theme}>
          {THEMES.map((th) => (
            <button
              key={th.id}
              type="button"
              className={`ap-swatch${p.theme === th.id ? ' on' : ''}`}
              style={{ background: `linear-gradient(135deg, ${th.sw[0]} 48%, ${th.sw[1]})` }}
              title={th.label}
              aria-label={th.label}
              aria-pressed={p.theme === th.id}
              onClick={() => p.setTheme(th.id)}
            />
          ))}
        </div>
        <p className="ap-now">{THEMES.find((x) => x.id === p.theme)?.label}</p>

        <div className="ap-grid">
          <div className="ap-field">
            <span className="ap-label mono">{t.density}</span>
            <div className="tb-seg" role="group">
              <button type="button" className={`tb-seg-btn${p.density === 'comfortable' ? ' on' : ''}`} aria-pressed={p.density === 'comfortable'} onClick={() => p.setDensity('comfortable')}>{t.comfortable}</button>
              <button type="button" className={`tb-seg-btn${p.density === 'compact' ? ' on' : ''}`} aria-pressed={p.density === 'compact'} onClick={() => p.setDensity('compact')}>{t.compact}</button>
            </div>
          </div>
          <div className="ap-field">
            <span className="ap-label mono">{t.motion}</span>
            <div className="tb-seg" role="group">
              <button type="button" className={`tb-seg-btn${p.motion === 'full' ? ' on' : ''}`} aria-pressed={p.motion === 'full'} onClick={() => p.setMotion('full')}>{t.full}</button>
              <button type="button" className={`tb-seg-btn${p.motion === 'reduced' ? ' on' : ''}`} aria-pressed={p.motion === 'reduced'} onClick={() => p.setMotion('reduced')}>{t.reduced}</button>
            </div>
          </div>
        </div>

        <div className="ap-field">
          <label className="ap-label mono" htmlFor="ap-glass">{t.glass} · <b className="mono">{p.glass}</b></label>
          <input id="ap-glass" className="tb-range" type="range" min={0} max={100} value={p.glass} onChange={(e) => p.setGlass(Number(e.target.value))} style={{ '--fill': `${p.glass}%` } as CSSProperties} />
        </div>
        <div className="ap-field">
          <label className="ap-label mono" htmlFor="ap-glow">{t.glow} · <b className="mono">{p.glow}</b></label>
          <input id="ap-glow" className="tb-range" type="range" min={0} max={100} value={p.glow} onChange={(e) => p.setGlow(Number(e.target.value))} style={{ '--fill': `${p.glow}%` } as CSSProperties} />
        </div>
      </div>

      {/* Pinned below the scroll body so shuffle/reset never scroll out of reach. */}
      <div className="ap-actions">
        <button type="button" className="btn btn-g btn-sm" onClick={p.shuffleTheme}>
          <Icon name="spark" size={14} /> {t.shuffle}
        </button>
        <button type="button" className="btn btn-g btn-sm" onClick={p.resetAppearance}>
          <Icon name="refresh" size={14} /> {t.reset}
        </button>
      </div>
      <p className="dk-foot mono">{t.sub}</p>
    </div>
  );
}