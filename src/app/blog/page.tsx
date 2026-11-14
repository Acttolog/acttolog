import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { SpatialFrame } from '@/components/spatial/SpatialFrame';
import { getDB, pub, seoFor } from '@/lib/content';
import { resolveImage, fdate, rt } from '@/lib/utils';
import { WorldPortal } from '@/components/world/WorldPortal';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/blog').title,
  description: seoFor('/blog').desc,
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  const posts = pub(db.posts)
    .slice()
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const cats = db.cats || [];
  const [featured, ...rest] = posts;

  return (
    <>
      <PageHead
        kicker="ACTTOLOG · BLOG"
        title="Blog"
        body="Research practice, technology craft, education design and creative systems from the Acttolog world."
        art="editorial"
      />
      <WorldPortal
        world="blog"
        title="Editorial World"
        titleNe="ब्लग वर्ल्ड"
        subtitle="A digital editorial environment in 360° — floating stories and reading paths, linked to the Digital Library."
        accent="var(--cy)"
        earthLink="/explore?mode=earth&lat=48.85600&lng=2.35200"
      />

      <section className="sec pt-2">
        <div className="wrap">
          {/* Category rail (static links keep SEO honest) */}
          <Reveal>
            <div className="mb-8 flex flex-wrap gap-2">
              <span className="chip on">All</span>
              {cats.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </div>
          </Reveal>

          {featured && (
            <Reveal>
              <Link href={`/blog/${featured.slug}`} className="card group mb-8 block">
                <div className="grid lg:grid-cols-[1.2fr_1fr]">
                  <SpatialFrame
                    className="relative h-[240px] min-h-[240px] overflow-hidden lg:h-full"
                    hud={
                      <>
                        <Icon name="layers" size={10} />
                        3D
                      </>
                    }
                  >
                    {}
                    <img
                      src={resolveImage(featured.cover, 'editorial')}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-[1.6s] group-hover:scale-105"
                    />
                  </SpatialFrame>
                  <div className="flex flex-col justify-center p-7 sm:p-9">
                    <div className="mb-4 flex gap-2">
                      <span className="badge b-info">Featured</span>
                      <AccessBadge access={featured.access} />
                    </div>
                    <div className="mono mb-3 text-[10.3px] tracking-[.2em]" style={{ color: 'var(--vi)' }}>
                      {featured.category.toUpperCase()} · {fdate(featured.publishedAt)} ·{' '}
                      {rt(featured.content.en)} MIN
                    </div>
                    <h2 className="h2 mb-4 !text-[clamp(1.4rem,2.8vw,2.1rem)]">{featured.title.en}</h2>
                    <p className="mut mb-6 text-[13.8px] leading-relaxed">{featured.excerpt.en}</p>
                    <span
                      className="inline-flex items-center gap-2 text-[13.4px] font-semibold"
                      style={{ color: 'var(--cy)' }}
                    >
                      Read more <Icon name="arrow" size={15} />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 60}>
                <Link href={`/blog/${p.slug}`} className="card group block h-full">
                  <SpatialFrame className="relative h-[168px] overflow-hidden">
                    {}
                    <img
                      src={resolveImage(p.cover, 'editorial')}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-[1.6s] group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3">
                      <AccessBadge access={p.access} />
                    </div>
                  </SpatialFrame>
                  <div className="p-5">
                    <div className="mono dim mb-2.5 text-[9.8px] tracking-[.18em]">
                      {p.category.toUpperCase()} · {fdate(p.publishedAt)}
                    </div>
                    <h3 className="h3 mb-2 !text-[16.2px]">{p.title.en}</h3>
                    <p className="mut mb-4 line-clamp-3 text-[12.8px] leading-relaxed">{p.excerpt.en}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(p.tags || []).slice(0, 3).map((tg) => (
                        <span key={tg} className="tag">
                          {tg}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          {posts.length === 0 && <div className="panel mut p-12 text-center">Nothing here yet.</div>}
        </div>
      </section>
    </>
  );
}
