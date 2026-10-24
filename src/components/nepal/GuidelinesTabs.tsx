'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Icon } from '@/components/ui/Icon';
import type { NepalGuide } from '@/lib/content/nepal';

/**
 * GuidelinesTabs — the "guidelines for all areas" the guide is judged on.
 * Four panels: permits, etiquette, safety, practical. Keyboard-operable,
 * aria-correct, and every line is server-rendered into the HTML so the
 * static GitHub Pages export keeps the full text crawlable.
 */

type PanelKey = 'permits' | 'etiquette' | 'safety' | 'practical';

const PANELS: { key: PanelKey; icon: string; en: string; ne: string }[] = [
  { key: 'permits', icon: 'shield', en: 'PERMITS & RULES', ne: 'अनुमति र नियम' },
  { key: 'etiquette', icon: 'users', en: 'COURTESY', ne: 'आचरण' },
  { key: 'safety', icon: 'lock', en: 'SAFETY', ne: 'सुरक्षा' },
  { key: 'practical', icon: 'globe', en: 'BEFORE YOU GO', ne: 'अघिकी तयारी' },
];

export function GuidelinesTabs({ g }: { g: NepalGuide }) {
  const { L, locale } = useI18n();
  const [tab, setTab] = useState<PanelKey>('permits');
  const ne = locale === 'ne';
  const label = (p: (typeof PANELS)[number]) => (ne ? p.ne : p.en);

  return (
    <div className="np-gt">
      <div className="np-gt-tabs" role="tablist" aria-label="Nepal travel guidelines">
        {PANELS.map((p) => (
          <button
            key={p.key}
            role="tab"
            id={`np-tab-${p.key}`}
            aria-selected={tab === p.key}
            aria-controls={`np-panel-${p.key}`}
            className={`np-gt-tab${tab === p.key ? ' on' : ''}`}
            onClick={() => setTab(p.key)}
            onKeyDown={(e) => {
              const i = PANELS.findIndex((x) => x.key === tab);
              if (e.key === 'ArrowRight') { e.preventDefault(); setTab(PANELS[(i + 1) % PANELS.length].key); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(PANELS[(i - 1 + PANELS.length) % PANELS.length].key); }
            }}
          >
            <Icon name={p.icon} size={14} />
            <span>{label(p)}</span>
          </button>
        ))}
      </div>

      <div className="np-gt-panels">
        <div
          role="tabpanel" id="np-panel-permits" aria-labelledby="np-tab-permits"
          hidden={tab !== 'permits'} className="np-gt-wrap np-gt-grid"
        >
          {g.permits.map((p) => (
            <article key={p.id} className="panel np-gt-card">
              <div className="np-gt-cardhead">
                <h3 className="np-gt-h3">{L(p.title)}</h3>
                <span className="mono np-gt-where">{p.where}</span>
              </div>
              <p className="np-gt-body">{L(p.body)}</p>
            </article>
          ))}
        </div>

        <ul
          role="tabpanel" id="np-panel-etiquette" aria-labelledby="np-tab-etiquette"
          hidden={tab !== 'etiquette'} className="np-gt-wrap np-gt-list"
        >
          {g.etiquette.map((e, i) => (
            <li key={i} className="np-gt-li">
              <span className="mono np-gt-n">{String(i + 1).padStart(2, '0')}</span>
              <p>{L(e)}</p>
            </li>
          ))}
        </ul>

        <div
          role="tabpanel" id="np-panel-safety" aria-labelledby="np-tab-safety"
          hidden={tab !== 'safety'} className="np-gt-wrap np-gt-grid np-gt-grid-wide"
        >
          {g.safety.map((s, i) => (
            <article key={i} className="panel np-gt-card np-gt-risk">
              <span className="mono np-gt-n">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="np-gt-h3">{L(s.title)}</h3>
              <p className="np-gt-body">{L(s.body)}</p>
            </article>
          ))}
        </div>

        <div
          role="tabpanel" id="np-panel-practical" aria-labelledby="np-tab-practical"
          hidden={tab !== 'practical'} className="np-gt-wrap np-gt-cols"
        >
          {([
            ['visa', ne ? 'भिसा' : 'VISA & ENTRY'],
            ['money', ne ? 'पैसा' : 'MONEY'],
            ['getting_around', ne ? 'यातायात' : 'GETTING AROUND'],
            ['essentials', ne ? 'अत्यावश्यक' : 'ESSENTIALS'],
          ] as [keyof NepalGuide['practical'], string][]).map(([k, heading]) => (
            <section key={k} className="panel np-gt-panel">
              <div className="eyebrow">{heading}</div>
              <ul className="np-gt-ul">
                {g.practical[k].map((line, i) => <li key={i}>{L(line)}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <p className="np-gt-note">{L(g.guidelines_note)}</p>

      <style>{`
        .np-gt { display: flex; flex-direction: column; gap: 20px; }
        .np-gt-wrap[hidden] { display: none !important; }
        .np-gt-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .np-gt-tab { display: inline-flex; align-items: center; gap: 8px; padding: 10px 15px; border-radius: 11px;
          border: 1px solid var(--line); background: var(--panel2); color: var(--mut); cursor: pointer;
          font: 500 11px/1 var(--font-mono); letter-spacing: .12em; transition: .28s; }
        .np-gt-tab:hover { color: var(--txt); border-color: var(--line2); }
        .np-gt-tab.on { color: var(--bg); background: var(--cy); border-color: var(--cy); }
        .np-gt-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        .np-gt-grid-wide { grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); }
        .np-gt-card { padding: 18px; display: flex; flex-direction: column; gap: 9px; }
        .np-gt-cardhead { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; flex-wrap: wrap; }
        .np-gt-h3 { font: 600 1.02rem/1.3 var(--font-display); color: var(--txt); margin: 0; letter-spacing: -.01em; }
        .np-gt-where { font-size: 9px; letter-spacing: .14em; color: var(--dim); text-transform: uppercase; }
        .np-gt-body { font-size: 13px; line-height: 1.66; color: var(--mut); margin: 0; }
        .np-gt-risk { border-left: 2px solid color-mix(in srgb, var(--mg) 45%, transparent); }
        .np-gt-n { font-size: 9.5px; letter-spacing: .14em; color: var(--cy); }
        .np-gt-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
        .np-gt-li { display: flex; gap: 12px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 13px;
          background: var(--panel2); align-items: flex-start; }
        .np-gt-li p { margin: 0; font-size: 13.2px; line-height: 1.6; color: var(--mut); }
        .np-gt-cols { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        .np-gt-panel { padding: 18px; }
        .np-gt-ul { margin: 12px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 9px; }
        .np-gt-ul li { font-size: 13px; line-height: 1.62; color: var(--mut); }
        .np-gt-ul li::marker { color: var(--cy); }
        .np-gt-note { font-size: 11.8px; line-height: 1.6; color: var(--dim); margin: 0;
          border-left: 2px solid var(--line2); padding-left: 12px; }
        @media (max-width: 620px) { .np-gt-list, .np-gt-grid, .np-gt-cols { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
