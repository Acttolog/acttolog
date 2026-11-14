import type { Metadata } from 'next';
import { HomeView } from '@/components/home/HomeView';
import { seoFor } from '@/lib/content';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acttolog.com.np';
const OG = [{ url: '/media/og-home.jpg', width: 1200, height: 630, alt: seoFor('/').title }];

export const metadata: Metadata = {
  title: seoFor('/').title,
  description: seoFor('/').desc,
  alternates: {
    // Absolute, so the trailing slash survives and / declares /ne as its Nepali twin.
    canonical: `${SITE}/`,
    languages: { en: `${SITE}/`, ne: `${SITE}/ne`, 'x-default': `${SITE}/` },
  },
  openGraph: {
    title: seoFor('/').title,
    description: seoFor('/').desc,
    url: `${SITE}/`,
    images: OG,
  },
  twitter: { card: 'summary_large_image', images: OG },
};

export default function HomePage() {
  return <HomeView altLang={{ href: '/ne', label: 'नेपाली संस्करण', lang: 'ne' }} />;
}
