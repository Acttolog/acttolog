import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { AccessBadge } from '@/components/ui/Badges';
import { GameStage } from './GameStage';
import { getDB, pub } from '@/lib/content';
import { resolveImage, fdate } from '@/lib/utils';

const db = getDB();

export function generateStaticParams() {
  return pub(db.games).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = db.games.find((x) => x.slug === slug);
  if (!g) return { title: 'Not found' };
  return {
    title: `${g.title.en} | Games`,
    description: g.desc.en.slice(0, 155),
    alternates: { canonical: `/games/${slug}` },
  };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = db.games.find((g) => g.slug === slug && g.visible !== false);
  if (!game) notFound();

  return (
    <section className="pt-[calc(var(--nav)+48px)] pb-16">
      <div className="wrap">
        <nav className="dim mb-7 flex flex-wrap items-center gap-2 text-[12.3px]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--cy)]">
            Home
          </Link>
          <span>/</span>
          <Link href="/games" className="hover:text-[var(--cy)]">
            Games
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--txt)' }}>{game.title.en}</span>
        </nav>

        <Reveal>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex gap-2">
                <span className="badge b-mut">{game.category}</span>
                <AccessBadge access={game.access} />
                {game.launch === 'soon' && <span className="badge b-warn">In development</span>}
              </div>
              <h1 className="h1 !text-[clamp(1.8rem,4.4vw,2.9rem)]">{game.title.en}</h1>
              {game.title.ne && (
                <p className="font-display mut mt-2 text-[16px] font-semibold">{game.title.ne}</p>
              )}
            </div>
            <span className="dim mono mt-2 text-[10.5px] tracking-[.16em]">
              RELEASED {fdate(game.release)}
            </span>
          </div>
        </Reveal>

        <GameStage game={game} />

        <Reveal>
          <div className="panel mt-8 p-6 sm:p-8">
            <p className="lead">{game.desc.en}</p>
            {game.desc.ne && <p className="mut mt-3 text-[13.4px] leading-relaxed">{game.desc.ne}</p>}
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/games" className="btn btn-g btn-sm">
              All games
            </Link>
            <Link href="/my/games" className="btn btn-g btn-sm">
              My scores & progress
            </Link>
          </div>
        </Reveal>

        {/* preview art kept for SSR richness */}
        <img src={resolveImage(game.thumb, 'games')} alt="" className="hidden" />
      </div>
    </section>
  );
}
