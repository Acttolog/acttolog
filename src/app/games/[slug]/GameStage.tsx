'use client';

import { MembersGate } from '@/components/ui/Interactive';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { track } from '@/lib/analytics';
import { resolveImage } from '@/lib/utils';
import type { Game } from '@/lib/content/types';

/** Game stage — guests see the preview; playing requires Continue with Google (spec §31). */
export function GameStage({ game }: { game: Game }) {
  const { user } = useSession();
  const { locale } = useI18n();
  const gated = game.access === 'members';

  const stage = (
    <div className="rounded-xl border overflow-hidden relative" style={{ borderColor: 'var(--line)' }}>
      <div className="aspect-video grid place-items-center relative" style={{ background: 'var(--panel2)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolveImage(game.thumb, 'games')} alt=""
          className={`absolute inset-0 w-full h-full object-cover ${gated && !user ? 'lockblur' : 'opacity-40'}`} />
        <div className="relative text-center p-8">
          {game.launch === 'soon' ? (
            <>
              <div className="mono text-[10px] tracking-[.24em] mb-3" style={{ color: 'var(--warn)' }}>IN DEVELOPMENT</div>
              <p className="mut text-[13.4px] max-w-[52ch]">
                {locale === 'ne'
                  ? 'यो खेल निर्माणाधीन छ — तयार भएपछि यहीँ खुल्नेछ। काम नगरेको कुनै चीजको घोषणा गरिँदैन।'
                  : 'This game is still in development — it opens here when it works. Nothing is announced before it works.'}
              </p>
            </>
          ) : game.url && user ? (
            <iframe src={game.url} title={game.title.en} className="w-full aspect-video rounded-xl"
              sandbox="allow-scripts allow-same-origin" allow="fullscreen"
              onLoad={() => track('game_launch', { game: game.slug, stage: 'play' })} />
          ) : (
            <>
              <div className="mono text-[10px] tracking-[.24em] dim mb-3">GAME STAGE</div>
              <p className="mut text-[13.4px] max-w-[52ch]">
                {locale === 'ne'
                  ? 'खेल मञ्च तयार छ — खेल्न Google बाट जारी राख्नुहोस्।'
                  : 'The stage is ready — continue with Google to play. Scores and progress stay private to you.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="panel p-4 sm:p-6">
      {gated && !user ? (
        <MembersGate returnTo={`/games/${game.slug}`}
          reason={locale === 'ne' ? 'खेल्न Google आवश्यक' : 'Playing requires Google'}>
          {stage}
        </MembersGate>
      ) : stage}
    </div>
  );
}
