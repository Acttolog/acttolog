'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import { useSaved } from '@/lib/saved';
import { track } from '@/lib/analytics';
import { useToast } from '@/lib/toast';

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category?: string;
  address?: string;
  source: 'NOMINATIM' | 'ACTTOLOG';
  raw?: Record<string, unknown>;
}

const NEARBY: [string, string, string][] = [
  ['Food', 'amenity=restaurant|amenity=cafe|amenity=fast_food', 'chat'],
  ['Hotels', 'tourism=hotel|tourism=guest_house', 'home'],
  ['Education', 'amenity=school|amenity=college|amenity=university', 'book'],
  ['Hospitals', 'amenity=hospital|amenity=clinic', 'shield'],
  ['Transport', 'aeroway=aerodrome|railway=station|amenity=bus_station', 'compass'],
  ['Tourism', 'tourism=attraction|tourism=viewpoint|tourism=museum', 'star'],
  ['Finance', 'amenity=bank|amenity=atm', 'chart'],
  ['Parks', 'leisure=park|leisure=garden', 'spark'],
];

/** Place Explorer panel — renders only fields the source returned (§11/§26/§77). */
export function PlacePanel({ place, onClose, onExplore, onAskAi }: {
  place: Place;
  onClose: () => void;
  onExplore: (mode: 'map' | 'sat' | 'earth' | '360', lat: number, lon: number) => void;
  onAskAi: (q: string) => void;
}) {
  const { locale } = useI18n();
  const { toggleSave, isSaved } = useSaved();
  const toast = useToast();
  const [nearCat, setNearCat] = useState<string | null>(null);
  const [near, setNear] = useState<{ name: string; kind: string }[] | null>(null);
  const [nearErr, setNearErr] = useState('');
  const saved = isSaved('place', place.id);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${place.name} — ${place.lat.toFixed(5)}, ${place.lon.toFixed(5)} — ${window.location.href}`);
      toast(locale === 'ne' ? 'प्रतिलिपि भयो' : 'Copied to clipboard', 'ok');
    } catch { toast('Copy failed', 'err'); }
  };
  const share = async () => {
    const url = `/explore?mode=map&lat=${place.lat.toFixed(5)}&lng=${place.lon.toFixed(5)}&zoom=14&place=${encodeURIComponent(place.name)}`;
    try {
      await navigator.clipboard.writeText(new URL(url, window.location.origin).toString());
      toast(locale === 'ne' ? 'साझा लिङ्क प्रतिलिपि भयो' : 'Share link copied', 'ok');
    } catch { toast('Share failed', 'err'); }
  };

  const loadNearby = async (cat: string) => {
    setNearCat(cat); setNear(null); setNearErr('');
    track('place_open', { place: place.name, section: 'nearby', cat });
    const filter = NEARBY.find(([n]) => n === cat)?.[1] || '';
    const q = `[out:json][timeout:12];node(${place.lat - 0.02},${place.lon - 0.02},${place.lat + 0.02},${place.lon + 0.02})[${filter.replace(/\|/g, '][').replace('][', ']||[')}];out 12;`;
    // simpler robust query: union of selectors
    const selectors = filter.split('|').map((f) => `node[${f}](${(place.lat - 0.015).toFixed(4)},${(place.lon - 0.015).toFixed(4)},${(place.lat + 0.015).toFixed(4)},${(place.lon + 0.015).toFixed(4)});`).join('');
    const query = `[out:json][timeout:12];(${selectors});out tags 14;`;
    void q;
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const els = (data.elements || []).map((e: { tags?: Record<string, string> }) => ({
        name: e.tags?.name || e.tags?.brand || 'Unnamed',
        kind: Object.entries(e.tags || {}).find(([k]) => ['amenity', 'tourism', 'leisure', 'railway', 'aeroway'].includes(k))?.[1] || '',
      })).slice(0, 10);
      setNear(els);
      if (!els.length) setNearErr('none');
    } catch {
      setNearErr('error');
    }
  };

  return (
    <aside className="panel p-5 sm:p-6 w-full overflow-auto" style={{ maxHeight: '72vh' }} aria-label="Place details">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="mono text-[9.4px] tracking-[.22em] dim mb-1.5">PLACE · {place.source}</div>
          <h2 className="font-display font-bold text-[19px] tracking-[-.02em] leading-tight">{place.name}</h2>
          {place.address && <p className="mut text-[12.4px] mt-1.5 leading-relaxed">{place.address}</p>}
        </div>
        <button className="ico !w-8 !h-8 flex-none" onClick={onClose} aria-label="Close"><Icon name="trash" size={0} />✕</button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4 mono text-[11px]">
        <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
          <div className="dim text-[8.8px] tracking-[.2em] mb-0.5">LATITUDE</div>{place.lat.toFixed(4)}° {place.lat >= 0 ? 'N' : 'S'}
        </div>
        <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
          <div className="dim text-[8.8px] tracking-[.2em] mb-0.5">LONGITUDE</div>{place.lon.toFixed(4)}° {place.lon >= 0 ? 'E' : 'W'}
        </div>
        {place.category && (
          <div className="rounded-lg border px-3 py-2 col-span-2" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
            <div className="dim text-[8.8px] tracking-[.2em] mb-0.5">CATEGORY</div>{place.category}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {(['earth', 'map', 'sat', '360'] as const).map((m) => (
          <button key={m} className="chip" onClick={() => onExplore(m, place.lat, place.lon)}>
            {m.toUpperCase()}
          </button>
        ))}
        <button className={`chip${saved ? ' on' : ''}`} onClick={() => toggleSave('place', place.id, place.name, `/explore?mode=map&lat=${place.lat}&lng=${place.lon}`)}>
          <Icon name="heart" size={12} />{saved ? 'Saved' : 'Save'}
        </button>
        <button className="chip" onClick={copy}><Icon name="doc" size={12} />Copy</button>
        <button className="chip" onClick={share}><Icon name="link" size={12} />Share</button>
        <button className="chip" onClick={() => onAskAi(`What is interesting about ${place.name}?`)}>
          <Icon name="brain" size={12} />Ask AI
        </button>
      </div>

      <div className="eyebrow mb-3">EXPLORE NEARBY</div>
      <div className="flex flex-wrap gap-2 mb-4">
        {NEARBY.map(([name, , icon]) => (
          <button key={name} className={`chip !py-1 !text-[10.6px]${nearCat === name ? ' on' : ''}`} onClick={() => loadNearby(name)}>
            <Icon name={icon} size={11} />{name}
          </button>
        ))}
      </div>
      {nearCat && !near && !nearErr && (
        <div className="dim mono text-[10.6px] tracking-[.16em] mb-3">QUERYING OPENSTREETMAP OVERPASS…</div>
      )}
      {nearErr === 'error' && (
        <div className="rounded-xl border p-4 mut text-[12.6px] mb-3" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
          Nearby data is temporarily unavailable. You can still explore the ACTTOLOG digital world.
          <button className="btn btn-g btn-sm mt-3" onClick={() => loadNearby(nearCat!)}>Retry</button>
        </div>
      )}
      {nearErr === 'none' && (
        <div className="mut text-[12.6px] mb-3">No mapped {(nearCat || "").toLowerCase()} venues within ~1.5 km in OpenStreetMap.</div>
      )}
      {near && near.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {near.map((n2, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[12.4px]"
              style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
              <span className="truncate">{n2.name}</span>
              <span className="dim mono text-[9.6px] tracking-[.14em] flex-none">{(n2.kind || '').toUpperCase()}</span>
            </div>
          ))}
          <div className="dim text-[10.4px] mt-2">Data © OpenStreetMap contributors · Overpass API</div>
        </div>
      )}

      <p className="dim text-[10.8px] leading-relaxed mt-4">
        {locale === 'ne'
          ? 'जानकारी नभएका फिल्ड देखाइँदैनन् — कहिल्यै बनाइँदैन।'
          : 'Fields not returned by the connected source are omitted — never invented. Photos/hours/reviews appear only when a licensed provider supplies them.'}
      </p>
    </aside>
  );
}

/** Search command bar — Nominatim autocomplete + ACTTOLOG content categories. */
export function SearchCmd({ onPick, onContent }: {
  onPick: (p: Place) => void;
  onContent: (q: string) => void;
}) {
  const { locale } = useI18n();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Place[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 3) { setRes([]); setState('idle'); return; }
      setState('loading');
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`);
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        setRes(j.map((x: { place_id: number; name: string; lat: string; lon: string; category?: string; type?: string; display_name?: string }) => ({
          id: `osm-${x.place_id}`,
          name: x.name || x.display_name?.split(',')[0] || 'Unnamed',
          lat: Number(x.lat), lon: Number(x.lon),
          category: [x.category, x.type].filter(Boolean).join(' · '),
          address: x.display_name,
          source: 'NOMINATIM' as const,
        })));
        setState('idle');
        track('place_search', { q: q.trim() });
      } catch {
        setState('error');
      }
    }, 600);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="panel p-3.5" style={{ borderRadius: 16 }}>
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--cy)' }}><Icon name="search" size={17} /></span>
        <input className="inp !border-0 !bg-transparent !px-0 !py-1 !shadow-none" value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={locale === 'ne' ? 'संसारमा जहाँ पनि खोज्नुहोस्…' : 'Search anywhere in the world…'}
          aria-label="Search anywhere" />
        {state === 'loading' && <span className="dot" />}
      </div>
      {state === 'error' && (
        <div className="mut text-[12px] mt-3 px-1">
          Search temporarily unavailable. You can still explore ACTTOLOG&apos;s digital world.
          <button className="btn btn-g btn-sm ml-3" onClick={() => setQ((v) => v + ' ')}>Retry</button>
        </div>
      )}
      {res.length > 0 && (
        <div className="mt-3 space-y-1" style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          {res.map((p) => (
            <button key={p.id} className="w-full text-left rounded-xl px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--cy)_8%,transparent)]"
              onClick={() => { onPick(p); setRes([]); }}>
              <div className="text-[13.4px] font-medium truncate">{p.name}</div>
              <div className="dim mono text-[9.8px] tracking-[.14em] mt-0.5 truncate">
                {p.category?.toUpperCase()} · {p.lat.toFixed(3)}, {p.lon.toFixed(3)} · NOMINATIM
              </div>
            </button>
          ))}
        </div>
      )}
      {q.trim().length >= 3 && res.length === 0 && state === 'idle' && (
        <div className="mut text-[12px] mt-3 px-1">
          {locale === 'ne' ? 'ठेगाना भेटिएन। प्रयास:' : 'No place found. Try:'} Kathmandu · Pokhara · Mount Everest
          <button className="chip ml-2 !py-0.5" onClick={() => onContent(q)}>Search ACTTOLOG content</button>
        </div>
      )}
    </div>
  );
}
