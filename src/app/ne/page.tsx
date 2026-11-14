import type { Metadata } from 'next';
import { HomeView } from '@/components/home/HomeView';
import { seoFor } from '@/lib/content';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acttolog.com.np';
const seo = seoFor('/');
const NE_TITLE = seo.titleNe || seo.title;
const NE_DESC = seo.descNe || seo.desc;
const OG = [{ url: '/media/og-home.jpg', width: 1200, height: 630, alt: NE_TITLE }];

/**
 * Nepali homepage. Same markup as "/" so the two stay in step; the locale comes
 * from the route (see Providers) and hreflang links the pair both ways.
 */
export const metadata: Metadata = {
  title: NE_TITLE,
  description: NE_DESC,
  alternates: {
    canonical: `${SITE}/ne`,
    languages: { en: `${SITE}/`, ne: `${SITE}/ne`, 'x-default': `${SITE}/` },
  },
  openGraph: {
    locale: 'ne_NP',
    title: NE_TITLE,
    description: NE_DESC,
    url: `${SITE}/ne`,
    images: OG,
  },
  twitter: { card: 'summary_large_image', images: OG },
};

export default function NepaliHomePage() {
  return (
    <div lang="ne">
      <HomeView locale="ne" altLang={{ href: '/', label: 'English version', lang: 'en' }} />
    </div>
  );
}
