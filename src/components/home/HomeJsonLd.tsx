import { divisions, getDB, pub, L } from '@/lib/content';
import type { Locale } from '@/lib/content/types';
import { resolveImage } from '@/lib/utils';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acttolog.com.np';

/**
 * Home-scoped structured data: the division ledger as an ItemList and the
 * featured story as an Article. Organization + WebSite live in the root layout.
 * Every value comes from the ledger — no ratings, no invented counts.
 */
export function HomeJsonLd({ locale = 'en' }: { locale?: Locale }) {
  const db = getDB();
  const base = locale === 'ne' ? `${SITE}/ne` : `${SITE}/`;
  const posts = pub(db.posts).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const post = posts.find((p) => p.featured) || posts[0];

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'ItemList',
      '@id': `${base}#divisions`,
      name: locale === 'ne' ? 'एक्टोलग नेटवर्कका शाखाहरू' : 'ACTTOLOG network divisions',
      numberOfItems: divisions().length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: divisions().map((d, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: L(d.name, locale),
        description: L(d.sub, locale),
        url: `${SITE}${d.route}`,
      })),
    },
  ];

  if (post) {
    // resolveImage falls back to an inline SVG data URI for placeholder covers;
    // that is not a crawlable image, so the property is omitted rather than faked.
    const cover = resolveImage(post.cover, 'editorial');
    graph.push({
      '@type': 'Article',
      '@id': `${SITE}/blog/${post.slug}#article`,
      headline: L(post.title, locale),
      description: L(post.excerpt, locale),
      ...(cover.startsWith('/') ? { image: `${SITE}${cover}` } : {}),
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      inLanguage: locale === 'ne' && post.content.ne ? 'ne' : 'en',
      author: { '@type': 'Organization', name: post.author },
      publisher: { '@id': `${SITE}/#organization` },
      mainEntityOfPage: `${SITE}/blog/${post.slug}`,
      isPartOf: { '@id': `${SITE}/#website` },
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }}
    />
  );
}