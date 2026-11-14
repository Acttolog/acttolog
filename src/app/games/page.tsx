import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { GamesClient } from './GamesClient';
import { GamesExtraGrid } from '@/components/content/Extensions';
import { getDB, pub, seoFor } from '@/lib/content';
import { WorldPortal } from '@/components/world/WorldPortal';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/games').title,
  description: seoFor('/games').desc,
  alternates: { canonical: '/games' },
};

export default function GamesPage() {
  const d = db.divisions.find((x) => x.id === 'games');
  const games = pub(db.games)
    .slice()
    .sort((a, b) => String(b.release).localeCompare(String(a.release)));

  return (
    <>
      <PageHead
        kicker="ACTTOLOG DIVISION · GAMES"
        title={d?.name.en || 'Games'}
        body={d?.desc.en}
        art="games"
      />
      <WorldPortal
        world="arena"
        title="Games World"
        titleNe="गेम्स वर्ल्ड"
        subtitle="A futuristic game lobby in 360° — hotspots lead into Entertainment and back to the ACTTOLOG world hub."
        accent="var(--ok)"
        earthLink="/explore?mode=earth&lat=35.68100&lng=139.76700"
      />

      <section className="sec pt-2">
        <div className="wrap">
          <GamesClient games={games} />
          <GamesExtraGrid />

          <Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  'Scores & achievements',
                  'Leaderboards stay private to you — progress is tracked, never published.',
                  'star',
                ],
                [
                  'Favorites & recents',
                  'Your game activity lives in My Acttolog, visible to nobody else.',
                  'heart',
                ],
                [
                  'Educational play',
                  'Some titles teach research methods and division knowledge through play.',
                  'book',
                ],
                [
                  'Experimental lab',
                  'New interactive experiments ship here first — some are marked in development.',
                  'rocket',
                ],
              ].map(([title, body, icon]) => (
                <div key={title} className="card p-6">
                  <span
                    className="mb-4 grid h-10 w-10 place-items-center rounded-xl"
                    style={{
                      background: 'color-mix(in srgb,var(--ok) 12%,transparent)',
                      color: 'var(--ok)',
                      border: '1px solid color-mix(in srgb,var(--ok) 28%,transparent)',
                    }}
                  >
                    <Icon name={icon} size={18} />
                  </span>
                  <h3 className="font-display mb-2 text-[14.4px] font-semibold">{title}</h3>
                  <p className="mut text-[12.6px] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="panel mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
              <p className="mut max-w-[70ch] text-[13.2px]">
                Advanced game systems (persistent scores, achievements, tournaments) activate as the platform
                matures — architecture is ready, nothing is announced before it works.
              </p>
              <Link href="/my/games" className="btn btn-g btn-sm">
                My games <Icon name="arrow" size={14} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
