import type { Metadata } from 'next';
import { Reveal } from '@/components/ui/Reveal';
import { DarkroomClient } from './DarkroomClient';
import { DarkroomAgent } from './DarkroomAgent';
import { getDB, pub, seoFor, divisions as getDivisions } from '@/lib/content';
import { WorldPortal } from '@/components/world/WorldPortal';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/darkroom').title,
  description: seoFor('/darkroom').desc,
  alternates: { canonical: '/darkroom' },
};

export default function DarkroomPage() {
  const resources = pub(db.dr);
  const cats = db.drCats.filter((c) => c.visible !== false);
  const cols = db.drCols.filter((c) => c.status === 'published');
  const d = getDivisions().find((x) => x.id === 'darkroom');

  return (
    <>
      <section className="relative pt-[calc(var(--nav)+50px)] pb-10 overflow-hidden">
        <div className="wrap">
          <Reveal>
            <div className="eyebrow">ACTTOLOG DIVISION · DARKROOM</div>
            <h1 className="h1 mt-5 max-w-[22ch]">{d?.name.en || 'Darkroom'}</h1>
            <p className="font-display font-bold text-[clamp(1.2rem,2.6vw,1.9rem)] tracking-[-.02em] gtext mt-4">
              Find What Others Struggle to Find.
            </p>
            <p className="lead mt-5">{d?.desc.en}</p>
            <p className="mut text-[13.2px] leading-relaxed mt-3 max-w-[72ch]">{d?.desc.ne}</p>
          </Reveal>
        </div>
      </section>

      <WorldPortal world="darkroom" title="Darkroom World" titleNe="डार्करूम वर्ल्ड"
        subtitle="The dark cinematic knowledge environment — discovery, verified resources and the AI core, connected by hotspots."
        accent="var(--gold)" earthLink="/explore?mode=earth&lat=52.52000&lng=13.40500" />

      <section className="sec pt-2">
        <div className="wrap">
          <DarkroomAgent />
          <DarkroomClient
            resources={resources}
            cats={cats}
            cols={cols}
            weights={db.drW}
            initialCat="All"
            initialQuery=""
            initialFromUrl
          />
        </div>
      </section>
    </>
  );
}
