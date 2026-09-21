import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'AI | ACTTOLOG Admin', robots: { index: false, follow: false } };

import { AHead } from '../AdminUi';
import { getDB } from '@/lib/content';
import { openaiConfigured } from '@/lib/ai';

export default function Page() {
  const ai = getDB().ai;
  const drAi = getDB().drAi;
  const configured = openaiConfigured();
  return (
    <div>
      <AHead title="AI Configuration & Usage" desc="Acttolog-first assistant. Knowledge priority: ACTTOLOG CONTENT, then EXTERNAL WEB — always labelled, never mixed. Darkroom AI discovery never silently publishes." />
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">PROVIDER</div>
          <div className="space-y-2.5 text-[13px]">
            <div className="flex justify-between"><span className="dim">Provider</span><span>{ai.provider}</span></div>
            <div className="flex justify-between"><span className="dim">Model</span><span className="mono text-[12px]">{ai.model}</span></div>
            <div className="flex justify-between"><span className="dim">Key</span>
              <span className={`badge ${configured ? 'b-ok' : 'b-mut'}`}>{configured ? 'configured' : 'not configured'}</span></div>
            <div className="flex justify-between"><span className="dim">Web mode</span><span>{ai.webMode}</span></div>
          </div>
          <p className="mut text-[12.6px] leading-relaxed mt-5">{ai.note}</p>
          <p className="dim text-[11.6px] mt-3">Without a key the assistant answers from deterministic retrieval over published Acttolog content and states this openly — it never invents external results.</p>
        </div>
        <div className="panel p-6">
          <div className="mono text-[9.7px] tracking-[.2em] dim mb-4">DARKROOM AI DISCOVERY RULES</div>
          <div className="space-y-3 text-[13.2px]">
            <div className="flex justify-between items-center"><span className="mut">Show AI-found resources to the user</span>
              <span className={`badge ${drAi.showUser ? 'b-ok' : 'b-mut'}`}>{drAi.showUser ? 'on' : 'off'}</span></div>
            <div className="flex justify-between items-center"><span className="mut">Suggest AI-found resources to Admin</span>
              <span className={`badge ${drAi.suggestAdmin ? 'b-ok' : 'b-mut'}`}>{drAi.suggestAdmin ? 'on' : 'off'}</span></div>
            <div className="flex justify-between items-center"><span className="mut" style={{ color: 'var(--err)' }}>Auto-publish (never enable silently)</span>
              <span className={`badge ${drAi.autoPublish ? 'b-err' : 'b-ok'}`}>{drAi.autoPublish ? 'ON — review!' : 'off'}</span></div>
            <div className="flex justify-between items-center"><span className="mut">Trusted categories</span>
              <span className="mono text-[11.4px]">{(drAi.trusted || []).join(', ') || '—'}</span></div>
          </div>
          <p className="dim text-[11.6px] mt-5 leading-relaxed">Auto-publish operates only under explicit owner-configured rules; every commercial placement is clearly labelled when enabled.</p>
        </div>
      </div>
    </div>
  );
}
