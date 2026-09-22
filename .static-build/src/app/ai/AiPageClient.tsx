'use client';

import { useEffect, useState } from 'react';
import { AiChat } from '@/components/ai/AiChat';
import { Reveal } from '@/components/ui/Reveal';
import { useSession } from '@/lib/session';
import { getDB } from '@/lib/content';

const db = getDB();

/** Full-page AI experience (spec §56) — chat + saved conversations for members. */
export function AiPageClient() {
  const { user } = useSession();
  const [prefill, setPrefill] = useState<string | undefined>();
  const [signal, setSignal] = useState(0);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const q = (e as CustomEvent).detail as string | undefined;
      if (q) { setPrefill(q); setSignal((x) => x + 1); }
    };
    window.addEventListener('acttolog:ai-open', onOpen);
    return () => window.removeEventListener('acttolog:ai-open', onOpen);
  }, []);

  return (
    <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-6 items-start">
      <Reveal>
        <div className="panel p-0 overflow-hidden" style={{ height: 'min(64vh, 620px)' }}>
          <AiChat variant="page" prefill={prefill} openSignal={signal} />
        </div>
      </Reveal>

      <aside className="space-y-5">
        <Reveal delay={80}>
          <div className="panel p-6">
            <div className="eyebrow mb-4">MODEL</div>
            <p className="mut text-[13.1px] leading-relaxed mb-4">{db.ai.note}</p>
            <div className="mono text-[11.4px] dim space-y-1.5">
              <div>provider: {db.ai.provider}</div>
              <div>model: {db.ai.model}</div>
              <div>web mode: {db.ai.webMode}</div>
              <div>keys: {db.ai.keys ? 'configured' : 'not configured — index answers only'}</div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="panel p-6">
            <div className="eyebrow mb-4">PRIVACY</div>
            <ul className="space-y-2.5 text-[13.1px] mut">
              <li>{user ? 'Your conversations can be saved privately to your account.' : 'Guest conversations are temporary — sign in to keep them.'}</li>
              <li>Darkroom search stays globally non-personalised, always.</li>
              <li>Personalization is opt-in under My Acttolog → Settings.</li>
            </ul>
          </div>
        </Reveal>

        {user && (
          <Reveal delay={200}>
            <div className="panel p-6">
              <div className="eyebrow mb-4">SAVED CONVERSATIONS</div>
              <p className="mut text-[12.8px] leading-relaxed">
                Conversations you keep appear here — reopen, continue, rename or delete. They are private to you.
              </p>
              <p className="dim text-[11.6px] mt-3">
                Persistence activates once the database is connected.
              </p>
            </div>
          </Reveal>
        )}
      </aside>
    </div>
  );
}
