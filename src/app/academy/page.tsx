import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AcademyClient } from './AcademyClient';
import { AcademyExtraSections } from '@/components/content/Extensions';
import { getDB, pub, seoFor } from '@/lib/content';
import { WorldPortal } from '@/components/world/WorldPortal';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/academy').title,
  description: seoFor('/academy').desc,
  alternates: { canonical: '/academy' },
};

export default function AcademyPage() {
  const d = db.divisions.find((x) => x.id === 'academy');
  const courses = pub(db.academy.courses, true)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const guestCourses = pub(db.academy.courses, false);

  return (
    <>
      <PageHead
        kicker="ACTTOLOG DIVISION · ACADEMY"
        title={d?.name.en || 'Academy'}
        body={d?.desc.en}
        art="academy"
      />
      <WorldPortal
        world="academy"
        title="Academy World"
        titleNe="एकेडेमी वर्ल्ड"
        subtitle="Digital classrooms and learning portals in 360° — hotspots lead into the Digital Library and back to the ACTTOLOG world hub."
        accent="var(--vi)"
        earthLink="/explore?mode=earth&lat=42.36100&lng=-71.05800"
      />

      <section className="sec pt-2">
        <div className="wrap">
          {/* Public introduction (guests always see this) */}
          <Reveal>
            <div className="panel mb-8 p-6 sm:p-8">
              <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_.8fr]">
                <div>
                  <div className="eyebrow mb-3">LEARNING & KNOWLEDGE</div>
                  <p className="mut text-[13.8px] leading-relaxed">{db.academy.intro.en}</p>
                  <p className="dim mt-3 text-[12.8px] leading-relaxed">{db.academy.intro.ne}</p>
                  <div className="mono dim mt-5 flex flex-wrap gap-2 text-[10px] tracking-[.16em]">
                    <span className="chip">COURSES → MODULES → LESSONS → RESOURCES</span>
                  </div>
                </div>
                <div
                  className="rounded-xl border p-5"
                  style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
                >
                  <div className="mono dim mb-3 text-[9.7px] tracking-[.2em]">PUBLIC NOTE</div>
                  <p className="mut text-[12.9px] leading-relaxed">{db.academy.publicNote.en}</p>
                </div>
              </div>
            </div>
          </Reveal>

          <AcademyClient courses={courses} guestVisible={guestCourses.length} />
          <AcademyExtraSections />

          <Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                [
                  'Private progress',
                  'Course progress is yours alone — no public leaderboards, no exposure of what you study.',
                  'lock',
                ],
                [
                  'Structured paths',
                  'Every course: modules, lessons and downloadable resources, ordered for practice.',
                  'layers',
                ],
                [
                  'Research-rooted',
                  'Curriculum is built from real research practice — methods, analysis, writing.',
                  'sigma',
                ],
              ].map(([title, body, icon]) => (
                <div key={title} className="card p-6">
                  <span
                    className="mb-4 grid h-10 w-10 place-items-center rounded-xl"
                    style={{
                      background: 'color-mix(in srgb,var(--vi) 13%,transparent)',
                      color: 'var(--vi)',
                      border: '1px solid color-mix(in srgb,var(--vi) 30%,transparent)',
                    }}
                  >
                    <Icon name={icon} size={18} />
                  </span>
                  <h3 className="font-display mb-2 text-[14.8px] font-semibold">{title}</h3>
                  <p className="mut text-[12.7px] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="panel mt-10 flex flex-wrap items-center justify-between gap-3 p-6">
              <p className="mut text-[13.4px]">
                Looking for a structured starting point?{' '}
                <Link href="/offers/academy-access" className="font-semibold" style={{ color: 'var(--cy)' }}>
                  Academy Access offer →
                </Link>
              </p>
              <Link href="/research" className="btn btn-g btn-sm">
                Thesyn Research <Icon name="arrow" size={14} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
