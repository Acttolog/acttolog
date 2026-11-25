import { GAMES as ARCADE_GAMES } from '../../../public/arcade/src/data.js';
import { getDB, pub } from './index';
import { summarizeGames, type ArcadeGame, type GameRegistry } from './game-registry';

export type { ArcadeGame, GameRegistry } from './game-registry';
export { summarizeGames } from './game-registry';

export function gameRegistry(): GameRegistry {
  return summarizeGames(pub(getDB().games), ARCADE_GAMES as ArcadeGame[]);
}
