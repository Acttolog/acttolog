'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { fktm } from '@/lib/utils';

interface Msg { id: string; name: string; email: string; phone?: string | null; subject: string; division?: string | null; message: string; status: string; createdAt: string }

export function MessagesClient() {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/messages').then(async (r) => {
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error === 'not_configured' ? 'not_configured' : 'error'); return null; }
      return r.json();
    }).then((d) => { if (d) setMsgs(d.messages); }).catch(() => setError('error'));
  }, []);

  if (error === 'not_configured') {
    return (
      <div className="panel p-10 text-center">
        <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'color-mix(in srgb,var(--warn) 12%,transparent)', color: 'var(--warn)' }}>
          <Icon name="mail" size={22} />
        </span>
        <h3 className="h3 mb-2">Inbox requires the database</h3>
        <p className="mut text-[13.2px] max-w-[52ch] mx-auto leading-relaxed">
          Contact messages persist to PostgreSQL. Until DATABASE_URL is connected, the public form
          honestly reports that message storage is not configured yet (visitors can still call or email).
        </p>
      </div>
    );
  }
  if (error) return <div className="panel p-10 text-center mut">Could not load messages.</div>;
  if (!msgs) return <div className="panel p-10 text-center dim mono text-[11px] tracking-[.2em]">LOADING…</div>;
  if (!msgs.length) return <div className="panel p-10 text-center mut">No messages yet.</div>;

  return (
    <div className="space-y-3">
      {msgs.map((m) => (
        <div key={m.id} className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <div className="font-display font-semibold text-[14.4px]">{m.subject}</div>
              <div className="dim mono text-[10.4px] mt-1">{m.name} · {m.email}{m.phone ? ' · ' + m.phone : ''}{m.division ? ' · ' + m.division : ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${m.status === 'new' ? 'b-info' : 'b-mut'}`}>{m.status}</span>
              <span className="dim mono text-[10px]">{fktm(m.createdAt)}</span>
            </div>
          </div>
          <p className="mut text-[13px] leading-relaxed whitespace-pre-line">{m.message}</p>
        </div>
      ))}
    </div>
  );
}
