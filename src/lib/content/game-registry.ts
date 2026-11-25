import type { Game } from './types.ts';

export interface ArcadeGame {
  id: string;
  title: string;
  ne: string;
  kicker: string;
  tagline: string;
  blurb: string;
  meta: string[];
  cover: string;
  accent: string;
}

export interface GameRegistry {
  catalogue: Game[];
  arcade: ArcadeGame[];
  arcadeCatalogue: Game[];
  cube: Game[];
  publicPlayable: Game[];
  counts: {
    catalogue: number;
    arcade: number;
    cube: number;
    publicPlayable: number;
  };
}

export function summarizeGames(catalogue: Game[], arcade: ArcadeGame[]): GameRegistry {
  const arcadeIds = new Set(arcade.map((g) => g.id));
  const arcadeCatalogue = catalogue.filter((g) => arcadeIds.has(g.slug));
  const cube = catalogue.filter((g) => g.slug === 'cube-26');
  const publicPlayable = catalogue.filter((g) => g.access === 'public' && Boolean(g.url) && g.launch !== 'soon');
  return {
    catalogue,
    arcade,
    arcadeCatalogue,
    cube,
    publicPlayable,
    counts: {
      catalogue: catalogue.length,
      arcade: arcade.length,
      cube: cube.length,
      publicPlayable: publicPlayable.length,
    },
  };
}
