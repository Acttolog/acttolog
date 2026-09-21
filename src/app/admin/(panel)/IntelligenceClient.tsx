'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface Agg {
  configured: boolean;
  period: string;
  pv: number; users: number; sessions: number; eng: number;
  byDiv: Record<string, number>;
  byDay: [string, number][];
  byType: Record<string, number>;
  prev: { pv: number; users: number; sessions: number };
  live: { online: number; by: Record<string, number> };
}

const PERIODS = [['live', 'Live'], ['today', 'Today'], ['7', '7 Days'], ['28', '28 Days'], ['90', '90 Days']];

export function IntelligenceClient({ variant }: { variant: 'analytics' | 'intelligence' }) {
  const [period, setPeriod] = useState('28');
  const [data, setData] = useState<Agg | null>(null);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      setData(await res.json());
    } catch { setData(null); }
  }, [period]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (variant !== 'intelligence') return;
    const id = setInterval(load, 30000); // live refresh
    return () => clearInterval(id);
  }, [load, variant]);

  const ask = () => {
    if (!data || !q.trim()) return;
    const lines: string[] = [];
    const qq = q.toLowerCase();
    lines.push(`MEASURED FACT. ${data.period}: ${data.pv} page views, ${data.users} users, ${data.sessions} sessions, ${data.eng}% engaged.`);
    if (/divis|compare/.test(qq)) Object.entries(data.byDiv).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([k, v]) => lines.push(`MEASURED FACT. ${k}: ${v} page views.`));
    if (/change|previous|last/.test(qq)) lines.push(`MEASURED FACT. Page views ${data.pv >= data.prev.pv ? '+' : ''}${data.prev.pv ? Math.round(((data.pv - data.prev.pv) / data.prev.pv) * 1000) / 10 : 0}% versus the previous period.`);
    if (/source/.test(qq)) lines.push('MEASURED FACT. Acquisition sources appear once measured events accumulate.');
    lines.push('AUTOMATED INTERPRETATION. These are arithmetic comparisons of measured counts. No causal explanation or success claim is inferred from traffic data alone.');
    setAnswer(lines);
  };

  if (!data) return <div className="panel p-10 text-center dim mono text-[11px] tracking-[.2em]">LOADING…</div>;

  if (!data.configured) {
    return (
      <div className="panel p-10 text-center">
        <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'color-mix(in srgb,var(--warn) 12%,transparent)', color: 'var(--warn)' }}>
          <Icon name="chart" size={22} />
        </span>
        <h3 className="h3 mb-2">No measured data yet</h3>
        <p className="mut text-[13.2px] max-w-[62ch] mx-auto leading-relaxed">
          Acttolog never shows sample numbers as real traffic. Analytics storage activates when PostgreSQL is
          connected; events are recorded only after visitors grant analytics consent. GA4 (when configured)
          loads under the same consent gate.
        </p>
      </div>
    );
  }

  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : a ? 100 : 0);
  const maxDay = Math.max(1, ...data.byDay.map(([, v]) => v));

  return (
    <div>
      <div className="panel p-5 mb-5">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(([k, label]) => (
              <button key={k} className={`chip${period === k ? ' on' : ''}`} onClick={() => setPeriod(k)}>{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {variant === 'intelligence' && (
              <a className="btn btn-g btn-sm" href={`/api/admin/analytics?period=${period}&format=csv`}>
                <Icon name="down" size={14} />Export CSV
              </a>
            )}
            <span className="dim mono text-[10.4px]">displayed in Asia/Kathmandu</span>
          </div>
        </div>
      </div>

      {variant === 'intelligence' && (
        <div className="panel p-6 mb-5">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="dot" />
            <div className="mono text-[9.7px] tracking-[.2em] dim">LIVE NOW · NEPAL TIME · AGGREGATED ONLY</div>
          </div>
          <div className="font-display font-bold text-[36px] leading-none tracking-[-.03em] mb-1">{data.live.online}</div>
          <div className="mut text-[12.8px] mb-5">visitors online (identity never exposed)</div>
          <div className="space-y-2">
            {Object.entries(data.live.by).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(84px,150px)_1fr_auto] gap-3 items-center">
                <div className="text-[12.5px] truncate">{k}</div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                  <i className="block h-full rounded-full" style={{ width: `${Math.min(100, (v / Math.max(1, data.live.online)) * 100)}%`, background: 'var(--grad)' }} />
                </div>
                <span className="mono text-[11.6px] dim">{v}</span>
              </div>
            ))}
            {!Object.keys(data.live.by).length && <p className="mut text-[12.6px]">Nobody online in the last 30 minutes.</p>}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {([['Page views', data.pv, data.prev.pv], ['Users', data.users, data.prev.users], ['Sessions', data.sessions, data.prev.sessions], ['Engaged %', data.eng, 0]] as [string, number, number][]).map(([label, v, prev]) => (
          <div key={label} className="panel p-5">
            <div className="mono text-[9.6px] tracking-[.18em] dim mb-2">{label.toUpperCase()}</div>
            <div className="font-display font-bold text-[28px] tracking-[-.03em]">{v.toLocaleString('en-US')}</div>
            {prev > 0 && (
              <span className={`badge mt-2 ${pct(v, prev) >= 0 ? 'b-ok' : 'b-err'}`}>{pct(v, prev) > 0 ? '+' : ''}{pct(v, prev)}%</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5 mb-5">
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">TRAFFIC TREND · PAGE VIEWS</div>
          <div className="flex items-end gap-[3px] h-[140px]">
            {data.byDay.map(([d, v]) => (
              <div key={d} className="flex-1 rounded-t" title={`${d}: ${v}`}
                style={{ height: `${Math.max(2, (v / maxDay) * 100)}%`, background: 'var(--grad)', opacity: 0.75 }} />
            ))}
            {!data.byDay.length && <p className="mut text-[12.6px]">No events in this period.</p>}
          </div>
        </div>
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">DIVISION PERFORMANCE</div>
          <div className="space-y-2">
            {Object.entries(data.byDiv).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(84px,150px)_1fr_auto] gap-3 items-center">
                <div className="text-[12.5px] truncate">{k}</div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                  <i className="block h-full rounded-full" style={{ width: `${(v / Math.max(1, data.pv)) * 100}%`, background: 'var(--grad)' }} />
                </div>
                <span className="mono text-[11.6px] dim">{v}</span>
              </div>
            ))}
            {!Object.keys(data.byDiv).length && <p className="mut text-[12.6px]">No measured views yet.</p>}
          </div>
        </div>
      </div>

      {variant === 'intelligence' && (
        <div className="panel p-6 mb-5">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">ASK YOUR DATA</div>
          <div className="flex gap-2.5 mb-4">
            <input className="inp flex-1" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="Show me traffic over 28 days · Compare divisions · What changed from last period?" />
            <button className="btn btn-p" onClick={ask} disabled={!q.trim()}><Icon name="arrow" size={15} /></button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Compare divisions', 'What changed from last period?', 'Which sections get most views?'].map((s) => (
              <button key={s} className="chip !text-[11px]" onClick={() => { setQ(s); }}>{s}</button>
            ))}
          </div>
          {answer && (
            <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
              {answer.map((l, i) => (
                <p key={i} className="text-[13px] leading-relaxed mut">
                  <span className={`badge mr-2 ${l.startsWith('MEASURED') ? 'b-info' : 'b-vi'}`}>{l.split('.')[0]}</span>
                  {l.slice(l.indexOf('.') + 2)}
                </p>
              ))}
            </div>
          )}
          <p className="dim text-[11.4px] mt-4">Deterministic arithmetic over measured events — nothing is invented. Connect OpenAI for natural-language summaries of the same measured data.</p>
        </div>
      )}

      <div className="panel p-6">
        <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">EVENT BREAKDOWN</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.byType).map(([k, v]) => <span key={k} className="chip">{k}: {v}</span>)}
          {!Object.keys(data.byType).length && <span className="mut text-[12.6px]">No events recorded in this period.</span>}
        </div>
      </div>
    </div>
  );
}
