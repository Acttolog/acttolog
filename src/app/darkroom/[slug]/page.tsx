import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { VerifyBadge } from '@/components/ui/Badges';
import { ResourceActions } from './ResourceActions';
import { getDB, pub } from '@/lib/content';
import { drRank } from '@/lib/darkroom';
import { fdate } from '@/lib/utils';

const db = getDB();

export function generateStaticParams() {
  return pub(db.dr).filter((r) => r.presentation === 'profile').map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = db.dr.find((x) => x.slug === slug);
  if (!r) return { title: 'Not found' };
  return {
    title: `${r.name} | Darkroom`,
    description: r.short.en.slice(0, 155),
    alternates: { canonical: `/darkroom/${slug}` },
  };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = db.dr.find((x) => x.slug === slug && x.visible !== false);
  if (!r || (r.status !== 'published' && r.status !== 'scheduled')) notFound();

  const related = drRank(
    db.dr.filter((x) => x.id !== r.id && x.status === 'published' && x.visible !== false &&
      (x.category === r.category || (x.subcategory && x.subcategory === r.subcategory))),
    '', db.drW, 'en').slice(0, 4).map((x) => x.r);

  return (
    <section className="pt-[calc(var(--nav)+48px)] pb-16">
      <div className="wrap">
        <nav className="flex items-center gap-2 text-[12.3px] dim mb-8 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--cy)]">Home</Link><span>/</span>
          <Link href="/darkroom" className="hover:text-[var(--cy)]">Darkroom</Link><span>/</span>
          <span style={{ color: 'var(--txt)' }}>{r.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.4fr_.6fr] gap-6 items-start">
          <div>
            <Reveal>
              <div className="panel p-6 sm:p-9">
                <div className="flex items-start gap-5 mb-6">
                  <span className="w-16 h-16 rounded-2xl grid place-items-center font-display font-bold text-[20px] flex-none"
                    style={{ background: 'color-mix(in srgb,var(--gold) 13%,transparent)', border: '1px solid color-mix(in srgb,var(--gold) 30%,transparent)', color: 'var(--gold)' }}>
                    {r.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h1 className="h1 !text-[clamp(1.6rem,3.6vw,2.5rem)] mb-2">{r.name}</h1>
                    <div className="flex flex-wrap gap-2 items-center">
                      {r.official && <span className="badge b-info">{r.type === 'Portal' ? 'Official portal' : 'Official'}</span>}
                      <VerifyBadge verification={r.verification} />
                      <span className="badge b-mut">{r.pricing}</span>
                      <span className="badge b-mut">{r.region}</span>
                    </div>
                  </div>
                </div>

                <div className="mono text-[9.8px] tracking-[.18em] dim mb-4">
                  {r.category.toUpperCase()} · {r.subcategory || '—'} · {r.type || '—'} · AUDIENCE: {r.audience || 'Everyone'} · LANG: {(r.language || 'en').toUpperCase()}
                </div>

                <p className="lead mb-4">{r.short.en}</p>
                {r.short.ne && <p className="mut text-[13.6px] leading-relaxed mb-6">{r.short.ne}</p>}

                <div className="prose !text-[14.6px] mb-6">
                  <p>{r.full.en}</p>
                  {r.full.ne && <p className="dim">{r.full.ne}</p>}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-8">
                  {(r.tags || []).map((tg) => <span key={tg} className="tag">{tg}</span>)}
                </div>

                <ResourceActions resource={{ slug: r.slug, name: r.name, url: r.url, presentation: r.presentation }} />

                <p className="dim text-[11.6px] mt-6 leading-relaxed flex items-center gap-2">
                  <Icon name="clock" size={13} /> Last reviewed {fdate(r.reviewDate)} · Automated checks never replace human verification.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="space-y-5">
            <Reveal delay={80}>
              <div className="panel p-6">
                <div className="eyebrow mb-4">RELATED RESOURCES</div>
                <div className="space-y-2.5">
                  {related.map((x) => (
                    <Link key={x.id}
                      href={x.presentation === 'profile' ? `/darkroom/${x.slug}` : x.url}
                      {...(x.presentation !== 'profile' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all hover:-translate-y-0.5"
                      style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                      <div className="min-w-0">
                        <div className="font-display font-semibold text-[13.4px] truncate">{x.name}</div>
                        <div className="dim mono text-[9.4px] tracking-[.14em] mt-0.5">{x.category.toUpperCase()} · {x.pricing}</div>
                      </div>
                      <span style={{ color: 'var(--cy)', flex: 'none' }}><Icon name="arrow" size={14} /></span>
                    </Link>
                  ))}
                  {related.length === 0 && <p className="mut text-[12.8px]">Nothing related yet.</p>}
                </div>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="panel p-6">
                <div className="eyebrow mb-4">WHY DARKROOM</div>
                <ul className="space-y-2.5 text-[12.8px] mut">
                  <li className="flex gap-2.5"><span style={{ color: 'var(--ok)' }}><Icon name="check" size={13} /></span>Rule-based ranking — identical for every visitor</li>
                  <li className="flex gap-2.5"><span style={{ color: 'var(--ok)' }}><Icon name="check" size={13} /></span>No popularity numbers, ever</li>
                  <li className="flex gap-2.5"><span style={{ color: 'var(--ok)' }}><Icon name="check" size={13} /></span>Human admin review before publication</li>
                  <li className="flex gap-2.5"><span style={{ color: 'var(--ok)' }}><Icon name="check" size={13} /></span>Official destinations linked directly</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
