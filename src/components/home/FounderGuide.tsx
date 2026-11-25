'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

const copy = {
  en: {
    kicker: 'THE GUIDE · संस्थापक', title: 'The Founder & Guide of Acttolog World',
    story: 'Acttolog was built by one person with one idea: technology, research, education, entertainment and discovery should feel like a single connected world — not scattered pages.',
    ring: 'The founder still guides visitors himself: his ring floats inside every 360° environment, from the University Visit to the Research Lab.',
    travel: 'Travel with the guide', contact: 'Contact', quote: 'One World. Endless Possibilities.',
  },
  ne: {
    kicker: 'THE GUIDE · संस्थापक', title: 'Acttolog World का संस्थापक र मार्गदर्शक',
    story: 'Acttolog एउटा व्यक्ति र एउटा विचारबाट बन्यो: प्रविधि, अनुसन्धान, शिक्षा, मनोरञ्जन र खोज एउटै जोडिएको संसार जस्तो लाग्नुपर्छ — छरिएका पृष्ठहरू जस्तो होइन।',
    ring: 'संस्थापकले आजनै आगन्तुकलाई मार्गदर्शन गर्नुहुन्छ: उहाँको रिङ University Visit देखि Research Lab सम्म प्रत्येक 360° वातावरणभित्र तैर्छ।',
    travel: 'मार्गदर्शकसँग यात्रा', contact: 'सम्पर्क', quote: 'एउटा संसार। अनन्त सम्भावना।',
  },
} as const;

export function FounderGuide({ locale }: { locale: 'en' | 'ne' }) {
  const t = copy[locale];
  return (
    <section className="founder sec" aria-labelledby="founder-title">
      <div className="wrap founder-grid">
        <div className="founder-visual">
          <div className="founder-ring" aria-hidden="true"><i /><i /><i /></div>
          <img src="/media/founder-pro.jpg" alt={locale === 'ne' ? 'Acttolog World का संस्थापक र मार्गदर्शक' : 'The founder and guide of Acttolog World'} loading="lazy" />
          <img src="/media/founder-casual.jpg" alt={locale === 'ne' ? 'Acttolog को संस्थापक स्थलमा' : 'The founder on site'} loading="lazy" />
        </div>
        <div className="founder-copy">
          <p className="eyebrow">{t.kicker}</p>
          <h2 id="founder-title" className="h2 mt-4">{t.title}</h2>
          <p className="lead mt-5">{t.story}</p>
          <p className="mut mt-4">{t.ring}</p>
          <blockquote>{t.quote}</blockquote>
          <div className="founder-actions">
            <Link className="btn btn-p" href="/explore?mode=360&world=university"><Icon name="compass" size={15} />{t.travel}</Link>
            <Link className="btn btn-g" href="/contact"><Icon name="mail" size={15} />{t.contact}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
