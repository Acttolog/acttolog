'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { resolveImage, fdate } from '@/lib/utils';
import type { EntertainmentItem } from '@/lib/content/types';

/** Category-filterable entertainment grid. */
export function EntertainmentGrid({ items, cats }: { items: EntertainmentItem[]; cats: string[] }) {
  const { L, t, locale } = useI18n();
  const [cat, setCat] = useState('All');
  const list = cat === 'All' ? items : items.filter((x) => x.category === cat);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-8">
        {['All', ...cats].map((c) => (
          <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
            {c === 'All' ? t('all') : c}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((e, i) => (
            <Reveal key={e.id} delay={(i % 3) * 60}>
              <Link href={`/entertainment/${e.slug}`} className="card group block h-full"
                onClick={() => track('entertainment_view', { item: e.slug })}>
                <div className="relative h-[190px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveImage(e.thumb, 'stage')} alt=""
                    className="w-full h-full object-cover transition-transform duration-[1.6s] group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,color-mix(in srgb,var(--bg) 88%,transparent))' }} />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="badge b-vi">{e.category}</span>
                    <AccessBadge access={e.access} membersLabel={t('members')} publicLabel={t('public')} />
                  </div>
                  {e.featured && (
                    <span className="badge b-info absolute top-3 right-3">{t('featured')}</span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="h3 !text-[16.4px] mb-2">{L(e.title)}</h3>
                  <p className="mut text-[12.9px] leading-relaxed mb-4 line-clamp-2">{L(e.desc)}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {(e.tags || []).slice(0, 2).map((x) => <span key={x} className="tag">{x}</span>)}
                    </div>
                    <span className="dim mono text-[10px] tracking-[.14em]">{fdate(e.date)}</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="panel p-12 text-center mut">{t('none')}</div>
      )}
      <p className="dim text-[12px] mt-6">
        {locale === 'ne'
          ? 'प्राथमिकता: आधुनिक स्वाभाविक नेपाली शैली।'
          : 'Editorial voice: modern, natural — Nepali copy follows contemporary style.'}
      </p>
    </>
  );
}
