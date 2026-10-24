'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSaved } from '@/lib/saved';
import { Icon } from '@/components/ui/Icon';
import { NepalShot } from './NepalShot';
import type { ShotSource } from '@/lib/nepal-media';
import type { NepalPlace, NepalRegion } from '@/lib/content/nepal';

/**
 * PlaceExplorer — filterable index of catalogued Nepal destinations.
 * Renders in the prerendered HTML (so GitHub Pages keeps the copy), then
 * upgrades to search + filters + save on the client. Saving uses the
 * existing `place` kind, so items land in My ACTTOLOG without new plumbing.
 */

const TYPE_LABEL: Record<string, { en: string; ne: string }> = {
  heritage: { en: 'Heritage', ne: 'सम्पदा' },
  mountain: { en: 'Mountain', ne: 'हिमाल' },
  lake: { en: 'Lake', ne: 'ताल' },
  wildlife: { en: 'Wildlife', ne: 'वन्यजन्तु' },
  village: { en: 'Hilltown', ne: 'पहाडी नगर' },
  monastery: { en: 'Monastery', ne: 'गुम्बा' },
  viewpoint: { en: 'Viewpoint', ne: 'दृश्यावलोकन' },
  city: { en: 'City', ne: 'सहर' },
  cave: { en: 'Cave', ne: 'गुफा' },
  landscape: { en: 'Landscape', ne: 'भूदृश्य' },
};

/** Deterministic procedural palette per place type when no photograph exists. */
const TYPE_ART: Record<string, string> = {
  mountain: 'himalaya', viewpoint: 'himalaya', cave: 'himalaya', landscape: 'himalaya',
  lake: 'himalaya', monastery: 'newar', heritage: 'newar', city: 'mithila',
  village: 'newar', wildlife: 'terai',
};

