import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ExploreClient } from '@/components/world/ExploreClient';

export const metadata: Metadata = {
  title: 'Explore — ACTTOLOG Earth',
  description: 'Immersive Earth explorer: 3D Earth, street map, satellite, 360 worlds and place search — one connected experience with deep links.',
  alternates: { canonical: '/explore' },
};

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreClient />
    </Suspense>
  );
}
