'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { usePrefs } from '@/lib/prefs';
import { Icon } from '@/components/ui/Icon';
import { useMediaQuery } from '@/components/fx/MagneticPointer';
import {
  POINTER_PRESETS,
  POINTER_RANGES,
  presetMatch,
  randomPointerSettings,
  serializeSettings,
} from '@/lib/pointer';
import type { PointerBlend, PointerNumKey } from '@/lib/pointer';

const L = {
  en: {
    kicker: 'POINTER STUDIO',
    sub: 'magnetic cursor · live design',
    enable: 'Magnetic pointer',
    hideNative: 'Hide native cursor',
    pulse: 'Click pulse',
    preset: 'Preset',
    custom: 'Custom mix',
    blend: 'Blend mode',
    blends: { normal: 'Normal', screen: 'Screen', difference: 'Difference', exclusion: 'Exclusion' } as Record<PointerBlend, string>,
    strength: 'Magnetic pull',
    radius: 'Detect radius',
    ringSize: 'Ring size',
    dotSize: 'Dot size',
    damping: 'Follow damping',
    trail: 'Trail particles',
    glow: 'Glow',
    deform: 'Ring stretch',
    hue: 'Hue rotate',
    preview: 'Live preview',
    reset: 'Reset',
    randomize: 'Randomize',
    export: 'Export',
    exported: 'Copied + downloaded!',
    exportedFile: 'Preset downloaded',
    exportedClip: 'Copied to clipboard',
    active: 'Active — fine pointer device',
    unavailable: 'Unavailable — touch device keeps the native cursor',
    disabled: 'Disabled — flip the switch above',
    checking: 'Checking device…',
    reducedNote: 'reduced motion',
    foot: 'Saved on this device · exports a JSON preset',
    presets: { precision: 'Precision', comet: 'Comet', halo: 'Halo', minimal: 'Minimal' } as Record<string, string>,
  },
  ne: {
    kicker: 'पोइन्टर स्टुडियो',
    sub: 'चुम्बकीय कर्सर · प्रत्यक्ष डिजाइन',
    enable: 'चुम्बकीय पोइन्टर',
    hideNative: 'नेटिभ कर्सर लुकाउनुहोस्',
    pulse: 'क्लिक पल्स',
    preset: 'प्रिसेट',
    custom: 'आफ्नै मिश्रण',
    blend: 'ब्लेन्ड मोड',
    blends: { normal: 'सामान्य', screen: 'स्क्रिन', difference: 'भिन्नता', exclusion: 'एक्सक्लुजन' } as Record<PointerBlend, string>,
    strength: 'चुम्बकीय बल',
    radius: 'पत्ता दायरा',
    ringSize: 'रिङ आकार',
    dotSize: 'डट आकार',
    damping: 'फलो स्मूदिङ',
    trail: 'ट्रेल कण',
    glow: 'ग्लो',
    deform: 'रिङ तन्काइ',
    hue: 'रङ घुमाइ',
    preview: 'प्रत्यक्ष पूर्वावलोकन',
    reset: 'रिसेट',
    randomize: 'अनियमित',
    export: 'निर्यात',
    exported: 'कपी + डाउनलोड भयो!',
    exportedFile: 'प्रिसेट डाउनलोड भयो',
    exportedClip: 'क्लिपबोर्डमा कपी भयो',
    active: 'सक्रिय — फाइन पोइन्टर यन्त्र',
    unavailable: 'अनुपलब्ध — टच यन्त्रमा नेटिभ कर्सर रहन्छ',
    disabled: 'निष्क्रिय — माथिको स्विच अन गर्नुहोस्',
    checking: 'यन्त्र जाँच हुँदैछ…',
    reducedNote: 'गति घटाइएको',
    foot: 'यही यन्त्रमा सुरक्षित · JSON प्रिसेट निर्यात',
    presets: { precision: 'सटीक', comet: 'पुच्छ्रे तारा', halo: 'आभा', minimal: 'न्यूनतम' } as Record<string, string>,
  },
} as const;

type SliderKey = Exclude<PointerNumKey, 'hue'>;
const SLIDERS: { key: SliderKey; unit: string }[] = [
  { key: 'strength', unit: '%' },
  { key: 'radius', unit: 'px' },
  { key: 'ringSize', unit: 'px' },
  { key: 'dotSize', unit: 'px' },
  { key: 'damping', unit: '' },
  { key: 'trail', unit: '' },
  { key: 'glow', unit: '%' },
  { key: 'deform', unit: '%' },
];

