export const dynamic = 'force-static';
import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acttolog.com.np';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/my', '/api/'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
