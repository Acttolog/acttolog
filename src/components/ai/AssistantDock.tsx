'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AiChat } from './AiChat';
import { useI18n } from '@/lib/i18n';
import { Icon } from '@/components/ui/Icon';

/** Floating AI assistant (spec §56) — FAB + dock, listens for search handoffs. */
export function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | undefined>();
  const [signal, setSignal] = useState(0);
  const pathname = usePathname();
  const { t, locale } = useI18n();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const q = (e as CustomEvent).detail as string | undefined;
      if (q) {
        setPrefill(q);
        setSignal((x) => x + 1);
      }
      setOpen(true);
    };
    window.addEventListener('acttolog:ai-open', onOpen);
    return () => window.removeEventListener('acttolog:ai-open', onOpen);
  }, []);

  const hide = pathname.startsWith('/admin');

  return (
    <>
      {!hide && (
        <button
          id="aifab"
          aria-label={t('ai.t')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={open ? { opacity: 0, pointerEvents: 'none' } : undefined}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="url(#aig)" strokeWidth="1.8">
            <defs>
              <linearGradient id="aig" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#35e0ff" />
                <stop offset="1" stopColor="#7c5cff" />
              </linearGradient>
            </defs>
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
            <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
          </svg>
        </button>
      )}
      <div id="aidock" role="dialog" aria-label={t('ai.t')} className={open && !hide ? 'open' : ''}>
        {open && !hide && (
          <>
            <div className="flex items-center gap-3 p-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
              <span
                className="grid h-9 w-9 flex-none place-items-center rounded-xl"
                style={{ background: 'var(--grad)', color: '#04060e' }}
              >
                <Icon name="spark" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display truncate text-[14.4px] font-semibold">{t('ai.t')}</div>
                <div className="dim mono truncate text-[9.5px] tracking-[.16em]">
                  {locale === 'ne' ? 'ACTTOLOG-पहिलो सहायक' : 'ACTTOLOG-FIRST ASSISTANT'}
                </div>
              </div>
              <a className="ico !h-8 !w-8" href="/ai" title="/ai" onClick={() => setOpen(false)}>
                <Icon name="arrow" size={15} />
              </a>
              <button className="ico !h-8 !w-8" aria-label={t('close')} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <AiChat variant="dock" prefill={prefill} openSignal={signal} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
