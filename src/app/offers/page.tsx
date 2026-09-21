import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { OffersClient } from './OffersClient';
import { getDB, pub, seoFor } from '@/lib/content';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/offers').title,
  description: seoFor('/offers').desc,
  alternates: { canonical: '/offers' },
};

export default function OffersPage() {
  const offers = pub(db.offers);
  const divisions = db.divisions;

  return (
    <>
      <PageHead kicker="ACTTOLOG · OFFERS" title="Offers"
        body="Selected commercial opportunities across the Acttolog ecosystem. Transparent scope, honest pricing in NPR and USD."
        art="offers" />
      <section className="sec pt-2">
        <div className="wrap">
          <OffersClient offers={offers} divisions={divisions} />
          <Reveal>
            <div className="panel p-6 sm:p-8 mt-12">
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  ['Inquiry only', 'Send an inquiry — scope and pricing are confirmed in writing before any work begins.', 'chat'],
                  ['Online purchase', 'Payment gateways activate only after provider verification — no payment is ever reported as successful without it.', 'shield'],
                  ['Both', 'Ask first or buy directly — every offer states its mode clearly, with validity and terms shown upfront.', 'layers'],
                ].map(([t, b, icon]) => (
                  <div key={t}>
                    <span className="w-10 h-10 rounded-xl grid place-items-center mb-3"
                      style={{ background: 'color-mix(in srgb,var(--gold) 12%,transparent)', color: 'var(--gold)', border: '1px solid color-mix(in srgb,var(--gold) 28%,transparent)' }}>
                      <Icon name={icon} size={18} />
                    </span>
                    <h3 className="font-display font-semibold text-[14.6px] mb-2">{t}</h3>
                    <p className="mut text-[12.7px] leading-relaxed">{b}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-8 pt-6" style={{ borderTop: '1px solid var(--line)' }}>
                <Link href="/contact" className="btn btn-g btn-sm"><Icon name="mail" size={14} />Ask about a custom scope</Link>
                <span className="dim mono text-[10.4px] tracking-[.15em] self-center">PRICES ARE CMS-EDITABLE · NEVER HARD-CODED</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
