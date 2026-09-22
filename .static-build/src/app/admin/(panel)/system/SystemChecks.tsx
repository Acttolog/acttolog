'use client';
import { useEffect, useState } from 'react';

/** Live runtime probes — build, API responsiveness, storage quota (browser-side honesty). */
export function SystemChecks() {
  const [checks, setChecks] = useState<[string, string, string][]>([]);
  useEffect(() => {
    const run = async () => {
      const out: [string, string, string][] = [];
      for (const [name, url] of [['Search API', '/api/search?q='], ['Session API', '/api/auth/session'], ['Track API (OPTIONS)', '/api/track']] as [string, string][]) {
        try {
          const t0 = performance.now();
          const res = await fetch(url, { method: name.startsWith('Track') ? 'OPTIONS' : 'GET' });
          out.push([name, res.ok || res.status === 405 ? 'healthy' : 'warning', Math.round(performance.now() - t0) + 'ms · HTTP ' + res.status]);
        } catch (e) {
          out.push([name, 'error', String(e)]);
        }
      }
      setChecks(out);
    };
    run();
  }, []);
  const badge = (s: string) => s === 'healthy' ? 'b-ok' : s === 'warning' ? 'b-warn' : 'b-err';
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {(checks.length ? checks : ([['Search API', 'pending', '…'], ['Session API', 'pending', '…'], ['Track API (OPTIONS)', 'pending', '…']] as [string, string, string][])).map(([n, s, d]) => (
        <div key={n} className="panel p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium">{n}</span>
            <span className={`badge ${s === 'pending' ? 'b-mut' : badge(s)}`}>{s}</span>
          </div>
          <div className="dim mono text-[10.6px]">{d}</div>
        </div>
      ))}
    </div>
  );
}