export function PlaceExplorer({ places, regions, shots }: {
  places: NepalPlace[];
  regions: NepalRegion[];
  /** place id → scanned photo, only for places that actually have one. */
  shots: Record<string, ShotSource>;
}) {
  const { L, locale } = useI18n();
  const { isSaved, toggleSave } = useSaved();
  const [region, setRegion] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [q, setQ] = useState('');

  const regionName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of regions) m[r.id] = L(r.name);
    return m;
  }, [regions, L]);

  const types = useMemo(() => {
    const seen = new Set(places.map((p) => p.type));
    return Array.from(seen).sort();
  }, [places]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return places.filter((p) => {
      if (region !== 'all' && p.region !== region) return false;
      if (type !== 'all' && p.type !== type) return false;
      if (!needle) return true;
      const hay = [
        p.name.en, p.name.ne || '', L(p.desc), p.tags.join(' '), regionName[p.region] || '', p.type,
      ].join(' ').toLowerCase();
      return hay.includes(needle);
    });
  }, [places, region, type, q, L, regionName]);

  const ne = locale === 'ne';
  return (
    <div>
      <div className="np-flt">
        <div className="np-flt-search">
          <Icon name="search" size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ne ? 'स्थान, ट्याग वा क्षेत्र खोज्नुहोस्…' : 'Search places, tags or regions…'}
            aria-label={ne ? 'स्थान खोज्नुहोस्' : 'Search places'}
          />
          {q && (
            <button className="np-flt-clear mono" onClick={() => setQ('')} aria-label="Clear search">✕</button>
          )}
        </div>
        <div className="np-flt-row" role="group" aria-label="Filter by region">
          <button className={`chip${region === 'all' ? ' on' : ''}`} onClick={() => setRegion('all')}>
            {ne ? 'सबै क्षेत्र' : 'ALL REGIONS'}
          </button>
          {regions.map((r) => (
            <button key={r.id} className={`chip${region === r.id ? ' on' : ''}`}
              onClick={() => setRegion(r.id)} style={{ ['--a']: r.accent } as React.CSSProperties}>
              {L(r.name)}
            </button>
          ))}
        </div>
        <div className="np-flt-row" role="group" aria-label="Filter by type">
          <button className={`chip${type === 'all' ? ' on' : ''}`} onClick={() => setType('all')}>
            {ne ? 'सबै प्रकार' : 'ALL TYPES'}
          </button>
          {types.map((t) => (
            <button key={t} className={`chip${type === t ? ' on' : ''}`} onClick={() => setType(t)}>
              {(TYPE_LABEL[t] || { en: t })[locale === 'ne' && TYPE_LABEL[t]?.ne ? 'ne' : 'en']}
            </button>
          ))}
        </div>
        <p className="mono np-flt-count">
          {filtered.length} / {places.length} {ne ? 'स्थान' : 'PLACES'}
          {region !== 'all' || type !== 'all' || q ? ` · ${ne ? 'फिल्टर सक्रिय' : 'FILTERED'}` : ''}
        </p>
      </div>

      <div className="np-grid">
        {filtered.map((p) => {
          const saved = isSaved('place', p.id);
          const shot = shots[p.id] || null;
          const real = Boolean(shot);
          return (
            <article key={p.id} id={`place-${p.id}`} className="np-card card">
              <div className="np-card-media">
                <NepalShot
                  shot={shot}
                  alt={real ? `${p.name.en} — ${regionName[p.region] || 'Nepal'}` : ''}
                  art={TYPE_ART[p.type] || 'himalaya'}
                  variant="card"
                  className="np-card-img"
                />
                <div className="np-card-badges">
                  <span className="tag">{(TYPE_LABEL[p.type] || { en: p.type })[ne && TYPE_LABEL[p.type]?.ne ? 'ne' : 'en']}</span>
                  {p.unesco && <span className="tag np-unesco">UNESCO</span>}
                </div>
                {!real && <span className="mono np-card-art">{ne ? 'विवरण चित्र' : 'ILLUSTRATED'}</span>}
              </div>
              <div className="np-card-body">
                <div className="mono np-card-region" style={{ ['--a']: (regions.find((r) => r.id === p.region)?.accent) || 'var(--cy)' } as React.CSSProperties}>
                  {regionName[p.region]}
                </div>
                <h3 className="np-card-title">{L(p.name)}</h3>
                <p className="np-card-desc">{L(p.desc)}</p>
                {p.note && <p className="np-card-note">{L(p.note)}</p>}
                <div className="np-card-tags">
                  {p.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                </div>
                <div className="np-card-foot">
                  <span className="mono np-card-best">
                    {ne ? 'उत्तम' : 'BEST'} · {p.best.join(ne ? ', ' : ' / ')}
                  </span>
                  <div className="np-card-acts">
                    <button
                      className={`btn btn-sm ${saved ? 'btn-p' : 'btn-g'}`}
                      onClick={() => toggleSave('place', p.id, p.name.en, `/nepal#place-${p.id}`)}
                      aria-pressed={saved}
                    >
                      <Icon name={saved ? 'check' : 'heart'} size={13} />
                      {saved ? (ne ? 'सुरक्षित' : 'SAVED') : (ne ? 'सुरक्षित गर्नु' : 'SAVE')}
                    </button>
                    <a className="btn btn-g btn-sm" href={`/explore?mode=map&lat=${p.coords[0]}&lng=${p.coords[1]}`}
                      aria-label={`View ${p.name.en} on the map`}>
                      <Icon name="globe" size={13} />{ne ? 'नक्सामा' : 'MAP'}
                    </a>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!filtered.length && (
        <div className="panel np-empty">
          <div className="eyebrow">{ne ? 'कुनै भेटिएन' : 'NOTHING FOUND'}</div>
          <p className="mut">{ne ? 'फिल्टर बदल्नुहोस् वा खोज शब्द हटाउनुहोस्।' : 'Loosen the filters or clear the search — every place here is catalogued by hand.'}</p>
        </div>
      )}

      <style>{`
        .np-flt { display: flex; flex-direction: column; gap: 12px; margin-bottom: 26px; }
        .np-flt-search { position: relative; display: flex; align-items: center; gap: 10px;
          border: 1px solid var(--line); border-radius: 12px; padding: 11px 14px; background: var(--panel2); color: var(--dim); }
        .np-flt-search input { flex: 1; background: transparent; border: 0; outline: 0; color: var(--txt);
          font: 400 14px/1.4 var(--font-sans); }
        .np-flt-search input::placeholder { color: var(--dim); }
        .np-flt-clear { background: transparent; border: 0; color: var(--dim); cursor: pointer; font-size: 12px; }
        .np-flt-row { display: flex; flex-wrap: wrap; gap: 7px; }
        .np-flt-count { font-size: 10px; letter-spacing: .16em; color: var(--dim); }
        .np-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(288px, 1fr)); }
        .np-card { display: flex; flex-direction: column; background: var(--panel2); }
        .np-card-media { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--bg); }
        .np-card-media img { width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform .9s cubic-bezier(.16,1,.3,1); }
        .np-card:hover .np-card-media img { transform: scale(1.05); }
        .np-card-badges { position: absolute; left: 10px; top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
        .np-card-badges .tag { background: color-mix(in srgb, var(--bg) 76%, transparent); backdrop-filter: blur(6px); }
        .np-unesco { color: var(--gold); border-color: color-mix(in srgb, var(--gold) 45%, transparent); }
        .np-card-art { position: absolute; right: 10px; top: 10px; font-size: 8.5px; letter-spacing: .14em;
          color: var(--dim); background: color-mix(in srgb, var(--bg) 76%, transparent); padding: 3px 7px; border-radius: 6px; }
        .np-card-body { padding: 16px; display: flex; flex-direction: column; gap: 9px; flex: 1; }
        .np-card-region { font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--a, var(--cy)); }
        .np-card-title { font: 600 1.14rem/1.25 var(--font-display); letter-spacing: -.015em; color: var(--txt); margin: 0; }
        .np-card-desc { font-size: 13px; line-height: 1.62; color: var(--mut); margin: 0; }
        .np-card-note { font-size: 11.8px; line-height: 1.55; color: var(--dim); margin: 0;
          border-left: 2px solid color-mix(in srgb, var(--gold) 45%, transparent); padding-left: 10px; }
        .np-card-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .np-card-tags .tag { font-size: 9.3px; }
        .np-card-foot { margin-top: auto; padding-top: 12px; display: flex; align-items: center;
          justify-content: space-between; gap: 10px; flex-wrap: wrap; border-top: 1px solid var(--line); }
        .np-card-best { font-size: 9.5px; letter-spacing: .12em; color: var(--dim); }
        .np-card-acts { display: flex; gap: 7px; }
        .np-empty { padding: 26px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
        .np-more { display: flex; justify-content: center; margin-top: 28px; }
        @media (prefers-reduced-motion: reduce) { .np-card-media img { transition: none; } }
        @media (max-width: 620px) { .np-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
