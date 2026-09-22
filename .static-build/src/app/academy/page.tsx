import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AcademyClient } from './AcademyClient';
import { getDB, pub, seoFor } from '@/lib/content';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/academy').title,
  description: seoFor('/academy').desc,
  alternates: { canonical: '/academy' },
};

export default function AcademyPage() {
  const d = db.divisions.find((x) => x.id === 'academy');
  const courses = pub(db.academy.courses, true).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const guestCourses = pub(db.academy.courses, false);

  return (
    <>
      <PageHead kicker="ACTTOLOG DIVISION · ACADEMY" title={d?.name.en || 'Academy'}
        body={d?.desc.en} art="academy" />
      <section className="sec pt-2">
        <div className="wrap">
          {/* Public introduction (guests always see this) */}
          <Reveal>
            <div className="panel p-6 sm:p-8 mb-8">
              <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-8 items-center">
                <div>
                  <div className="eyebrow mb-3">LEARNING & KNOWLEDGE</div>
                  <p className="mut text-[13.8px] leading-relaxed">{db.academy.intro.en}</p>
                  <p className="dim text-[12.8px] leading-relaxed mt-3">{db.academy.intro.ne}</p>
                  <div className="flex flex-wrap gap-2 mt-5 mono text-[10px] tracking-[.16em] dim">
                    <span className="chip">COURSES → MODULES → LESSONS → RESOURCES</span>
                  </div>
                </div>
                <div className="rounded-xl border p-5" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
                  <div className="mono text-[9.7px] tracking-[.2em] dim mb-3">PUBLIC NOTE</div>
                  <p className="mut text-[12.9px] leading-relaxed">{db.academy.publicNote.en}</p>
                </div>
              </div>
            </div>
          </Reveal>

          <AcademyClient courses={courses} guestVisible={guestCourses.length} />

          <Reveal>
            <div className="grid sm:grid-cols-3 gap-4 mt-10">
              {[
                ['Private progress', 'Course progress is yours alone — no public leaderboards, no exposure of what you study.', 'lock'],
                ['Structured paths', 'Every course: modules, lessons and downloadable resources, ordered for practice.', 'layers'],
                ['Research-rooted', 'Curriculum is built from real research practice — methods, analysis, writing.', 'sigma'],
              ].map(([title, body, icon]) => (
                <div key={title} className="card p-6">
                  <span className="w-10 h-10 rounded-xl grid place-items-center mb-4"
                    style={{ background: 'color-mix(in srgb,var(--vi) 13%,transparent)', color: 'var(--vi)', border: '1px solid color-mix(in srgb,var(--vi) 30%,transparent)' }}>
                    <Icon name={icon} size={18} />
                  </span>
                  <h3 className="font-display font-semibold text-[14.8px] mb-2">{title}</h3>
                  <p className="mut text-[12.7px] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="flex flex-wrap gap-3 items-center justify-between panel p-6 mt-10">
              <p className="mut text-[13.4px]">
                Looking for a structured starting point?{' '}
                <Link href="/offers/academy-access" className="font-semibold" style={{ color: 'var(--cy)' }}>Academy Access offer →</Link>
              </p>
              <Link href="/research" className="btn btn-g btn-sm">Thesyn Research <Icon name="arrow" size={14} /></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
