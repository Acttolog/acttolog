'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { CurrencyPrice } from '@/components/ui/Interactive';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import { track } from '@/lib/analytics';
import { fdate } from '@/lib/utils';
import type { Offer } from '@/lib/content/types';

/** Offer CTA — inquiry / purchase / both (payments activate only when a provider is verified, spec §42). */
export function OfferActions({ offer }: { offer: Offer }) {
  const { t, locale } = useI18n();
  const { currency, setCurrency, usdToNpr } = usePrefs();

  const paymentsReady = false; // set true only when a verified payment provider is configured

  return (
    <>
      <div className="font-display font-bold text-[34px] tracking-[-.03em] mb-1">
        <CurrencyPrice npr={offer.npr} usd={offer.usd} />
      </div>
      <div className="flex items-center gap-2 mb-5">
        <button className={`chip !py-1 !text-[10.6px]${currency === 'NPR' ? ' on' : ''}`} onClick={() => setCurrency('NPR')}>NPR</button>
        <button className={`chip !py-1 !text-[10.6px]${currency === 'USD' ? ' on' : ''}`} onClick={() => setCurrency('USD')}>USD</button>
        <span className="dim mono text-[9.8px] tracking-[.14em]">1 USD ≈ रु {usdToNpr}</span>
      </div>

      <div className="space-y-2.5 mb-6 text-[12.8px] mut">
        <div className="flex justify-between gap-3">
          <span className="dim">Mode</span>
          <span>{offer.mode === 'inquiry' ? t('inq') : offer.mode === 'purchase' ? t('buy') : t('both')}</span>
        </div>
        {offer.validUntil && (
          <div className="flex justify-between gap-3">
            <span className="dim">Valid until</span>
            <span>{fdate(offer.validUntil)}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {(offer.mode === 'inquiry' || offer.mode === 'both') && (
          <Link href={`/contact?offer=${offer.slug}`} className="btn btn-p w-full"
            onClick={() => track('offer_interaction', { offer: offer.slug, action: 'inquiry' })}>
            <Icon name="mail" size={15} />
            {locale === 'ne' ? 'सोधपुछ गर्नुहोस्' : 'Send inquiry'}
          </Link>
        )}
        {(offer.mode === 'purchase' || offer.mode === 'both') && (
          paymentsReady ? (
            <button className="btn btn-g w-full"
              onClick={() => track('offer_interaction', { offer: offer.slug, action: 'purchase' })}>
              <Icon name="shield" size={15} />{locale === 'ne' ? 'अनलाइन खरिद' : 'Buy online'}
            </button>
          ) : (
            <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
              <div className="mono text-[9.6px] tracking-[.18em] dim mb-1.5">ONLINE PURCHASE</div>
              <p className="mut text-[12.2px] leading-relaxed">
                {locale === 'ne'
                  ? 'भुक्तानी प्रदायक प्रमाणीकरण पछि सक्रिय हुनेछ। हाल सोधपुछ मार्फत अघि बढ्नुहोस्।'
                  : 'Activates once a payment provider is authorized and verified. Please use the inquiry path for now.'}
              </p>
            </div>
          )
        )}
      </div>

      <p className="dim text-[11.2px] mt-5 leading-relaxed">
        {locale === 'ne'
          ? 'कुनै पनि भुक्तानी प्रदायक पुष्टि बिना सफल मानिँदैन। अन्तिम मूल्य लिखित कार्यक्षेत्रमा पुष्टि हुन्छ।'
          : 'No payment is ever reported as successful without provider verification. Final scope is confirmed in writing before work begins.'}
      </p>
    </>
  );
}
