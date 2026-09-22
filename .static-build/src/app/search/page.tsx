import type { Metadata } from 'next';
import { SearchClient } from './SearchClient';

export const metadata: Metadata = {
  title: 'Search | ACTTOLOG',
  description: 'Search across divisions, blog, Darkroom, Academy, Games, Entertainment, Thesyn Research and Offers.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <section className="pt-[calc(var(--nav)+48px)] pb-16">
      <div className="wrap">
        <div className="eyebrow mb-4">ACTTOLOG SEARCH</div>
        <h1 className="h1 !text-[clamp(1.85rem,4.6vw,3rem)] max-w-[20ch] mb-7">Search Acttolog</h1>
        <SearchClient />
      </div>
    </section>
  );
}
