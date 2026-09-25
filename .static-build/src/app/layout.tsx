import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ConsentBanner } from '@/components/layout/ConsentBanner';
import { AssistantDock } from '@/components/ai/AssistantDock';
import { SearchOverlay } from '@/components/layout/SearchOverlay';
import { getDB, navItems, divisions } from '@/lib/content';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'], weight: ['500', '600', '700'],
  variable: '--font-space-grotesk', display: 'swap',
});
const inter = Inter({
  subsets: ['latin'], variable: '--font-inter', display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'], weight: ['400', '700'], variable: '--font-jetbrains-mono', display: 'swap',
});
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'], weight: ['400', '500', '600', '700'],
  variable: '--font-ne', display: 'swap',
});

const db = getDB();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acttolog.com.np';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: db.seo.pages['/'].title,
    template: '%s | ACTTOLOG',
  },
  description: db.seo.pages['/'].desc,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'ACTTOLOG',
    title: db.seo.pages['/'].title,
    description: db.seo.pages['/'].desc,
    url: siteUrl,
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: '/brand/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/brand/icon-dark.svg',
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#05060c',
};

/** Pre-paint theme restoration — no flash of wrong theme. */
const themeScript = `(function(){try{var t=localStorage.getItem('act_theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',t==='dark'?'#05060c':'#f4f7fc');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrains.variable} ${notoDevanagari.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Providers usdToNpr={db.settings.usdToNpr} gaId={process.env.NEXT_PUBLIC_GA_ID}>
          <Header nav={navItems()} divisions={divisions()} brand={db.settings.brand} />
          <main id="main">{children}</main>
          <Footer />
          <ConsentBanner />
          <AssistantDock />
          <SearchOverlay />
        </Providers>
        <JsonLd />
      </body>
    </html>
  );
}

/** Organization + WebSite structured data (spec §84). */
function JsonLd() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: db.seo.siteName,
        url: `${siteUrl}/`,
        description: db.settings.purpose.en,
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: db.settings.phone,
          email: db.settings.email,
          contactType: 'customer service',
          availableLanguage: ['en', 'ne'],
        },
      },
      {
        '@type': 'WebSite',
        name: db.seo.siteName,
        url: `${siteUrl}/`,
        inLanguage: ['en', 'ne'],
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
  );
}
