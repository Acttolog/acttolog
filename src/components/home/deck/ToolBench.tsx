'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/lib/prefs';
import { Icon } from '@/components/ui/Icon';

type Tab = 'convert' | 'calc' | 'focus' | 'notes' | 'key';

const L = {
  en: {
    kicker: 'TOOL BENCH',
    sub: 'Five working instruments · runs entirely in your browser',
    convert: 'Convert',
    calc: 'Calculator',
    focus: 'Focus',
    notes: 'Notes',
    key: 'Password',
    category: 'Category',
    currency: 'Currency',
    temperature: 'Temperature',
    length: 'Length',
    value: 'Value',
    from: 'From',
    to: 'To',
    swap: 'Swap units',
    result: 'Result',
    rate: 'rate',
    clear: 'Clear',
    backspace: 'Backspace',
    equals: 'Equals',
    focusTitle: 'Focus timer',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset',
    presetFocus: 'Focus 25m',
    presetShort: 'Break 5m',
    presetLong: 'Long 15m',
    done: 'Session complete. Well done.',
    sound: 'Completion sound',
    notesTitle: 'Scratchpad',
    notesPh: 'Write a note… it autosaves on this device.',
    saved: 'Saved on this device',
    chars: 'characters',
    keyTitle: 'Password generator',
    lengthLabel: 'Length',
    upper: 'A-Z',
    lower: 'a-z',
    digits: '0-9',
    symbols: '!@#',
    generate: 'Generate',
    copy: 'Copy',
    copied: 'Copied!',
    strength: 'Strength',
    weak: 'Weak',
    fair: 'Fair',
    strong: 'Strong',
    veryStrong: 'Very strong',
    entropy: 'bits of entropy',
  },
  ne: {
    kicker: 'औजार बेन्च',
    sub: 'पाँच काम गर्ने औजार · पूरै ब्राउजरमा चल्छ',
    convert: 'रूपान्तरण',
    calc: 'क्याल्कुलेटर',
    focus: 'फोकस',
    notes: 'नोटहरू',
    key: 'पासवर्ड',
    category: 'श्रेणी',
    currency: 'मुद्रा',
    temperature: 'तापक्रम',
    length: 'लम्बाइ',
    value: 'मान',
    from: 'बाट',
    to: 'मा',
    swap: 'एकाइ साट्नुहोस्',
    result: 'नतिजा',
    rate: 'दर',
    clear: 'खाली',
    backspace: 'मेटाउनुहोस्',
    equals: 'बराबर',
    focusTitle: 'फोकस टाइमर',
    start: 'सुरु',
    pause: 'रोक्नुहोस्',
    reset: 'रिसेट',
    presetFocus: 'फोकस २५ मि',
    presetShort: 'विश्राम ५ मि',
    presetLong: 'लामो १५ मि',
    done: 'सत्र पूरा भयो। स्याबास!',
    sound: 'समाप्ति ध्वनि',
    notesTitle: 'स्क्र्याचप्याड',
    notesPh: 'नोट लेख्नुहोस्… यही यन्त्रमा आफै सुरक्षित हुन्छ।',
    saved: 'यही यन्त्रमा सुरक्षित',
    chars: 'अक्षर',
    keyTitle: 'पासवर्ड जेनेरेटर',
    lengthLabel: 'लम्बाइ',
    upper: 'A-Z',
    lower: 'a-z',
    digits: '०-',
    symbols: '!@#',
    generate: 'बनाउनुहोस्',
    copy: 'कपी',
    copied: 'कपी भयो!',
    strength: 'बल',
    weak: 'कमजोर',
    fair: 'ठिकै',
    strong: 'बलियो',
    veryStrong: 'धेरै बलियो',
    entropy: 'बिट इन्ट्रोपी',
  },
} as const;

const TABS: { id: Tab; icon: string; key: keyof (typeof L)['en'] }[] = [
  { id: 'convert', icon: 'refresh', key: 'convert' },
  { id: 'calc', icon: 'sigma', key: 'calc' },
  { id: 'focus', icon: 'clock', key: 'focus' },
  { id: 'notes', icon: 'doc', key: 'notes' },
  { id: 'key', icon: 'lock', key: 'key' },
];

