'use client';

import { MembersGate } from '@/components/ui/Interactive';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/lib/i18n';
import type { AcademyCourse, Bi } from '@/lib/content/types';

const titleOf = (t: Bi | string, L: (v: Bi | string) => string) => (typeof t === 'string' ? t : L(t));

/** Course curriculum — visible to members; guests see structure + gate (spec §30). */
export function CourseBody({ course }: { course: AcademyCourse }) {
  const { L, locale } = useI18n();
  const mods = course.modules || [];

  const curriculum = (
    <div className="space-y-3">
      {mods.map((m, i) => (
        <Reveal key={i} delay={i * 40}>
          <div className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="mono text-[10px] tracking-[.2em] dim">MODULE {String(i + 1).padStart(2, '0')}</span>
              <span className="hr flex-1" />
            </div>
            <h2 className="font-display font-semibold text-[15.8px] mb-3">{titleOf(m.title, L)}</h2>
            <ol className="space-y-2">
              {(m.lessons || []).map((l, j) => (
                <li key={j} className="flex items-center gap-3 text-[13.2px] mut rounded-lg px-3 py-2"
                  style={{ background: 'var(--panel2)' }}>
                  <span className="mono text-[10px] dim w-6">{String(j + 1).padStart(2, '0')}</span>
                  <Icon name="play" size={13} />
                  {titleOf(l, L)}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      ))}
    </div>
  );

  return (
    <div>
      <div className="eyebrow mb-5">{locale === 'ne' ? 'पाठ्यक्रम संरचना' : 'CURRICULUM'}</div>
      {course.access === 'members' ? (
        <MembersGate returnTo={`/academy/${course.slug}`}
          reason={locale === 'ne' ? 'सदस्य-विशेष पाठ्यक्रम' : 'Members-only course'}>
          {curriculum}
        </MembersGate>
      ) : curriculum}
    </div>
  );
}
