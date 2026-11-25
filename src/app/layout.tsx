import type { Metadata, Viewport } from 'next';
import { Caladea, Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import './pointer.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ConsentBanner } from '@/components/layout/ConsentBanner';
import { AssistantDock } from '@/components/ai/AssistantDock';
import { SearchOverlay } from '@/components/layout/SearchOverlay';
import { FirstVisit } from '@/components/world/FirstVisit';
import { MobileNav } from '@/components/layout/MobileNav';
import { SpatialViewer } from '@/components/spatial/SpatialViewer';
import { MagneticPointer } from '@/components/fx/MagneticPointer';
import { spatialGallery } from '@/lib/spatial';
import { getDB, navItems, divisions } from '@/lib/content';

// Caladea is the open Cambria-compatible fallback for non-Windows devices.
const caladea = Caladea({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-caladea',
  display: 'swap',
  fallback: ['Cambria', 'Georgia', 'serif'],
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ne',
  display: 'swap',
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
  alternates: {
    canonical: '/',
    languages: {
      en: '/',
      ne: '/ne',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'ACTTOLOG',
    locale: 'en_US',
    title: db.seo.pages['/'].title,
    description: db.seo.pages['/'].desc,
    url: siteUrl,
    images: [{ url: '/media/og-home.jpg', width: 1200, height: 630, alt: db.seo.pages['/'].title }],
  },
  twitter: {
    card: 'summary_large_image',
    title: db.seo.pages['/'].title,
    description: db.seo.pages['/'].desc,
    images: ['/media/og-home.jpg'],
  },
  icons: {
    icon: [{ url: '/brand/favicon.svg', type: 'image/svg+xml' }],
    apple: '/brand/icon-dark.svg',
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
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
const themeScript = `(function(){try{var t=localStorage.getItem('act_theme');var ids=['dark','light','midnight','aurora','sunset','paper','cyber','royal','ocean','rose','nebula','titanium','holo','crimson','matcha','glacier','glass','crystal','veil'];if(ids.indexOf(t)>-1){document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',(t==='light'||t==='paper'||t==='titanium'||t==='matcha'||t==='glacier'||t==='crystal')?'#f4f7fc':'#05060c');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${caladea.variable} ${inter.variable} ${jetbrains.variable} ${notoDevanagari.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <div className="scrollbeam" aria-hidden="true" />
        <Providers usdToNpr={db.settings.usdToNpr} gaId={process.env.NEXT_PUBLIC_GA_ID}>
          <Header nav={navItems()} divisions={divisions()} brand={db.settings.brand} />
          <main id="main">{children}</main>
          <Footer />
          <ConsentBanner />
          <MobileNav />
          <AssistantDock />
          <SearchOverlay />
          <SpatialViewer items={spatialGallery()} />
          <FirstVisit />
          <MagneticPointer />
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
        '@id': `${siteUrl}/#organization`,
        name: db.seo.siteName,
        alternateName: db.settings.org,
        url: `${siteUrl}/`,
        logo: `${siteUrl}/brand/logo-512.png`,
        image: `${siteUrl}/media/og-home.jpg`,
        description: db.settings.purpose.en,
        slogan: db.settings.tagline.en,
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'NP',
        },
        sameAs: ['https://acttolog.blogspot.com', ...Object.values(db.settings.social).filter(Boolean)],
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
        '@id': `${siteUrl}/#website`,
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
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />;
}
