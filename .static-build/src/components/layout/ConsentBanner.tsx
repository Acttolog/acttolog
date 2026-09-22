'use client';

import { useState } from 'react';
import { useConsent } from '@/lib/consent';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/lib/toast';
import { Icon } from '@/components/ui/Icon';

/** Consent banner (spec §73) — necessary always on; analytics/personalisation opt-in. */
export function ConsentBanner() {
  const { consent, save } = useConsent();
  const { t, locale } = useI18n();
  const toast = useToast();
  const [analytics, setAnalytics] = useState(false);
  const [personalization, setPersonalization] = useState(false);

  if (consent) return null;

  const write = (a: boolean, p: boolean) => {
    save(a, p);
    toast(locale === 'ne' ? 'गोपनीयता रोजाइ सुरक्षित भयो।' : 'Privacy choices saved.', 'ok');
  };

  return (
    <div id="consent">
      <div className="panel p-5 sm:p-6" role="dialog" aria-label={t('consent.t')}>
        <div className="flex items-start gap-4">
          <div className="flex-none w-10 h-10 rounded-xl grid place-items-center"
            style={{ background: 'color-mix(in srgb,var(--cy) 14%,transparent)', color: 'var(--cy)', border: '1px solid color-mix(in srgb,var(--cy) 30%,transparent)' }}>
            <Icon name="shield" size={19} />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold text-[15.4px] mb-1.5">{t('consent.t')}</div>
            <p className="mut text-[12.7px] leading-relaxed mb-4">{t('consent.b')}</p>
            <div className="space-y-2.5 mb-5">
              <div className="flex items-center gap-3 text-[13.1px]">
                <span className="sw on" style={{ pointerEvents: 'none' }} />
                <span>{t('consent.nec')}</span>
              </div>
              <div className="flex items-center gap-3 text-[13.1px]">
                <button className={`sw${analytics ? ' on' : ''}`} aria-label={t('consent.ana')}
                  aria-pressed={analytics} onClick={() => setAnalytics((v) => !v)} />
                <span>{t('consent.ana')}</span>
              </div>
              <div className="flex items-center gap-3 text-[13.1px]">
                <button className={`sw${personalization ? ' on' : ''}`} aria-label={t('consent.per')}
                  aria-pressed={personalization} onClick={() => setPersonalization((v) => !v)} />
                <span>{t('consent.per')}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button className="btn btn-p btn-sm" onClick={() => write(analytics, personalization)}>{t('consent.save')}</button>
              <button className="btn btn-g btn-sm" onClick={() => write(true, true)}>{t('consent.all')}</button>
              <button className="btn btn-g btn-sm" onClick={() => write(false, false)}>{t('consent.min')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
