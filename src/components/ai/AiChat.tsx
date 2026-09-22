'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { track } from '@/lib/analytics';
import { clientAiAnswer } from '@/lib/ai-core';

interface Msg { role: 'user' | 'ai'; text: string; sources?: AiSource[] }
export interface AiSource { title: string; route: string; meta: string; origin: 'acttolog' | 'web' }

const SUGGESTIONS = {
  en: ['Free tools for panel-data analysis', 'Thesis proposal structure', 'What is Darkroom?', 'Research packages and pricing'],
  ne: ['प्यानल डाटाका निःशुल्क औजार', 'थेसिस प्रस्ताव संरचना', 'Darkroom के हो?', 'अनुसन्धान प्याकेज र मूल्य'],
};

/** Shared chat core for the floating dock and the /ai page (spec §56). */
export function AiChat({ variant, prefill, openSignal }: {
  variant: 'dock' | 'page';
  prefill?: string;
  openSignal?: number;
}) {
  const { t, locale } = useI18n();
  const { user } = useSession();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'act' | 'actweb'>('actweb');
  const logRef = useRef<HTMLDivElement>(null);
  const sentPrefill = useRef('');

  useEffect(() => {
    try {
      const m = localStorage.getItem('act_ai_mode');
      if (m === 'act' || m === 'actweb') setMode(m);
    } catch { /* ignore */ }
  }, []);

  const changeMode = (m: 'act' | 'actweb') => {
    setMode(m);
    try { localStorage.setItem('act_ai_mode', m); } catch { /* ignore */ }
  };

  const greet = useCallback((): Msg => ({
    role: 'ai',
    text: locale === 'ne'
      ? 'नमस्ते! म Acttolog AI हुँ। म पहिले Acttolog सामग्री खोज्छु — थेसिन रिसर्च, डार्करूम, ब्लग, एकेडेमी, गेम्स र अफरहरू। के खोज्नुहुन्छ?'
      : 'Hello — I am Acttolog AI. I search Acttolog content first: Thesyn Research, Darkroom, Blog, Academy, Games and Offers. What are you looking for?',
  }), [locale]);

  useEffect(() => { setMessages([greet()]); }, [greet]);

  useEffect(() => {
    if (prefill && prefill !== sentPrefill.current) { sentPrefill.current = prefill; send(prefill); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, openSignal]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    const history = messages.map((m) => ({ role: m.role === 'ai' ? 'assistant' as const : 'user' as const, text: m.text }));
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setBusy(true);
    track('search', { q, mode: 'ai' });
    let replied = true;
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, mode, locale, history: history.slice(-8) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ai_failed');
      setMessages((prev) => [...prev, { role: 'ai', text: data.answer, sources: data.sources || [] }]);
    } catch {
      // Static host or API unavailable → identical Acttolog-first index, run locally
      replied = false;
      try {
        const local = clientAiAnswer(q, locale, mode);
        setMessages((prev) => [...prev, { role: 'ai', text: local.answer, sources: local.sources }]);
        replied = true;
      } catch { /* apology below */ }
    }
    if (!replied) {
      setMessages((prev) => [...prev, {
        role: 'ai',
        text: locale === 'ne'
          ? 'माफ गर्नुहोस् — जवाफ तयार गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।'
          : 'Sorry — I could not produce an answer right now. Please try again.',
      }]);
    }
    setBusy(false);
  }

  const suggestions = SUGGESTIONS[locale] || SUGGESTIONS.en;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3.5 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex gap-2 flex-1">
          <button className={`chip${mode === 'act' ? ' on' : ''}`} onClick={() => changeMode('act')}>{t('ai.act')}</button>
          <button className={`chip${mode === 'actweb' ? ' on' : ''}`} onClick={() => changeMode('actweb')}>{t('ai.web')}</button>
        </div>
        {!user && <span className="srcpill">{t('ai.temp')}</span>}
      </div>

      <div ref={logRef}
        className={variant === 'dock' ? 'p-3.5 space-y-3 overflow-auto flex-1' : 'p-5 space-y-3.5 overflow-auto flex-1'}>
        {messages.map((m, i) => m.role === 'user' ? (
          <div key={i} className="aimsg u">{m.text}</div>
        ) : (
          <div key={i} className="aimsg a">
            <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
            {m.sources && m.sources.length > 0 && (
              <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--line)' }}>
                {m.sources.slice(0, 5).map((s, j) => s.route.startsWith('http') ? (
                  <a key={j} className="flex items-start gap-2.5 group" href={s.route} target="_blank" rel="noopener noreferrer">
                    <span className="srcpill flex-none mt-0.5">{s.origin === 'acttolog' ? t('ai.src') : 'EXTERNAL WEB SOURCE'}</span>
                    <span className="text-[12.6px] mut group-hover:text-[var(--cy)] transition-colors">
                      {s.title} <span className="dim">· {s.meta}</span>
                    </span>
                  </a>
                ) : (
                  <Link key={j} className="flex items-start gap-2.5 group" href={s.route}>
                    <span className="srcpill flex-none mt-0.5">{s.origin === 'acttolog' ? t('ai.src') : 'EXTERNAL WEB SOURCE'}</span>
                    <span className="text-[12.6px] mut group-hover:text-[var(--cy)] transition-colors">
                      {s.title} <span className="dim">· {s.meta}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="aimsg a flex items-center gap-2">
            <span className="dot" />
            <span className="dim mono text-[11px] tracking-[.18em]">{locale === 'ne' ? 'खोजिँदै…' : 'RETRIEVING…'}</span>
          </div>
        )}
      </div>

      <form className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--line)' }}
        onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="inp !py-2.5 !text-[13.5px] flex-1" value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('ai.ph')} aria-label={t('ai.t')} autoComplete="off" />
        <button className="btn btn-p !px-3.5" type="submit" disabled={busy || !input.trim()} aria-label="Send">
          <Icon name="arrow" size={16} />
        </button>
      </form>

      <div className="px-3 pb-3 flex gap-2 flex-wrap">
        {suggestions.map((sq) => (
          <button key={sq} className="chip !text-[11px]" onClick={() => send(sq)} disabled={busy}>{sq}</button>
        ))}
      </div>
    </div>
  );
}
