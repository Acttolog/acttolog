'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';

const EXAMPLES = [
  'I need free software for panel-data analysis',
  'Official Nepal government statistics',
  'Open access journals for health research',
  'Free reference manager for APA citations',
  'AI datasets for machine learning',
];

/** Layer 2 natural-language interpretation (spec §34) — intent → applied filters. */
export function NlSearch({ onClose, onApply }: { onClose: () => void; onApply: (q: string) => void }) {
  const { locale } = useI18n();
  const [q, setQ] = useState('');
  const [result, setResult] = useState<{ intent: Record<string, unknown>; note: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (query: string) => {
    setQ(query);
    setBusy(true);
    try {
      const res = await fetch('/api/darkroom/nl', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query }),
      });
      setResult(await res.json());
    } catch {
      setResult({ intent: {}, note: 'Interpretation unavailable — keyword search will still work.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mbd" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mcard" role="dialog" aria-modal="true">
        <div className="p-7">
          <div className="eyebrow mb-3">{locale === 'ne' ? 'प्राकृतिक भाषा खोज' : 'NATURAL-LANGUAGE SEARCH'}</div>
          <h3 className="h3 mb-2">{locale === 'ne' ? 'आवश्यकता वाक्यमा लेख्नुहोस्' : 'Describe what you need'}</h3>
          <p className="mut text-[13.2px] mb-5 max-w-[62ch]">
            {locale === 'ne'
              ? 'Layer 1 कीवर्ड, Layer 2 इन्टेन्ट व्याख्या, Layer 3 AI (कन्फिगर भएमा)। साधारण खोजहरू कहिल्यै OpenAI मा पठाइँदैन।'
              : 'Layer 1 keyword · Layer 2 intent parsing · Layer 3 AI interpretation only when configured and useful. Simple queries never reach OpenAI.'}
          </p>
          <label className="fld">
            <span>{locale === 'ne' ? 'तपाईंलाई के चाहिन्छ?' : 'What do you need?'}</span>
            <textarea className="ta" rows={3} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="I need free software for panel-data analysis." />
          </label>
          <div className="flex flex-wrap gap-2 mb-5">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="chip !text-[11px]" onClick={() => run(ex)}>{ex}</button>
            ))}
          </div>
          {result && (
            <div className="rounded-xl border p-4 mb-5" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
              <div className="mono text-[9.7px] tracking-[.2em] dim mb-3">INTERPRETED INTENT</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(result.intent).map(([k, v]) =>
                  v && (Array.isArray(v) ? v.length > 0 : true) ? (
                    <span key={k} className="tag">{k}: {Array.isArray(v) ? v.join(', ') : String(v)}</span>
                  ) : null)}
              </div>
              <p className="dim text-[11.8px] leading-relaxed">{result.note}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-end">
            <button className="btn btn-g btn-sm" onClick={onClose}>{locale === 'ne' ? 'बन्द' : 'Close'}</button>
            <button className="btn btn-g btn-sm" onClick={() => run(q)} disabled={busy || !q.trim()}>
              <Icon name="brain" size={14} />{locale === 'ne' ? 'व्याख्या' : 'Interpret'}
            </button>
            <button className="btn btn-p btn-sm" onClick={() => onApply(q)} disabled={!q.trim()}>
              {locale === 'ne' ? 'खोज लागू गर्नुहोस्' : 'Apply search'} <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
