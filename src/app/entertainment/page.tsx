import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { EntertainmentGrid } from './EntertainmentGrid';
import { EntertainmentChannels } from '@/components/content/Extensions';
import { getDB, pub, seoFor } from '@/lib/content';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/entertainment').title,
  description: seoFor('/entertainment').desc,
  alternates: { canonical: '/entertainment' },
};

export default function EntertainmentPage() {
  const items = pub(db.entertainment).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const cats = db.entCats || [];
  const d = db.divisions.find((x) => x.id === 'entertainment');

  return (
    <>
      <PageHead kicker={`ACTTOLOG DIVISION · ENTERTAINMENT`} title={d ? d.name.en : 'Entertainment'}
        body={d ? d.desc.en : ''} art="stage" />
      <section className="sec pt-2">
        <div className="wrap">
          <EntertainmentGrid items={items} cats={cats} />
          <EntertainmentChannels />
          <Reveal>
            <div className="panel p-6 sm:p-8 mt-12 flex flex-wrap items-center gap-6 justify-between">
              <div>
                <div className="eyebrow mb-2">STUDIO</div>
                <p className="mut text-[13.4px] leading-relaxed max-w-[70ch]">
                  Entertainment items marked <span className="badge b-vi mx-1"><Icon name="lock" size={10} />Members</span>{' '}
                  show a preview to everyone; the full media opens after you continue with Google.
                </p>
              </div>
              <Link href="/offers/entertainment-studio" className="btn btn-g">Studio Pass <Icon name="arrow" size={15} /></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

