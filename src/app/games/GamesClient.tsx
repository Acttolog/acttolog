'use client';

import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { resolveImage, fdate } from '@/lib/utils';
import type { Game } from '@/lib/content/types';

/** Public game library — thumbnails, titles, descriptions visible to all (spec §31). */
export function GamesClient({ games }: { games: Game[] }) {
  const { L, t, locale } = useI18n();

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {games.map((g, i) => (
        <Reveal key={g.id} delay={(i % 3) * 60}>
          <Link href={`/games/${g.slug}`} className="card group block h-full"
            onClick={() => track('game_launch', { game: g.slug, stage: 'open' })}>
            <div className="relative h-[178px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImage(g.thumb, 'games')} alt=""
                className="w-full h-full object-cover transition-transform duration-[1.6s] group-hover:scale-105" />
              <div className="absolute inset-0 grid place-items-center"
                style={{ background: 'color-mix(in srgb,var(--bg) 34%,transparent)', opacity: 0, transition: '.4s' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}>
                <span className="w-14 h-14 rounded-full grid place-items-center"
                  style={{ background: 'var(--grad)', color: '#04060e' }}>
                  <Icon name="play" size={22} />
                </span>
              </div>
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="badge b-mut">{g.category}</span>
                <AccessBadge access={g.access} membersLabel={t('members')} publicLabel={t('public')} />
              </div>
              {g.launch === 'soon' && (
                <span className="badge b-warn absolute top-3 right-3">{t('dev')}</span>
              )}
            </div>
            <div className="p-5">
              <h3 className="h3 !text-[16.4px] mb-2">{L(g.title)}</h3>
              <p className="mut text-[12.9px] leading-relaxed mb-4 line-clamp-2">{L(g.desc)}</p>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[12.6px] font-semibold" style={{ color: 'var(--ok)' }}>
                  {g.launch === 'soon' ? t('dev') : t('play')} <Icon name="arrow" size={13} />
                </span>
                <span className="dim mono text-[10px] tracking-[.14em]">{fdate(g.release)}</span>
              </div>
            </div>
          </Link>
        </Reveal>
      ))}
      {games.length === 0 && (
        <div className="panel p-12 text-center mut sm:col-span-2 lg:col-span-3">{t('none')}</div>
      )}
      <p className="dim text-[12px] sm:col-span-2 lg:col-span-3">
        {locale === 'ne'
          ? 'खेल्न Google साइन-इन आवश्यक छ — कुनै पासवर्ड वा दर्ता फारम छैन।'
          : 'Playing requires Continue with Google — no passwords, no registration forms.'}
      </p>
    </div>
  );
}
