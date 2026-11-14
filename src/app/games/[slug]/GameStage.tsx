'use client';

import { useEffect, useRef, useState } from 'react';
import { MembersGate } from '@/components/ui/Interactive';
import { Icon } from '@/components/ui/Icon';
import { SpatialFrame } from '@/components/spatial/SpatialFrame';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { track } from '@/lib/analytics';
import { resolveImage } from '@/lib/utils';
import type { Game } from '@/lib/content/types';

/** Game stage — public games play instantly; member games require Continue with Google (spec §31). */
export function GameStage({ game }: { game: Game }) {
  const { user } = useSession();
  const { locale } = useI18n();
  const [playing, setPlaying] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const gated = game.access === 'members';
  const openPlay = !gated && game.launch !== 'soon' && Boolean(game.url);

  useEffect(() => {
    if (playing) stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [playing]);

  const start = () => {
    track('game_launch', { game: game.slug, stage: 'play' });
    // The desktop stage embeds the app; phones open it full-page so the fixed
    // site nav cannot sit on top of the game's own controls.
    if (window.matchMedia('(max-width: 640px)').matches) {
      window.location.assign(game.url);
      return;
    }
    setPlaying(true);
  };

  if (openPlay) {
    return (
      <div ref={stageRef} className="panel p-4 sm:p-6" style={{ scrollMarginTop: 'calc(var(--nav) + 16px)' }}>
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--line)' }}>
          {playing ? (
            <iframe
              src={game.url}
              title={game.title.en}
              className="block w-full border-0"
              style={{ height: 'clamp(520px, 78vh, 820px)', background: '#07080c' }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              allow="fullscreen; clipboard-write"
              allowFullScreen
              onLoad={() => track('game_launch', { game: game.slug, stage: 'play' })}
            />
          ) : (
            <div className="relative aspect-video">
              <img
                src={resolveImage(game.thumb, 'games')}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb,var(--bg) 22%,transparent), color-mix(in srgb,var(--bg) 78%,transparent))',
                }}
              />
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <div
                  className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6"
                  style={{
                    background: 'color-mix(in srgb,var(--bg) 66%,transparent)',
                    border: '1px solid var(--line)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div className="mono mb-3 text-[10px] tracking-[.24em]" style={{ color: 'var(--ok)' }}>
                    {game.category} · {locale === 'ne' ? 'निःशुल्क खेल' : 'FREE PLAY'}
                  </div>
                  <button type="button" className="btn btn-g" onClick={start}>
                    <Icon name="play" size={16} /> {locale === 'ne' ? 'अहिले खेल्नुहोस्' : 'Play now'}
                  </button>
                  <p className="dim mt-3 text-[11.6px]">
                    <span className="sm:hidden">
                      {locale === 'ne'
                        ? 'पूर्ण स्क्रिनमा खेल खुल्छ। खाता आवश्यक छैन।'
                        : 'Opens the game full screen. No account needed.'}
                    </span>
                    <span className="hidden sm:inline">
                      {locale === 'ne' ? 'यसै पृष्ठमा चल्छ। ' : 'Runs right here in the page. '}
                      <a
                        href={game.url}
                        target="_blank"
                        rel="noopener"
                        className="underline hover:text-[var(--cy)]"
                      >
                        {locale === 'ne' ? 'पूर्ण स्क्रिनमा खोल्नुहोस्' : 'Open full screen'}
                      </a>
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        {playing && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="dim text-[11.8px]">
              {locale === 'ne'
                ? `${game.title.ne || game.title.en} · ${game.category} · प्रगति यही ब्राउजरमा सुरक्षित रहन्छ।`
                : `${game.title.en} · ${game.category} · progress stays in this browser.`}
            </p>
            <a href={game.url} target="_blank" rel="noopener" className="btn btn-g btn-sm">
              {locale === 'ne' ? 'पूर्ण स्क्रिन' : 'Full screen'} <Icon name="arrow" size={13} />
            </a>
          </div>
        )}
      </div>
    );
  }

  const stage = (
    <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: 'var(--line)' }}>
      <div className="relative grid aspect-video place-items-center" style={{ background: 'var(--panel2)' }}>
        <SpatialFrame className="absolute inset-0" clean intensity={5}>
          {}
          <img
            src={resolveImage(game.thumb, 'games')}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover ${gated && !user ? 'lockblur' : 'opacity-40'}`}
          />
        </SpatialFrame>
        <div className="relative p-8 text-center">
          {game.launch === 'soon' ? (
            <>
              <div className="mono mb-3 text-[10px] tracking-[.24em]" style={{ color: 'var(--warn)' }}>
                IN DEVELOPMENT
              </div>
              <p className="mut max-w-[52ch] text-[13.4px]">
                {locale === 'ne'
                  ? 'यो खेल निर्माणाधीन छ — तयार भएपछि यहीँ खुल्नेछ। काम नगरेको कुनै चीजको घोषणा गरिँदैन।'
                  : 'This game is still in development — it opens here when it works. Nothing is announced before it works.'}
              </p>
            </>
          ) : game.url && user ? (
            <iframe
              src={game.url}
              title={game.title.en}
              className="aspect-video w-full rounded-xl"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              allow="fullscreen"
              onLoad={() => track('game_launch', { game: game.slug, stage: 'play' })}
            />
          ) : (
            <>
              <div className="mono dim mb-3 text-[10px] tracking-[.24em]">GAME STAGE</div>
              <p className="mut max-w-[52ch] text-[13.4px]">
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
        <MembersGate
          returnTo={`/games/${game.slug}`}
          reason={locale === 'ne' ? 'खेल्न Google आवश्यक' : 'Playing requires Google'}
        >
          {stage}
        </MembersGate>
      ) : (
        stage
      )}
    </div>
  );
}