const valueText = (key: PointerNumKey, v: number, unit: string) => {
  if (unit === 'px') return `${v} pixels`;
  if (unit === '%') return `${v} percent`;
  if (unit === '°') return `${v} degrees`;
  if (key === 'trail') return `${v} particles`;
  if (key === 'damping') return `level ${v} of 30`;
  return String(v);
};

function Switch({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`ptr-switch${on ? ' on' : ''}`} onClick={onClick}>
      <span className="ptr-switch-track" aria-hidden="true">
        <span className="ptr-switch-knob" />
      </span>
      <span className="ptr-switch-text">{label}</span>
    </button>
  );
}

export function PointerStudio({ locale }: { locale: 'en' | 'ne' }) {
  const t = L[locale];
  const p = usePrefs();
  const s = p.pointer;
  const fineQuery = useMediaQuery('(hover: hover) and (pointer: fine)');
  const sysReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const noopSubscribe = useCallback(() => () => {}, []);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const fine: boolean | null = mounted ? fineQuery : null;
  const [exported, setExported] = useState<'' | 'both' | 'file' | 'clip'>('');
  const exportTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(exportTimer.current), []);

  const reduced = p.motion === 'reduced' || sysReduced;
  const activePreset = presetMatch(s) ?? 'custom';
  const g = s.glow / 100;
  const ringShadow = `0 0 ${Math.round(5 + g * 26)}px color-mix(in srgb, var(--cy) ${Math.round(18 + g * 62)}%, transparent), inset 0 0 ${Math.round(3 + g * 12)}px color-mix(in srgb, var(--cy) ${Math.round(8 + g * 34)}%, transparent)`;
  const dotShadow = `0 0 ${Math.round(3 + g * 16)}px color-mix(in srgb, var(--mg) ${Math.round(28 + g * 60)}%, transparent)`;
  const pvTrail = reduced ? 0 : Math.min(s.trail, 8);

  const status = fine === null ? t.checking : !fine ? t.unavailable : s.enabled ? t.active : t.disabled;
  const statusOn = fine === true && s.enabled;

  const doExport = async () => {
    const json = serializeSettings(s);
    let file = false;
    let clip = false;
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'acttolog-pointer-preset.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      file = true;
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      /* download unavailable — clipboard below still runs */
    }
    try {
      await navigator.clipboard.writeText(json);
      clip = true;
    } catch {
      /* clipboard blocked — the file download is the fallback */
    }
    // Browsers deny clipboard write without a user gesture they trust, so the
    // confirmation must name only the channel that actually succeeded.
    setExported(file && clip ? 'both' : file ? 'file' : clip ? 'clip' : '');
    window.clearTimeout(exportTimer.current);
    exportTimer.current = window.setTimeout(() => setExported(''), 1800);
  };

  const slider = (key: SliderKey, unit: string) => {
    const { min, max, step } = POINTER_RANGES[key];
    const v = s[key];
    const fill = ((v - min) / (max - min)) * 100;
    return (
      <div className="ptr-field ptr-slider" key={key}>
        <label className="ptr-label mono" htmlFor={`ptr-${key}`}>
          <span>{t[key]}</span>
          <b className="ptr-num mono">
            {v}
            {unit}
          </b>
        </label>
        <input
          id={`ptr-${key}`}
          className="tb-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          aria-valuetext={valueText(key, v, unit)}
          onChange={(e) => p.setPointer({ [key]: Number(e.target.value) })}
          style={{ '--fill': `${fill}%` } as CSSProperties}
        />
      </div>
    );
  };

  return (
    <div className="ptr">
      <p className="dk-kicker mono">
        {t.kicker} <span className="dk-dim">· {t.sub}</span>
      </p>
      <p className={`ptr-status mono${statusOn ? ' on' : ''}`} role="status">
        <span className="ptr-status-dot" aria-hidden="true" />
        {status}
        {reduced ? ` · ${t.reducedNote}` : ''}
      </p>

      <div className="ptr-body ptr-scroll">
        <div className="ptr-toggles">
          <Switch on={s.enabled} label={t.enable} onClick={() => p.setPointer({ enabled: !s.enabled })} />
          <Switch on={s.hideNative} label={t.hideNative} onClick={() => p.setPointer({ hideNative: !s.hideNative })} />
          <Switch on={s.clickPulse} label={t.pulse} onClick={() => p.setPointer({ clickPulse: !s.clickPulse })} />
        </div>

        <div className="ptr-row2">
          <div className="ptr-field">
            <label className="ptr-label mono" htmlFor="ptr-preset">
              <span>{t.preset}</span>
            </label>
            <select
              id="ptr-preset"
              className="ptr-select mono"
              value={activePreset}
              onChange={(e) => {
                const pre = POINTER_PRESETS.find((x) => x.id === e.target.value);
                if (pre) p.setPointer({ ...pre.settings, enabled: s.enabled, hideNative: s.hideNative });
              }}
            >
              <option value="custom">{t.custom}</option>
              {POINTER_PRESETS.map((pre) => (
                <option key={pre.id} value={pre.id}>
                  {t.presets[pre.id] ?? pre.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ptr-field">
            <label className="ptr-label mono" htmlFor="ptr-blend">
              <span>{t.blend}</span>
            </label>
            <select
              id="ptr-blend"
              className="ptr-select mono"
              value={s.blend}
              onChange={(e) => p.setPointer({ blend: e.target.value as PointerBlend })}
            >
              {(['normal', 'screen', 'difference', 'exclusion'] as PointerBlend[]).map((b) => (
                <option key={b} value={b}>
                  {t.blends[b]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ptr-grid">{SLIDERS.map(({ key, unit }) => slider(key, unit))}</div>

        <div className="ptr-field ptr-slider">
          <label className="ptr-label mono" htmlFor="ptr-hue">
            <span>{t.hue}</span>
            <span className="ptr-hue-wrap">
              <span className="ptr-hue-swatch" style={{ filter: `hue-rotate(${s.hue}deg)` }} aria-hidden="true" />
              <b className="ptr-num mono">{s.hue}°</b>
            </span>
          </label>
          <input
            id="ptr-hue"
            className="tb-range ptr-hue"
            type="range"
            min={POINTER_RANGES.hue.min}
            max={POINTER_RANGES.hue.max}
            step={POINTER_RANGES.hue.step}
            value={s.hue}
            aria-valuetext={valueText('hue', s.hue, '°')}
            onChange={(e) => p.setPointer({ hue: Number(e.target.value) })}
          />
        </div>

        <div className="ptr-field">
          <span className="ptr-label mono">
            <span>{t.preview}</span>
          </span>
          <div className={`ptr-pv${reduced ? ' still' : ''}`} aria-hidden="true">
            <span className="ptr-pv-target a" style={{ '--pull': s.strength / 100 } as CSSProperties} />
            <span className="ptr-pv-target b" style={{ '--pull': s.strength / 100 } as CSSProperties} />
            <div
              className="ptr-pv-scene"
              style={{ mixBlendMode: s.blend, filter: s.hue > 0 ? `hue-rotate(${s.hue}deg)` : 'none' }}
            >
              {Array.from({ length: pvTrail }, (_, j) => {
                const i = j + 1;
                const f = 1 - i / (pvTrail + 1);
                const size = Math.max(2, Math.round(s.dotSize * (0.35 + f * 0.85)));
                return (
                  <span key={i} className="ptr-pv-unit" style={{ '--d': `${i * 0.12}s`, '--off': `${i * 11}px` } as CSSProperties}>
                    <span className="ptr-pv-bob">
                      <span
                        className="ptr-pv-trail"
                        style={{ width: size, height: size, opacity: 0.08 + f * 0.4, boxShadow: dotShadow }}
                      />
                    </span>
                  </span>
                );
              })}
              <span className="ptr-pv-unit head" style={{ '--d': '0s', '--off': '0px' } as CSSProperties}>
                <span className="ptr-pv-bob">
                  <span
                    className={`ptr-pv-ring${s.deform > 0 && !reduced ? ' squish' : ''}`}
                    style={{ width: s.ringSize, height: s.ringSize, boxShadow: ringShadow, '--squish': (s.deform / 100) * 0.35 } as CSSProperties}
                  />
                  <span className="ptr-pv-dot" style={{ width: s.dotSize, height: s.dotSize, boxShadow: dotShadow }} />
                  {s.clickPulse && !reduced && <span className="ptr-pv-pulse" />}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Outside the scroll body: reset/randomize/export stay reachable however
          far down the sliders the reader has scrolled. */}
      <div className="ptr-actions">
        <button type="button" className="btn btn-g btn-sm" onClick={p.resetPointer}>
          <Icon name="refresh" size={14} /> {t.reset}
        </button>
        <button type="button" className="btn btn-g btn-sm" onClick={() => p.setPointer(randomPointerSettings())}>
          <Icon name="spark" size={14} /> {t.randomize}
        </button>
        <button type="button" className={`btn btn-p btn-sm ptr-export${exported ? ' on' : ''}`} onClick={doExport}>
          <Icon name={exported ? 'check' : 'down'} size={14} />{' '}
          {exported === 'both' ? t.exported : exported === 'file' ? t.exportedFile : exported === 'clip' ? t.exportedClip : t.export}
        </button>
      </div>

      <p className="dk-foot mono">{t.foot}</p>
    </div>
  );
}