/* ── Converter ─────────────────────────────────────────────── */
type Cat = 'currency' | 'temperature' | 'length';
const UNITS: Record<Cat, string[]> = {
  currency: ['NPR', 'USD'],
  temperature: ['°C', '°F', 'K'],
  length: ['km', 'mi', 'm', 'ft'],
};
function convert(cat: Cat, v: number, from: string, to: string, usdToNpr: number): number {
  if (cat === 'currency') {
    const usd = from === 'USD' ? v : v / usdToNpr;
    return to === 'USD' ? usd : usd * usdToNpr;
  }
  if (cat === 'temperature') {
    const c = from === '°C' ? v : from === '°F' ? ((v - 32) * 5) / 9 : v - 273.15;
    return to === '°C' ? c : to === '°F' ? (c * 9) / 5 + 32 : c + 273.15;
  }
  const m: Record<string, number> = { km: 1000, mi: 1609.344, m: 1, ft: 0.3048 };
  return (v * m[from]) / m[to];
}
function Converter({ locale, usdToNpr }: { locale: 'en' | 'ne'; usdToNpr: number }) {
  const t = L[locale];
  const [cat, setCat] = useState<Cat>('currency');
  const [val, setVal] = useState('1');
  const [from, setFrom] = useState('NPR');
  const [to, setTo] = useState('USD');
  const units = UNITS[cat];
  const num = parseFloat(val);
  const out = Number.isFinite(num) ? convert(cat, num, from, to, usdToNpr) : NaN;
  const fmt = (n: number) =>
    Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—';
  const pickCat = (c: Cat) => {
    setCat(c);
    setFrom(UNITS[c][0]);
    setTo(UNITS[c][1]);
  };
  return (
    <div className="tb-convert">
      <div className="tb-field">
        <label className="tb-label mono">{t.category}</label>
        <div className="tb-seg" role="group">
          {(['currency', 'temperature', 'length'] as Cat[]).map((c) => (
            <button key={c} type="button" className={`tb-seg-btn${cat === c ? ' on' : ''}`} onClick={() => pickCat(c)} aria-pressed={cat === c}>
              {t[c]}
            </button>
          ))}
        </div>
      </div>
      <div className="tb-row">
        <div className="tb-field grow">
          <label className="tb-label mono" htmlFor="tb-conv-val">{t.value}</label>
          <input id="tb-conv-val" className="tb-input mono" type="number" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} />
        </div>
        <button type="button" className="tb-icon-btn" onClick={() => { setFrom(to); setTo(from); }} aria-label={t.swap} title={t.swap}>
          <Icon name="refresh" size={16} />
        </button>
      </div>
      <div className="tb-row">
        <div className="tb-field grow">
          <label className="tb-label mono" htmlFor="tb-conv-from">{t.from}</label>
          <select id="tb-conv-from" className="tb-input mono" value={from} onChange={(e) => setFrom(e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="tb-field grow">
          <label className="tb-label mono" htmlFor="tb-conv-to">{t.to}</label>
          <select id="tb-conv-to" className="tb-input mono" value={to} onChange={(e) => setTo(e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="tb-result">
        <span className="tb-label mono">{t.result}</span>
        <b className="tb-result-num mono">{fmt(out)} <span className="tb-result-unit">{to}</span></b>
      </div>
      {cat === 'currency' && <p className="dk-foot mono">1 USD ≈ रु {usdToNpr} · {t.rate}</p>}
    </div>
  );
}

/* ── Calculator ────────────────────────────────────────────── */
const round = (n: number) => (Number.isFinite(n) ? parseFloat(n.toPrecision(12)) : NaN);
function calc(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return round(a + b);
    case '−': return round(a - b);
    case '×': return round(a * b);
    case '÷': return b === 0 ? NaN : round(a / b);
    default: return b;
  }
}
function Calculator({ locale }: { locale: 'en' | 'ne' }) {
  const t = L[locale];
  const [disp, setDisp] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [wait, setWait] = useState(false);
  const digit = (d: string) => {
    setDisp((s) => (wait ? d : s === '0' ? d : s.length < 14 ? s + d : s));
    setWait(false);
  };
  const dot = () => {
    setDisp((s) => (wait ? '0.' : s.includes('.') ? s : s + '.'));
    setWait(false);
  };
  const operator = (next: string) => {
    const input = parseFloat(disp);
    if (acc === null) setAcc(input);
    else if (op && !wait) {
      const r = calc(acc, input, op);
      setAcc(r);
      setDisp(Number.isFinite(r) ? String(r) : 'Error');
    }
    setOp(next);
    setWait(true);
  };
  const equals = () => {
    if (op === null || acc === null) return;
    const input = wait ? acc : parseFloat(disp);
    const r = calc(acc, input, op);
    setDisp(Number.isFinite(r) ? String(r) : 'Error');
    setAcc(null);
    setOp(null);
    setWait(true);
  };
  const clear = () => { setDisp('0'); setAcc(null); setOp(null); setWait(false); };
  const back = () => setDisp((s) => (wait || s.length <= 1 ? '0' : s.slice(0, -1)));
  const negate = () => setDisp((s) => (s === '0' || s === 'Error' ? s : String(-parseFloat(s))));
  const percent = () => setDisp((s) => String(round(parseFloat(s) / 100)));
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (/^[0-9]$/.test(k)) { digit(k); e.preventDefault(); }
    else if (k === '.') { dot(); e.preventDefault(); }
    else if (k === '+') { operator('+'); e.preventDefault(); }
    else if (k === '-') { operator('−'); e.preventDefault(); }
    else if (k === '*') { operator('×'); e.preventDefault(); }
    else if (k === '/') { operator('÷'); e.preventDefault(); }
    else if (k === 'Enter' || k === '=') { equals(); e.preventDefault(); }
    else if (k === 'Backspace') { back(); e.preventDefault(); }
    else if (k === 'Escape') { clear(); e.preventDefault(); }
    else if (k === '%') { percent(); e.preventDefault(); }
  };
  const keys: { lab: string; act: () => void; cls?: string }[] = [
    { lab: 'C', act: clear, cls: 'fn' }, { lab: '±', act: negate, cls: 'fn' }, { lab: '%', act: percent, cls: 'fn' }, { lab: '÷', act: () => operator('÷'), cls: 'op' },
    { lab: '7', act: () => digit('7') }, { lab: '8', act: () => digit('8') }, { lab: '9', act: () => digit('9') }, { lab: '×', act: () => operator('×'), cls: 'op' },
    { lab: '4', act: () => digit('4') }, { lab: '5', act: () => digit('5') }, { lab: '6', act: () => digit('6') }, { lab: '−', act: () => operator('−'), cls: 'op' },
    { lab: '1', act: () => digit('1') }, { lab: '2', act: () => digit('2') }, { lab: '3', act: () => digit('3') }, { lab: '+', act: () => operator('+'), cls: 'op' },
    { lab: '0', act: () => digit('0') }, { lab: '.', act: dot }, { lab: '⌫', act: back, cls: 'fn' }, { lab: '=', act: equals, cls: 'eq' },
  ];
  return (
    <div className="tb-calc" tabIndex={0} onKeyDown={onKey} role="group" aria-label={t.calc}>
      <div className="tb-calc-screen">
        <span className="tb-calc-expr mono">{acc !== null ? `${acc} ${op ?? ''}` : ''}</span>
        <span className="tb-calc-disp mono">{disp}</span>
      </div>
      <div className="tb-calc-keys">
        {keys.map((k) => (
          <button key={k.lab} type="button" className={`tb-key ${k.cls ?? ''}`} onClick={k.act}>{k.lab}</button>
        ))}
      </div>
    </div>
  );
}

/* ── Focus timer ───────────────────────────────────────────── */
function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const now = ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.18);
      g.gain.linearRampToValueAtTime(0.14, now + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(now + i * 0.18);
      o.stop(now + i * 0.18 + 0.42);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {
    /* audio unavailable */
  }
}
function Focus({ locale, onRunning }: { locale: 'en' | 'ne'; onRunning: (b: boolean) => void }) {
  const t = L[locale];
  const [total, setTotal] = useState(25 * 60);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  useEffect(() => { onRunning(running); }, [running, onRunning]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          setDone(true);
          if (soundRef.current) chime();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const preset = (min: number) => { setRunning(false); setDone(false); setTotal(min * 60); setLeft(min * 60); };
  const mmss = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  const frac = total > 0 ? left / total : 0;
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="tb-focus">
      <div className="tb-focus-ring">
        <svg viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">
          <circle className="tb-ring-bg" cx="60" cy="60" r={R} />
          <circle className="tb-ring-fg" cx="60" cy="60" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 60 60)" />
        </svg>
        <div className="tb-focus-time">
          <b className="mono">{mmss}</b>
          <span className="dk-foot mono">{done ? t.done : t.focusTitle}</span>
        </div>
      </div>
      <div className="tb-seg" role="group">
        <button type="button" className="tb-seg-btn" onClick={() => preset(25)}>{t.presetFocus}</button>
        <button type="button" className="tb-seg-btn" onClick={() => preset(5)}>{t.presetShort}</button>
        <button type="button" className="tb-seg-btn" onClick={() => preset(15)}>{t.presetLong}</button>
      </div>
      <div className="tb-focus-ctrl">
        <button type="button" className="btn btn-p btn-sm" onClick={() => { if (left === 0) { setLeft(total); setDone(false); } setRunning((r) => !r); }}>
          <Icon name={running ? 'clock' : 'play'} size={14} /> {running ? t.pause : t.start}
        </button>
        <button type="button" className="btn btn-g btn-sm" onClick={() => preset(total / 60)}>
          <Icon name="refresh" size={14} /> {t.reset}
        </button>
        <button type="button" className={`tb-icon-btn${sound ? ' on' : ''}`} onClick={() => setSound((s) => !s)} aria-pressed={sound} aria-label={t.sound} title={t.sound}>
          <Icon name="bell" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Notes ─────────────────────────────────────────────────── */
function Notes({ locale }: { locale: 'en' | 'ne' }) {
  const t = L[locale];
  const [text, setText] = useState('');
  useEffect(() => {
    try { setText(localStorage.getItem('act_notes') || ''); } catch { /* ignore */ }
  }, []);
  const save = (v: string) => {
    setText(v);
    try { localStorage.setItem('act_notes', v); } catch { /* ignore */ }
  };
  return (
    <div className="tb-notes">
      <textarea
        className="tb-textarea dk-scroll"
        value={text}
        placeholder={t.notesPh}
        onChange={(e) => save(e.target.value)}
        aria-label={t.notesTitle}
        rows={7}
      />
      <div className="tb-notes-foot">
        <span className="dk-foot mono">{t.saved} · {text.length} {t.chars}</span>
        <button type="button" className="tb-icon-btn" onClick={() => save('')} aria-label={t.clear} title={t.clear} disabled={!text}>
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  );
}

/* ── Password generator ────────────────────────────────────── */
const SETS = { upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ', lower: 'abcdefghijkmnpqrstuvwxyz', digits: '23456789', symbols: '!@#$%^&*-_=+?' };
function genPw(len: number, use: Record<keyof typeof SETS, boolean>): string {
  let pool = '';
  (Object.keys(SETS) as (keyof typeof SETS)[]).forEach((k) => { if (use[k]) pool += SETS[k]; });
  if (!pool) pool = SETS.lower;
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => pool[n % pool.length]).join('');
}
function Password({ locale }: { locale: 'en' | 'ne' }) {
  const t = L[locale];
  const [len, setLen] = useState(16);
  const [use, setUse] = useState({ upper: true, lower: true, digits: true, symbols: true });
  const [pw, setPw] = useState('');
  const [copied, setCopied] = useState(false);
  const regenerate = useCallback((l: number, u: Record<keyof typeof SETS, boolean>) => setPw(genPw(l, u)), []);
  useEffect(() => { setPw(genPw(16, { upper: true, lower: true, digits: true, symbols: true })); }, []);
  const poolSize = (Object.keys(SETS) as (keyof typeof SETS)[]).reduce((s, k) => s + (use[k] ? SETS[k].length : 0), 0) || SETS.lower.length;
  const bits = Math.round(len * Math.log2(poolSize));
  const level = bits < 40 ? 0 : bits < 64 ? 1 : bits < 90 ? 2 : 3;
  const labels = [t.weak, t.fair, t.strong, t.veryStrong];
  const colors = ['var(--err)', 'var(--warn)', 'var(--ok)', 'var(--cy)'];
  const toggle = (k: keyof typeof SETS) => {
    const next = { ...use, [k]: !use[k] };
    setUse(next);
    regenerate(len, next);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      const el = document.createElement('textarea');
      el.value = pw;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };
  return (
    <div className="tb-pass">
      <div className="tb-key-out">
        <input className="tb-input mono grow" readOnly value={pw} aria-label={t.keyTitle} onFocus={(e) => e.target.select()} />
        <button type="button" className="tb-icon-btn" onClick={copy} aria-label={t.copy} title={t.copy}>
          <Icon name={copied ? 'check' : 'doc'} size={16} />
        </button>
      </div>
      <div className="tb-field">
        <label className="tb-label mono" htmlFor="tb-key-len">{t.lengthLabel} · <b className="mono">{len}</b></label>
        <input id="tb-key-len" className="tb-range" type="range" min={8} max={32} value={len} onChange={(e) => { const l = Number(e.target.value); setLen(l); regenerate(l, use); }} />
      </div>
      <div className="tb-seg" role="group">
        {(Object.keys(SETS) as (keyof typeof SETS)[]).map((k) => (
          <button key={k} type="button" className={`tb-seg-btn${use[k] ? ' on' : ''}`} onClick={() => toggle(k)} aria-pressed={use[k]}>{t[k]}</button>
        ))}
      </div>
      <div className="tb-key-meter">
        <div className="tb-meter-track"><span style={{ width: `${Math.min(100, (bits / 120) * 100)}%`, background: colors[level] }} /></div>
        <span className="dk-foot mono" style={{ color: colors[level] }}>{labels[level]} · {bits} {t.entropy}</span>
      </div>
      <button type="button" className="btn btn-p btn-sm tb-cta" onClick={() => regenerate(len, use)}>
        <Icon name="refresh" size={14} /> {copied ? t.copied : t.generate}
      </button>
    </div>
  );
}

/* ── Bench shell ───────────────────────────────────────────── */
export function ToolBench({ locale }: { locale: 'en' | 'ne' }) {
  const t = L[locale];
  const { usdToNpr } = usePrefs();
  const [tab, setTab] = useState<Tab>('convert');
  const [focusRunning, setFocusRunning] = useState(false);
  const onRunning = useCallback((b: boolean) => setFocusRunning(b), []);
  return (
    <div className="tb">
      <p className="dk-kicker mono">{t.kicker} <span className="dk-dim">· {t.sub}</span></p>
      <div className="tb-tabs" role="tablist" aria-label={t.kicker}>
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            className={`tb-tab${tab === tb.id ? ' on' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            <Icon name={tb.icon} size={14} />
            <span>{t[tb.key]}</span>
            {tb.id === 'focus' && focusRunning && <span className="tb-tab-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>
      <div className="tb-body dk-scroll">
        <div className="tb-panel" hidden={tab !== 'convert'}><Converter locale={locale} usdToNpr={usdToNpr} /></div>
        <div className="tb-panel" hidden={tab !== 'calc'}><Calculator locale={locale} /></div>
        <div className="tb-panel" hidden={tab !== 'focus'}><Focus locale={locale} onRunning={onRunning} /></div>
        <div className="tb-panel" hidden={tab !== 'notes'}><Notes locale={locale} /></div>
        <div className="tb-panel" hidden={tab !== 'key'}><Password locale={locale} /></div>
      </div>
    </div>
  );
}