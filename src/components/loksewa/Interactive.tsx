'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { LkBi, LkQuestion } from '@/lib/content/loksewa';

/* ── medium ─────────────────────────────────────────────────────── */

type Medium = 'ne' | 'en' | 'mix';
const MediumCtx = createContext<{ medium: Medium; set: (m: Medium) => void }>({ medium: 'ne', set: () => {} });

export function MediumProvider({ children }: { children: ReactNode }) {
  const [medium, setMedium] = useState<Medium>('ne');
  useEffect(() => {
    try {
      const stored = localStorage.getItem('act_lk_medium');
      if (stored === 'ne' || stored === 'en' || stored === 'mix') setMedium(stored);
    } catch {
      /* private mode */
    }
  }, []);
  const set = useCallback((m: Medium) => {
    setMedium(m);
    try {
      localStorage.setItem('act_lk_medium', m);
    } catch {
      /* private mode */
    }
  }, []);
  const value = useMemo(() => ({ medium, set }), [medium, set]);
  return <MediumCtx.Provider value={value}>{children}</MediumCtx.Provider>;
}

export function useMedium() {
  return useContext(MediumCtx);
}

/** Renders a bilingual field according to the chosen medium. */
export function Lk({ v, as: Tag = 'span', className = '' }: { v: LkBi; as?: 'span' | 'p' | 'h1' | 'h2' | 'h3'; className?: string }) {
  const { medium } = useMedium();
  const text = medium === 'en' ? v.en : medium === 'mix' ? `${v.ne} · ${v.en}` : v.ne;
  return <Tag className={className}>{text}</Tag>;
}

