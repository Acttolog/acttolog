'use client';

import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { AccessBadge } from '@/components/ui/Badges';
import { SpatialFrame } from '@/components/spatial/SpatialFrame';
import { useI18n } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import { resolveImage, fdate } from '@/lib/utils';
import type { Game } from '@/lib/content/types';

/** Public game library — thumbnails, titles, descriptions visible to all (spec §31). */
export function GamesClient({ games }: { games: Game[] }) {
  const { L, t, locale } = useI18n();

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((g, i) => (
        <Reveal key={g.id} delay={(i % 3) * 60}>
          <Link
            href={`/games/${g.slug}`}
            className="card group block h-full"
            onClick={() => track('game_launch', { game: g.slug, stage: 'open' })}
          >
            <SpatialFrame
              className="relative h-[178px] overflow-hidden"
              hud={
                <>
                  <Icon name="layers" size={10} />
                  BROWSER
                </>
              }
            >
              {}
              <img
                src={resolveImage(g.thumb, 'games')}
                alt=""
                className="h-full w-full object-cover transition-transform duration-[1.6s] group-hover:scale-105"
              />
              <div
                className="absolute inset-0 grid place-items-center"
                style={{
                  background: 'color-mix(in srgb,var(--bg) 34%,transparent)',
                  opacity: 0,
                  transition: '.4s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <span
                  className="grid h-14 w-14 place-items-center rounded-full"
                  style={{ background: 'var(--grad)', color: '#04060e' }}
                >
                  <Icon name="play" size={22} />
                </span>
              </div>
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="badge b-mut">{g.category}</span>
                <AccessBadge access={g.access} membersLabel={t('members')} publicLabel={t('public')} />
              </div>
              {g.launch === 'soon' && <span className="badge b-warn absolute top-3 right-3">{t('dev')}</span>}
            </SpatialFrame>
            <div className="p-5">
              <h3 className="h3 mb-2 !text-[16.4px]">{L(g.title)}</h3>
              <p className="mut mb-4 line-clamp-2 text-[12.9px] leading-relaxed">{L(g.desc)}</p>
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 text-[12.6px] font-semibold"
                  style={{ color: 'var(--ok)' }}
                >
                  {g.launch === 'soon' ? t('dev') : g.access === 'public' && g.url ? t('playNow') : t('play')}{' '}
                  <Icon name="arrow" size={13} />
                </span>
                <span className="dim mono text-[10px] tracking-[.14em]">{fdate(g.release)}</span>
              </div>
            </div>
          </Link>
        </Reveal>
      ))}
      {games.length === 0 && (
        <div className="panel mut p-12 text-center sm:col-span-2 lg:col-span-3">{t('none')}</div>
      )}
      <p className="dim text-[12px] sm:col-span-2 lg:col-span-3">
        {locale === 'ne'
          ? 'नेपाल सिरिज आर्केड र CUBE/26 खाता बिनै तुरुन्तै खेल्न सकिन्छ — छ ब्राउजर खेल, कुनै डाउनलोड छैन। सदस्य खेलहरू Google बाट जारी राखेपछि खुल्छन् — कुनै पासवर्ड वा दर्ता फारम छैन।'
          : 'The Nepal Series arcade and CUBE/26 play instantly with no account — six browser games, no downloads. Member games open with Continue with Google — no passwords, no registration forms.'}
      </p>
    </div>
  );
}
