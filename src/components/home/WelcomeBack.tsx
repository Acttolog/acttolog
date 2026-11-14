'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface RecentEntry {
  kind: string;
  id: string;
  title: string;
  at: string;
}

/**
 * WelcomeBack — the human layer of the homepage.
 *
 * This is deliberately rule-based, not "AI personalisation": it reads the
 * recently-viewed list the site already writes in PageViewTracker and says the
 * one true thing it knows. First visits get real counts and real contact facts
 * instead. Nothing is fetched, and the SSR output is the fallback, so there is
 * no hydration text mismatch.
 */
export function WelcomeBack({
  resources,
  courses,
  labelEn = true,
}: {
  resources: number;
  courses: number;
  labelEn?: boolean;
}) {
  const [recent, setRecent] = useState<RecentEntry | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('act_recent_guest') || localStorage.getItem('act_recent');
      if (!raw) return;
      const list: RecentEntry[] = JSON.parse(raw);
      const first = list.find((x) => x && x.id && x.id !== '/' && x.title);
      if (first) setRecent(first);
    } catch {
      /* private mode or malformed storage: keep the fallback */
    }
  }, []);

  return (
    <div className="hbento-note">
      <Icon name="heart" size={15} />
      {recent ? (
        <>
          <p className="hbento-note-lead">
            {labelEn ? 'Welcome back. Last time you opened' : 'फेरि स्वागत छ। पछिल्लो पटक तपाईंले खोल्नुभएको'}{' '}
            <strong>{recent.title}</strong>.
          </p>
          <Link className="hbento-note-link" href={recent.id}>
            {labelEn ? 'Continue where you left off' : 'जहाँ छोड्नुभएको थियो त्यहाँबाट जारी राख्नुहोस्'} <Icon name="arrow" size={13} />
          </Link>
        </>
      ) : (
        <>
          <p className="hbento-note-lead">
            {labelEn
              ? `${resources} verified resources, ${courses} courses, and a guide to Nepal — open to read, no sign-in required.`
              : `${resources} प्रमाणित स्रोत, ${courses} पाठ्यक्रम र नेपालको मार्गदर्शन — खाता बिना पढ्न सक्नुहुन्छ।`}
          </p>
          <Link className="hbento-note-link" href="/contact">
            {labelEn ? 'Ask a question — a person answers' : 'प्रश्न सोध्नुहोस् — मान्छेले जवाफ दिन्छ'} <Icon name="arrow" size={13} />
          </Link>
        </>
      )}
    </div>
  );
}
