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
  return pub(db.dr)
    .filter((r) => r.presentation === 'profile')
    .map((r) => ({ slug: r.slug }));
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
    db.dr.filter(
      (x) =>
        x.id !== r.id &&
        x.status === 'published' &&
        x.visible !== false &&
        (x.category === r.category || (x.subcategory && x.subcategory === r.subcategory)),
    ),
    '',
    db.drW,
    'en',
  )
    .slice(0, 4)
    .map((x) => x.r);

  return (
    <section className="pt-[calc(var(--nav)+48px)] pb-16">
      <div className="wrap">
        <nav className="dim mb-8 flex flex-wrap items-center gap-2 text-[12.3px]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--cy)]">
            Home
          </Link>
          <span>/</span>
          <Link href="/darkroom" className="hover:text-[var(--cy)]">
            Darkroom
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--txt)' }}>{r.name}</span>
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_.6fr]">
          <div>
            <Reveal>
              <div className="panel p-6 sm:p-9">
                <div className="mb-6 flex items-start gap-5">
                  <span
                    className="font-display grid h-16 w-16 flex-none place-items-center rounded-2xl text-[20px] font-bold"
                    style={{
                      background: 'color-mix(in srgb,var(--gold) 13%,transparent)',
                      border: '1px solid color-mix(in srgb,var(--gold) 30%,transparent)',
                      color: 'var(--gold)',
                    }}
                  >
                    {r.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h1 className="h1 mb-2 !text-[clamp(1.6rem,3.6vw,2.5rem)]">{r.name}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.official && (
                        <span className="badge b-info">
                          {r.type === 'Portal' ? 'Official portal' : 'Official'}
                        </span>
                      )}
                      <VerifyBadge verification={r.verification} />
                      <span className="badge b-mut">{r.pricing}</span>
                      <span className="badge b-mut">{r.region}</span>
                    </div>
                  </div>
                </div>

                <div className="mono dim mb-4 text-[10.5px] tracking-[.18em]">
                  {r.category.toUpperCase()} · {r.subcategory || '—'} · {r.type || '—'} · AUDIENCE:{' '}
                  {r.audience || 'Everyone'} · LANG: {(r.language || 'en').toUpperCase()}
                </div>

                <p className="lead mb-4">{r.short.en}</p>
                {r.short.ne && <p className="mut mb-6 text-[13.6px] leading-relaxed">{r.short.ne}</p>}

                <div className="prose mb-6 !text-[14.6px]">
                  <p>{r.full.en}</p>
                  {r.full.ne && <p className="dim">{r.full.ne}</p>}
                </div>

                <div className="mb-8 flex flex-wrap gap-1.5">
                  {(r.tags || []).map((tg) => (
                    <span key={tg} className="tag">
                      {tg}
                    </span>
                  ))}
                </div>

                <ResourceActions
                  resource={{ slug: r.slug, name: r.name, url: r.url, presentation: r.presentation }}
                />

                <p className="dim mt-6 flex items-center gap-2 text-[11.6px] leading-relaxed">
                  <Icon name="clock" size={13} /> Last reviewed {fdate(r.reviewDate)} · Automated checks never
                  replace human verification.
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
                    <Link
                      key={x.id}
                      href={x.presentation === 'profile' ? `/darkroom/${x.slug}` : x.url}
                      {...(x.presentation !== 'profile'
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all hover:-translate-y-0.5"
                      style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
                    >
                      <div className="min-w-0">
                        <div className="font-display truncate text-[13.4px] font-semibold">{x.name}</div>
                        <div className="dim mono mt-0.5 text-[10.5px] tracking-[.14em]">
                          {x.category.toUpperCase()} · {x.pricing}
                        </div>
                      </div>
                      <span style={{ color: 'var(--cy)', flex: 'none' }}>
                        <Icon name="arrow" size={14} />
                      </span>
                    </Link>
                  ))}
                  {related.length === 0 && <p className="mut text-[12.8px]">Nothing related yet.</p>}
                </div>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="panel p-6">
                <div className="eyebrow mb-4">WHY DARKROOM</div>
                <ul className="mut space-y-2.5 text-[12.8px]">
                  <li className="flex gap-2.5">
                    <span style={{ color: 'var(--ok)' }}>
                      <Icon name="check" size={13} />
                    </span>
                    Rule-based ranking — identical for every visitor
                  </li>
                  <li className="flex gap-2.5">
                    <span style={{ color: 'var(--ok)' }}>
                      <Icon name="check" size={13} />
                    </span>
                    No popularity numbers, ever
                  </li>
                  <li className="flex gap-2.5">
                    <span style={{ color: 'var(--ok)' }}>
                      <Icon name="check" size={13} />
                    </span>
                    Human admin review before publication
                  </li>
                  <li className="flex gap-2.5">
                    <span style={{ color: 'var(--ok)' }}>
                      <Icon name="check" size={13} />
                    </span>
                    Official destinations linked directly
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
