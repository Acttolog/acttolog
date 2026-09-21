'use client';

import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { GoogleButton } from '@/components/ui/GoogleButton';
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.slice(0, 3).map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <div className="card h-full">
                <div className="h-[148px] overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveImage(c.image, 'academy')} alt="" className="w-full h-full object-cover lockblur" />
                </div>
                <div className="p-5">
                  <h3 className="h3 !text-[16.4px] mb-2">{L(c.title)}</h3>
                  <p className="mut text-[12.9px] leading-relaxed lockblur mb-4" aria-hidden="true">{L(c.summary)}</p>
                  <AccessBadge access="members" membersLabel={t('members')} publicLabel={t('public')} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="panel p-8 sm:p-10 text-center mt-8 max-w-[640px] mx-auto">
            <div className="badge b-vi mb-4"><Icon name="lock" size={11} />{locale === 'ne' ? 'सुरक्षित एकेडेमी' : 'PROTECTED ACADEMY'}</div>
            <h2 className="h2 !text-[clamp(1.4rem,3vw,2rem)] mb-3">
              {locale === 'ne' ? 'पूर्ण एकेडेमी खोल्नुहोस्' : 'Unlock the full Academy'}
            </h2>
            <p className="mut text-[13.6px] leading-relaxed max-w-[52ch] mx-auto mb-7">
              {locale === 'ne'
                ? `पाठ्यक्रम, मोड्युल, पाठ र स्रोतहरू — ${courses.length} वटा पाठ्यक्रम उपलब्ध छन्। Google बाट जारी राख्नुहोस्; कुनै दर्ता फारम वा पासवर्ड छैन।`
                : `${courses.length} courses with modules, lessons and resources are ready. Continue with Google — no registration form, no password, no profile questions.`}
            </p>
            <GoogleButton returnTo="/academy" className="mx-auto" />
            <p className="dim text-[11.4px] mt-5">
              {locale === 'ne' ? 'प्रगति निजी हुन्छ — कुनै सार्वजनिक लिडरबोर्ड छैन।' : 'Progress stays private — no public leaderboards.'}
              {guestVisible > 0 && (locale === 'ne' ? ` ${guestVisible} परिचय सामग्री सार्वजनिक छन्।` : ` ${guestVisible} introductory items remain public.`)}
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {courses.map((c, i) => {
        const mods = (c.modules || []).length;
        const lessons = (c.modules || []).reduce((a, m) => a + (m.lessons || []).length, 0);
        return (
          <Reveal key={c.id} delay={(i % 3) * 60}>
            <Link href={`/academy/${c.slug}`} className="card group block h-full"
              onClick={() => track('academy_entry', { course: c.slug })}>
              <div className="h-[148px] overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImage(c.image, 'academy')} alt=""
                  className="w-full h-full object-cover transition-transform duration-[1.6s] group-hover:scale-105" />
                <div className="absolute top-3 left-3">
                  <AccessBadge access={c.access} membersLabel={t('members')} publicLabel={t('public')} />
                </div>
              </div>
              <div className="p-5">
                <h3 className="h3 !text-[16.8px] mb-2">{L(c.title)}</h3>
                <p className="mut text-[13px] leading-relaxed mb-4">{L(c.summary)}</p>
                <div className="flex flex-wrap gap-1.5 mono text-[10.1px] dim">
                  <span className="chip !py-1">{c.level}</span>
                  <span className="chip !py-1">{mods} {t('modules')}</span>
                  <span className="chip !py-1">{lessons} {t('lessons')}</span>
                </div>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
