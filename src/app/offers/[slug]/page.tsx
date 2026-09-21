import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { OfferActions } from './OfferActions';
import { getDB, pub } from '@/lib/content';
import { resolveImage, fdate } from '@/lib/utils';

const db = getDB();

export function generateStaticParams() {
  return pub(db.offers).map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const o = db.offers.find((x) => x.slug === slug);
  if (!o) return { title: 'Not found' };
  return {
    title: `${o.title.en} | Offers`,
    description: o.short.en.slice(0, 155),
    alternates: { canonical: `/offers/${slug}` },
  };
}

export default async function OfferPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const offer = db.offers.find((o) => o.slug === slug && o.visible !== false);
  if (!offer || (offer.status !== 'published' && offer.status !== 'scheduled')) notFound();

  const division = db.divisions.find((d) => d.id === offer.division);
  const related = pub(db.offers).filter((o) => o.id !== offer.id && o.division === offer.division).slice(0, 3);

  return (
    <section className="pt-[calc(var(--nav)+48px)] pb-16">
      <div className="wrap">
        <nav className="flex items-center gap-2 text-[12.3px] dim mb-8 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--cy)]">Home</Link><span>/</span>
          <Link href="/offers" className="hover:text-[var(--cy)]">Offers</Link><span>/</span>
          <span style={{ color: 'var(--txt)' }}>{offer.title.en}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-6 items-start">
          <Reveal>
            <div className="panel overflow-hidden">
              <div className="relative h-[200px] sm:h-[240px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImage(offer.art ? `art:${offer.art}` : '', 'offers')} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 30%,color-mix(in srgb,var(--bg) 90%,transparent))' }} />
                <div className="absolute bottom-5 left-6 sm:left-8">
                  <span className="badge b-mut mb-2">{division ? division.name.en : offer.division}</span>
                  <h1 className="font-display font-bold text-[clamp(1.6rem,3.8vw,2.5rem)] tracking-[-.025em]" style={{ color: offer.accent || 'var(--txt)' }}>
                    {offer.title.en}
                  </h1>
                </div>
              </div>
              <div className="p-6 sm:p-9">
                <p className="lead mb-4">{offer.short.en}</p>
                <p className="mut text-[14px] leading-relaxed mb-3">{offer.desc.en}</p>
                {offer.desc.ne && <p className="dim text-[13.2px] leading-relaxed mb-8">{offer.desc.ne}</p>}

                <div className="eyebrow mb-4">WHAT IS INCLUDED</div>
                <ul className="space-y-3 mb-8">
                  {(offer.features || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-[13.6px] mut">
                      <span style={{ color: 'var(--ok)', flex: 'none', marginTop: 3 }}><Icon name="check" size={14} /></span>
                      <span>{f.en}{f.ne && <span className="dim block text-[12.4px] mt-0.5">{f.ne}</span>}</span>
                    </li>
                  ))}
                </ul>

                {(offer.terms.en || offer.terms.ne) && (
                  <div className="rounded-xl border p-5" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                    <div className="mono text-[9.7px] tracking-[.2em] dim mb-2">TERMS</div>
                    <p className="mut text-[12.8px] leading-relaxed">{offer.terms.en}</p>
                    {offer.terms.ne && <p className="dim text-[12px] leading-relaxed mt-2">{offer.terms.ne}</p>}
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          <div className="space-y-5">
            <Reveal delay={80}>
              <div className="panel p-6 sm:p-7 lg:sticky lg:top-[calc(var(--nav)+20px)]">
                <OfferActions offer={offer} />
              </div>
            </Reveal>
            {related.length > 0 && (
              <Reveal delay={140}>
                <div className="panel p-6">
                  <div className="eyebrow mb-4">MORE FROM {division ? division.name.en.toUpperCase() : 'ACTTOLOG'}</div>
                  <div className="space-y-3">
                    {related.map((o) => (
                      <Link key={o.id} href={`/offers/${o.slug}`} className="block group">
                        <div className="font-display font-semibold text-[13.6px] group-hover:text-[var(--cy)] transition-colors">{o.title.en}</div>
                        <div className="mut text-[12.2px] mt-0.5 line-clamp-1">{o.short.en}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export const dynamicParams = false;
