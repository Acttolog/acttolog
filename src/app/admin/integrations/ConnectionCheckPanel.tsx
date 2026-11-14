'use client';

import { useCallback, useEffect, useState } from 'react';
import { HealthBadge } from '../AdminDashClient';
import type { Health } from '@/lib/system';

interface ConfigRow {
  key: string;
  label: string;
  status: Health;
  note: string;
}

interface Probe {
  key: string;
  label: string;
  state: 'verified' | 'failed' | 'not_configured' | 'no_probe';
  detail: string;
  checkedAt: string | null;
  latencyMs: number | null;
}

const BADGE: Record<Probe['state'], [string, string]> = {
  verified: ['b-ok', 'CONNECTION VERIFIED'],
  failed: ['b-err', 'CHECK FAILED'],
  not_configured: ['b-info', 'NOT CONFIGURED'],
  no_probe: ['b-info', 'NO PROBE'],
};

export function ConnectionCheckPanel() {
  const [config, setConfig] = useState<ConfigRow[]>([]);
  const [probes, setProbes] = useState<Probe[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (method: 'GET' | 'POST') => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/connectors', { method });
      const data = await res.json();
      setConfig(data.config || []);
      setProbes(data.probes || []);
    } catch {
      setConfig([]);
      setProbes([]);
    } finally {
      setBusy(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load('GET');
  }, [load]);

  return (
    <div>
      {!loaded ? (
        <p className="mut text-[12.8px]">Reading configuration and running connection checks…</p>
      ) : config.length === 0 ? (
        <p className="mut text-[12.8px]">
          Configuration and connection status require the application server. This static preview cannot read host
          environment variables or reach external providers.
        </p>
      ) : (
        <div className="space-y-3">
          {config.map((r) => (
            <div key={r.key} className="panel p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="font-display text-[14.4px] font-semibold">{r.label}</div>
                <HealthBadge status={r.status} />
              </div>
              <p className="mut max-w-[96ch] text-[12.8px] leading-relaxed">{r.note}</p>
            </div>
          ))}
        </div>
      )}

      <div className="panel mt-5 p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="mono dim text-[9.7px] tracking-[.2em]">LIVE CONNECTION CHECKS · MEASURED, NOT ASSUMED</div>
          <button className="btn btn-p btn-sm" onClick={() => load('POST')} disabled={busy}>
            {busy ? 'Checking…' : 'Re-run connection checks'}
          </button>
        </div>
        <p className="mut mb-4 max-w-[96ch] text-[12.6px] leading-relaxed">
          Each probe below runs server-side against the real endpoint right now. A connector is only labelled
          &quot;connection verified&quot; after its probe succeeds; configuration presence alone never counts as connected.
          Connectors without a server-side probe are listed above as configuration status only.
        </p>
        {!loaded ? (
          <p className="mut text-[12.8px]">Running connection checks…</p>
        ) : probes.length === 0 ? (
          <p className="mut text-[12.8px]">No connection probes available in this session.</p>
        ) : (
          <div className="space-y-3">
            {probes.map((p) => {
              const [cls, label] = BADGE[p.state];
              return (
                <div key={p.key} className="panel p-4">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="font-display text-[13.4px] font-semibold">{p.label}</div>
                    <span className={`badge ${cls}`}>{label}</span>
                  </div>
                  <p className="mut text-[12.4px] leading-relaxed">{p.detail}</p>
                  <p className="mono dim mt-1 text-[10px]">
                    {p.checkedAt ? `checked ${p.checkedAt}` : 'not checked'}
                    {p.latencyMs !== null ? ` · ${p.latencyMs} ms` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}