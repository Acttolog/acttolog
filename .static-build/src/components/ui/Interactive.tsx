'use client';

import { useState } from 'react';
import { usePrefs } from '@/lib/prefs';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { money } from '@/lib/utils';
import { GoogleButton } from './GoogleButton';
import { Icon } from './Icon';
import type { Bi } from '@/lib/content/types';

/** Price display honouring the currency preference (spec §43). */
export function CurrencyPrice({ npr, usd, className }: { npr: number; usd: number; className?: string }) {
  const { currency, usdToNpr } = usePrefs();
  const { locale } = useI18n();
  return <span className={className}>{money({ npr, usd }, currency, usdToNpr, locale)}</span>;
}

/** FAQ accordion (research page). */
export function FaqAccordion({ items }: { items: { q: Bi; a: Bi }[] }) {
  const { L } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2.5">
      {items.map((f, i) => (
        <div key={i} className="panel overflow-hidden">
          <button className="w-full flex items-center justify-between gap-4 p-5 text-left"
            aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span className="font-display font-semibold text-[14.6px]">{L(f.q)}</span>
            <span style={{ color: 'var(--cy)', transform: open === i ? 'rotate(90deg)' : 'none', transition: '.3s', flex: 'none' }}>
              <Icon name="arrow" size={16} />
            </span>
          </button>
          {open === i && (
            <div className="px-5 pb-5">
              <p className="mut text-[13.4px] leading-relaxed">{L(f.a)}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Members gate (spec §29–31, §40): preview stays visible (blurred), full
 * content unlocks with Continue with Google. No forms, no passwords.
 */
export function MembersGate({ returnTo, reason, children }: {
  returnTo: string; reason?: Bi | string; children?: React.ReactNode;
}) {
  const { user } = useSession();
  const { t, locale, L } = useI18n();
  if (user) return <>{children}</>;
  return (
    <div className="relative">
      {children && <div className="lockblur" aria-hidden="true">{children}</div>}
      <div className="panel p-8 sm:p-10 text-center max-w-[560px] mx-auto mt-6">
        <div className="badge b-vi mb-4">{typeof reason === 'object' ? L(reason) : (reason || t('members'))}</div>
        <h3 className="h3 mb-3">{t('gate.t')}</h3>
        <p className="mut text-[13.6px] leading-relaxed max-w-[46ch] mx-auto mb-7">{t('gate.b')}</p>
        <GoogleButton returnTo={returnTo} className="mx-auto" />
        <p className="dim text-[11.4px] mt-5 leading-relaxed">
          {locale === 'ne'
            ? 'लगइन पछि तपाईं ठ्याक्कै यहीँ फर्कनुहुनेछ।'
            : 'You will return exactly here after signing in.'}
        </p>
      </div>
    </div>
  );
}
