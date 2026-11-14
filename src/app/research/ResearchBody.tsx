'use client';

import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { FaqAccordion, CurrencyPrice } from '@/components/ui/Interactive';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import type { Bi, ResearchPackage } from '@/lib/content/types';

/** Packages (Silver/Gold/Diamond — fully CMS-editable, currency-aware) + FAQ. */
export function ResearchBody({ packages, faq }: { packages: ResearchPackage[]; faq: { q: Bi; a: Bi }[] }) {
  const { L, t, locale } = useI18n();

  return (
    <>
      <section className="sec" id="packages">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum mb-3">PACKAGES</div>
                <h2 className="h2 max-w-[26ch]">
                  {locale === 'ne' ? 'स्पष्ट कार्यक्षेत्र, इमानदार मूल्य' : 'Clear scope, honest pricing'}
                </h2>
                <p className="lead mt-4">
                  {locale === 'ne'
                    ? 'प्रत्येक प्याकेज लिखित कार्यक्षेत्रसहित सुरु हुन्छ। मूल्य CMS मार्फत सम्पादनयोग्य छन् — कुनै लुकेको शुल्क छैन।'
                    : 'Every package starts with a written scope. Prices are CMS-editable — no hidden fees, no absolute guarantees.'}
                </p>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            {packages.map((p, i) => (
              <Reveal key={p.id} delay={i * 70}>
                <div
                  className="card relative flex h-full flex-col p-7"
                  style={
                    i === 1 ? { borderColor: 'color-mix(in srgb,var(--cy) 40%,transparent)' } : undefined
                  }
                >
                  {i === 1 && <span className="badge b-info absolute top-5 right-5">{t('featured')}</span>}
                  <div className="mono dim mb-2 text-[10px] tracking-[.24em]">
                    THESYN {p.name.toUpperCase()}
                  </div>
                  <h3
                    className="font-display mb-1 text-[22px] font-bold tracking-[-.02em]"
                    style={{ color: p.accent || 'var(--txt)' }}
                  >
                    {p.name}
                  </h3>
                  <p className="mut mb-5 text-[12.8px]">{L(p.tagline)}</p>
                  <div className="font-display mb-1 text-[30px] font-bold tracking-[-.03em]">
                    <CurrencyPrice npr={p.npr} usd={p.usd} />
                  </div>
                  <div className="dim mono mb-6 text-[10px] tracking-[.14em]">
                    {L(p.interval).toUpperCase()}
                  </div>
                  <p className="mut mb-6 text-[13px] leading-relaxed">{L(p.desc)}</p>
                  <ul className="mb-8 flex-1 space-y-2.5">
                    {(p.features || []).map((f, j) => (
                      <li key={j} className="mut flex items-start gap-2.5 text-[12.9px]">
                        <span style={{ color: 'var(--ok)', flex: 'none', marginTop: 2 }}>
                          <Icon name="check" size={13} />
                        </span>
                        {L(f)}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className="btn btn-p w-full"
                    onClick={() =>
                      track('offer_interaction', { offer: p.name.toLowerCase(), where: 'research_packages' })
                    }
                  >
                    {p.mode === 'inquiry' ? t('inq') : t('both')} <Icon name="arrow" size={15} />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="dim mt-6 max-w-[80ch] text-[12.2px] leading-relaxed">
            {locale === 'ne'
              ? 'मूल्य परियोजनाको दायराअनुसार फरक हुन सक्छ — काम सुरु हुनुअघि लिखित कार्यक्षेत्र पठाइन्छ। कुनै विश्वविद्यालयसँगको सम्बन्धन दाबी गरिँदैन।'
              : 'Final pricing depends on project scope — a written scope is provided before any work begins. No university affiliation is claimed or implied.'}
          </p>
        </div>
      </section>

      <section className="sec pt-2">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <div className="secnum mb-3">FAQ</div>
                <h2 className="h2 max-w-[26ch]">
                  {locale === 'ne' ? 'बारम्बार सोधिने प्रश्नहरू' : 'Frequently asked questions'}
                </h2>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <div className="max-w-[820px]">
              <FaqAccordion items={faq} />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
