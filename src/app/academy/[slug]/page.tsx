import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { SpatialFrame } from '@/components/spatial/SpatialFrame';
import { CourseBody } from './CourseBody';
import { getDB, pub } from '@/lib/content';
import { resolveImage } from '@/lib/utils';

const db = getDB();

export function generateStaticParams() {
  return db.academy.courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = db.academy.courses.find((x) => x.slug === slug);
  if (!c) return { title: 'Not found' };
  return {
    title: `${c.title.en} | Academy`,
    description: c.summary.en.slice(0, 155),
    alternates: { canonical: `/academy/${slug}` },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = db.academy.courses.find((c) => c.slug === slug);
  if (!course || !pub([course], true).length) notFound();

  const mods = course.modules || [];
  const lessonCount = mods.reduce((a, m) => a + (m.lessons || []).length, 0);

  return (
    <section className="pt-[calc(var(--nav)+48px)] pb-16">
      <div className="wrap">
        <nav className="dim mb-7 flex flex-wrap items-center gap-2 text-[12.3px]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--cy)]">
            Home
          </Link>
          <span>/</span>
          <Link href="/academy" className="hover:text-[var(--cy)]">
            Academy
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--txt)' }}>{course.title.en}</span>
        </nav>

        <Reveal>
          <div className="panel mb-8 overflow-hidden">
            <SpatialFrame
              className="relative h-[220px] sm:h-[300px]"
              hud={
                <>
                  <Icon name="layers" size={10} />
                  3D
                </>
              }
            >
              {}
              <img
                src={resolveImage(course.image, 'academy')}
                alt=""
                className="h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg,transparent 40%,color-mix(in srgb,var(--bg) 92%,transparent))',
                }}
              />
              <div className="absolute top-4 left-4">
                <AccessBadge access={course.access} />
              </div>
            </SpatialFrame>
            <div className="p-6 sm:p-9">
              <div className="mono mb-3 text-[10.5px] tracking-[.2em]" style={{ color: 'var(--vi)' }}>
                {course.level.toUpperCase()} · {mods.length} MODULES · {lessonCount} LESSONS
              </div>
              <h1 className="h1 mb-4 !text-[clamp(1.8rem,4.4vw,2.9rem)]">{course.title.en}</h1>
              {course.title.ne && (
                <p className="font-display mut mb-4 text-[16.5px] font-semibold">{course.title.ne}</p>
              )}
              <p className="lead">{course.summary.en}</p>
              {course.summary.ne && (
                <p className="mut mt-3 text-[13.4px] leading-relaxed">{course.summary.ne}</p>
              )}
            </div>
          </div>
        </Reveal>

        <CourseBody course={course} />

        <Reveal>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/academy" className="btn btn-g btn-sm">
              <Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} />
              All courses
            </Link>
            <Link href="/offers/academy-access" className="btn btn-g btn-sm">
              Academy Access offer
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
