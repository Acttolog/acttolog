'use client';

import { useCallback, useEffect, useState } from 'react';
import { evaluateRules, DEFAULT_RULES, ALERT_LABEL, type AlertRule, type AlertMetric, type AlertOp, type TriggeredAlert } from '@/lib/intelligence/alerts';

const STORE = 'act_alert_rules';

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>(DEFAULT_RULES);
  const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);
  const [configured, setConfigured] = useState(true);
  const [label, setLabel] = useState('');
  const [metric, setMetric] = useState<AlertMetric>('page_views');
  const [op, setOp] = useState<AlertOp>('lt');
  const [threshold, setThreshold] = useState(5);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setRules(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (next: AlertRule[]) => {
    setRules(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {}
  };

  const evaluate = useCallback(async (rs: AlertRule[]) => {
    try {
      const res = await fetch('/api/admin/analytics?period=28');
      const data = await res.json();
      setConfigured(data.configured);
      const byDay: [string, number][] = data.byDay || [];
      const latest = {
        page_views: byDay.length ? byDay[byDay.length - 1][1] : null,
        sessions: data.sessions ?? null,
        engaged_rate: data.eng ?? null,
      };
      setTriggered(evaluateRules(rs, { latest, byDay }));
    } catch {
      setTriggered([]);
    }
  }, []);

  useEffect(() => {
    evaluate(rules);
  }, [rules, evaluate]);

  const add = () => {
    if (!label.trim()) return;
    save([...rules, { id: `r${Date.now()}`, label: label.trim(), metric, op, threshold }]);
    setLabel('');
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-[22px] font-bold tracking-[-.02em]">Alerts</h2>
        <p className="mut mt-1 max-w-[92ch] text-[13px] leading-relaxed">
          Threshold and statistical-anomaly rules evaluated against measured data. Rules are stored in this browser
          only (local). Server-side scheduled alerting needs a cron runner and a notification provider and is not
          active — nothing is sent automatically.
        </p>
      </div>

      <div className="panel mb-5 p-6">
        <div className="mono dim mb-4 text-[10.5px] tracking-[.2em]">TRIGGERED NOW · {triggered.length}</div>
        {!configured ? (
          <p className="mut text-[12.8px]">Alert evaluation activates when PostgreSQL is connected.</p>
        ) : triggered.length === 0 ? (
          <p className="mut text-[12.8px]">No rules triggered on the current measured data.</p>
        ) : (
          <div className="space-y-2">
            {triggered.map((t) => (
              <div key={t.rule.id} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="badge b-err">triggered</span>
                  <span className="text-[13px] font-semibold">{t.rule.label}</span>
                </div>
                <p className="mut text-[12px] leading-relaxed">{t.detail}</p>
              </div>
            ))}
          </div>
        )}
        <p className="dim mt-3 text-[10.5px]">{ALERT_LABEL}</p>
      </div>

      <div className="panel mb-5 p-6">
        <div className="mono dim mb-4 text-[10.5px] tracking-[.2em]">RULES · LOCAL TO THIS BROWSER</div>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--line)' }}>
              <span className="text-[13px]">{r.label}</span>
              <span className="mono dim text-[11px]">
                {r.metric} {r.op} {r.threshold}
              </span>
              <button className="btn btn-g btn-sm" onClick={() => save(rules.filter((x) => x.id !== r.id))}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className="inp lg:col-span-2" placeholder="Rule label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <select className="inp" value={metric} onChange={(e) => setMetric(e.target.value as AlertMetric)}>
            <option value="page_views">Daily page views</option>
            <option value="sessions">Sessions</option>
            <option value="engaged_rate">Engaged rate</option>
          </select>
          <select className="inp" value={op} onChange={(e) => setOp(e.target.value as AlertOp)}>
            <option value="lt">below</option>
            <option value="gt">above</option>
            <option value="anomaly">anomaly</option>
          </select>
          <input className="inp" type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        </div>
        <button className="btn btn-p btn-sm mt-3" onClick={add} disabled={!label.trim()}>
          Add rule
        </button>
      </div>
    </div>
  );
}