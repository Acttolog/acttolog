import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeGames, type ArcadeGame } from './game-registry.ts';
import type { Game } from './types.ts';

const game = (slug: string, access: Game['access'] = 'public', launch: Game['launch'] = 'play'): Game => ({
  id: slug,
  slug,
  title: { en: slug, ne: slug },
  desc: { en: '', ne: '' },
  thumb: '',
  url: `/games/${slug}`,
  category: 'Arcade',
  launch,
  access,
  status: 'published',
  featured: false,
  visible: true,
  release: '2026-01-01',
});

const arcade: ArcadeGame[] = [
  { id: 'snake', title: 'Snake', ne: '', kicker: '', tagline: '', blurb: '', meta: [], cover: '', accent: '' },
  { id: 'ludo', title: 'Ludo', ne: '', kicker: '', tagline: '', blurb: '', meta: [], cover: '', accent: '' },
];

test('game registry keeps catalogue, arcade, cube and public-play scopes distinct', () => {
  const registry = summarizeGames(
    [game('snake-himalaya'), game('ludo-himalaya'), game('cube-26'), game('member', 'members'), game('soon', 'public', 'soon')],
    arcade.map((g) => ({ ...g, id: g.id === 'snake' ? 'snake-himalaya' : 'ludo-himalaya' })),
  );
  assert.equal(registry.counts.catalogue, 5);
  assert.equal(registry.counts.arcade, 2);
  assert.equal(registry.counts.cube, 1);
  assert.equal(registry.counts.publicPlayable, 3);
  assert.deepEqual(registry.arcadeCatalogue.map((g) => g.slug), ['snake-himalaya', 'ludo-himalaya']);
});
