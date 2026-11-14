'use client';

import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { SpatialFrame } from '@/components/spatial/SpatialFrame';
import { useSession } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { resolveImage } from '@/lib/utils';
import type { AcademyCourse } from '@/lib/content/types';

/** Course library — signed-in members see everything; guests see the gate (spec §30). */
export function AcademyClient({ courses, guestVisible }: { courses: AcademyCourse[]; guestVisible: number }) {
  const { user } = useSession();
  const { L, t, locale } = useI18n();

  if (!user) {
    return (
      <div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.slice(0, 3).map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <div className="card h-full">
                <SpatialFrame className="relative h-[148px] overflow-hidden">
                  {}
                  <img
                    src={resolveImage(c.image, 'academy')}
                    alt=""
                    className="lockblur h-full w-full object-cover"
                  />
                </SpatialFrame>
                <div className="p-5">
                  <h3 className="h3 mb-2 !text-[16.4px]">{L(c.title)}</h3>
                  <p className="mut lockblur mb-4 text-[12.9px] leading-relaxed" aria-hidden="true">
                    {L(c.summary)}
                  </p>
                  <AccessBadge access="members" membersLabel={t('members')} publicLabel={t('public')} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="panel mx-auto mt-8 max-w-[640px] p-8 text-center sm:p-10">
            <div className="badge b-vi mb-4">
              <Icon name="lock" size={11} />
              {locale === 'ne' ? 'सुरक्षित एकेडेमी' : 'PROTECTED ACADEMY'}
            </div>
            <h2 className="h2 mb-3 !text-[clamp(1.4rem,3vw,2rem)]">
              {locale === 'ne' ? 'पूर्ण एकेडेमी खोल्नुहोस्' : 'Unlock the full Academy'}
            </h2>
            <p className="mut mx-auto mb-7 max-w-[52ch] text-[13.6px] leading-relaxed">
              {locale === 'ne'
                ? `पाठ्यक्रम, मोड्युल, पाठ र स्रोतहरू — ${courses.length} वटा पाठ्यक्रम उपलब्ध छन्। Google बाट जारी राख्नुहोस्; कुनै दर्ता फारम वा पासवर्ड छैन।`
                : `${courses.length} courses with modules, lessons and resources are ready. Continue with Google — no registration form, no password, no profile questions.`}
            </p>
            <GoogleButton returnTo="/academy" className="mx-auto" />
            <p className="dim mt-5 text-[11.4px]">
              {locale === 'ne'
                ? 'प्रगति निजी हुन्छ — कुनै सार्वजनिक लिडरबोर्ड छैन।'
                : 'Progress stays private — no public leaderboards.'}
              {guestVisible > 0 &&
                (locale === 'ne'
                  ? ` ${guestVisible} परिचय सामग्री सार्वजनिक छन्।`
                  : ` ${guestVisible} introductory items remain public.`)}
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c, i) => {
        const mods = (c.modules || []).length;
        const lessons = (c.modules || []).reduce((a, m) => a + (m.lessons || []).length, 0);
        return (
          <Reveal key={c.id} delay={(i % 3) * 60}>
            <Link
              href={`/academy/${c.slug}`}
              className="card group block h-full"
              onClick={() => track('academy_entry', { course: c.slug })}
            >
              <SpatialFrame
                className="relative h-[148px] overflow-hidden"
                hud={
                  <>
                    <Icon name="layers" size={10} />
                    3D
                  </>
                }
              >
                {}
                <img
                  src={resolveImage(c.image, 'academy')}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-[1.6s] group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <AccessBadge access={c.access} membersLabel={t('members')} publicLabel={t('public')} />
                </div>
              </SpatialFrame>
              <div className="p-5">
                <h3 className="h3 mb-2 !text-[16.8px]">{L(c.title)}</h3>
                <p className="mut mb-4 text-[13px] leading-relaxed">{L(c.summary)}</p>
                <div className="mono dim flex flex-wrap gap-1.5 text-[10.1px]">
                  <span className="chip !py-1">{c.level}</span>
                  <span className="chip !py-1">
                    {mods} {t('modules')}
                  </span>
                  <span className="chip !py-1">
                    {lessons} {t('lessons')}
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
