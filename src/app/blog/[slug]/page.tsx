import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { SaveButton } from '@/components/ui/SaveButton';
import { SpatialFrame } from '@/components/spatial/SpatialFrame';
import { PostBody } from './PostBody';
import { getDB, pub } from '@/lib/content';
import { resolveImage, fdate, rt } from '@/lib/utils';

const db = getDB();

export function generateStaticParams() {
  return pub(db.posts).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = db.posts.find((x) => x.slug === slug);
  if (!p) return { title: 'Not found' };
  return {
    title: p.seoTitle || `${p.title.en} | Blog`,
    description: p.seoDescription || p.excerpt.en.slice(0, 155),
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { type: 'article', title: p.title.en, description: p.excerpt.en },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = db.posts.find((p) => p.slug === slug && p.visible !== false);
  if (!post || (post.status !== 'published' && post.status !== 'scheduled')) notFound();

  const related = pub(db.posts)
    .filter(
      (p) =>
        p.id !== post.id &&
        (p.category === post.category || (p.tags || []).some((t) => post.tags.includes(t))),
    )
    .slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title.en,
    description: post.excerpt.en,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: 'ACTTOLOG' },
    inLanguage: post.content.ne ? ['en', 'ne'] : 'en',
  };

  return (
    <section className="pt-[calc(var(--nav)+48px)] pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="wrap">
        <nav className="dim mb-7 flex flex-wrap items-center gap-2 text-[12.3px]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--cy)]">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-[var(--cy)]">
            Blog
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--txt)' }} className="max-w-[40ch] truncate">
            {post.title.en}
          </span>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_320px]">
          <article>
            <Reveal>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="badge b-vi">{post.category}</span>
                <AccessBadge access={post.access} />
                {post.featured && <span className="badge b-info">Featured</span>}
              </div>
              <h1 className="h1 mb-4 max-w-[24ch] !text-[clamp(1.8rem,4.6vw,3.1rem)]">{post.title.en}</h1>
              {post.title.ne && (
                <p className="font-display mut mb-5 max-w-[52ch] text-[17px] font-semibold">
                  {post.title.ne}
                </p>
              )}
              <div className="mono dim mb-5 flex flex-wrap items-center gap-3 text-[10.3px] tracking-[.2em]">
                <span>{post.author.toUpperCase()}</span>
                <span>·</span>
                <span>{fdate(post.publishedAt)}</span>
                <span>·</span>
                <span>{rt(post.content.en)} MIN READ</span>
              </div>
              <div className="mb-8">
                <SaveButton kind="post" id={post.slug} title={post.title.en} route={`/blog/${post.slug}`} />
              </div>
            </Reveal>

            <Reveal>
              <SpatialFrame
                className="relative mb-8 h-[280px] overflow-hidden rounded-2xl border sm:h-[380px]"
                style={{ borderColor: 'var(--line)' }}
                hud={
                  <>
                    <Icon name="layers" size={10} />
                    3D
                  </>
                }
              >
                {}
                <img
                  src={resolveImage(post.cover, 'editorial')}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </SpatialFrame>
            </Reveal>

            <PostBody post={post} />
          </article>

          <aside className="space-y-5 lg:sticky lg:top-[calc(var(--nav)+20px)]">
            <Reveal delay={80}>
              <div className="panel p-6">
                <div className="eyebrow mb-4">IN THIS ARTICLE</div>
                <p className="mut text-[12.9px] leading-relaxed">{post.excerpt.en}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(post.tags || []).map((tg) => (
                    <span key={tg} className="tag">
                      {tg}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
            {related.length > 0 && (
              <Reveal delay={140}>
                <div className="panel p-6">
                  <div className="eyebrow mb-4">RELATED</div>
                  <div className="space-y-3">
                    {related.map((p) => (
                      <Link key={p.id} href={`/blog/${p.slug}`} className="group block">
                        <div className="font-display text-[13.4px] leading-snug font-semibold transition-colors group-hover:text-[var(--cy)]">
                          {p.title.en}
                        </div>
                        <div className="dim mono mt-1 text-[9.6px] tracking-[.14em]">
                          {p.category.toUpperCase()} · {fdate(p.publishedAt)}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
            <Reveal delay={200}>
              <div className="panel p-6">
                <div className="eyebrow mb-4">ACTTOLOG WORLD</div>
                <div className="space-y-2">
                  <Link
                    href="/darkroom"
                    className="mut flex items-center justify-between text-[13px] transition-colors hover:text-[var(--cy)]"
                  >
                    Darkroom <Icon name="arrow" size={13} />
                  </Link>
                  <Link
                    href="/research"
                    className="mut flex items-center justify-between text-[13px] transition-colors hover:text-[var(--cy)]"
                  >
                    Thesyn Research <Icon name="arrow" size={13} />
                  </Link>
                  <Link
                    href="/ai"
                    className="mut flex items-center justify-between text-[13px] transition-colors hover:text-[var(--cy)]"
                  >
                    Acttolog AI <Icon name="arrow" size={13} />
                  </Link>
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </div>
    </section>
  );
}
