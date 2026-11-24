'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { fktm } from '@/lib/utils';

interface Msg {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  division?: string | null;
  message: string;
  status: string;
  createdAt: string;
}

export function MessagesClient() {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/messages')
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setError(d.error === 'not_configured' ? 'not_configured' : 'error');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setMsgs(d.messages);
      })
      .catch(() => setError('error'));
  }, []);

  if (error === 'not_configured') {
    return (
      <div className="panel p-10 text-center">
        <span
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl"
          style={{ background: 'color-mix(in srgb,var(--warn) 12%,transparent)', color: 'var(--warn)' }}
        >
          <Icon name="mail" size={22} />
        </span>
        <h3 className="h3 mb-2">Inbox requires the database</h3>
        <p className="mut mx-auto max-w-[52ch] text-[13.2px] leading-relaxed">
          Contact messages persist to PostgreSQL. Until DATABASE_URL is connected, the public form honestly
          reports that message storage is not configured yet (visitors can still call or email).
        </p>
      </div>
    );
  }
  if (error) return <div className="panel mut p-10 text-center">Could not load messages.</div>;
  if (!msgs)
    return <div className="panel dim mono p-10 text-center text-[11px] tracking-[.2em]">LOADING…</div>;
  if (!msgs.length) return <div className="panel mut p-10 text-center">No messages yet.</div>;

  return (
    <div className="space-y-3">
      {msgs.map((m) => (
        <div key={m.id} className="panel p-5">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-display text-[14.4px] font-semibold">{m.subject}</div>
              <div className="dim mono mt-1 text-[10.5px]">
                {m.name} · {m.email}
                {m.phone ? ' · ' + m.phone : ''}
                {m.division ? ' · ' + m.division : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${m.status === 'new' ? ' b-info' : ' b-mut'}`}>{m.status}</span>
              <span className="dim mono text-[10.5px]">{fktm(m.createdAt)}</span>
            </div>
          </div>
          <p className="mut text-[13px] leading-relaxed whitespace-pre-line">{m.message}</p>
        </div>
      ))}
    </div>
  );
}
