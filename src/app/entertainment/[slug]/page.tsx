import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { ItemBody } from './ItemBody';
import { getDB, pub } from '@/lib/content';
import { resolveImage, fdate, rt } from '@/lib/utils';

const db = getDB();

export function generateStaticParams() {
  return pub(db.entertainment).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = db.entertainment.find((e) => e.slug === slug);
  if (!item) return { title: 'Not found' };
  return {
    title: `${item.title.en} | Entertainment`,
    description: item.desc.en.slice(0, 155),
    alternates: { canonical: `/entertainment/${slug}` },
  };
}

export default async function EntertainmentItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = db.entertainment.find((e) => e.slug === slug && e.visible !== false);
  if (!item || (item.status !== 'published' && item.status !== 'scheduled')) notFound();

  const related = pub(db.entertainment).filter((e) => e.id !== item.id && e.category === item.category).slice(0, 3);

  return (
    <section className="pt-[calc(var(--nav)+48px)] pb-16">
      <div className="wrap">
        <nav className="flex items-center gap-2 text-[12.3px] dim mb-7 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--cy)]">Home</Link>
          <span>/</span>
          <Link href="/entertainment" className="hover:text-[var(--cy)]">Entertainment</Link>
          <span>/</span>
          <span style={{ color: 'var(--txt)' }}>{item.title.en}</span>
        </nav>

        <Reveal>
          <div className="panel overflow-hidden mb-8">
            <div className="relative h-[280px] sm:h-[380px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImage(item.thumb, 'stage')} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 45%,color-mix(in srgb,var(--bg) 92%,transparent))' }} />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="badge b-vi">{item.category}</span>
                <AccessBadge access={item.access} />
              </div>
            </div>
            <div className="p-6 sm:p-9">
              <div className="mono text-[10.3px] tracking-[.2em] mb-3" style={{ color: 'var(--mg)' }}>
                {item.category.toUpperCase()} · {fdate(item.date)} · {rt(item.desc.en)} MIN
              </div>
              <h1 className="h1 !text-[clamp(1.8rem,4.4vw,3rem)] mb-4">{item.title.en}</h1>
              {item.title.ne && <p className="font-display font-semibold text-[17px] mut mb-5">{item.title.ne}</p>}
              <p className="lead">{item.desc.en}</p>
              {item.desc.ne && <p className="mut text-[13.6px] leading-relaxed mt-3">{item.desc.ne}</p>}
              <div className="flex flex-wrap gap-1.5 mt-6">
                {(item.tags || []).map((tg) => <span key={tg} className="tag">{tg}</span>)}
              </div>
            </div>
          </div>
        </Reveal>

        <ItemBody item={item} />

        {related.length > 0 && (
          <div className="mt-12">
            <div className="secnum mb-4">MORE IN {item.category.toUpperCase()}</div>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((e) => (
                <Link key={e.id} href={`/entertainment/${e.slug}`} className="card p-5 block">
                  <div className="font-display font-semibold text-[14.4px] mb-1.5">{e.title.en}</div>
                  <p className="mut text-[12.4px] leading-relaxed line-clamp-2">{e.desc.en}</p>
                  <span className="inline-flex items-center gap-1.5 text-[12.4px] font-semibold mt-3" style={{ color: 'var(--mg)' }}>
                    Watch <Icon name="arrow" size={13} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
