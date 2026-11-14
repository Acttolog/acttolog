'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { CurrencyPrice } from '@/components/ui/Interactive';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import { track } from '@/lib/analytics';
import type { Division, Offer } from '@/lib/content/types';

/** Offers grid — division filter + currency switch (spec §41, §43). */
export function OffersClient({ offers, divisions }: { offers: Offer[]; divisions: Division[] }) {
  const { L, t, locale } = useI18n();
  const { currency, setCurrency } = usePrefs();
  const [div, setDiv] = useState('All');

  const list = div === 'All' ? offers : offers.filter((o) => o.division === div);
  const divName = (id: string) => {
    const d = divisions.find((x) => x.id === id);
    return d ? L(d.name) : id;
  };

  return (
    <>
      <Reveal>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button className={`chip${div === 'All' ? 'on' : ''}`} onClick={() => setDiv('All')}>
              {t('all')}
            </button>
            {divisions.map((d) => (
              <button key={d.id} className={`chip${div === d.id ? 'on' : ''}`} onClick={() => setDiv(d.id)}>
                {L(d.name)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="mono dim text-[10px] tracking-[.16em]">{t('cur')}:</span>
            <button className={`chip${currency === 'NPR' ? 'on' : ''}`} onClick={() => setCurrency('NPR')}>
              NPR रु
            </button>
            <button className={`chip${currency === 'USD' ? 'on' : ''}`} onClick={() => setCurrency('USD')}>
              USD $
            </button>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((o, i) => (
          <Reveal key={o.id} delay={(i % 3) * 60}>
            <Link
              href={`/offers/${o.slug}`}
              className="card block h-full p-6"
              onClick={() => track('offer_interaction', { offer: o.slug })}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span
                  className="badge"
                  style={{
                    color: 'var(--cy)',
                    borderColor: 'color-mix(in srgb,var(--cy) 40%,transparent)',
                    background: 'color-mix(in srgb,var(--cy) 10%,transparent)',
                  }}
                >
                  {o.mode === 'inquiry' ? t('inq') : o.mode === 'purchase' ? t('buy') : t('both')}
                </span>
                {o.featured && <span className="badge b-info">{t('featured')}</span>}
              </div>
              <div className="mono dim mb-2 text-[9.6px] tracking-[.18em]">
                {divName(o.division).toUpperCase()}
              </div>
              <h3
                className="font-display mb-1 text-[21px] font-bold tracking-[-.02em]"
                style={{ color: o.accent || 'var(--txt)' }}
              >
                {L(o.title)}
              </h3>
              <p className="mut mb-5 text-[13.1px] leading-relaxed">{L(o.short)}</p>
              <div className="font-display mb-5 text-[26px] font-bold tracking-[-.03em]">
                <CurrencyPrice npr={o.npr} usd={o.usd} />
              </div>
              <span
                className="inline-flex items-center gap-2 text-[13px] font-semibold"
                style={{ color: 'var(--cy)' }}
              >
                {t('details')} <Icon name="arrow" size={15} />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      {list.length === 0 && <div className="panel mut p-12 text-center">{t('none')}</div>}

      {list.some((o) => o.mode !== 'inquiry') && (
        <p className="dim mt-6 max-w-[86ch] text-[12.2px] leading-relaxed">
          {locale === 'ne'
            ? 'अनलाइन भुक्तानी प्रदायक प्रमाणीकरण पछि मात्र सक्रिय हुन्छन् — कुनै पनि भुक्तानी प्रदायक पुष्टि बिना सफल मानिँदैन।'
            : 'Online purchase activates only after a payment provider is authorized and verified — no payment is ever reported as successful without provider verification.'}
        </p>
      )}
    </>
  );
}
