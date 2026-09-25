import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui/Heads';
import { Reveal } from '@/components/ui/Reveal';
import { Icon } from '@/components/ui/Icon';
import { GamesClient } from './GamesClient';
import { GamesExtraGrid } from '@/components/content/Extensions';
import { getDB, pub, seoFor } from '@/lib/content';

const db = getDB();

export const metadata: Metadata = {
  title: seoFor('/games').title,
  description: seoFor('/games').desc,
  alternates: { canonical: '/games' },
};

export default function GamesPage() {
  const d = db.divisions.find((x) => x.id === 'games');
  const games = pub(db.games).slice().sort((a, b) => String(b.release).localeCompare(String(a.release)));

  return (
    <>
      <PageHead kicker="ACTTOLOG DIVISION · GAMES" title={d?.name.en || 'Games'}
        body={d?.desc.en} art="games" />
      <section className="sec pt-2">
        <div className="wrap">
          <GamesClient games={games} />
          <GamesExtraGrid />

          <Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
              {[
                ['Scores & achievements', 'Leaderboards stay private to you — progress is tracked, never published.', 'star'],
                ['Favorites & recents', 'Your game activity lives in My Acttolog, visible to nobody else.', 'heart'],
                ['Educational play', 'Some titles teach research methods and division knowledge through play.', 'book'],
                ['Experimental lab', 'New interactive experiments ship here first — some are marked in development.', 'rocket'],
              ].map(([title, body, icon]) => (
                <div key={title} className="card p-6">
                  <span className="w-10 h-10 rounded-xl grid place-items-center mb-4"
                    style={{ background: 'color-mix(in srgb,var(--ok) 12%,transparent)', color: 'var(--ok)', border: '1px solid color-mix(in srgb,var(--ok) 28%,transparent)' }}>
                    <Icon name={icon} size={18} />
                  </span>
                  <h3 className="font-display font-semibold text-[14.4px] mb-2">{title}</h3>
                  <p className="mut text-[12.6px] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="panel p-6 mt-10 flex flex-wrap items-center justify-between gap-4">
              <p className="mut text-[13.2px] max-w-[70ch]">
                Advanced game systems (persistent scores, achievements, tournaments) activate as the platform matures —
                architecture is ready, nothing is announced before it works.
              </p>
              <Link href="/my/games" className="btn btn-g btn-sm">My games <Icon name="arrow" size={14} /></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
