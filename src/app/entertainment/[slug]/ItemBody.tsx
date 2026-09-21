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
        <MembersGate returnTo={`/entertainment/${item.slug}`}
          reason={locale === 'ne' ? 'सदस्य-विशेष मिडिया' : 'Members-only media'}>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
            <div className="aspect-video grid place-items-center" style={{ background: 'var(--panel2)' }}>
              <div className="text-center p-8">
                <div className="mono text-[10px] tracking-[.24em] dim mb-3">PROTECTED MEDIA</div>
                <p className="mut text-[13.4px] max-w-[52ch] mx-auto">{body}</p>
              </div>
            </div>
          </div>
        </MembersGate>
      ) : item.media ? (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
          <video src={item.media} controls className="w-full aspect-video" style={{ background: '#000' }} />
        </div>
      ) : (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}>
          <div className="mono text-[10px] tracking-[.24em] dim mb-3">MEDIA COMING SOON</div>
          <Md src={body} />
          <p className="dim text-[12px] mt-4">
            {locale === 'ne'
              ? 'मिडिया फाइलहरू CMS मार्फत थपिनेछन् — छायाङ्कन/पोस्ट-प्रोडक्सन पछि।'
              : 'Media files are attached via the CMS after production — nothing is announced before it works.'}
          </p>
        </div>
      )}
    </div>
  );
}
