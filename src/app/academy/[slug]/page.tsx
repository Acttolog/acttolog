import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
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
        <nav className="flex items-center gap-2 text-[12.3px] dim mb-7 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--cy)]">Home</Link><span>/</span>
          <Link href="/academy" className="hover:text-[var(--cy)]">Academy</Link><span>/</span>
          <span style={{ color: 'var(--txt)' }}>{course.title.en}</span>
        </nav>

        <Reveal>
          <div className="panel overflow-hidden mb-8">
            <div className="relative h-[220px] sm:h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImage(course.image, 'academy')} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,color-mix(in srgb,var(--bg) 92%,transparent))' }} />
              <div className="absolute top-4 left-4"><AccessBadge access={course.access} /></div>
            </div>
            <div className="p-6 sm:p-9">
              <div className="mono text-[10.3px] tracking-[.2em] mb-3" style={{ color: 'var(--vi)' }}>
                {course.level.toUpperCase()} · {mods.length} MODULES · {lessonCount} LESSONS
              </div>
              <h1 className="h1 !text-[clamp(1.8rem,4.4vw,2.9rem)] mb-4">{course.title.en}</h1>
              {course.title.ne && <p className="font-display font-semibold text-[16.5px] mut mb-4">{course.title.ne}</p>}
              <p className="lead">{course.summary.en}</p>
              {course.summary.ne && <p className="mut text-[13.4px] leading-relaxed mt-3">{course.summary.ne}</p>}
            </div>
          </div>
        </Reveal>

        <CourseBody course={course} />

        <Reveal>
          <div className="flex flex-wrap gap-3 mt-10">
            <Link href="/academy" className="btn btn-g btn-sm"><Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} />All courses</Link>
            <Link href="/offers/academy-access" className="btn btn-g btn-sm">Academy Access offer</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
