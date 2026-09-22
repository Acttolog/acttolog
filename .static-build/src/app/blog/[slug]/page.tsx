import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
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
    .filter((p) => p.id !== post.id && (p.category === post.category || (p.tags || []).some((t) => post.tags.includes(t))))
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
        <nav className="flex items-center gap-2 text-[12.3px] dim mb-7 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--cy)]">Home</Link><span>/</span>
          <Link href="/blog" className="hover:text-[var(--cy)]">Blog</Link><span>/</span>
          <span style={{ color: 'var(--txt)' }} className="truncate max-w-[40ch]">{post.title.en}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          <article>
            <Reveal>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge b-vi">{post.category}</span>
                <AccessBadge access={post.access} />
                {post.featured && <span className="badge b-info">Featured</span>}
              </div>
              <h1 className="h1 !text-[clamp(1.8rem,4.6vw,3.1rem)] max-w-[24ch] mb-4">{post.title.en}</h1>
              {post.title.ne && <p className="font-display font-semibold text-[17px] mut mb-5 max-w-[52ch]">{post.title.ne}</p>}
              <div className="mono text-[10.3px] tracking-[.2em] dim mb-8 flex flex-wrap items-center gap-3">
                <span>{post.author.toUpperCase()}</span><span>·</span>
                <span>{fdate(post.publishedAt)}</span><span>·</span>
                <span>{rt(post.content.en)} MIN READ</span>
              </div>
            </Reveal>

            <Reveal>
              <div className="rounded-2xl overflow-hidden mb-8 border" style={{ borderColor: 'var(--line)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImage(post.cover, 'editorial')} alt="" className="w-full h-[280px] sm:h-[380px] object-cover" />
              </div>
            </Reveal>

            <PostBody post={post} />
          </article>

          <aside className="space-y-5 lg:sticky lg:top-[calc(var(--nav)+20px)]">
            <Reveal delay={80}>
              <div className="panel p-6">
                <div className="eyebrow mb-4">IN THIS ARTICLE</div>
                <p className="mut text-[12.9px] leading-relaxed">{post.excerpt.en}</p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {(post.tags || []).map((tg) => <span key={tg} className="tag">{tg}</span>)}
                </div>
              </div>
            </Reveal>
            {related.length > 0 && (
              <Reveal delay={140}>
                <div className="panel p-6">
                  <div className="eyebrow mb-4">RELATED</div>
                  <div className="space-y-3">
                    {related.map((p) => (
                      <Link key={p.id} href={`/blog/${p.slug}`} className="block group">
                        <div className="font-display font-semibold text-[13.4px] leading-snug group-hover:text-[var(--cy)] transition-colors">{p.title.en}</div>
                        <div className="dim mono text-[9.6px] tracking-[.14em] mt-1">{p.category.toUpperCase()} · {fdate(p.publishedAt)}</div>
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
                  <Link href="/darkroom" className="flex items-center justify-between text-[13px] mut hover:text-[var(--cy)] transition-colors">
                    Darkroom <Icon name="arrow" size={13} />
                  </Link>
                  <Link href="/research" className="flex items-center justify-between text-[13px] mut hover:text-[var(--cy)] transition-colors">
                    Thesyn Research <Icon name="arrow" size={13} />
                  </Link>
                  <Link href="/ai" className="flex items-center justify-between text-[13px] mut hover:text-[var(--cy)] transition-colors">
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