export function MediumSwitch() {
  const { medium, set } = useMedium();
  const opts: { id: Medium; label: string }[] = [
    { id: 'ne', label: 'नेपाली' },
    { id: 'en', label: 'English' },
    { id: 'mix', label: 'नेपाली + English' },
  ];
  return (
    <div className="lkm" role="group" aria-label="पढ्ने माध्यम / Reading medium">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          className="lkm-btn"
          data-on={medium === o.id ? '1' : '0'}
          aria-pressed={medium === o.id}
          onClick={() => set(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── progress ───────────────────────────────────────────────────── */

const PKEY = 'act_lk_progress';

export function ProgressTracker({ units }: { units: { key: string; label: LkBi; href: string }[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PKEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const toggle = (key: string) => {
    setDone((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(PKEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  const total = units.length;
  const finished = units.filter((u) => done[u.key]).length;
  const pct = total ? Math.round((finished / total) * 100) : 0;
  const left = units.filter((u) => !done[u.key]).slice(0, 6);

  return (
    <div className="lkprog">
      <div className="lkprog-head">
        <div className="lkprog-ring" style={{ '--p': pct } as React.CSSProperties} aria-hidden="true">
          <b>{ready ? pct : 0}%</b>
        </div>
        <div>
          <h3>
            <Icon name="check" size={15} /> तपाईंको प्रगति <span className="lk-en">Your progress</span>
          </h3>
          <p>
            {ready ? `${finished} / ${total} फोल्डर पूरा` : `${total} फोल्डर`} · यो यही ब्राउजरमा मात्र सुरक्षित हुन्छ,
            कतै पठाइँदैन।
          </p>
        </div>
      </div>
      <ul className="lkprog-list">
        {units.map((u) => (
          <li key={u.key} data-on={done[u.key] ? '1' : '0'}>
            <button type="button" onClick={() => toggle(u.key)} aria-pressed={Boolean(done[u.key])}>
              <span className="lkprog-box" aria-hidden="true" />
              <Lk v={u.label} />
            </button>
          </li>
        ))}
      </ul>
      {ready && left.length > 0 && (
        <p className="lkprog-left">
          अझै बाँकी: {left.map((u) => u.label.ne).join(', ')}
          {total - finished > left.length ? ` …अरू ${total - finished - left.length}` : ''}
        </p>
      )}
    </div>
  );
}

/* ── practice test ──────────────────────────────────────────────── */

const TKEY = 'act_lk_tests';

export function PracticeTest({ questions, paperLabel }: { questions: LkQuestion[]; paperLabel: LkBi }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [marked, setMarked] = useState(false);
  const [history, setHistory] = useState<{ at: string; score: number; total: number }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TKEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const right = questions.filter((q, i) => answers[i] === q.answer).length;
  const wrong = questions.filter((q, i) => answers[i] !== undefined && answers[i] !== q.answer).length;
  const blank = questions.length - right - wrong;
  // Paper I marks one for a correct answer and takes a fifth for a wrong one.
  const score = marked ? right - wrong * 0.2 : 0;
  const missed = questions.filter((q, i) => answers[i] !== undefined && answers[i] !== q.answer);

  const submit = () => {
    setMarked(true);
    const entry = { at: new Date().toISOString(), score: right - wrong * 0.2, total: questions.length };
    const next = [entry, ...history].slice(0, 12);
    setHistory(next);
    try {
      localStorage.setItem(TKEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  const reset = () => {
    setAnswers({});
    setMarked(false);
  };

  return (
    <div className="lktest">
      <div className="lktest-bar">
        <div>
          <h3>
            <Icon name="compass" size={15} /> अभ्यास परीक्षण <span className="lk-en">Practice test</span>
          </h3>
          <p className="lktest-warn">
            यी प्रश्न ACTTOLOG ले पढाइका लागि लेखेको हो — आयोगको आधिकारिक प्रश्नपत्र होइन। {paperLabel.ne}मा १ अङ्क,
            गलतमा ०.२ घट्छ।
          </p>
        </div>
        <div className="lktest-score" data-on={marked ? '1' : '0'}>
          <b>{marked ? score.toFixed(1) : '—'}</b>
          <span>/ {questions.length}</span>
        </div>
      </div>

      <ol className="lktest-qs">
        {questions.map((q, i) => {
          const picked = answers[i];
          return (
            <li key={i} data-state={marked ? (picked === q.answer ? 'ok' : picked === undefined ? 'blank' : 'bad') : 'idle'}>
              <Lk v={q.q} as="p" className="lktest-q" />
              <div className="lktest-opts">
                {q.options.map((o, oi) => (
                  <label key={oi} className="lktest-opt" data-picked={picked === oi ? '1' : '0'} data-true={q.answer === oi ? '1' : '0'}>
                    <input
                      type="radio"
                      name={`q${i}`}
                      checked={picked === oi}
                      disabled={marked}
                      onChange={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                    />
                    <span>{o.ne === o.en ? o.en : `${o.ne} / ${o.en}`}</span>
                  </label>
                ))}
              </div>
              {marked && (
                <p className="lktest-exp">
                  <Icon name="doc" size={13} /> <Lk v={q.explain} />
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="lktest-foot">
        {!marked ? (
          <button type="button" className="btn btn-p" onClick={submit} disabled={Object.keys(answers).length === 0}>
            जवाफ जाँच्नुहोस् <Icon name="check" size={15} />
          </button>
        ) : (
          <button type="button" className="btn btn-g" onClick={reset}>
            फेरि गर्नुहोस् <Icon name="refresh" size={15} />
          </button>
        )}
        {marked && (
          <p className="lktest-tally">
            सही {right} · गलत {wrong} · खाली {blank}
          </p>
        )}
      </div>

      {marked && missed.length > 0 && (
        <div className="lktest-gap">
          <h4>
            <Icon name="shield" size={14} /> यी ठाउँमा फेरि पढ्नुहोस्
          </h4>
          <ul>
            {missed.map((q, i) => (
              <li key={i}>
                <Lk v={q.q} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <p className="lktest-hist mono">
          {history.slice(0, 3).map((h) => `${h.score.toFixed(1)}/${h.total}`).join('  ·  ')}
        </p>
      )}
    </div>
  );
}
