'use client';

import { MembersGate } from '@/components/ui/Interactive';
import { useI18n } from '@/lib/i18n';
import { Md } from '@/components/ui/Bi';
import { track } from '@/lib/analytics';
import { useEffect } from 'react';
import type { EntertainmentItem } from '@/lib/content/types';

/** Entertainment body — guests get the preview; members get full media (spec §29). */
export function ItemBody({ item }: { item: EntertainmentItem }) {
  const { locale } = useI18n();
  const members = item.access === 'members';

  useEffect(() => {
    if (!members) track('entertainment_view', { item: item.slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);

  const body = item.desc[locale] || item.desc.en;

  return (
    <div className="panel p-6 sm:p-9">
      <div className="eyebrow mb-5">{members ? 'FULL FEATURE' : 'NOW SHOWING'}</div>
      {members ? (
        <MembersGate
          returnTo={`/entertainment/${item.slug}`}
          reason={locale === 'ne' ? 'सदस्य-विशेष मिडिया' : 'Members-only media'}
        >
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--line)' }}>
            <div className="grid aspect-video place-items-center" style={{ background: 'var(--panel2)' }}>
              <div className="p-8 text-center">
                <div className="mono dim mb-3 text-[10.5px] tracking-[.24em]">PROTECTED MEDIA</div>
                <p className="mut mx-auto max-w-[52ch] text-[13.4px]">{body}</p>
              </div>
            </div>
          </div>
        </MembersGate>
      ) : item.media ? (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--line)' }}>
          <video src={item.media} controls className="aspect-video w-full" style={{ background: '#000' }} />
        </div>
      ) : (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
        >
          <div className="mono dim mb-3 text-[10.5px] tracking-[.24em]">MEDIA COMING SOON</div>
          <Md src={body} />
          <p className="dim mt-4 text-[12px]">
            {locale === 'ne'
              ? 'मिडिया फाइलहरू CMS मार्फत थपिनेछन् — छायाङ्कन/पोस्ट-प्रोडक्सन पछि।'
              : 'Media files are attached via the CMS after production — nothing is announced before it works.'}
          </p>
        </div>
      )}
    </div>
  );
}
